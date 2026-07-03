"use client"

// ══════════════════════════════════════
// Arkhos — Grafo de Notas: motor SVG + d3-force
// Invariante: React posee estructura/clases/estilos/eventos; d3 posee EN
// EXCLUSIVA los atributos de posición (transform/x1/y1/x2/y2), que nunca
// aparecen en JSX. El tick muta el DOM directamente (cero re-renders por
// frame) → compatible con React Compiler sin escape hatches.
// ══════════════════════════════════════

import { useEffect, useRef } from "react"
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
  select,
  zoom,
  zoomIdentity,
  drag,
  type Simulation,
} from "d3"
import {
  GRAPH_FORCES,
  GRAPH_NODE_COLORS,
  GRAPH_LINK_COLOR,
  GRAPH_LINK_ACTIVE_COLOR,
  GRAPH_ZOOM_EXTENT,
  GRAPH_LABEL_ZOOM_THRESHOLD,
  GRAPH_STATIC_TICKS,
} from "./graph-constants"
import {
  radiusFor,
  truncateLabel,
  matchesSearch,
  linkEndpointId,
  type GraphNodeDatum,
  type GraphLinkDatum,
} from "./graph-model"

interface GraphSvgProps {
  nodes: GraphNodeDatum[]
  links: GraphLinkDatum[]
  neighborMap: Map<string, Set<string>>
  hoveredId: string | null
  searchQuery: string
  selectedId: string | null
  reducedMotion: boolean
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}

interface StoredPosition {
  x: number | undefined
  y: number | undefined
  fx: number | null
  fy: number | null
}

export function GraphSvg({
  nodes,
  links,
  neighborMap,
  hoveredId,
  searchQuery,
  selectedId,
  reducedMotion,
  onHover,
  onSelect,
}: GraphSvgProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomGroupRef = useRef<SVGGElement>(null)
  const simRef = useRef<Simulation<GraphNodeDatum, GraphLinkDatum> | null>(null)
  /** Posiciones persistidas entre reconstrucciones (filtros no re-explotan el layout) */
  const prevPositions = useRef(new Map<string, StoredPosition>())
  const nodeEls = useRef(new Map<string, SVGGElement>())
  const linkEls = useRef<(SVGLineElement | null)[]>([])
  const hadDataBefore = useRef(false)

  // ── Zoom/pan (una vez) ──────────────
  useEffect(() => {
    const svg = svgRef.current
    const zg = zoomGroupRef.current
    const container = containerRef.current
    if (!svg || !zg || !container) return

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent(GRAPH_ZOOM_EXTENT)
      .on("zoom", (event) => {
        zg.setAttribute("transform", String(event.transform))
        zg.dataset.zoom = event.transform.k < GRAPH_LABEL_ZOOM_THRESHOLD ? "far" : "near"
      })

    const sel = select(svg)
    sel.call(zoomBehavior)
    // dblclick reservado para liberar nodos fijados
    sel.on("dblclick.zoom", null)
    // Centro inicial: el layout de fuerzas gravita en torno a (0,0)
    const { width, height } = container.getBoundingClientRect()
    sel.call(zoomBehavior.transform, zoomIdentity.translate(width / 2, height / 2))

    return () => {
      sel.on(".zoom", null)
    }
  }, [])

  // ── Simulación + drag (por cambio de datos) ──
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || nodes.length === 0) return

    // Fusionar posiciones previas: los nodos que sobreviven a un filtro
    // conservan x/y/fx/fy y el layout no se recoloca desde cero
    for (const n of nodes) {
      const prev = prevPositions.current.get(n.id)
      if (prev) {
        n.x = prev.x
        n.y = prev.y
        n.fx = prev.fx
        n.fy = prev.fy
      }
    }

    const paint = () => {
      for (const n of nodes) {
        const el = nodeEls.current.get(n.id)
        if (el && n.x !== undefined && n.y !== undefined) {
          el.setAttribute("transform", `translate(${n.x},${n.y})`)
        }
        prevPositions.current.set(n.id, {
          x: n.x,
          y: n.y,
          fx: n.fx ?? null,
          fy: n.fy ?? null,
        })
      }
      for (let i = 0; i < links.length; i++) {
        const el = linkEls.current[i]
        const s = links[i].source
        const t = links[i].target
        if (el && typeof s === "object" && typeof t === "object" && s.x !== undefined && t.x !== undefined) {
          el.setAttribute("x1", String(s.x))
          el.setAttribute("y1", String(s.y))
          el.setAttribute("x2", String(t.x))
          el.setAttribute("y2", String(t.y))
        }
      }
    }

    const sim = forceSimulation<GraphNodeDatum>(nodes)
      .force(
        "link",
        forceLink<GraphNodeDatum, GraphLinkDatum>(links)
          .id((d) => d.id)
          .distance(GRAPH_FORCES.linkDistance)
          .strength(GRAPH_FORCES.linkStrength)
      )
      .force("charge", forceManyBody().strength(GRAPH_FORCES.charge))
      .force(
        "collide",
        forceCollide<GraphNodeDatum>((d) => radiusFor(d.degree) + GRAPH_FORCES.collidePadding)
      )
      .force("x", forceX(0).strength(GRAPH_FORCES.centerStrength))
      .force("y", forceY(0).strength(GRAPH_FORCES.centerStrength))
      .alphaMin(0.005)
    simRef.current = sim

    if (reducedMotion) {
      // Asentar el layout de golpe y pintar una sola vez (sin animación)
      sim.stop()
      for (let i = 0; i < GRAPH_STATIC_TICKS && sim.alpha() > sim.alphaMin(); i++) {
        sim.tick()
      }
      paint()
    } else {
      sim.on("tick", paint)
      // Primera carga: layout completo; cambios de filtro: reacomodo suave
      sim.alpha(hadDataBefore.current ? 0.45 : 1).restart()
    }
    hadDataBefore.current = true

    // Drag con pin: al soltar se mantienen fx/fy (doble click libera)
    const dragBehavior = drag<SVGCircleElement, GraphNodeDatum>()
      .on("start", (event, d) => {
        if (!reducedMotion && !event.active) sim.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on("drag", (event, d) => {
        d.fx = event.x
        d.fy = event.y
        if (reducedMotion) paint()
      })
      .on("end", (event) => {
        if (!reducedMotion && !event.active) sim.alphaTarget(0)
      })

    const nodeById = new Map(nodes.map((n) => [n.id, n]))
    select(svg)
      .selectAll<SVGCircleElement, GraphNodeDatum>("circle.graph-node")
      .each(function () {
        const datum = nodeById.get(this.dataset.id ?? "")
        if (datum) select(this).datum(datum)
      })
      .call(dragBehavior)

    // Primera pintura inmediata (posiciones fusionadas o del primer tick síncrono)
    paint()

    return () => {
      sim.stop()
      simRef.current = null
    }
  }, [nodes, links, reducedMotion])

  const searching = searchQuery.trim().length > 0
  const hoverNeighbors = hoveredId ? neighborMap.get(hoveredId) : undefined

  return (
    <div ref={containerRef} className="notes-graph relative h-full w-full overflow-hidden">
      <svg ref={svgRef} className="h-full w-full cursor-grab active:cursor-grabbing">
        <g ref={zoomGroupRef} data-zoom="near">
          <g>
            {links.map((l, i) => {
              const sId = linkEndpointId(l.source)
              const tId = linkEndpointId(l.target)
              const active = hoveredId !== null && (sId === hoveredId || tId === hoveredId)
              const dimmed = hoveredId !== null && !active
              return (
                <line
                  key={`${sId}→${tId}`}
                  ref={(el) => {
                    linkEls.current[i] = el
                  }}
                  style={{
                    stroke: active ? GRAPH_LINK_ACTIVE_COLOR : GRAPH_LINK_COLOR,
                    strokeWidth: active ? 1.6 : 1,
                    opacity: dimmed ? 0.1 : active ? 0.85 : 0.32,
                    transition: "opacity 150ms, stroke 150ms",
                  }}
                />
              )
            })}
          </g>
          <g>
            {nodes.map((n) => {
              const isHovered = hoveredId === n.id
              const isNeighbor = hoverNeighbors?.has(n.id) ?? false
              const isMatch = searching && matchesSearch(n.title, searchQuery)
              const isSelected = selectedId === n.id
              const isPriority = isHovered || isSelected || isMatch
              const dimmed =
                (hoveredId !== null && !isHovered && !isNeighbor) || (searching && !isMatch)
              const r = radiusFor(n.degree)
              return (
                <g
                  key={n.id}
                  ref={(el) => {
                    if (el) nodeEls.current.set(n.id, el)
                    else nodeEls.current.delete(n.id)
                  }}
                  style={{
                    opacity: dimmed ? 0.16 : n.isOrphan && !isPriority ? 0.5 : 1,
                    transition: "opacity 150ms",
                  }}
                >
                  <circle
                    className="graph-node cursor-pointer"
                    data-id={n.id}
                    r={r}
                    role="button"
                    aria-label={n.title}
                    style={{
                      fill: GRAPH_NODE_COLORS[n.colorKey],
                      stroke: isPriority ? "var(--text-primary)" : "var(--bg-card)",
                      strokeWidth: isPriority ? 2 : 1.5,
                    }}
                    onMouseEnter={() => onHover(n.id)}
                    onMouseLeave={() => onHover(null)}
                    onClick={() => onSelect(n.id)}
                    onDoubleClick={() => {
                      // Liberar nodo fijado y dejar que las fuerzas lo reacomoden
                      n.fx = null
                      n.fy = null
                      const stored = prevPositions.current.get(n.id)
                      if (stored) {
                        stored.fx = null
                        stored.fy = null
                      }
                      if (!reducedMotion) simRef.current?.alpha(0.3).restart()
                    }}
                  />
                  <text
                    className={`graph-label pointer-events-none select-none ${isPriority ? "is-priority" : ""}`}
                    textAnchor="middle"
                    y={r + 13}
                    style={{
                      fill: "var(--text-secondary)",
                      fontSize: 10.5,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {truncateLabel(n.title)}
                  </text>
                </g>
              )
            })}
          </g>
        </g>
      </svg>
    </div>
  )
}
