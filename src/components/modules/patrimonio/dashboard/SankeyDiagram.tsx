"use client";

import { useRef, useEffect, useMemo } from "react";
// @ts-ignore
import * as d3Sankey from "d3-sankey";
import { select as d3Select } from "d3";
import { usePatrimonioStore } from "@/stores/patrimonio-store";
import { useIndexaStore } from "@/stores/indexa-store";
import { useHorosStore } from "@/stores/horos-store";
import { useCryptoStore } from "@/stores/crypto-store";
import { useMintosStore } from "@/stores/mintos-store";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/types/patrimonio";
import type { AssetCategory } from "@/types/patrimonio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SankeyRawNode {
  name: string;
  color: string;
}

interface SankeyRawLink {
  source: number;
  target: number;
  value: number;
}

// ---------------------------------------------------------------------------
// Platform metadata
// ---------------------------------------------------------------------------

const PLATFORM_META: Record<
  string,
  { color: string; label: string }
> = {
  "trade-republic": { color: "#2E7D6B", label: "Trade Republic" },
  indexa: { color: "#3B78B0", label: "Indexa Capital" },
  horos: { color: "#7260C4", label: "Horos" },
  mintos: { color: "#C4704A", label: "Mintos" },
  crypto: { color: "#B07A3A", label: "Cripto" },
};

// ---------------------------------------------------------------------------
// Graph builder
// ---------------------------------------------------------------------------

interface GraphData {
  nodes: SankeyRawNode[];
  links: SankeyRawLink[];
}

function buildGraph(
  trValue: number,
  trCategoryValues: Map<AssetCategory, number>,
  indexaValue: number,
  horosValue: number,
  mintosValue: number,
  cryptoValue: number
): GraphData {
  const nodes: SankeyRawNode[] = [];
  const links: SankeyRawLink[] = [];

  // Node 0: source
  nodes.push({ name: "Tu dinero", color: "var(--module-patrimonio, #2E7D6B)" });

  // Level 1: platforms (nodes 1-5)
  const platforms: Array<{ key: string; value: number }> = [
    { key: "trade-republic", value: trValue },
    { key: "indexa", value: indexaValue },
    { key: "horos", value: horosValue },
    { key: "mintos", value: mintosValue },
    { key: "crypto", value: cryptoValue },
  ].filter((p) => p.value > 0);

  const platformIndexMap = new Map<string, number>();
  for (const p of platforms) {
    const idx = nodes.length;
    platformIndexMap.set(p.key, idx);
    nodes.push({
      name: PLATFORM_META[p.key]?.label ?? p.key,
      color: PLATFORM_META[p.key]?.color ?? "#888",
    });
    links.push({ source: 0, target: idx, value: p.value });
  }

  // Level 2: TR categories (if TR has data)
  const trIdx = platformIndexMap.get("trade-republic");
  if (trIdx !== undefined && trCategoryValues.size > 0) {
    for (const [cat, val] of trCategoryValues) {
      if (val <= 0) continue;
      const catIdx = nodes.length;
      nodes.push({
        name: CATEGORY_LABELS[cat] ?? cat,
        color: CATEGORY_COLORS[cat] ?? "#888",
      });
      links.push({ source: trIdx, target: catIdx, value: val });
    }
  }

  return { nodes, links };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SankeyDiagram() {
  const ref = useRef<SVGSVGElement>(null);

  // TR data
  const assets = usePatrimonioStore((s) => s.assets);
  const platforms = usePatrimonioStore((s) => s.platforms);

  // Other stores
  const indexaOverview = useIndexaStore((s) => s.overview);
  const horosPosition = useHorosStore((s) => s.position);
  const mintosOverview = useMintosStore((s) => s.overview);
  const cryptoAssets = useCryptoStore((s) => s.assets);
  const cryptoDefi = useCryptoStore((s) => s.defiPositions);
  const cryptoMonthlyPlan = useCryptoStore((s) => s.monthlyPlan);
  const getCryptoOverview = useCryptoStore((s) => s.getOverview);

  const cryptoOverview = useMemo(
    () => getCryptoOverview(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cryptoAssets, cryptoDefi, cryptoMonthlyPlan, getCryptoOverview]
  );

  const { trValue, trCategoryValues } = useMemo(() => {
    const trPlatform = platforms.find((p) => p.slug === "trade-republic");
    if (!trPlatform) return { trValue: 0, trCategoryValues: new Map<AssetCategory, number>() };

    const trAssets = assets.filter(
      (a) => a.platform_id === trPlatform.id && a.category !== "cash"
    );

    const val = trAssets.reduce((s, a) => s + (a.current_value ?? 0), 0);

    // Group by category
    const catMap = new Map<AssetCategory, number>();
    for (const a of trAssets) {
      const existing = catMap.get(a.category) ?? 0;
      catMap.set(a.category, existing + (a.current_value ?? 0));
    }

    return { trValue: val, trCategoryValues: catMap };
  }, [assets, platforms]);

  const indexaValue = indexaOverview?.total_value ?? 0;
  const horosValue = horosPosition?.total_value ?? 0;
  const mintosValue = mintosOverview?.total_value ?? 0;
  const cryptoValue = cryptoOverview?.total_value_eur ?? 0;

  const graphData = useMemo(
    () =>
      buildGraph(
        trValue,
        trCategoryValues,
        indexaValue,
        horosValue,
        mintosValue,
        cryptoValue
      ),
    [trValue, trCategoryValues, indexaValue, horosValue, mintosValue, cryptoValue]
  );

  useEffect(() => {
    if (!ref.current) return;
    const { nodes: rawNodes, links: rawLinks } = graphData;
    if (rawNodes.length === 0 || rawLinks.every((l) => l.value === 0)) return;

    const W = 560;
    const H = 320;

    const svg = d3Select(ref.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    // @ts-ignore
    const { sankey, sankeyLinkHorizontal } = d3Sankey;
    const sankeyLayout = sankey()
      .nodeWidth(12)
      .nodePadding(10)
      .extent([
        [16, 16],
        [W - 16, H - 16],
      ]);

    // Deep copy to avoid mutation — cast through unknown to bypass d3-sankey strict typing
    const sankeyInput = {
      // @ts-ignore
      nodes: rawNodes.map((d) => ({ ...d })),
      links: rawLinks.map((d) => ({ ...d })),
    };
    // @ts-ignore
    const { nodes, links } = sankeyLayout(sankeyInput);

    // Links
    svg
      .append("g")
      .selectAll("path")
      .data(links)
      .enter()
      .append("path")
      // @ts-ignore
      .attr("d", sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr(
        "stroke",
        // @ts-ignore
        (d) => (d as { source: { color: string } }).source.color ?? "#999"
      )
      .attr(
        "stroke-width",
        // @ts-ignore
        (d) => Math.max(1, (d as { width: number }).width)
      )
      .attr("stroke-opacity", 0.28);

    // Nodes
    svg
      .append("g")
      .selectAll("rect")
      .data(nodes)
      .enter()
      .append("rect")
      // @ts-ignore
      .attr("x", (d) => (d as { x0: number }).x0)
      // @ts-ignore
      .attr("y", (d) => (d as { y0: number }).y0)
      .attr("height", (d) =>
        // @ts-ignore
        Math.max(1, (d as { y1: number; y0: number }).y1 - (d as { y0: number }).y0)
      )
      // @ts-ignore
      .attr("width", (d) => (d as { x1: number; x0: number }).x1 - (d as { x0: number }).x0)
      // @ts-ignore
      .attr("fill", (d) => (d as { color: string }).color ?? "var(--module-patrimonio)")
      .attr("rx", 2)
      .attr("opacity", 0.9);

    // Labels
    svg
      .append("g")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr(
        "x",
        // @ts-ignore
        (d) =>
          (d as { x0: number }).x0 < W / 2
            ? // @ts-ignore
              (d as { x1: number }).x1 + 5
            : // @ts-ignore
              (d as { x0: number }).x0 - 5
      )
      .attr(
        "y",
        // @ts-ignore
        (d) => ((d as { y0: number }).y0 + (d as { y1: number }).y1) / 2
      )
      .attr("dy", "0.35em")
      .attr(
        "text-anchor",
        // @ts-ignore
        (d) => ((d as { x0: number }).x0 < W / 2 ? "start" : "end")
      )
      .attr("font-size", 10)
      .attr("fill", "var(--text-secondary)")
      // @ts-ignore
      .text((d) => (d as { name: string }).name);
  }, [graphData]);

  const totalValue =
    trValue + indexaValue + horosValue + mintosValue + cryptoValue;

  if (totalValue === 0) {
    return (
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
        }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Flujo de capital
        </p>
        <div className="flex items-center justify-center py-10">
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Sin datos de plataformas disponibles
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-stone, rgba(160,120,80,0.25))",
      }}
    >
      <p className="mb-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        Flujo de capital
      </p>
      <svg
        ref={ref}
        style={{ width: "100%", height: 320 }}
        aria-label="Diagrama Sankey de distribución de capital"
      />
    </div>
  );
}
