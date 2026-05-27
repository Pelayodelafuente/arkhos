// Pure parsing logic for Mintos account statement Excel files.
// Used client-side (preview) and server-side (API route import).
// No side effects, no DB calls.

export const MINTOS_TYPE_MAP: Record<string, string> = {
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
  'Bonificación': 'interest_income',
  'Comisiones de mora recibidas': 'late_interest',
};

export const EXPECTED_HEADERS = [
  'Fecha',
  'Identificación de la operación:',
  'Detalles',
  'Volumen de negocios',
  'Saldo',
  'Divisa',
  'Tipo de pago',
];

export interface MonthlyBreakdown {
  month: string;   // 'YYYY-MM'
  label: string;   // 'Ene 2026'
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
  net_interest: number;
  total_deposited_cumulative: number; // filled post-aggregation
}

export interface DepositEntry {
  date: string;   // 'YYYY-MM-DD'
  amount: number;
}

export interface MintosParseResult {
  isValidFormat: boolean;
  formatError?: string;
  totalRows: number;
  periodStart: string;  // 'YYYY-MM'
  periodEnd: string;    // 'YYYY-MM'
  months: string[];
  deposits: DepositEntry[];
  totalDeposited: number;
  monthlyBreakdown: MonthlyBreakdown[];
  totalNetInterest: number;
  typeSummary: Record<string, number>;
  unknownTypes: string[];
}

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return `${MONTHS_SHORT[parseInt(m, 10) - 1]} ${y}`;
}

function emptyMonth(): Omit<MonthlyBreakdown, 'month' | 'label' | 'net_interest' | 'total_deposited_cumulative'> {
  return {
    deposits: 0, interest_income: 0, capital_received: 0,
    buyback_principal: 0, buyback_interest: 0, investments: 0,
    secondary_market: 0, late_interest: 0, commissions: 0, taxes_withheld: 0,
  };
}

export function parseMintosRows(rows: unknown[][]): MintosParseResult {
  if (rows.length < 2) {
    return {
      isValidFormat: false, formatError: 'El archivo está vacío o no tiene transacciones.',
      totalRows: 0, periodStart: '', periodEnd: '', months: [],
      deposits: [], totalDeposited: 0, monthlyBreakdown: [],
      totalNetInterest: 0, typeSummary: {}, unknownTypes: [],
    };
  }

  // Validate headers
  const headers = rows[0] as string[];
  const isValidFormat = EXPECTED_HEADERS.every((h, i) =>
    String(headers[i] ?? '').trim().startsWith(h.slice(0, 10))
  );
  if (!isValidFormat) {
    return {
      isValidFormat: false,
      formatError: 'Cabeceras no reconocidas. Asegúrate de exportar el "Extracto de cuenta" de Mintos.',
      totalRows: rows.length - 1, periodStart: '', periodEnd: '', months: [],
      deposits: [], totalDeposited: 0, monthlyBreakdown: [],
      totalNetInterest: 0, typeSummary: {}, unknownTypes: [],
    };
  }

  const monthlyAgg = new Map<string, ReturnType<typeof emptyMonth>>();
  const depositsMap = new Map<string, number>(); // 'YYYY-MM-DD_amount' → amount
  const deposits: DepositEntry[] = [];
  const typeSummary: Record<string, number> = {};
  const unknownTypeSet = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const rawDate = row[0];
    const rawVolume = row[3];
    const tipoPago = String(row[6] ?? '').trim();
    if (!rawDate || rawVolume === '' || rawVolume === undefined) continue;

    let dateStr: string;
    if (rawDate instanceof Date) {
      dateStr = rawDate.toISOString().slice(0, 10);
    } else {
      dateStr = String(rawDate).slice(0, 10);
    }

    const monthKey = dateStr.slice(0, 7);
    const volume = typeof rawVolume === 'number' ? rawVolume : parseFloat(String(rawVolume));
    if (!isFinite(volume)) continue;

    const category = MINTOS_TYPE_MAP[tipoPago];
    if (!category) {
      if (tipoPago) unknownTypeSet.add(tipoPago);
      continue;
    }

    typeSummary[tipoPago] = (typeSummary[tipoPago] ?? 0) + 1;

    if (!monthlyAgg.has(monthKey)) monthlyAgg.set(monthKey, emptyMonth());
    const agg = monthlyAgg.get(monthKey)!;

    switch (category) {
      case 'deposit':
        agg.deposits += volume;
        // deduplicate by date+amount
        const depKey = `${dateStr}_${volume.toFixed(4)}`;
        if (!depositsMap.has(depKey)) {
          depositsMap.set(depKey, volume);
          deposits.push({ date: dateStr, amount: volume });
        }
        break;
      case 'interest_income':   agg.interest_income  += volume; break;
      case 'capital_received':  agg.capital_received += volume; break;
      case 'buyback_principal': agg.buyback_principal += volume; break;
      case 'buyback_interest':  agg.buyback_interest += volume; break;
      case 'investment':        agg.investments      += Math.abs(volume); break;
      case 'secondary_market':  agg.secondary_market += Math.abs(volume); break;
      case 'late_interest':     agg.late_interest    += volume; break;
      case 'commissions':       agg.commissions      += Math.abs(volume); break;
      case 'taxes_withheld':    agg.taxes_withheld   += Math.abs(volume); break;
    }
  }

  const sortedMonths = [...monthlyAgg.keys()].sort();
  let cumDeposited = 0;
  let totalNetInterest = 0;

  const monthlyBreakdown: MonthlyBreakdown[] = sortedMonths.map((key) => {
    const agg = monthlyAgg.get(key)!;
    cumDeposited += agg.deposits;
    const netInterest = parseFloat(
      (agg.interest_income + agg.buyback_interest + agg.late_interest - agg.commissions - agg.taxes_withheld).toFixed(4)
    );
    totalNetInterest += netInterest;
    return {
      month: key,
      label: monthLabel(key),
      ...agg,
      net_interest: netInterest,
      total_deposited_cumulative: parseFloat(cumDeposited.toFixed(2)),
    };
  });

  deposits.sort((a, b) => a.date.localeCompare(b.date));

  return {
    isValidFormat: true,
    totalRows: rows.length - 1,
    periodStart: sortedMonths[0] ?? '',
    periodEnd: sortedMonths[sortedMonths.length - 1] ?? '',
    months: sortedMonths,
    deposits,
    totalDeposited: parseFloat(deposits.reduce((s, d) => s + d.amount, 0).toFixed(2)),
    monthlyBreakdown,
    totalNetInterest: parseFloat(totalNetInterest.toFixed(4)),
    typeSummary,
    unknownTypes: [...unknownTypeSet],
  };
}
