# Plan: Notas — Potenciación completa (9 batches)

**Estado actual**: Batches 1, 2, 3, 4 y 5 completados (2026-04-03)

---

## Decisiones del usuario
- Vista edición: Split-pane (lista izquierda + editor derecho persistente) — reemplaza el modal ✅ implementado en Batch 3
- Grafo: Vista dedicada nueva en toolbar (Lista | Canvas | Grafo) con react-force-graph

## Qué NO se implementa
| Mejora | Por qué |
|--------|---------|
| A11: Editor bloques Notion | Requiere reescribir schema DB, migrar HTML → JSONB, ~3 meses |
| A25: Offline-first | Service Worker + IndexedDB es proyecto separado |
| A13: Propiedades custom | Depende de A11 |
| A3: Tags normalizados en tabla | Migration + refactor de callers. Aplazado |
| A1: Sub-carpetas | Depende de A3 |
| A2: Notas dentro de notas | UI recursiva compleja, bajo ROI |
| A24: Import Obsidian/Notion | Parsing complejo |

---

## Batches

### Batch 1 — Card UX ✅ COMPLETADO (2026-04-03)
B2 checklist progress · B3 preview imagen · B5 duplicar · B6 mover a carpeta · A22 papelera soft-delete

### Batch 2 — Estado + Conocimiento inline ✅ COMPLETADO (2026-04-03)
A18 estado de nota · B4 notas relacionadas · A9 menciones no enlazadas

### Batch 3 — Split-pane layout (B1) ✅ COMPLETADO (2026-04-03)
Commit: 7ed79f4
- NotePane.tsx: panel derecho persistente con editor, backlinks, historial, auto-save, Escape
- NotesView: layout 3 columnas (sidebar + lista 360px + pane flex-1)
- NotesList: grid 1 col cuando pane activo, selectedNoteId prop
- NoteCard: ring verde (isPaneActive)
- notes-store: selectedNoteId + setSelectedNoteId
- NoteModal conservado para nueva nota y edits de canvas

---

### Batch 4 — Grafo de conocimiento (A8) ✅ COMPLETADO (2026-04-03)
Commit: 69333a8
- NotesGraph.tsx: force-graph 2D con react-force-graph-2d, nodos coloreados por carpeta/color
- Toolbar extendido: [Lista] [Canvas] [Grafo]
- Panel de filtros: carpeta, color, tag
- Click en nodo → split-pane list view
- notes-store: viewMode 'graph', graphBacklinks[], loadGraphData()
- notes.ts: getAllBacklinksForGraph()

**Archivos**: nueva NotesGraph.tsx, instalar react-force-graph

Nueva vista en toolbar: [Lista] [Canvas] [Grafo]
- Instalar `react-force-graph` (o d3-force puro para menor bundle)
- `NotesGraph.tsx`: nodos = notas (color por carpeta), edges = note_backlinks
- Tamaño nodo proporcional al número de backlinks
- Click en nodo → abre nota en split-pane (setSelectedNoteId)
- Filtros: por carpeta, por tag, por color
- Zoom + pan nativo de react-force-graph
- Nodos aislados (sin conexiones) en cluster separado

---

### Batch 5 — IA (B12 + B13) ✅ COMPLETADO (2026-04-03)
Commit: a5349bf
- /api/notes/summarize (streaming haiku) + /api/notes/suggest-tags (JSON)
- NotePane: botón ✨ + panel resumen colapsable con streaming
- TagInput: botón ✨ + aiSuggestedTags con aceptar/descartar

**Archivos**: nueva `/api/notes/ai` route, NotePane

Reutiliza patrón de `/api/projects/analyze` y `/api/projects/chat`.

1. **B12 — Resumen IA**: Botón ✨ en toolbar del editor. Llama `/api/notes/summarize`. Streaming response. Muestra resumen en panel colapsable bajo el editor.
2. **B13 — Sugerencia tags IA**: En TagInput, botón "Sugerir". Llama `/api/notes/suggest-tags`. Devuelve array de tags sugeridos. El usuario los acepta/descarta uno a uno.

---

### Batch 6 — Integraciones cross-módulo
**Complejidad**: Media | **Riesgo**: Bajo
**Archivos**: migration, NotePane, project-detail.tsx

1. **B10 — Notas ↔ Proyectos**: Migration añade `project_id UUID REFERENCES projects(id) ON DELETE SET NULL`. NotePane: selector "Vincular a proyecto". project-detail.tsx: nueva tab "Notas".
2. **B11 — Notas ↔ Gastos**: Migration añade `subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL`. NotePane: selector "Vincular a suscripción". Modal suscripción: badge "Ver notas".

---

### Batch 7 — Search + Performance
**Complejidad**: Alta | **Riesgo**: Medio
**Archivos**: migration, notes.ts, notes-store.ts, NotesToolbar

1. **A5 — Full-text search PostgreSQL**: Migration añade `content_tsvector TSVECTOR` con trigger + índice GIN. `searchNotes()` usa `.textSearch('content_tsvector', query)`.
2. **A19/A20 — Paginación lazy**: `fetchNotes()` SELECT sin `content` (campo pesado). Carga content al seleccionar. `fetchMoreNotes()` con cursor. Scroll al final → `loadMoreNotes()`.

---

### Batch 8 — Canvas avanzado
**Complejidad**: Media | **Riesgo**: Bajo
**Archivos**: NoteCanvas, CanvasMiniMap.tsx (nuevo), dependencia html2canvas

1. **B7 — Minimap dinámico**: `CanvasMiniMap` SVG 150×100px proporcional. Viewport indicator. Click → pan al área.
2. **B8 — Export canvas PNG**: Botón "Exportar PNG". Usa `html2canvas` o `dom-to-image-more`. Download automático.
3. **A8 en canvas — Auto-grafo**: Botón "Generar conexiones" que lee `note_backlinks` y crea edges automáticamente.

---

### Batch 9 — Capture + Daily Notes
**Complejidad**: Media | **Riesgo**: Bajo
**Archivos**: QuickCapture.tsx (nuevo), layout global, notes-store

1. **A16 — Quick capture**: Componente `QuickCapture` flotante (botón ➕ bottom-right en TODAS las páginas). Mini-modal con título + contenido básico. Crea en carpeta "Inbox" (auto-creada). Shortcut global `Ctrl+Shift+N`.
2. **A15 — Daily notes**: Botón "Nota de hoy" en sidebar. Busca nota con título = fecha de hoy. Si no existe, la crea. Sin template predefinido.

---

## Dependencias entre batches

```
Batch 1 ✅ → Batch 2 ✅ → Batch 3 ✅ → Batch 4 ✅ (grafo)
                                      → Batch 5 (IA)
Batch 6 (integraciones) — independiente
Batch 7 (search) — independiente
Batch 8 (canvas) — independiente
Batch 9 (capture) — independiente
```

## Nuevas dependencias npm pendientes
- `react-force-graph-2d` ✅ instalado (Batch 4)
- `html2canvas` o `dom-to-image-more` (Batch 8)

## Verificación por batch
- `tsc --noEmit` → 0 errores
- `next build` → limpio
- Migrations: RLS en tablas nuevas
- Commit Conventional Commits por batch
