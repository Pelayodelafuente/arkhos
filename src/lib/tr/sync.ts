// Server-side only — never import this in client components
// Used by: scripts/tr-sync-run.ts and src/app/api/tr/sync/route.ts

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type {
  TRCashResponse,
  TRPortfolioResponse,
  TRTimelineSection,
  TRTickerResponse,
  TRSyncResult,
} from './types'
import {
  classifyTransactionTitle,
  classifyPassiveIncomeTitle,
  isPassiveIncome,
  parseDecimal,
  timestampToDate,
} from './mappers'

type SupabaseAdmin = ReturnType<typeof createClient<Database>>

export async function runTRSync(
  userId: string,
  cash: TRCashResponse,
  portfolio: TRPortfolioResponse,
  timeline: TRTimelineSection[],
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

  // 3. Update current_price and current_quantity on portfolio_assets
  let positionsUpdated = 0

  for (const category of portfolio.categories) {
    for (const pos of category.positions) {
      const assetId = isinToAssetId.get(pos.isin)
      if (!assetId) continue

      const currentPrice = tickerPrices.get(pos.isin) ?? null
      const currentQty = parseDecimal(pos.netSize)

      const { error } = await supabase
        .from('portfolio_assets')
        .update({
          current_quantity: currentQty,
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

  // 4. Upsert transactions from timeline
  let transactionsUpserted = 0
  let passiveIncomeUpserted = 0

  for (const section of timeline) {
    for (const item of section.data) {
      if (!item.id || !item.title) continue

      const amount = Math.abs(item.cashChangeAmount ?? item.amount?.value ?? 0)
      const date = timestampToDate(item.timestamp)

      if (isPassiveIncome(item.title)) {
        const incomeType = classifyPassiveIncomeTitle(item.title)
        if (!incomeType) continue

        const { error } = await supabase.from('passive_income').upsert(
          {
            user_id: userId,
            platform_id: platform.id,
            asset_id: null, // would need timeline detail to resolve ISIN
            type: incomeType,
            income_date: date,
            amount,
            currency: 'EUR',
            notes: item.title,
          },
          { onConflict: 'id' }
        )

        if (!error) passiveIncomeUpserted++
      } else {
        const txType = classifyTransactionTitle(item.title)
        if (!txType) continue

        const { error } = await supabase.from('portfolio_transactions').upsert(
          {
            user_id: userId,
            platform_id: platform.id,
            asset_id: null, // resolved in step 4b if ISIN available
            type: txType,
            transaction_date: date,
            quantity: null,
            price_per_unit: null,
            total_amount: amount,
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
      total_value: portfolioTotal,
      total_invested: totalInvested,
      cash_value: cash.amount,
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
