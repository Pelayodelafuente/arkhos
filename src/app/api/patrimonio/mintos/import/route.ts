import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import type { MintosImportResult } from '@/types/mintos';

// ── Payment type mapping ──────────────────────────────────────────────────────
const TYPE_MAP: Record<string, string> = {
  'Depósitos': 'deposit',
  'Intereses recibidos': 'interest_income',
  'Retención de impuestos': 'taxes_withheld',
  'Capital recibido': 'capital_received',
  'Inversión': 'investment',
  'Operación del Mercado Secundario': 'secondary_market',
  'Ingresos del principal recibidos por la recompra del préstamo': 'buyback_principal',
  'Ingresos de los intereses recibidos por la recompra del préstamo': 'buyback_interest',
  'Mintos Core fee': 'commissions',
  'Ingresos por intereses retrasados derivados de la conciliación en tránsito': 'late_interest',
  'Intereses recibidos por pagos pendientes': 'late_interest',
};

interface MonthlyAgg {
  deposits: number;
  interest_income: number;
  capital_received: number;
  buyback_principal: number;
  buyback_interest: number;
  investments: number;
  secondary_market: number;
  late_interest: number;
  commissions: number;
  taxes_withheld: number;
}

interface DepositEntry {
  deposit_date: string;
  amount: number;
  notes: string;
}

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Formato de request inválido' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof Blob)) {
    return Response.json({ error: 'No se recibió archivo' }, { status: 400 });
  }

  // Parse Excel
  const buffer = await file.arrayBuffer();
  const workbook = xlsxRead(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return Response.json({ error: 'Excel vacío o inválido' }, { status: 400 });
  }

  const rows: unknown[][] = xlsxUtils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: true,
  });

  if (rows.length < 2) {
    return Response.json({ error: 'El extracto no tiene transacciones' }, { status: 400 });
  }

  // Verify headers match expected Mintos format
  const headers = rows[0] as string[];
  const expectedHeaders = ['Fecha', 'Identificación de la operación:', 'Detalles', 'Volumen de negocios', 'Saldo', 'Divisa', 'Tipo de pago'];
  const isValidFormat = expectedHeaders.every((h, i) => String(headers[i] ?? '').trim().startsWith(h.slice(0, 10)));
  if (!isValidFormat) {
    return Response.json({ error: 'Formato de extracto no reconocido. Usa el extracto de cuenta de Mintos.' }, { status: 400 });
  }

  // ── Aggregate by month ────────────────────────────────────────────────────
  const monthlyAgg = new Map<string, MonthlyAgg>();
  const depositsFound: DepositEntry[] = [];
  const typeSummary: Record<string, number> = {};

  const emptyMonth = (): MonthlyAgg => ({
    deposits: 0, interest_income: 0, capital_received: 0,
    buyback_principal: 0, buyback_interest: 0, investments: 0,
    secondary_market: 0, late_interest: 0, commissions: 0, taxes_withheld: 0,
  });

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const rawDate = row[0];
    const rawVolume = row[3];
    const tipoPago = String(row[6] ?? '').trim();

    if (!rawDate || rawVolume === '' || rawVolume === undefined) continue;

    // Parse date: can be a Date object or string 'YYYY-MM-DD HH:MM:SS'
    let dateStr: string;
    if (rawDate instanceof Date) {
      dateStr = rawDate.toISOString().slice(0, 10);
    } else {
      dateStr = String(rawDate).slice(0, 10);
    }

    const monthKey = dateStr.slice(0, 7); // YYYY-MM
    const volume = typeof rawVolume === 'number' ? rawVolume : parseFloat(String(rawVolume));
    if (!isFinite(volume)) continue;

    const category = TYPE_MAP[tipoPago];
    if (!category) continue;

    typeSummary[tipoPago] = (typeSummary[tipoPago] ?? 0) + 1;

    if (!monthlyAgg.has(monthKey)) {
      monthlyAgg.set(monthKey, emptyMonth());
    }
    const agg = monthlyAgg.get(monthKey)!;

    switch (category) {
      case 'deposit':
        agg.deposits += volume;
        depositsFound.push({ deposit_date: dateStr, amount: volume, notes: 'Importado del extracto' });
        break;
      case 'interest_income':
        agg.interest_income += volume;
        break;
      case 'capital_received':
        agg.capital_received += volume;
        break;
      case 'buyback_principal':
        agg.buyback_principal += volume;
        break;
      case 'buyback_interest':
        agg.buyback_interest += volume;
        break;
      case 'investment':
        agg.investments += Math.abs(volume);
        break;
      case 'secondary_market':
        agg.secondary_market += Math.abs(volume);
        break;
      case 'late_interest':
        agg.late_interest += volume;
        break;
      case 'commissions':
        agg.commissions += Math.abs(volume);
        break;
      case 'taxes_withheld':
        agg.taxes_withheld += Math.abs(volume);
        break;
    }
  }

  // ── Compute total deposited per month (cumulative) ────────────────────────
  const sortedMonths = [...monthlyAgg.keys()].sort();
  let cumDeposited = 0;

  const snapshotRows = sortedMonths.map((key) => {
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const agg = monthlyAgg.get(key)!;
    cumDeposited += agg.deposits;

    const netInterest =
      agg.interest_income + agg.buyback_interest + agg.late_interest -
      agg.commissions - agg.taxes_withheld;

    return {
      year,
      month,
      total_value: null as number | null,         // updated by user via manual snapshot
      total_deposited: parseFloat(cumDeposited.toFixed(4)),
      deposits: parseFloat(agg.deposits.toFixed(4)),
      interest_income: parseFloat(agg.interest_income.toFixed(4)),
      capital_received: parseFloat(agg.capital_received.toFixed(4)),
      buyback_principal: parseFloat(agg.buyback_principal.toFixed(4)),
      buyback_interest: parseFloat(agg.buyback_interest.toFixed(4)),
      investments: parseFloat(agg.investments.toFixed(4)),
      secondary_market: parseFloat(agg.secondary_market.toFixed(4)),
      late_interest: parseFloat(agg.late_interest.toFixed(4)),
      commissions: parseFloat(agg.commissions.toFixed(4)),
      taxes_withheld: parseFloat(agg.taxes_withheld.toFixed(4)),
      _net_interest: parseFloat(netInterest.toFixed(4)),
    };
  });

  // Recompute total_value as cumulative deposits + cumulative net interest
  let cumNetInterest = 0;
  for (const s of snapshotRows) {
    cumNetInterest += s._net_interest;
    s.total_value = parseFloat((s.total_deposited + cumNetInterest).toFixed(2));
  }

  // ── Persist to Supabase ───────────────────────────────────────────────────
  if (snapshotRows.length > 0) {
    const upsertRows = snapshotRows.map(({ _net_interest: _, ...rest }) => ({
      user_id: user.id,
      ...rest,
      updated_at: new Date().toISOString(),
    }));

    const { error: snapshotError } = await supabase
      .from('mintos_monthly_snapshots')
      .upsert(upsertRows, { onConflict: 'user_id,year,month' });

    if (snapshotError) {
      return Response.json({ error: `Error guardando snapshots: ${snapshotError.message}` }, { status: 500 });
    }
  }

  // ── Upsert new deposits ───────────────────────────────────────────────────
  if (depositsFound.length > 0) {
    const { data: existingDeposits } = await supabase
      .from('mintos_deposits')
      .select('deposit_date, amount')
      .eq('user_id', user.id);

    const existingKeys = new Set(
      ((existingDeposits ?? []) as Array<{ deposit_date: string; amount: number }>).map(
        (d) => `${d.deposit_date}_${d.amount}`
      )
    );

    const newDeposits = depositsFound.filter(
      (d) => !existingKeys.has(`${d.deposit_date}_${d.amount}`)
    );

    if (newDeposits.length > 0) {
      await supabase
        .from('mintos_deposits')
        .insert(newDeposits.map((d) => ({ user_id: user.id, ...d })));
    }
  }

  // ── Update overview net_gain from computed data ───────────────────────────
  const totalNetInterest = snapshotRows.reduce((s, r) => s + r._net_interest! || 0, 0);
  if (totalNetInterest > 0) {
    await supabase
      .from('mintos_overview')
      .update({
        net_gain: parseFloat(totalNetInterest.toFixed(4)),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
  }

  revalidatePath('/patrimonio');

  const result: MintosImportResult = {
    totalRows: rows.length - 1,
    monthsProcessed: sortedMonths,
    depositsFound: depositsFound.length,
    summary: typeSummary,
  };

  return Response.json({ success: true, result });
}
