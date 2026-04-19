'use client';

import { create } from 'zustand';
import type {
  CryptoAsset,
  CryptoTransaction,
  CryptoDefiPosition,
  CryptoMonthlyPlan,
  CryptoAssetWithPL,
  CryptoOverview,
  CryptoDCAPoint,
  CryptoTransactionWithAsset,
  CryptoMonthlyPlanWithAsset,
} from '@/types/crypto';

type ActiveTab = 'dashboard' | 'transactions' | 'defi' | 'plan' | 'costs';
type ActiveFilter = 'all' | 'BTC' | 'ETH' | 'USDC' | 'altcoins';

interface CryptoStore {
  // State
  assets: CryptoAsset[];
  transactions: CryptoTransaction[];
  defiPositions: CryptoDefiPosition[];
  monthlyPlan: CryptoMonthlyPlan[];
  isLoading: boolean;
  activeTab: ActiveTab;
  activeFilter: ActiveFilter;

  // Actions
  setAssets: (assets: CryptoAsset[]) => void;
  setTransactions: (transactions: CryptoTransaction[]) => void;
  setDefiPositions: (defiPositions: CryptoDefiPosition[]) => void;
  setMonthlyPlan: (monthlyPlan: CryptoMonthlyPlan[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setActiveFilter: (filter: ActiveFilter) => void;

  // Selectors
  getAssetsWithPL: () => CryptoAssetWithPL[];
  getOverview: () => CryptoOverview | null;
  getBTCDCAChart: () => CryptoDCAPoint[];
  getTransactionsWithAsset: () => CryptoTransactionWithAsset[];
  getAltcoins: () => CryptoAssetWithPL[];
  getMonthlyPlanWithAssets: () => CryptoMonthlyPlanWithAsset[];
  getTotalFees: () => number;
}

export const useCryptoStore = create<CryptoStore>((set, get) => ({
  // Initial state
  assets: [],
  transactions: [],
  defiPositions: [],
  monthlyPlan: [],
  isLoading: false,
  activeTab: 'dashboard',
  activeFilter: 'all',

  // Actions
  setAssets: (assets) => set({ assets }),
  setTransactions: (transactions) => set({ transactions }),
  setDefiPositions: (defiPositions) => set({ defiPositions }),
  setMonthlyPlan: (monthlyPlan) => set({ monthlyPlan }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),

  // Selectors
  getAssetsWithPL: () => {
    const assets = get().assets;
    if (assets.length === 0) return [];

    // First pass: calculate raw values
    const withValues = assets.map((asset) => {
      const price = asset.current_price_eur ?? asset.avg_buy_price_eur;
      const current_value_eur = asset.current_balance * price;
      const pl_eur = current_value_eur - asset.total_invested_eur;
      const pl_pct =
        asset.total_invested_eur > 0
          ? (pl_eur / asset.total_invested_eur) * 100
          : 0;
      return { asset, current_value_eur, pl_eur, pl_pct };
    });

    const totalValue = withValues.reduce((sum, { current_value_eur }) => sum + current_value_eur, 0);

    return withValues.map(({ asset, current_value_eur, pl_eur, pl_pct }) => ({
      ...asset,
      current_value_eur,
      pl_eur,
      pl_pct,
      weight_pct: totalValue > 0 ? (current_value_eur / totalValue) * 100 : 0,
    }));
  },

  getOverview: () => {
    const assetsWithPL = get().getAssetsWithPL();
    if (assetsWithPL.length === 0) return null;

    const total_value_eur = assetsWithPL.reduce((sum, a) => sum + a.current_value_eur, 0);
    const total_invested_eur = assetsWithPL.reduce((sum, a) => sum + a.total_invested_eur, 0);
    const pl_eur = total_value_eur - total_invested_eur;
    const pl_pct = total_invested_eur > 0 ? (pl_eur / total_invested_eur) * 100 : 0;

    const defiPositions = get().defiPositions;
    const usdcAsset = get().assets.find((a) => a.symbol === 'USDC');
    const usdcPrice = usdcAsset?.current_price_eur ?? 1;
    const aave_yield_eur =
      defiPositions.length > 0
        ? (defiPositions[0].yield_earned ?? 0) * usdcPrice
        : 0;

    const monthly_plan_eur = get().monthlyPlan.reduce(
      (sum, p) => sum + p.monthly_amount_eur,
      0
    );

    return {
      total_value_eur,
      total_invested_eur,
      pl_eur,
      pl_pct,
      aave_yield_eur,
      monthly_plan_eur,
    };
  },

  getBTCDCAChart: () => {
    const assets = get().assets;
    const transactions = get().transactions;

    const btcAsset = assets.find((a) => a.symbol === 'BTC');
    if (!btcAsset) return [];

    const btcCurrentPrice = btcAsset.current_price_eur ?? btcAsset.avg_buy_price_eur;

    return transactions
      .filter((tx) => tx.asset_id === btcAsset.id && tx.type === 'buy')
      .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))
      .map((tx): CryptoDCAPoint => ({
        date: tx.transaction_date,
        label: new Date(tx.transaction_date).toLocaleDateString('es-ES', {
          month: 'short',
          year: '2-digit',
        }),
        price_eur: tx.price_eur ?? 0,
        amount_eur: tx.amount_eur ?? 0,
        quantity: tx.quantity ?? 0,
        is_above_current: (tx.price_eur ?? 0) < btcCurrentPrice,
      }));
  },

  getTransactionsWithAsset: () => {
    const assets = get().assets;
    const transactions = get().transactions;

    const assetMap = new Map<string, CryptoAsset>(
      assets.map((a) => [a.id, a])
    );

    return transactions.map((tx): CryptoTransactionWithAsset => {
      const asset = tx.asset_id != null ? (assetMap.get(tx.asset_id) ?? null) : null;
      const currentPrice = asset
        ? (asset.current_price_eur ?? asset.avg_buy_price_eur)
        : null;

      const current_value_eur =
        currentPrice != null && tx.quantity != null
          ? tx.quantity * currentPrice
          : null;

      const cost_basis =
        tx.quantity != null && tx.price_eur != null
          ? tx.quantity * tx.price_eur
          : null;

      const pl_since_buy_eur =
        current_value_eur != null && cost_basis != null
          ? current_value_eur - cost_basis
          : null;

      const pl_since_buy_pct =
        pl_since_buy_eur != null && cost_basis != null && cost_basis > 0
          ? (pl_since_buy_eur / cost_basis) * 100
          : null;

      return {
        ...tx,
        asset,
        current_value_eur,
        pl_since_buy_eur,
        pl_since_buy_pct,
      };
    });
  },

  getAltcoins: () => {
    const CORE_SYMBOLS = new Set(['BTC', 'ETH', 'USDC']);
    return get().getAssetsWithPL().filter((a) => !CORE_SYMBOLS.has(a.symbol));
  },

  getMonthlyPlanWithAssets: () => {
    const assets = get().assets;
    const assetMap = new Map<string, CryptoAsset>(assets.map((a) => [a.id, a]));

    return get().monthlyPlan.map((plan): CryptoMonthlyPlanWithAsset => ({
      ...plan,
      asset: plan.asset_id != null ? (assetMap.get(plan.asset_id) ?? null) : null,
    }));
  },

  getTotalFees: () =>
    get().transactions.reduce((sum, tx) => sum + (tx.fee_eur ?? 0), 0),
}));
