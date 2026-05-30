// Server-side only — never import this in client components

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type {
  TRCashResponse,
  TRPortfolioResponse,
  TRTimelineItem,
  TRTickerResponse,
  TRSyncResult,
} from './types'
import {
  classifyTransactionTitle,
  classifyPassiveIncomeTitle,
  isPassiveIncome,
  parseDecimal,
  isoDateToDate,
} from './mappers'

type SupabaseAdmin = ReturnType<typeof createClient<Database>>

export async function runTRSync(
  userId: string,
  cash: TRCashResponse,
  portfolio: TRPortfolioResponse,
  items: TRTimelineItem[],
  tickerPrices: Map<string, number>,
  supabase: SupabaseAdmin
): Promise<TRSyncResult> {
  // 1. Resolve asset IDs by ISIN for this user
  const { data: assets, error: assetsError } = await supabase
    .from('portfolio_assets')
    .select('id, isin')
    .eq('user_id', userId)
    .not('isin', 'is', null)

  if (assetsError) throw assetsError

  const isinToAssetId = new Map<string, string>(
    (assets ?? []).map((a) => [a.isin!, a.id])
  )

  // 2. Resolve Trade Republic platform ID
  const { data: platform, error: platformError } = await supabase
    .from('investment_platforms')
    .select('id')
    .eq('user_id', userId)
    .eq('slug', 'trade-republic')
    .single()

  if (platformError || !platform) {
    throw new Error('Plataforma Trade Republic no encontrada para este usuario')
  }

  // 3. Update current_price, current_quantity, and avg_buy_price on portfolio_assets
  let positionsUpdated = 0

  for (const category of portfolio.categories) {
    for (const pos of category.positions) {
      const assetId = isinToAssetId.get(pos.isin)
      if (!assetId) continue

      const currentPrice = tickerPrices.get(pos.isin) ?? null
      const currentQty = parseDecimal(pos.netSize)
      const avgBuyPrice = parseDecimal(pos.averageBuyIn)

      const { error } = await supabase
        .from('portfolio_assets')
        .update({
          current_quantity: currentQty,
          avg_buy_price: avgBuyPrice,
          ...(currentPrice !== null && {
            current_price: currentPrice,
            current_price_eur: currentPrice,
            price_updated_at: new Date().toISOString(),
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', assetId)
        .eq('user_id', userId)

      if (!error) positionsUpdated++
    }
  }

  // 4. Upsert transactions from timeline items
  let transactionsUpserted = 0
  let passiveIncomeUpserted = 0

  for (const item of items) {
    if (!item.id || !item.title) continue

    const amount = item.amount?.value ?? 0
    const absAmount = Math.abs(amount)
    const date = isoDateToDate(item.timestamp)

    if (isPassiveIncome(item.title, item.subtitle)) {
      const incomeType = classifyPassiveIncomeTitle(item.title, item.subtitle)
      if (!incomeType) continue

      const { error } = await supabase.from('passive_income').upsert(
        {
          user_id: userId,
          platform_id: platform.id,
          asset_id: null,
          type: incomeType,
          income_date: date,
          amount: absAmount,
          currency: 'EUR',
          notes: item.title,
        },
        { onConflict: 'id' }
      )

      if (!error) passiveIncomeUpserted++
    } else {
      const txType = classifyTransactionTitle(item.title, item.subtitle, amount)
      if (!txType) continue

      const { error } = await supabase.from('portfolio_transactions').upsert(
        {
          user_id: userId,
          platform_id: platform.id,
          asset_id: null,
          type: txType,
          transaction_date: date,
          quantity: null,
          price_per_unit: null,
          total_amount: absAmount,
          currency: 'EUR',
          notes: item.title,
          source: 'tr-api',
          external_id: item.id,
        },
        { onConflict: 'external_id' }
      )

      if (!error) transactionsUpserted++
    }
  }

  // 5. Daily portfolio snapshot
  const today = new Date().toISOString().split('T')[0]
  const allPositions = portfolio.categories.flatMap((c) => c.positions)

  let totalValue = 0
  let totalInvested = 0

  for (const pos of allPositions) {
    const qty = parseDecimal(pos.netSize)
    const price = tickerPrices.get(pos.isin) ?? 0
    const avgBuyIn = parseDecimal(pos.averageBuyIn)

    totalValue += qty * price
    totalInvested += qty * avgBuyIn
  }

  const portfolioTotal = totalValue + cash.amount
  const pl = totalValue - totalInvested

  await supabase.from('portfolio_snapshots').upsert(
    {
      user_id: userId,
      snapshot_date: today,
      platform_id: platform.id,
      total_value: totalValue,      // portfolio sin efectivo (consistente con RPC)
      total_invested: totalInvested,
      cash_value: cash.amount,      // efectivo por separado
      pl_amount: pl,
      pl_percentage: totalInvested > 0 ? (pl / totalInvested) * 100 : 0,
    },
    { onConflict: 'user_id, snapshot_date, platform_id' }
  )

  return {
    positionsUpdated,
    transactionsUpserted,
    passiveIncomeUpserted,
    cashEur: cash.amount,
  }
}
