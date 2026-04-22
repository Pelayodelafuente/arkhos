import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { parseMintosRows } from '@/lib/mintos/parse-excel';
import type { MintosImportResult } from '@/types/mintos';

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

  // Use shared parser
  const parsed = parseMintosRows(rows);

  if (!parsed.isValidFormat) {
    return Response.json({ error: parsed.formatError ?? 'Formato no reconocido' }, { status: 400 });
  }

  if (parsed.months.length === 0) {
    return Response.json({ error: 'El extracto no tiene transacciones reconocidas' }, { status: 400 });
  }

  // ── Persist monthly snapshots ─────────────────────────────────────────────
  const snapshotRows = parsed.monthlyBreakdown.map((m) => {
    const netInterestCumulative = parsed.monthlyBreakdown
      .filter((x) => x.month <= m.month)
      .reduce((s, x) => s + x.net_interest, 0);

    return {
      user_id: user.id,
      year: parseInt(m.month.slice(0, 4), 10),
      month: parseInt(m.month.slice(5, 7), 10),
      total_value: parseFloat((m.total_deposited_cumulative + netInterestCumulative).toFixed(2)),
      total_deposited: m.total_deposited_cumulative,
      deposits: parseFloat(m.deposits.toFixed(4)),
      interest_income: parseFloat(m.interest_income.toFixed(4)),
      capital_received: parseFloat(m.capital_received.toFixed(4)),
      buyback_principal: parseFloat(m.buyback_principal.toFixed(4)),
      buyback_interest: parseFloat(m.buyback_interest.toFixed(4)),
      investments: parseFloat(m.investments.toFixed(4)),
      secondary_market: parseFloat(m.secondary_market.toFixed(4)),
      late_interest: parseFloat(m.late_interest.toFixed(4)),
      commissions: parseFloat(m.commissions.toFixed(4)),
      taxes_withheld: parseFloat(m.taxes_withheld.toFixed(4)),
      updated_at: new Date().toISOString(),
    };
  });

  const { error: snapshotError } = await supabase
    .from('mintos_monthly_snapshots')
    .upsert(snapshotRows, { onConflict: 'user_id,year,month' });

  if (snapshotError) {
    return Response.json({ error: `Error guardando snapshots: ${snapshotError.message}` }, { status: 500 });
  }

  // ── Persist new deposits (deduplicated) ───────────────────────────────────
  if (parsed.deposits.length > 0) {
    const { data: existing } = await supabase
      .from('mintos_deposits')
      .select('deposit_date, amount')
      .eq('user_id', user.id);

    const existingKeys = new Set(
      ((existing ?? []) as Array<{ deposit_date: string; amount: number }>).map(
        (d) => `${d.deposit_date}_${d.amount}`
      )
    );

    const newDeposits = parsed.deposits.filter(
      (d) => !existingKeys.has(`${d.date}_${d.amount}`)
    );

    if (newDeposits.length > 0) {
      await supabase
        .from('mintos_deposits')
        .insert(newDeposits.map((d) => ({ user_id: user.id, deposit_date: d.date, amount: d.amount })));
    }
  }

  // ── Update overview net_gain ──────────────────────────────────────────────
  if (parsed.totalNetInterest > 0) {
    await supabase
      .from('mintos_overview')
      .update({
        net_gain: parseFloat(parsed.totalNetInterest.toFixed(4)),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
  }

  revalidatePath('/patrimonio');

  const result: MintosImportResult = {
    totalRows: parsed.totalRows,
    monthsProcessed: parsed.months,
    depositsFound: parsed.deposits.length,
    summary: parsed.typeSummary,
  };

  return Response.json({ success: true, result });
}
