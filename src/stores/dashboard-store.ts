// ══════════════════════════════════════
// Arkhos — Dashboard Store (Zustand)
// Dashboard no tenía store: `(dashboard)/page.tsx` pasaba props directas a
// `DashboardView`. Con la megacarga única al login, el agregador
// (`getAppData`) resuelve `DashboardData` server-side y `hydrateAllStores`
// lo vuelca aquí — `DashboardView` pasará a leer de este store (Fase 3/4).
// ══════════════════════════════════════

import { create } from 'zustand';
import type { DashboardData } from '@/lib/supabase/dashboard';

interface DashboardStore {
  data: DashboardData | null;
  error: string | null;
  setData: (data: DashboardData) => void;
  setError: (error: string) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  data: null,
  error: null,
  setData: (data) => set({ data, error: null }),
  setError: (error) => set({ error }),
}));
