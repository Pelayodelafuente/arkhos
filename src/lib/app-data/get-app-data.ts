// ══════════════════════════════════════
// Arkhos — Agregador central de datos (megacarga única al login)
// Junta los 6 módulos (Dashboard, Proyectos, Gastos, Notas, Patrimonio,
// Mercados) en una sola llamada server-side. Cronos (Agenda) y Settings
// quedan fuera — siguen cargando como hoy (decisión explícita de Pelayo).
//
// Cada módulo se resuelve vía Promise.allSettled a nivel top: si un módulo
// falla (p.ej. una API externa lenta de Mercados) no tumba a los demás —
// degrada a `{ error: string }` en vez de propagar la excepción.
// ══════════════════════════════════════

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

import { getDashboardData, type DashboardData } from '@/lib/supabase/dashboard'
import { getProjects } from '@/lib/supabase/projects'
import type { ProjectListItem } from '@/types/projects'
import {
  getSubscriptions,
  getExpenseCategories,
  getUserGastosSettings,
  getPayments,
  getMonthlySpending,
} from '@/lib/supabase/expenses'
import type { ExpensesSnapshot } from '@/types/expenses'
import { getNotasInitialData } from '@/lib/supabase/notes'
import type { Note, NoteCanvas } from '@/types/notes'

import {
  hasPlatforms,
  getPortfolioOverview,
  getAllAssets,
  getAllTransactions,
  getSavingsPlan,
  getSnapshots,
  getDailyGlobalSnapshots,
  getPassiveIncome,
  getPlatforms,
} from '@/lib/supabase/patrimonio'
import {
  getIndexaOverview,
  getIndexaMonthlyReturns,
  getIndexaTransactions,
  getIndexaMonthlyPlan,
} from '@/lib/supabase/indexa'
import { getHorosPosition } from '@/lib/supabase/horos'
import { getCryptoAssets } from '@/lib/supabase/crypto'
import { getMintosOverview } from '@/lib/supabase/mintos'
import type {
  PortfolioOverview,
  PortfolioAsset,
  PortfolioTransaction,
  SavingsPlanItem,
  PortfolioSnapshot,
  PassiveIncome,
  InvestmentPlatform,
} from '@/types/patrimonio'
import type {
  IndexaOverview,
  IndexaMonthlyReturn,
  IndexaTransaction,
  IndexaMonthlyPlan,
} from '@/types/indexa'
import type { HorosPosition } from '@/types/horos'
import type { CryptoAsset } from '@/types/crypto'
import type { MintosOverview, MintosFullData } from '@/types/mintos'

// Las 4 cargas "completas" que hoy dispara PatrimonioView en un segundo
// useEffect (transacciones, nav history, distribución, planes...). Son
// Server Actions sin parámetros — hacen su propio getAuthUser() interno.
import { loadIndexaData, type IndexaFullData } from '@/app/actions/indexa'
import { loadHorosData, type HorosFullData } from '@/app/actions/horos'
import { loadCryptoData, type CryptoFullData } from '@/app/actions/crypto'
import { loadMintosData } from '@/app/actions/mintos'

import { fetchPulseData, type PulseData } from '@/lib/mercados/pulse'
import { fetchMacroData, type MacroData } from '@/lib/mercados/macro'
import { fetchAssetsData, type AssetsData } from '@/lib/mercados/assets'
import { fetchPortfolioMarketData, type PortfolioMarketData } from '@/lib/mercados/portfolio-market'
import { getUserAlerts, type MarketAlert } from '@/lib/mercados/alerts'

type Client = SupabaseClient<Database>

// ─── Resultado con degradación a error ──────────────────────────────────────

export interface ModuleError {
  error: string
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message
  return 'Error desconocido al cargar datos'
}

// ─── Patrimonio ──────────────────────────────────────────────────────────────

export interface PatrimonioOnboardingData {
  onboarding: true
}

export interface PatrimonioLoadedData {
  onboarding: false
  overview: PortfolioOverview
  assets: PortfolioAsset[]
  transactions: PortfolioTransaction[]
  savingsPlan: SavingsPlanItem[]
  snapshots: PortfolioSnapshot[]
  dailySnapshots: PortfolioSnapshot[]
  passiveIncome: PassiveIncome[]
  platforms: InvestmentPlatform[]
  indexaOverview: IndexaOverview | null
  indexaMonthlyReturns: IndexaMonthlyReturn[]
  indexaTransactions: IndexaTransaction[]
  indexaPlan: IndexaMonthlyPlan | null
  horosPosition: HorosPosition | null
  cryptoAssets: CryptoAsset[]
  mintosOverview: MintosOverview | null
  // Datos "completos" (transacciones, históricos, distribución, planes) que
  // hoy carga PatrimonioView en un segundo useEffect — precargados aquí para
  // que la navegación a Patrimonio no se sienta "a medias".
  indexaFull: IndexaFullData | null
  horosFull: HorosFullData | null
  cryptoFull: CryptoFullData | null
  mintosFull: MintosFullData | null
}

export type PatrimonioAppData = PatrimonioOnboardingData | PatrimonioLoadedData

async function loadPatrimonio(userId: string): Promise<PatrimonioAppData> {
  const hasData = await hasPlatforms(userId)
  if (!hasData) return { onboarding: true }

  const [
    overview,
    assets,
    transactions,
    savingsPlan,
    snapshots,
    dailySnapshots,
    passiveIncome,
    platforms,
    indexaOverview,
    indexaMonthlyReturns,
    indexaTransactions,
    indexaPlan,
    horosPosition,
    cryptoAssets,
    mintosOverview,
    indexaFull,
    horosFull,
    cryptoFull,
    mintosFull,
  ] = await Promise.all([
    getPortfolioOverview(userId),
    getAllAssets(userId),
    getAllTransactions(userId, 500),
    getSavingsPlan(userId),
    getSnapshots(userId),
    getDailyGlobalSnapshots(userId),
    getPassiveIncome(userId),
    getPlatforms(userId),
    getIndexaOverview(userId).catch(() => null as IndexaOverview | null),
    getIndexaMonthlyReturns(userId).catch(() => [] as IndexaMonthlyReturn[]),
    getIndexaTransactions(userId).catch(() => [] as IndexaTransaction[]),
    getIndexaMonthlyPlan(userId).catch(() => null as IndexaMonthlyPlan | null),
    getHorosPosition(userId).catch(() => null as HorosPosition | null),
    getCryptoAssets(userId).catch(() => [] as CryptoAsset[]),
    getMintosOverview(userId).catch(() => null as MintosOverview | null),
    loadIndexaData().catch(() => null as IndexaFullData | null),
    loadHorosData().catch(() => null as HorosFullData | null),
    loadCryptoData().catch(() => null as CryptoFullData | null),
    loadMintosData().catch(() => null as MintosFullData | null),
  ])

  if (!overview) return { onboarding: true }

  return {
    onboarding: false,
    overview,
    assets,
    transactions,
    savingsPlan,
    snapshots,
    dailySnapshots,
    passiveIncome,
    platforms,
    indexaOverview,
    indexaMonthlyReturns,
    indexaTransactions,
    indexaPlan,
    horosPosition,
    cryptoAssets,
    mintosOverview,
    indexaFull,
    horosFull,
    cryptoFull,
    mintosFull,
  }
}

// ─── Mercados ────────────────────────────────────────────────────────────────

export interface MercadosAppData {
  pulse: PulseData | ModuleError
  macro: MacroData | ModuleError
  assets: AssetsData | ModuleError
  portfolio: PortfolioMarketData | ModuleError
  alerts: MarketAlert[] | ModuleError
}

async function loadMercados(userId: string): Promise<MercadosAppData> {
  // Promise.allSettled INTERNO: un fallo de FRED/Yahoo/CoinGecko en
  // macro/assets no debe bloquear pulse/portfolio/alerts.
  const [pulseResult, macroResult, assetsResult, portfolioResult, alertsResult] =
    await Promise.allSettled([
      fetchPulseData(false),
      fetchMacroData(false),
      fetchAssetsData(false),
      fetchPortfolioMarketData(userId, false),
      getUserAlerts(userId),
    ])

  return {
    pulse: pulseResult.status === 'fulfilled' ? pulseResult.value : { error: errorMessage(pulseResult.reason) },
    macro: macroResult.status === 'fulfilled' ? macroResult.value : { error: errorMessage(macroResult.reason) },
    assets: assetsResult.status === 'fulfilled' ? assetsResult.value : { error: errorMessage(assetsResult.reason) },
    portfolio:
      portfolioResult.status === 'fulfilled'
        ? portfolioResult.value
        : { error: errorMessage(portfolioResult.reason) },
    alerts: alertsResult.status === 'fulfilled' ? alertsResult.value : { error: errorMessage(alertsResult.reason) },
  }
}

// ─── Resto de módulos (wrappers con try/catch → degradan a ModuleError) ──────

async function loadDashboard(supabase: Client, userId: string): Promise<DashboardData | ModuleError> {
  try {
    return await getDashboardData(supabase, userId)
  } catch (e) {
    return { error: errorMessage(e) }
  }
}

async function loadProyectos(supabase: Client, userId: string): Promise<ProjectListItem[] | ModuleError> {
  try {
    return await getProjects(supabase, userId)
  } catch (e) {
    return { error: errorMessage(e) }
  }
}

async function loadGastos(supabase: Client, userId: string): Promise<ExpensesSnapshot | ModuleError> {
  try {
    const [subscriptions, categories, settings, payments, monthlySpending] = await Promise.all([
      getSubscriptions(userId, supabase),
      getExpenseCategories(userId, supabase),
      getUserGastosSettings(userId, supabase),
      getPayments(userId, undefined, undefined, supabase),
      getMonthlySpending(userId, 6, supabase),
    ])
    return { subscriptions, categories, settings, payments, monthlySpending }
  } catch (e) {
    return { error: errorMessage(e) }
  }
}

async function loadNotas(
  supabase: Client,
  userId: string
): Promise<{ notes: Note[]; canvas: NoteCanvas } | ModuleError> {
  try {
    return await getNotasInitialData(supabase, userId)
  } catch (e) {
    return { error: errorMessage(e) }
  }
}

// ─── AppData ─────────────────────────────────────────────────────────────────

export interface AppData {
  dashboard: DashboardData | ModuleError
  proyectos: ProjectListItem[] | ModuleError
  gastos: ExpensesSnapshot | ModuleError
  notas: { notes: Note[]; canvas: NoteCanvas } | ModuleError
  patrimonio: PatrimonioAppData | ModuleError
  mercados: MercadosAppData | ModuleError
}

function unwrap<T, E>(result: PromiseSettledResult<T>, fallback: (reason: unknown) => E): T | E {
  return result.status === 'fulfilled' ? result.value : fallback(result.reason)
}

/**
 * Agregador central: junta los 6 módulos vía `Promise.allSettled` a nivel
 * top (no `Promise.all`) para que un módulo que falle no tumbe a los demás.
 */
export async function getAppData(supabase: Client, userId: string): Promise<AppData> {
  const [dashboardResult, proyectosResult, gastosResult, notasResult, patrimonioResult, mercadosResult] =
    await Promise.allSettled([
      loadDashboard(supabase, userId),
      loadProyectos(supabase, userId),
      loadGastos(supabase, userId),
      loadNotas(supabase, userId),
      loadPatrimonio(userId),
      loadMercados(userId),
    ])

  return {
    dashboard: unwrap(dashboardResult, (reason) => ({ error: errorMessage(reason) })),
    proyectos: unwrap(proyectosResult, (reason) => ({ error: errorMessage(reason) })),
    gastos: unwrap(gastosResult, (reason) => ({ error: errorMessage(reason) })),
    notas: unwrap(notasResult, (reason) => ({ error: errorMessage(reason) })),
    patrimonio: unwrap(patrimonioResult, (reason) => ({ error: errorMessage(reason) })),
    mercados: unwrap(mercadosResult, (reason) => ({ error: errorMessage(reason) })),
  }
}
