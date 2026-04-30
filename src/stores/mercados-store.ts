import { create } from 'zustand';

export type MercadosTab = 'pulse' | 'macro' | 'assets' | 'portfolio';

interface MercadosStore {
  activeTab: MercadosTab;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  pulseData: Record<string, unknown> | null;
  alerts: unknown[];
  unreadAlertsCount: number;

  setActiveTab: (tab: MercadosTab) => void;
  setIsRefreshing: (v: boolean) => void;
  setLastUpdated: (date: Date) => void;
  setPulseData: (data: Record<string, unknown>) => void;
  setAlerts: (alerts: unknown[]) => void;
  markAllAlertsRead: () => void;
}

export const useMercadosStore = create<MercadosStore>((set) => ({
  activeTab: 'pulse',
  isRefreshing: false,
  lastUpdated: null,
  pulseData: null,
  alerts: [],
  unreadAlertsCount: 0,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setIsRefreshing: (v) => set({ isRefreshing: v }),
  setLastUpdated: (date) => set({ lastUpdated: date }),
  setPulseData: (data) => set({ pulseData: data }),
  setAlerts: (alerts) => set({ alerts }),
  markAllAlertsRead: () => set({ unreadAlertsCount: 0 }),
}));
