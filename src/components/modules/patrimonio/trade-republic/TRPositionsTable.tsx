"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { PLBadge } from "@/components/modules/patrimonio/shared/PLBadge";
import { PriceProgressBar } from "@/components/modules/patrimonio/shared/PriceProgressBar";
import { CATEGORY_LABELS } from "@/types/patrimonio";
import type { PortfolioAsset, AssetCategory } from "@/types/patrimonio";
import { Input } from "@/components/ui";
import { AssetDetailDrawer } from "./AssetDetailDrawer";
import { AssetFormModal } from "./AssetFormModal";

const TODAY_MS = Date.now();

const formatEur = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

const formatQty = (value: number) => {
  if (value === Math.floor(value)) return value.toLocaleString("es-ES");
  return value.toLocaleString("es-ES", { maximumFractionDigits: 2 });
};

const formatQtyFull = (value: number) =>
  value.toLocaleString("es-ES", { maximumFractionDigits: 6 });

type FilterTab = "all" | "etf" | "stock" | "commodity" | "bond" | "cash";
type SortKey = "name" | "value" | "invested" | "pl_amount" | "pl_percentage";
type SortDir = "asc" | "desc";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "etf", label: "ETFs" },
  { key: "stock", label: "Acciones" },
  { key: "commodity", label: "Commodities" },
  { key: "bond", label: "Bonos" },
  { key: "cash", label: "Efectivo" },
];

function matchesFilter(asset: PortfolioAsset, filter: FilterTab): boolean {
  if (filter === "all") return true;
  if (filter === "etf") return asset.category.startsWith("etf");
  if (filter === "stock") return asset.category.startsWith("stock");
  if (filter === "commodity") return asset.category === "etf_commodity";
  if (filter === "bond") return asset.category === "etf_bond";
  if (filter === "cash") return asset.category === "cash";
  return true;
}

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}

function SortHeader({ label, sortKey, currentKey, currentDir, onSort, className = "" }: SortHeaderProps) {
  const isActive = currentKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground ${
        isActive ? "text-foreground" : "text-text-tertiary"
      } ${className}`}
      aria-label={`${label}${isActive ? `, ordenado ${currentDir === "asc" ? "ascendente" : "descendente"}` : ""}`}
    >
      {label}
      {isActive ? (
        currentDir === "asc" ? (
          <ArrowUp size={11} strokeWidth={2} aria-hidden="true" />
        ) : (
          <ArrowDown size={11} strokeWidth={2} aria-hidden="true" />
        )
      ) : (
        <ArrowUpDown size={11} strokeWidth={1.75} className="opacity-30" aria-hidden="true" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// PriceCell — shows price with day-change badge and flash animation
// ---------------------------------------------------------------------------

interface PriceCellProps {
  asset: PortfolioAsset;
  changePercent: number | null | undefined;
}

function PriceCell({ asset, changePercent }: PriceCellProps) {
  const prevPrice = useRef<number | undefined>(asset.current_price_eur);
  const [flashClass, setFlashClass] = useState("");

  useEffect(() => {
    const prev = prevPrice.current;
    const curr = asset.current_price_eur;
    prevPrice.current = curr;
    if (prev == null || curr == null || prev === curr) return;
    const cls = curr > prev ? "price-flash-up" : "price-flash-down";
    const flashTimer = setTimeout(() => setFlashClass(cls), 0);
    const clearTimer = setTimeout(() => setFlashClass(""), 400);
    return () => {
      clearTimeout(flashTimer);
      clearTimeout(clearTimer);
    };
  }, [asset.current_price_eur]);

  if (asset.current_price_eur == null) {
    return <span className="font-mono text-xs text-text-tertiary">—</span>;
  }

  const isUp = (changePercent ?? 0) >= 0;
  const changeBadgeColor = (changePercent ?? 0) === 0
    ? "var(--text-tertiary)"
    : isUp
    ? "var(--module-patrimonio)"
    : "#A32D2D";

  return (
    <div className={`flex flex-col items-end gap-0.5 rounded ${flashClass}`}>
      <span className="font-mono text-xs text-text-secondary">
        {formatEur(asset.current_price_eur)}
      </span>
      {changePercent != null && (
        <span
          className="font-mono text-xs font-medium"
          style={{ color: changeBadgeColor }}
          title="Variación del día"
        >
          {changePercent >= 0 ? "+" : ""}
          {changePercent.toFixed(2)}%
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function computeAnnualizedPL(plPct: number, days: number): number | null {
  if (days <= 0) return null;
  const years = days / 365;
  if (years < 0.05) return null; // < ~18 days: not meaningful
  const factor = 1 + plPct / 100;
  if (factor <= 0) return null;
  return (Math.pow(factor, 1 / years) - 1) * 100;
}

interface CategoryGroupProps {
  category: AssetCategory;
  assets: PortfolioAsset[];
  savingsPlanMap: Map<string, number>;
  priceChanges: Record<string, number | null>;
  trCurrentValue: number;
  firstBuyDateMap: Map<string, string>;
  onAssetClick: (id: string) => void;
}

function CategoryGroup({ category, assets, savingsPlanMap, priceChanges, trCurrentValue, firstBuyDateMap, onAssetClick }: CategoryGroupProps) {
  const [open, setOpen] = useState(true);

  const groupValue = assets.reduce((s, a) => s + (a.current_value ?? 0), 0);
  const groupInvested = assets.reduce((s, a) => s + a.total_invested, 0);
  const groupPL = groupValue - groupInvested;
  const groupPLPct = groupInvested > 0 ? (groupPL / groupInvested) * 100 : 0;

  return (
    <>
      {/* Group header row */}
      <tr
        className="cursor-pointer border-b border-border bg-sand/40 transition-colors hover:bg-sand/60"
        onClick={() => setOpen((prev) => !prev)}
      >
        <td className="px-4 py-2.5" colSpan={2}>
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown size={13} strokeWidth={2} className="text-text-tertiary" aria-hidden="true" />
            ) : (
              <ChevronRight size={13} strokeWidth={2} className="text-text-tertiary" aria-hidden="true" />
            )}
            <span className="text-xs font-semibold text-text-secondary">
              {CATEGORY_LABELS[category]}
            </span>
            <span className="text-xs text-text-tertiary">({assets.length})</span>
          </div>
        </td>
        <td className="hidden px-3 py-2.5 text-right font-mono text-xs text-text-secondary md:table-cell">
          —
        </td>
        <td className="hidden px-3 py-2.5 text-right font-mono text-xs text-text-secondary md:table-cell">
          —
        </td>
        <td className="px-3 py-2.5 text-right font-mono text-xs font-medium text-foreground">
          {formatEur(groupValue)}
        </td>
        <td className="hidden px-3 py-2.5 text-right font-mono text-xs text-text-secondary md:table-cell">
          {formatEur(groupInvested)}
        </td>
        <td className="px-3 py-2.5 text-right">
          <PLBadge amount={groupPL} percentage={groupPLPct} showPercentage />
        </td>
        <td className="hidden px-3 py-2.5 text-right font-mono text-xs text-text-tertiary md:table-cell">
          —
        </td>
        <td className="hidden px-3 py-2.5 md:table-cell" />
        <td className="hidden px-4 py-2.5 md:table-cell" />
        <td className="hidden px-4 py-2.5 md:table-cell" />
      </tr>

      {/* Asset rows */}
      {open &&
        assets.map((asset) => {
          const planAmount = savingsPlanMap.get(asset.id);
          const firstBuyDate = firstBuyDateMap.get(asset.id);
          const daysInPortfolio = firstBuyDate
            ? Math.floor((TODAY_MS - new Date(firstBuyDate).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          const plAnnualized =
            asset.pl_percentage != null && daysInPortfolio != null
              ? computeAnnualizedPL(asset.pl_percentage, daysInPortfolio)
              : null;
          return (
            <tr
              key={asset.id}
              className="border-b border-border/50 transition-colors hover:bg-sand/30"
            >
              <td className="px-4 py-3 pl-10">
                <button
                  type="button"
                  className="text-left hover:underline"
                  onClick={() => onAssetClick(asset.id)}
                >
                  <p className="text-sm font-medium text-foreground">{asset.name}</p>
                  {asset.sector && (
                    <p className="text-xs text-text-tertiary">{asset.sector}</p>
                  )}
                </button>
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-xs text-text-tertiary">
                    {asset.ticker ?? asset.isin?.substring(0, 12) ?? "—"}
                  </span>
                  {asset.current_price_eur != null && (
                    <PriceProgressBar
                      avgBuyPrice={asset.avg_buy_price}
                      currentPrice={asset.current_price_eur}
                    />
                  )}
                  <span className="font-mono text-[10px] text-text-tertiary" title="Precio medio de compra">
                    P.medio {formatEur(asset.avg_buy_price)}
                  </span>
                </div>
              </td>
              <td className="hidden px-3 py-3 text-right font-mono text-xs text-text-secondary md:table-cell">
                <span title={`${formatQtyFull(asset.current_quantity)} participaciones`}>
                  {formatQty(asset.current_quantity)}
                </span>
              </td>
              <td className="hidden px-3 py-3 text-right md:table-cell">
                <PriceCell
                  asset={asset}
                  changePercent={asset.isin ? priceChanges[asset.isin] : undefined}
                />
              </td>
              <td className="px-3 py-3 text-right font-mono text-sm font-medium text-foreground">
                {formatEur(asset.current_value ?? 0)}
              </td>
              <td className="hidden px-3 py-3 text-right font-mono text-xs text-text-secondary md:table-cell">
                {formatEur(asset.total_invested)}
              </td>
              <td className="px-3 py-3 text-right">
                {asset.pl_amount != null && asset.pl_percentage != null ? (
                  <div className="flex flex-col items-end gap-0.5">
                    <PLBadge
                      amount={asset.pl_amount}
                      percentage={asset.pl_percentage}
                      showAmount
                      showPercentage
                      size="sm"
                    />
                    {plAnnualized != null && (
                      <span
                        className="font-mono text-[10px]"
                        style={{ color: plAnnualized >= 0 ? "#2E7D6B" : "#A32D2D" }}
                        title="P&L% anualizado (CAGR por posición)"
                      >
                        {plAnnualized >= 0 ? "+" : ""}
                        {plAnnualized.toFixed(1)}%/año
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-text-tertiary">—</span>
                )}
              </td>
              <td className="hidden px-3 py-3 text-right font-mono text-xs text-text-secondary md:table-cell">
                {trCurrentValue > 0
                  ? `${(((asset.current_value ?? 0) / trCurrentValue) * 100).toFixed(1)}%`
                  : "—"}
              </td>
              <td className="hidden px-3 py-3 text-right font-mono text-xs md:table-cell">
                {planAmount != null ? (
                  <span style={{ color: "var(--module-patrimonio)" }}>{formatEur(planAmount)}</span>
                ) : (
                  <span className="text-text-tertiary">—</span>
                )}
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                {asset.geographic_region && (
                  <span className="text-xs text-text-tertiary">{asset.geographic_region}</span>
                )}
              </td>
              <td className="hidden px-4 py-3 text-right md:table-cell">
                {daysInPortfolio != null ? (
                  <span className="font-mono text-xs text-text-tertiary">{daysInPortfolio}d</span>
                ) : (
                  <span className="text-xs text-text-tertiary">—</span>
                )}
              </td>
            </tr>
          );
        })}
    </>
  );
}

export function TRPositionsTable() {
  const assets = usePatrimonioStore((s) => s.assets);
  const platforms = usePatrimonioStore((s) => s.platforms);
  const savingsPlan = usePatrimonioStore((s) => s.savingsPlan);
  const transactions = usePatrimonioStore((s) => s.transactions);
  const priceChanges = usePatrimonioStore((s) => s.priceChanges);
  const getTRCurrentValue = usePatrimonioStore((s) => s.getTRCurrentValue);
  const trCurrentValue = getTRCurrentValue();

  const trAssets = useMemo(() => {
    const trPlatform = platforms.find((p) => p.slug === "trade-republic");
    if (!trPlatform) return [];
    return assets.filter((a) => a.platform_id === trPlatform.id);
  }, [assets, platforms]);

  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [activeDrawerAssetId, setActiveDrawerAssetId] = useState<string | null>(null);
  const [showAssetModal, setShowAssetModal] = useState(false);

  const savingsPlanMap = useMemo(
    () => new Map(savingsPlan.map((item) => [item.asset_id, item.monthly_amount])),
    [savingsPlan]
  );

  const firstBuyDateMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of transactions) {
      if (!t.asset_id) continue;
      if (t.type !== "buy" && t.type !== "savings_plan") continue;
      const existing = map.get(t.asset_id);
      if (!existing || t.transaction_date < existing) {
        map.set(t.asset_id, t.transaction_date);
      }
    }
    return map;
  }, [transactions]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    let result = trAssets.filter((a) => matchesFilter(a, filter));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.ticker?.toLowerCase().includes(q) ||
          a.isin?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let av = 0;
      let bv = 0;
      if (sortKey === "name") {
        return sortDir === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (sortKey === "value") { av = a.current_value ?? 0; bv = b.current_value ?? 0; }
      if (sortKey === "invested") { av = a.total_invested; bv = b.total_invested; }
      if (sortKey === "pl_amount") { av = a.pl_amount ?? 0; bv = b.pl_amount ?? 0; }
      if (sortKey === "pl_percentage") { av = a.pl_percentage ?? 0; bv = b.pl_percentage ?? 0; }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return result;
  }, [trAssets, filter, search, sortKey, sortDir]);

  // Group by category
  const groups = useMemo(() => {
    const map = new Map<AssetCategory, PortfolioAsset[]>();
    for (const asset of filtered) {
      const existing = map.get(asset.category) ?? [];
      existing.push(asset);
      map.set(asset.category, existing);
    }
    return map;
  }, [filtered]);

  // Exclude cash from totals — cash is not an investment position
  const filteredNonCash = filtered.filter((a) => a.category !== "cash");
  const totalValue = filteredNonCash.reduce((s, a) => s + (a.current_value ?? 0), 0);
  const totalInvested = filteredNonCash.reduce((s, a) => s + a.total_invested, 0);
  const totalPL = totalValue - totalInvested;
  const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search
            size={14}
            strokeWidth={1.75}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            aria-hidden="true"
          />
          <Input
            type="text"
            placeholder="Buscar por nombre o ticker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor:
                  filter === tab.key ? "var(--module-patrimonio)" : "var(--bg-sand)",
                color: filter === tab.key ? "var(--card)" : "var(--text-secondary)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Add asset button */}
        <button
          type="button"
          onClick={() => setShowAssetModal(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          style={{ backgroundColor: "var(--bg-sand)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          <Plus size={13} strokeWidth={2} />
          Activo
        </button>
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block">
        <div className="max-h-[600px] overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10" style={{ backgroundColor: "var(--bg-card)" }}>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left">
                <SortHeader
                  label="Nombre"
                  sortKey="name"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-text-tertiary">Ticker</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-text-tertiary">Cant.</th>
              <th className="px-3 py-3 text-right text-xs font-medium text-text-tertiary">Precio</th>
              <th className="px-3 py-3 text-right">
                <SortHeader
                  label="Valor"
                  sortKey="value"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  className="justify-end"
                />
              </th>
              <th className="px-3 py-3 text-right">
                <SortHeader
                  label="Invertido"
                  sortKey="invested"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  className="justify-end"
                />
              </th>
              <th className="px-3 py-3 text-right">
                <SortHeader
                  label="P&L"
                  sortKey="pl_amount"
                  currentKey={sortKey}
                  currentDir={sortDir}
                  onSort={handleSort}
                  className="justify-end"
                />
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-text-tertiary">
                Peso %
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-text-tertiary">
                Plan/mes
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-text-tertiary">
                Region
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-text-tertiary">
                Días
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Investment positions first (non-cash) */}
            {Array.from(groups.entries())
              .filter(([cat]) => cat !== "cash")
              .map(([category, assets]) => (
                <CategoryGroup
                  key={category}
                  category={category}
                  assets={assets}
                  savingsPlanMap={savingsPlanMap}
                  priceChanges={priceChanges}
                  trCurrentValue={trCurrentValue}
                  firstBuyDateMap={firstBuyDateMap}
                  onAssetClick={setActiveDrawerAssetId}
                />
              ))}
            {/* Cash separator + group — always last */}
            {groups.has("cash") && (
              <>
                <tr>
                  <td colSpan={11} className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <span className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
                        Efectivo (no invertido)
                      </span>
                      <span className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
                    </div>
                  </td>
                </tr>
                <CategoryGroup
                  key="cash"
                  category="cash"
                  assets={groups.get("cash")!}
                  savingsPlanMap={savingsPlanMap}
                  priceChanges={priceChanges}
                  trCurrentValue={trCurrentValue}
                  firstBuyDateMap={firstBuyDateMap}
                  onAssetClick={setActiveDrawerAssetId}
                />
              </>
            )}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="py-12 text-center text-sm text-text-tertiary">
                  No hay posiciones con esos filtros
                </td>
              </tr>
            )}
          </tbody>
          {filteredNonCash.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border bg-sand/30">
                <td className="px-4 py-3 text-sm font-semibold text-foreground" colSpan={4}>
                  Total ({filteredNonCash.length} pos.)
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm font-semibold text-foreground">
                  {formatEur(totalValue)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-xs text-text-secondary">
                  {formatEur(totalInvested)}
                </td>
                <td className="px-3 py-3 text-right">
                  <PLBadge amount={totalPL} percentage={totalPLPct} showAmount showPercentage />
                </td>
                <td />
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>

      {/* Mobile — cards view */}
      <div className="md:hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-text-tertiary">
            No hay posiciones con esos filtros
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Array.from(groups.entries())
              .filter(([cat]) => cat !== "cash")
              .map(([category, assets]) => (
                <MobileCategoryGroup
                  key={category}
                  category={category}
                  assets={assets}
                  savingsPlanMap={savingsPlanMap}
                  onAssetClick={setActiveDrawerAssetId}
                />
              ))}
            {groups.has("cash") && (
              <>
                <div className="px-4 py-2" style={{ backgroundColor: "var(--bg-sand)" }}>
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-tertiary)" }}>
                    Efectivo (no invertido)
                  </span>
                </div>
                <MobileCategoryGroup
                  key="cash"
                  category="cash"
                  assets={groups.get("cash")!}
                  savingsPlanMap={savingsPlanMap}
                  onAssetClick={setActiveDrawerAssetId}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals / Drawers */}
      <AssetDetailDrawer
        assetId={activeDrawerAssetId}
        onClose={() => setActiveDrawerAssetId(null)}
      />
      <AssetFormModal
        isOpen={showAssetModal}
        onClose={() => setShowAssetModal(false)}
      />
    </div>
  );
}

interface MobileCategoryGroupProps {
  category: AssetCategory;
  assets: PortfolioAsset[];
  savingsPlanMap: Map<string, number>;
  onAssetClick: (id: string) => void;
}

function MobileCategoryGroup({ category, assets, savingsPlanMap, onAssetClick }: MobileCategoryGroupProps) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between bg-sand/40 px-4 py-3"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown size={13} strokeWidth={2} className="text-text-tertiary" aria-hidden="true" />
          ) : (
            <ChevronRight size={13} strokeWidth={2} className="text-text-tertiary" aria-hidden="true" />
          )}
          <span className="text-xs font-semibold text-text-secondary">
            {CATEGORY_LABELS[category]}
          </span>
          <span className="text-xs text-text-tertiary">({assets.length})</span>
        </div>
      </button>
      {open && (
        <div className="divide-y divide-border/50">
          {assets.map((asset) => {
            const planAmount = savingsPlanMap.get(asset.id);
            return (
              <div key={asset.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="truncate text-left text-sm font-medium text-foreground hover:underline"
                      onClick={() => onAssetClick(asset.id)}
                    >
                      {asset.name}
                    </button>
                    <p className="font-mono text-xs text-text-tertiary">
                      {asset.ticker ?? asset.isin?.substring(0, 12) ?? "—"}
                    </p>
                    {asset.current_price_eur != null && (
                      <div className="mt-1">
                        <PriceProgressBar
                          avgBuyPrice={asset.avg_buy_price}
                          currentPrice={asset.current_price_eur}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {formatEur(asset.current_value ?? 0)}
                    </p>
                    {asset.pl_amount != null && asset.pl_percentage != null && (
                      <div className="mt-0.5">
                        <PLBadge
                          amount={asset.pl_amount}
                          percentage={asset.pl_percentage}
                          showPercentage
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
                {planAmount != null && (
                  <p className="mt-1 text-xs" style={{ color: "var(--module-patrimonio)" }}>
                    Plan: {formatEur(planAmount)}/mes
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
