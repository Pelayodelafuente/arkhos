# Módulo Notas — Documentación técnica

## Overview

El módulo Notas es una plataforma de gestión de notas con tres vistas:
- **Lista** — notas paginadas con filtros, carpetas, búsqueda
- **Canvas** — lienzo visual tipo Obsidian Canvas con nodos y conexiones
- **Grafo** — visualización de backlinks entre notas (react-force-graph-2d)

---

## Schema de base de datos

### Tabla `notes` (migraciones 006, 011, 016, 017, 018, 019)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles (RLS) |
| `title` | TEXT | Título de la nota |
| `content` | TEXT | HTML enriquecido (TipTap) |
| `color` | TEXT | `default \| sage \| terracotta \| stone \| blue \| gold` |
| `icon` | TEXT | Nombre de icono Lucide (ej. `FileText`) |
| `is_pinned` | BOOLEAN | Anclada al tope de la lista |
| `word_count` | INTEGER | Auto-calculado al guardar |
| `tags` | TEXT[] | GIN index para filtros rápidos |
| `sort_order` | INTEGER | Orden manual |
| `folder_id` | UUID | FK → note_folders ON DELETE SET NULL |
| `archived` | BOOLEAN | Oculta de la lista normal |
| `favorited` | BOOLEAN | Marcada como favorita |
| `deleted_at` | TIMESTAMPTZ | NULL = activa; not null = en papelera |
| `status` | TEXT | `none \| idea \| in_progress \| done` |
| `project_id` | UUID | FK → projects ON DELETE SET NULL |
| `subscription_id` | UUID | FK → subscriptions ON DELETE SET NULL |
| `content_tsvector` | TSVECTOR | Full-text search (GIN index, trigger auto-actualiza) |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ | Auto-trigger |

**RLS:** `auth.uid() = user_id` para ALL operations.

### Tabla `note_folders` (migración 011)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → auth.users (RLS) |
| `name` | TEXT | Nombre de la carpeta |
| `icon` | TEXT | Nombre icono Lucide |
| `color` | NoteColor | Color de la carpeta |
| `sort_order` | INTEGER | Orden arrastrable |

### Tabla `note_canvases` (migración 006)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles (RLS) |
| `name` | TEXT | Nombre del canvas |
| `description` | TEXT | — |
| `is_default` | BOOLEAN | Solo hay un canvas por usuario |

### Tabla `canvas_nodes` (migraciones 006, 007)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | PK |
| `canvas_id` | UUID | FK → note_canvases |
| `note_id` | UUID | FK → notes (NULL para nodos text/url/image) |
| `node_type` | TEXT | `note \| text \| url \| image` |
| `pos_x`, `pos_y` | FLOAT | Posición en el canvas |
| `width`, `height` | FLOAT | Tamaño del nodo |
| `content` | TEXT | Contenido para nodos `text` |
| `url` | TEXT | URL para nodos `url` / `image` |
| `label` | TEXT | Etiqueta libre |
| `color` | NoteColor | Color del nodo |
| `z_index` | INTEGER | Capa de renderizado |
| `locked` | BOOLEAN | Inmovilizado (migración 007) |

**Índice único parcial:** `(canvas_id, note_id) WHERE note_id IS NOT NULL` — garantiza una sola entrada por nota en el canvas.

### Tabla `canvas_edges` (migración 006)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | PK |
| `canvas_id` | UUID | FK → note_canvases |
| `from_node_id` | UUID | FK → canvas_nodes |
| `to_node_id` | UUID | FK → canvas_nodes |
| `label` | TEXT | Etiqueta de la arista |
| `color` | EdgeColor | `default \| sage \| terracotta \| stone \| blue` |
| `style` | EdgeStyle | `arrow \| line \| bidirectional` |
| `from_side`, `to_side` | EdgeSide | `top \| right \| bottom \| left` |

**Constraint:** `no_self_loop CHECK (from_node_id != to_node_id)`

### Tabla `note_versions` (migración 011)

Historial de versiones por nota. Se crea automáticamente al guardar si el contenido cambió significativamente.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `note_id` | UUID | FK → notes |
| `user_id` | UUID | FK → auth.users |
| `title`, `content` | TEXT | Snapshot |
| `version_number` | INTEGER | Incremental por nota |

---

## Data Layer — `src/lib/supabase/notes.ts`

**Paginación:** `NOTES_PAGE_SIZE = 30`. Las funciones de lista devuelven `NoteListItem[]` (sin `content`) vía el helper interno `toNoteListItems()`. El content se carga bajo demanda con `getNoteContent(noteId)`.

### Funciones principales

| Función | Descripción |
|---------|-------------|
| `getNotes(userId, offset?)` | Lista paginada sin content |
| `getNoteContent(noteId)` | Lazy load del content |
| `getTrashedNotes(userId)` | Notas en papelera |
| `createNote(userId, formData)` | Crea nota, calcula word_count |
| `updateNote(id, data)` | Actualiza nota (recalcula word_count si content cambia) |
| `deleteNote(id)` | Soft-delete (sets deleted_at) |
| `restoreNote(id)` | Quita deleted_at |
| `hardDeleteNote(id)` | Elimina permanentemente |
| `emptyTrash(userId)` | Elimina todas las notas en papelera |
| `searchNotes(userId, query)` | Full-text search via tsvector |
| `getOrCreateDefaultCanvas(userId)` | Crea o devuelve el canvas por defecto |
| `getCanvasWithNodes(canvasId)` | Canvas + nodos + aristas en paralelo |
| `getNotesWithoutCanvasNode(canvasId, userId)` | Notas que no tienen nodo en el canvas |

**Patrón singleton:** El cliente Supabase se obtiene vía `createClient()` de `@/lib/supabase/client` (singleton lazy).

---

## Store — `src/stores/notes-store.ts`

Estado y acciones usando Zustand. Optimistic updates + rollback.

### Estado relevante

```ts
notes: Note[]                    // Lista principal (content vacío hasta lazy load)
trashedNotes: Note[]             // Papelera
folders: NoteFolder[]            // Carpetas
viewMode: 'list' | 'canvas' | 'graph'
sortMode: NoteSortMode           // Importado desde @/types/notes
activeFolderId: string | null    // null=todas, 'archived', 'favorites', 'no-folder'
searchQuery: string
activeTag: string | null

// Canvas
canvas: NoteCanvas | null
canvasNodes: CanvasNode[]
canvasEdges: CanvasEdge[]
viewport: CanvasViewport          // { offsetX, offsetY, scale }
selectedNodeIds: Set<string>
selectedEdgeId: string | null
connectingFromNodeId: string | null
rubberBand: RubberBand | null
snapEnabled: boolean
history: HistoryEntry[]          // Undo/redo (50 entradas máx)
historyIndex: number
clipboard: { nodes, edges } | null
```

### Acciones principales

| Acción | Descripción |
|--------|-------------|
| `loadNotes(userId)` | Fetch inicial + lazy load |
| `loadMoreNotes(userId)` | Siguiente página |
| `createNote(userId, data)` | Optimistic insert |
| `saveNote(id, data)` | Optimistic update + backlink sync fire-and-forget |
| `deleteNote(id)` | Soft-delete optimistic |
| `restoreFromTrash(id)` | Restaura nota |
| `permanentlyDelete(id)` | Elimina permanentemente |
| `archiveNote(id)` / `unarchiveNote(id)` | Archivado |
| `toggleFavorite(id)` | Toggle favorita |
| `moveNoteToFolder(noteId, folderId)` | Mueve nota a carpeta |
| `loadCanvas(userId)` | Carga canvas + nodos + edges; sanitiza posiciones y duplicados |
| `addNodeToCanvas(userId, note)` | Añade nota como nodo |
| `addTextNode(userId)` / `addUrlNode` / `addImageNode` | Nodos libres |
| `moveNodes(updates)` | Batch move con optimistic update |
| `resizeNode(id, width, height)` | Resize con persist |
| `addEdge(userId, from, to, opts)` | Crea arista |
| `removeEdge(id)` | Elimina arista |
| `undoCanvas()` / `redoCanvas()` | Historial |
| `copySelected()` / `pasteClipboard(userId)` | Portapapeles |
| `syncBacklinksOnSave(id, content)` | Detecta `[[título]]` y actualiza note_backlinks |

**Re-export:** `export type { NoteSortMode } from '@/types/notes'` — para compatibilidad con importadores externos.

---

## Componentes principales

| Componente | Archivo | Responsabilidad |
|-----------|---------|-----------------|
| `NotesView` | `NotesView.tsx` | Shell: renderiza lista, canvas o grafo según viewMode |
| `NotesSidebar` | `NotesSidebar.tsx` | Sidebar izquierda: carpetas, filtros rápidos, quick capture |
| `NotesList` | `NotesList.tsx` | Lista virtual de tarjetas, sort/filter, infinite scroll |
| `NoteCard` | `NoteCard.tsx` | Tarjeta de nota con menú contextual, preview, checklist progress |
| `NoteModal` | `NoteModal.tsx` | Modal de creación/edición (TipTap editor completo) |
| `NotePane` | `NotePane.tsx` | Panel lateral de edición (alternativa al modal, mantiene contexto) |
| `NoteEditor` | `NoteEditor.tsx` | Editor TipTap con extensiones: highlight, code-block, table, mention, task-list |
| `NotesToolbar` | `NotesToolbar.tsx` | Barra superior: búsqueda, filtros, cambio de vista |
| `NotesGraph` | `NotesGraph.tsx` | Grafo de backlinks con react-force-graph-2d |
| `QuickCapture` | `QuickCapture.tsx` | Captura rápida de nota desde la sidebar |
| `TagInput` | `TagInput.tsx` | Input de tags con autocompletado |

### Canvas (subcarpeta `canvas/`)

| Componente | Responsabilidad |
|-----------|-----------------|
| `NotesCanvas` | Motor del canvas: pan/zoom, rubber band, event handling |
| `CanvasNode` | Nodo individual: note / text / url / image |
| `CanvasEdge` | Arista SVG con routing ortogonal o bezier suave |
| `CanvasToolbar` | Controles: zoom, snap, minimap, add nodo |
| `CanvasMinimap` | Vista general en miniatura del canvas |
| `CanvasContextMenu` | Menú contextual (click derecho en canvas/nodo) |
| `CanvasFilterPanel` | Panel de filtros de nodos visibles |
| `NodePropertiesPanel` | Panel de propiedades del nodo seleccionado |

---

## Canvas — Motor interno

### Pan & Zoom

El canvas usa CSS `transform: translate() scale()` sobre un contenedor SVG+HTML. El estado `viewport: { offsetX, offsetY, scale }` se persiste en `localStorage` vía `canvas-store.ts`.

**Rangos:** `CANVAS_BOUNDS = { minX: 0, minY: 0, maxX: 4000, maxY: 3000 }`. Los nodos se clamean a estos límites.

**Zoom:** rueda del ratón → `scale` entre 0.2 y 3.0.

### Rubber Band Selection

`rubberBand` state en el store: `{ startX, startY, currentX, currentY }`. Los nodos cuyo AABB intersecta con el rect de rubber band se añaden a `selectedNodeIds`.

### Snap a Grid

`snapEnabled` (toggle desde toolbar). Cuando activo, las posiciones al soltar se redondean a la cuadrícula de 20px. `snapGuides` calcula líneas de alineación respecto a otros nodos.

### Historial (Undo/Redo)

Máximo 50 entradas. Cada `HistoryEntry = { nodes: CanvasNode[], edges: CanvasEdge[] }`. `undoCanvas()` restaura el estado anterior; `redoCanvas()` avanza.

### Sincronización lista ↔ canvas

Al cargar el canvas:
1. `getCanvasWithNodes(canvasId)` carga nodos y aristas
2. Se detectan nodos con posiciones fuera de bounds → `batchUpdateNodePositions` (fire-and-forget)
3. Se detectan duplicados por `note_id` → `batchRemoveNodes` (fire-and-forget)
4. Se filtran nodos huérfanos (nota archivada o eliminada) → `batchRemoveNodes` (fire-and-forget)

### Edge Routing

Las aristas usan una curva Bezier suave cuyos handles se calculan según `from_side` y `to_side`. El componente `CanvasEdge` dibuja la curva en SVG con un path clickable de 20px de ancho para facilitar la selección.

---

## Features implementadas

- ✅ Lista paginada con lazy load de content (30 notas/página)
- ✅ Búsqueda full-text via PostgreSQL tsvector (migración 019)
- ✅ Carpetas con drag & drop (@dnd-kit)
- ✅ Archivado, favoritos, papelera (soft-delete)
- ✅ Etiquetas (tags) con filtrado en sidebar
- ✅ Estado por nota: `none / idea / in_progress / done`
- ✅ Backlinks automáticos con sintaxis `[[título]]`
- ✅ Historial de versiones con restauración
- ✅ Enlace a Proyecto o Suscripción (cross-module)
- ✅ Editor TipTap con: bold, italic, underline, link, código, listas, tablas, checklist, highlight, imágenes
- ✅ Canvas: 4 tipos de nodo (note, text, url, image)
- ✅ Canvas: conexiones direccionales con routing, estilo y color
- ✅ Canvas: rubber band selection, multiselect, copy/paste
- ✅ Canvas: undo/redo (50 pasos)
- ✅ Canvas: snap a grid, guías de alineación
- ✅ Canvas: minimap
- ✅ Canvas: menú contextual (click derecho)
- ✅ Grafo de backlinks interactivo (pan/zoom, click para abrir nota)
- ✅ Sugerencia de tags con IA (API route `/api/notes/suggest-tags`)
- ✅ Resumen con IA (API route `/api/notes/summarize`)
- ✅ Quick Capture desde sidebar
