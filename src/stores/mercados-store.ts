import { create } from 'zustand';
import type { PulseData } from '@/lib/mercados/pulse';
import type { MacroData } from '@/lib/mercados/macro';
import type { AssetsData } from '@/lib/mercados/assets';
import type { PortfolioMarketData } from '@/lib/mercados/portfolio-market';
import type { MarketAlert } from '@/lib/mercados/alerts';

export type MercadosTab = 'pulse' | 'macro' | 'assets' | 'portfolio';

interface MercadosStore {
  activeTab: MercadosTab;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  pulseData: PulseData | null;
  macroData: MacroData | null;
  assetsData: AssetsData | null;
  portfolioData: PortfolioMarketData | null;
  alerts: MarketAlert[];
  unreadAlertsCount: number;

  setActiveTab: (tab: MercadosTab) => void;
  setIsRefreshing: (v: boolean) => void;
  setLastUpdated: (date: Date) => void;
  setPulseData: (data: PulseData) => void;
  setMacroData: (data: MacroData) => void;
  setAssetsData: (data: AssetsData) => void;
  setPortfolioData: (data: PortfolioMarketData) => void;
  setAlerts: (alerts: MarketAlert[]) => void;
  setUnreadAlertsCount: (count: number) => void;
  markAllAlertsRead: () => void;
}

export const useMercadosStore = create<MercadosStore>((set) => ({
  activeTab: 'pulse',
  isRefreshing: false,
  lastUpdated: null,
  pulseData: null,
  macroData: null,
  assetsData: null,
  portfolioData: null,
  alerts: [],
  unreadAlertsCount: 0,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setIsRefreshing: (v) => set({ isRefreshing: v }),
  setLastUpdated: (date) => set({ lastUpdated: date }),
  setPulseData: (data) => set({ pulseData: data }),
  setMacroData: (data) => set({ macroData: data }),
  setAssetsData: (data) => set({ assetsData: data }),
  setPortfolioData: (data) => set({ portfolioData: data }),
  setAlerts: (alerts) => set({ alerts }),
  setUnreadAlertsCount: (count) => set({ unreadAlertsCount: count }),
  markAllAlertsRead: () => set({ unreadAlertsCount: 0 }),
}));
