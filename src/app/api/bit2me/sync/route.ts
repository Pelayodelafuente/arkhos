import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import {
  fetchAllTransactions,
  type Bit2MeTransaction,
} from '@/lib/bit2me/client';

const SUPPORTED_CURRENCIES = new Set(['BTC', 'ETH', 'USDC']);

interface MappedTransaction {
  user_id: string;
  asset_id: string;
  transaction_date: string;
  type: 'buy' | 'transfer_out';
  quantity: number;
  price_eur: number;
  amount_eur: number;
  fee_eur: number | null;
  exchange: string;
  source: string;
  external_id: string;
  notes: string | null;
}

function isBuy(tx: Bit2MeTransaction): boolean {
  return (
    tx.type === 'transfer' &&
    tx.subtype === 'purchase' &&
    tx.destination.class === 'pocket' &&
    SUPPORTED_CURRENCIES.has(tx.destination.currency)
  );
}

function isTransferOut(tx: Bit2MeTransaction): boolean {
  return (
    tx.type === 'withdrawal' &&
    tx.method === 'blockchain' &&
    tx.status === 'completed' &&
    SUPPORTED_CURRENCIES.has(tx.origin.currency)
  );
}

function mapBuy(
  tx: Bit2MeTransaction,
  userId: string,
  assetId: string,
): MappedTransaction {
  const quantity = parseFloat(tx.destination.amount);
  const amountEur = parseFloat(tx.origin.amount);

  return {
    user_id: userId,
    asset_id: assetId,
    transaction_date: tx.date,
    type: 'buy',
    symbol: tx.destination.currency,
    quantity,
    price_eur: quantity > 0 ? amountEur / quantity : 0,
    amount_eur: amountEur,
    fee_eur: null,
    exchange: 'bit2me',
    source: 'import_bit2me',
    external_id: tx.id,
    notes: null,
  } as MappedTransaction & { symbol: string };
}

function mapTransferOut(
  tx: Bit2MeTransaction,
  userId: string,
  assetId: string,
): MappedTransaction {
  const originAmount = parseFloat(tx.origin.amount);
  const destAmount = parseFloat(tx.destination.amount);
  const rateValue = parseFloat(tx.origin.rate?.value ?? '0');

  return {
    user_id: userId,
    asset_id: assetId,
    transaction_date: tx.date,
    type: 'transfer_out',
    symbol: tx.origin.currency,
    quantity: originAmount,
    price_eur: rateValue,
    amount_eur: originAmount * rateValue,
    fee_eur: (originAmount - destAmount) * rateValue,
    exchange: 'bit2me',
    source: 'import_bit2me',
    external_id: tx.id,
    notes: 'Transfer a wallet externa',
  } as MappedTransaction & { symbol: string };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { success } = await rateLimit(req, { limit: 10, window: 3600 });
  if (!success) {
    return NextResponse.json(
      { error: 'Demasiadas peticiones. Máximo 10 sincronizaciones por hora.' },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const userId = user.id;

  let rawTransactions: Bit2MeTransaction[];
  try {
    rawTransactions = await fetchAllTransactions();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return NextResponse.json(
      { error: `Error al conectar con Bit2Me: ${message}` },
      { status: 502 },
    );
  }

  const relevant = rawTransactions.filter(
    (tx) => isBuy(tx) || isTransferOut(tx),
  );

  if (relevant.length === 0) {
    return NextResponse.json({ synced: 0, skipped: 0, total: 0 });
  }

  const { data: assets } = await supabase
    .from('crypto_assets')
    .select('id, symbol')
    .eq('user_id', userId);

  const assetMap = new Map<string, string>(
    (assets ?? []).map((a) => [a.symbol, a.id]),
  );

  type CandidateRow = MappedTransaction & { symbol: string };

  const candidates: CandidateRow[] = [];

  for (const tx of relevant) {
    if (isBuy(tx)) {
      const symbol = tx.destination.currency;
      const assetId = assetMap.get(symbol);
      if (!assetId) continue;
      candidates.push(mapBuy(tx, userId, assetId) as CandidateRow);
    } else if (isTransferOut(tx)) {
      const symbol = tx.origin.currency;
      const assetId = assetMap.get(symbol);
      if (!assetId) continue;
      candidates.push(mapTransferOut(tx, userId, assetId) as CandidateRow);
    }
  }

  const skippedNoAsset = relevant.length - candidates.length;

  if (candidates.length === 0) {
    return NextResponse.json({
      synced: 0,
      skipped: skippedNoAsset,
      total: relevant.length,
    });
  }

  const incomingIds = candidates.map((c) => c.external_id);

  const { data: existingRows } = await supabase
    .from('crypto_transactions')
    .select('external_id')
    .eq('user_id', userId)
    .eq('source', 'import_bit2me')
    .in('external_id', incomingIds);

  const existingSet = new Set(
    (existingRows ?? []).map((r) => r.external_id ?? ''),
  );

  const newRows = candidates.filter((c) => !existingSet.has(c.external_id));

  if (newRows.length === 0) {
    return NextResponse.json({
      synced: 0,
      skipped: candidates.length + skippedNoAsset,
      total: relevant.length,
    });
  }

  const rowsToInsert = newRows.map(({ symbol: _symbol, ...row }) => row);

  const { error: insertError } = await supabase
    .from('crypto_transactions')
    .insert(rowsToInsert);

  if (insertError) {
    return NextResponse.json(
      { error: `Error al guardar transacciones: ${insertError.message}` },
      { status: 500 },
    );
  }

  const skipped = relevant.length - newRows.length;

  return NextResponse.json({
    synced: newRows.length,
    skipped,
    total: relevant.length,
  });
}
