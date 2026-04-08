# Plan: Canvas, Grafo y Sistema de Notas — Refactorización Completa
> Generado: 2026-04-08 | Basado en auditoría DOM + revisión de código

---

## Contexto

Auditoría realizada con la extensión de Claude en Chrome. Se inspeccionó el DOM en vivo,
la arquitectura React/Next.js, la estructura SVG de conexiones, el sistema de nodos,
grupos, modal de creación y vista de grafo.

Archivos principales afectados:
- `src/components/modules/notes/canvas/NotesCanvas.tsx`
- `src/components/modules/notes/canvas/CanvasEdge.tsx`
- `src/components/modules/notes/canvas/CanvasNode.tsx`
- `src/components/modules/notes/canvas/CanvasMinimap.tsx`
- `src/components/modules/notes/canvas/CanvasToolbar.tsx`
- `src/components/modules/notes/NotesGraph.tsx`
- `src/components/modules/notes/NoteModal.tsx`
- `src/stores/notes-store.ts`

---

## Lo que encontré en el código vs la auditoría

Antes del plan, 3 aclaraciones importantes tras leer el código real:

**Edges** — La arquitectura ya tiene handlers correctos (`onClick`, `onMouseEnter/Leave`,
`pointerEvents: 'all'` en el hit-target). El bug real es que el `<svg>` padre tiene
`pointerEvents: "none"` y aunque el `<g>` hijo tiene `pointerEvents: "auto"`, en SVG
renderizado en HTML algunos navegadores aplican `none` heredado como absoluto, bloqueando
eventos incluso con override explícito. Fix quirúrgico, no reescritura.

**Graph** — El `ForceGraph2D` no tiene `d3Force` customizado. Sin `charge` ni `linkDistance`
configurados, los nodos colapsan al centro. Fix de ~10 líneas de configuración.

**Canvas motor** — Ya tiene `isNodeVisible` para culling básico. El problema real es que el
zoom/pan recalcula coordenadas por nodo individualmente en lugar de usar un CSS transform
padre. Refactor medio.

**Grupos** — Esto sí está fundamentalmente roto: son `<rect>` SVG calculados desde posiciones
de hijos, sin relación DOM real, sin pointer-events, sin interacción propia.

---

## BLOQUE 1 — Fix Edges (crítico, ~2h)

**Archivos**: `NotesCanvas.tsx:1093`, `CanvasEdge.tsx`

### Problema

Línea 1093 de `NotesCanvas.tsx`:
```jsx
<svg style={{ zIndex: 1, pointerEvents: "none" }}>
  <g style={{ pointerEvents: "auto" }}>  {/* no es suficiente en algunos browsers */}
```

En SVG dentro de HTML, algunos navegadores tratan `pointer-events: none` en el `<svg>`
padre como absoluto, bloqueando eventos en hijos aunque tengan `pointer-events: auto`.

### Cambios requeridos

1. **Mover `pointerEvents: "auto"` al SVG padre directamente** — el SVG debe ser
   interactivo pero con background no-blocking.

2. **Añadir `pointerEvents: "auto"` explícito en cada `<g data-edge-id>`** en
   `CanvasEdge.tsx` — actualmente el `<g>` solo tiene `onMouseEnter/Leave` pero no
   declara su propia política de pointer-events.

3. **Verificar Delete/Backspace**: comprobar que el keydown listener en el canvas llama
   `removeEdge` cuando `selectedEdgeId !== null`.

4. **`strokeWidth`**: ya usa `/ scale` correctamente (`1.5 / scale`, `16 / scale`).
   No necesita cambio.

### Resultado esperado

Click en conexión → selección visual → botón X en punto medio → eliminar.
Keyboard `Delete` funciona con edge seleccionado.

---

## BLOQUE 2 — Fix Grupos (crítico, ~4h)

**Archivos**: `NotesCanvas.tsx:1060-1091`, `CanvasNode.tsx`, `notes-store.ts`

### Problema

Los grupos son `<rect>` SVG en un SVG con `pointer-events: none`. Los nodos hijos están
en un contenedor DOM hermano (z-index: 2), no dentro del grupo. La relación es solo via
`group_id` en el store. No hay header, no hay botón collapse/expand interactivo real,
no hay feedback visual de drag-into-group.

### Cambios requeridos

**2a — Group header interactivo como `<div>`**

Crear (o extraer) un `CanvasGroupNode` component que renderice:
- Header con nombre editable inline + badge con conteo de hijos
- Botón collapse/expand (icono ChevronDown/Up de Lucide)
- Botón "..." para context menu (Renombrar, Color, Desagrupar, Eliminar)
- Fondo del grupo como `<div>` posicionado absolutamente (no SVG) para poder tener
  `pointer-events`, `border`, hover states con Tailwind

**2b — Fix "0 nodos" bug**

El cálculo de bounding box usa:
```js
const children = nodes.filter(n => n.group_id === group.id && n.node_type !== 'group')
```
Cuando `children.length === 0`, el grupo desaparece. Fix: cuando no hay hijos, mostrar
el grupo en su posición stored (`pos_x`, `pos_y`) con tamaño mínimo (200×100px).

**2c — Drag-into-group feedback**

Ya existe `dragOverGroupId` en el store y lógica de `assignNodeToGroup`. Falta el
feedback visual: borde punteado animado + texto "Soltar para añadir al grupo" cuando
`dragOverGroupId === group.id`.

**2d — Mover grupo con hijos**

Ya existe `moveGroupWithChildren` en el store. Verificar que se llama cuando el nodo
arrastrado es de `node_type === 'group'`.

### Resultado esperado

Grupos con header visible siempre (incluso sin hijos), conteo correcto de nodos,
collapse/expand funcional, drag-and-drop con feedback visual claro.

---

## BLOQUE 3 — Canvas: CSS Transform Zoom/Pan (arquitectura, ~5h)

**Archivos**: `NotesCanvas.tsx` (completo), `CanvasEdge.tsx`, `CanvasMinimap.tsx`

> ⚠️ Este es el cambio más profundo. Hacerlo DESPUÉS de que los Bloques 1 y 2
> estén estables.

### Problema

Actualmente cada nodo calcula su posición en pantalla individualmente:
```js
left: node.pos_x * scale + offsetX
top: node.pos_y * scale + offsetY
width: node.width * scale
```

El SVG de conexiones también trabaja en coordenadas de pantalla recalculadas, lo que
puede desincronizar zoom de líneas y nodos. Ineficiente: cada nodo re-calcula en
cada frame de animación.

### Plan de migración

Añadir un `div.canvas-viewport` intermedio con CSS transform:

```jsx
<div
  className="absolute"
  style={{
    width: CANVAS_BOUNDS.w,
    height: CANVAS_BOUNDS.h,
    transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
    transformOrigin: '0 0',
  }}
>
  {/* SVG de conexiones en coordenadas de MUNDO (sin scale/offset) */}
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
    <g style={{ pointerEvents: 'auto' }}>
      {edges.map(edge => <CanvasEdge ... />)}
    </g>
  </svg>

  {/* Nodos en coordenadas de MUNDO */}
  {nodes.map(node => (
    <div
      key={node.id}
      style={{ position: 'absolute', left: node.pos_x, top: node.pos_y, width: node.width }}
    >
      <CanvasNodeComponent ... />
    </div>
  ))}
</div>
```

`CanvasEdge` deja de recibir `scale/offsetX/offsetY` — trabaja en coordenadas de mundo.
`strokeWidth` se convierte en constante (el transform lo escala uniformemente).

El grid de fondo usa `background-size` CSS para escalar con el viewport.

### Ventajas

- Menos rerenders (el transform se aplica una vez, no por nodo)
- Coordenadas consistentes entre edges y nodos
- Scroll/zoom más suave (GPU-accelerated)

### Riesgo

Requiere actualizar `CanvasEdge`, `CanvasNode`, `CanvasMinimap` y toda la lógica de
conversión screen↔world en event handlers (position del mouse → coordenadas de mundo).

---

## BLOQUE 4 — Modal de Creación UX (mejora, ~3h)

**Archivos**: `NoteModal.tsx`, `NotesView.tsx`, `QuickCapture.tsx`

### Problema

El modal usa el componente `Modal` del design system (centrado, tamaño fijo ~500px).
El botón expand (Maximize2/Minimize2) solo cambia la altura, pierde el campo de título
en el proceso. No es una experiencia de edición profesional.

### Cambios requeridos

**4a — Drawer mode** (modo principal desde canvas)

En lugar de `<Modal>`, usar un panel lateral de 420px que aparece desde la derecha
(`animate-slide-in-right`). El canvas permanece visible detrás con overlay `bg-black/10`.

Estructura del drawer:
1. Header: icono tipo nota + Input título (fontSize 20px, autofocus) + botón X
2. Selector color (6 círculos 20px con check)
3. Selector estado: pills (Idea / En progreso / Hecho) con iconos Lucide
4. Separador
5. Editor de contenido (flex-grow, textarea o NoteEditor existente)
6. Separador
7. Tags input
8. Footer fijo: carpeta dropdown + botones Cancelar/Crear

**4b — Modo expandido**

Click en Maximize2 → overlay `90vw × 90vh` centrado con transición CSS
(cambiar clases con `transition-all duration-300`). Maximize2 se convierte en
Minimize2 para volver al drawer.

**4c — Quick capture**

`QuickCapture.tsx` ya existe. Conectar correctamente como mini-modal centrado
con solo título + textarea + tags (sin color/estado). Para captura rápida
desde el botón flotante del módulo.

---

## BLOQUE 5 — Graph: Forces & Rendering (mejora, ~2h)

**Archivos**: `NotesGraph.tsx:316-337`

### Problema

El `ForceGraph2D` no tiene `d3Force` customizado (líneas 316-337). Sin `charge` ni
`linkDistance` configurados, los nodos colapsan al centro formando un cluster ilegible.

### Cambios requeridos

Añadir ref al grafo y configurar fuerzas via `useEffect`:

```jsx
const fgRef = useRef<any>()

useEffect(() => {
  if (!fgRef.current) return
  const fg = fgRef.current

  // Repulsión fuerte entre nodos
  fg.d3Force('charge').strength(-250)

  // Links más largos para separar nodos conectados
  fg.d3Force('link').distance(120)

  // Evitar solapamiento de nodos y labels
  fg.d3Force('collide', d3.forceCollide(40))

  // Nodos aislados: empujar al perímetro
  fg.d3Force('radial',
    d3.forceRadial(280, dimensions.width / 2, dimensions.height / 2)
      .strength((node: GraphNode) => isolatedSet.has(node.id) ? 0.3 : 0)
  )
}, [graphData, isolatedSet, dimensions])

<ForceGraph2D
  ref={fgRef}
  cooldownTicks={150}      // más tiempo = mejor distribución
  d3AlphaDecay={0.015}     // enfriamiento más lento
  d3VelocityDecay={0.25}
  ...
/>
```

### Resultado esperado

Nodos separados, labels legibles, nodos aislados en el perímetro exterior del
cluster principal.

---

## BLOQUE 6 — Polish General (mejoras visuales, ~2h)

**Archivos**: `CanvasNode.tsx`, `CanvasToolbar.tsx`, `NotesCanvas.tsx`

**6a — Nodo selection ring estilo Figma**

Cambiar el ring de selección actual a:
```css
box-shadow: 0 0 0 2px var(--accent-terracotta)
```
En lugar del borde sólido actual.

**6b — Toolbar con separadores lógicos**

Añadir `<div className="w-px h-4 bg-border mx-1" />` entre grupos:
- [Undo | Redo] | [Select | Nota | Texto | URL | Imagen | Grupo] | [Auto-layout | Fit] | [Snap | Zoom] | [Search | Filtros]

**6c — Auto-layout mejorado**

El algoritmo actual (`autoLayoutNodes`) deja solapamiento. Mejorar separación mínima:
- Horizontal: `node.width + 30px`
- Vertical: `node.height + 40px`

Separar notas con conexiones (layout tipo árbol, izquierda) de notas aisladas
(grid 3 columnas, derecha). Animar transición con `pushHistory` previo para undo.

**6d — Verificar double-click en canvas vacío**

Ya está implementado (`handleCanvasDoubleClick`). Verificar que funciona y añadir
`animate-scale-in` al nodo creado para feedback visual.

---

## Orden de implementación recomendado

| Prioridad | Bloque | Tiempo estimado | Riesgo | Decisión |
|-----------|--------|-----------------|--------|----------|
| 1 | Fix Edges | ~2h | Bajo | Implementar primero |
| 2 | Fix Grupos | ~4h | Medio | Implementar en misma sesión |
| 3 | Graph Forces | ~2h | Bajo | Alta rentabilidad / poco riesgo |
| 4 | Modal UX | ~3h | Bajo | Buena UX, riesgo contenido |
| 5 | CSS Transform | ~5h | Alto | Hacer cuando el resto esté estable |
| 6 | Polish | ~2h | Muy bajo | Último, cierre de sesión |

**Total estimado**: ~18h de trabajo real de implementación.

### Recomendación de sesiones

**Sesión A** (primera): Bloques 1 + 2 + 5 — resolver todos los bugs críticos y el graph
**Sesión B** (segunda): Bloque 4 — modal UX (independiente, sin riesgo)
**Sesión C** (tercera): Bloque 3 — refactor arquitectura canvas (la más arriesgada)
**Sesión D** (cuarta): Bloque 6 — polish y cierre

---

## Sobre la sugerencia de migrar a @xyflow/react (React Flow)

La auditoría sugiere migrar toda la implementación custom a React Flow. **No recomendado**
por las siguientes razones:

1. La implementación actual tiene la arquitectura correcta (handles, edge routing,
   viewport, snap guides, rubber-band, history/undo, grupos, backlinks). El 80% ya funciona.
2. React Flow v12 requeriría reescribir el store completo, todos los tipos, todas las
   funciones del store, y la integración con Supabase.
3. El coste de migración (~40h+) supera con creces el coste de los fixes (~18h).
4. Los bugs son puntuales y solucionables quirúrgicamente.

La implementación custom a largo plazo da más control sobre el comportamiento específico
de Arkhos (sync con notas, backlinks, grupos, tipos de nodo propios).
