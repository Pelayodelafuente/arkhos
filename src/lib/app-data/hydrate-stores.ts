// ══════════════════════════════════════
// Arkhos — Hidratación de stores tras la megacarga única al login
// Dado el resultado de `loadAppData()`, vuelca cada módulo en su store de
// Zustand vía `.getState()` (sin hooks — esto corre dentro de un efecto, no
// del cuerpo de un componente). Si un módulo vino degradado a `{ error }`,
// no se sobreescribe el store con basura: se deja como está (null/vacío) y
// la UI decide cómo mostrar el estado de error.
// ══════════════════════════════════════

import type { AppData, ModuleError } from '@/lib/app-data/get-app-data'
import { useDashboardStore } from '@/stores/dashboard-store'
import { useMercadosStore } from '@/stores/mercados-store'
import { usePatrimonioStore } from '@/stores/patrimonio-store'
import { useIndexaStore } from '@/stores/indexa-store'
import { useHorosStore } from '@/stores/horos-store'
import { useCryptoStore } from '@/stores/crypto-store'
import { useMintosStore } from '@/stores/mintos-store'
import { useProjectsStore } from '@/stores/projects-store'
import { useExpensesStore } from '@/stores/expenses-store'
import { useNotesStore } from '@/stores/notes-store'

function isModuleError<T>(value: T | ModuleError): value is ModuleError {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'error' in value &&
    typeof (value as ModuleError).error === 'string'
  )
}

/**
 * Vuelca el resultado de `loadAppData()` en todos los stores de los 6
 * módulos cubiertos por la megacarga (Dashboard, Proyectos, Gastos, Notas,
 * Patrimonio, Mercados). Cronos (Agenda) y Settings quedan fuera.
 */
export function hydrateAllStores(data: AppData): void {
  // ─── Dashboard ──────────────────────────────────────────────────────────
  if (isModuleError(data.dashboard)) {
    useDashboardStore.getState().setError(data.dashboard.error)
  } else {
    useDashboardStore.getState().setData(data.dashboard)
  }

  // ─── Proyectos ──────────────────────────────────────────────────────────
  if (!isModuleError(data.proyectos)) {
    useProjectsStore.getState().hydrateProjects(data.proyectos)
  }

  // ─── Gastos ─────────────────────────────────────────────────────────────
  if (!isModuleError(data.gastos)) {
    useExpensesStore.getState().hydrate(data.gastos)
  }

  // ─── Notas ──────────────────────────────────────────────────────────────
  if (!isModuleError(data.notas)) {
    useNotesStore.getState().setNotes(data.notas.notes)
    useNotesStore.getState().setCanvas(data.notas.canvas)
  }

  // ─── Patrimonio (+ Indexa/Horos/Crypto/Mintos) ─────────────────────────
  if (isModuleError(data.patrimonio)) {
    usePatrimonioStore.getState().setError(data.patrimonio.error)
  } else if (data.patrimonio.onboarding) {
    usePatrimonioStore.getState().setOnboarding(true)
  } else {
    const p = data.patrimonio

    const patrimonioStore = usePatrimonioStore.getState()
    patrimonioStore.setOnboarding(false)
    patrimonioStore.setOverview(p.overview)
    patrimonioStore.setAssets(p.assets)
    patrimonioStore.setTransactions(p.transactions)
    patrimonioStore.setSavingsPlan(p.savingsPlan)
    patrimonioStore.setSnapshots(p.snapshots)
    patrimonioStore.setDailySnapshots(p.dailySnapshots)
    patrimonioStore.setPassiveIncome(p.passiveIncome)
    patrimonioStore.setPlatforms(p.platforms)

    const indexaStore = useIndexaStore.getState()
    const indexaOverview = p.indexaOverview ?? p.indexaFull?.overview ?? null
    if (indexaOverview) indexaStore.setOverview(indexaOverview)
    indexaStore.setMonthlyReturns(p.indexaMonthlyReturns)
    indexaStore.setTransactions(p.indexaTransactions)
    if (p.indexaPlan) indexaStore.setPlan(p.indexaPlan)
    if (p.indexaFull) {
      indexaStore.setFunds(p.indexaFull.funds)
      indexaStore.setPositions(p.indexaFull.positions)
    }

    const horosStore = useHorosStore.getState()
    horosStore.setPosition(p.horosPosition)
    if (p.horosFull) {
      horosStore.setTransactions(p.horosFull.transactions)
      horosStore.setNavHistory(p.horosFull.navHistory)
      horosStore.setDistribution(p.horosFull.distribution)
      horosStore.setCosts(p.horosFull.costs)
      if (p.horosFull.plan) horosStore.setPlan(p.horosFull.plan)
    }

    const cryptoStore = useCryptoStore.getState()
    cryptoStore.setAssets(p.cryptoAssets)
    if (p.cryptoFull) {
      cryptoStore.setTransactions(p.cryptoFull.transactions)
      cryptoStore.setDefiPositions(p.cryptoFull.defiPositions)
      cryptoStore.setMonthlyPlan(p.cryptoFull.monthlyPlan)
    }

    const mintosStore = useMintosStore.getState()
    mintosStore.setOverview(p.mintosOverview)
    if (p.mintosFull) {
      mintosStore.setDeposits(p.mintosFull.deposits)
      mintosStore.setMonthlySnapshots(p.mintosFull.monthlySnapshots)
      mintosStore.setPortfolioHealth(p.mintosFull.portfolioHealth)
      mintosStore.setDistributions(p.mintosFull.distributions)
      mintosStore.setPlan(p.mintosFull.plan)
    }
  }

  // ─── Mercados ───────────────────────────────────────────────────────────
  if (!isModuleError(data.mercados)) {
    const m = data.mercados
    const mercadosStore = useMercadosStore.getState()
    if (!isModuleError(m.pulse)) mercadosStore.setPulseData(m.pulse)
    if (!isModuleError(m.macro)) mercadosStore.setMacroData(m.macro)
    if (!isModuleError(m.assets)) mercadosStore.setAssetsData(m.assets)
    if (!isModuleError(m.portfolio)) mercadosStore.setPortfolioData(m.portfolio)
    if (!isModuleError(m.alerts)) {
      mercadosStore.setAlerts(m.alerts)
      mercadosStore.setUnreadAlertsCount(m.alerts.filter((a) => !a.is_read).length)
    }
  }
}
