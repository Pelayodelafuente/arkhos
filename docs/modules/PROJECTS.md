# Módulo Proyectos — Documentación técnica

## Visión general

Módulo de gestión de proyectos personales con seguimiento de fases, tareas, estados y tipos personalizables.

- **URL lista**: `/proyectos`
- **URL detalle**: `/proyectos/[id]`
- **Color**: `#C4704A` (terracota)
- **Icono**: `FolderKanban` (Lucide)

---

## Schema de base de datos

### `projects`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `UUID` | PK, generado automáticamente |
| `user_id` | `UUID` | FK → `profiles.id`, CASCADE DELETE |
| `name` | `TEXT` | Nombre del proyecto |
| `icon` | `TEXT` | Nombre de icono Lucide (default: `'Box'`) |
| `logo_url` | `TEXT` | URL pública en Supabase Storage |
| `type` | `TEXT` | Tipo dinámico (FK lógica via `project_types`) |
| `status` | `TEXT` | Estado dinámico (FK lógica via `project_statuses`) |
| `stack` | `TEXT[]` | Tecnologías del stack |
| `tags` | `TEXT[]` | Etiquetas libres |
| `start_date` | `DATE` | Fecha de inicio (nullable) |
| `sort_order` | `INTEGER` | Orden manual |
| `created_at` | `TIMESTAMPTZ` | |
| `updated_at` | `TIMESTAMPTZ` | Auto-actualizado por trigger |

RLS: `auth.uid() = user_id`

### `project_phases`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `UUID` | PK |
| `project_id` | `UUID` | FK → `projects.id`, CASCADE DELETE |
| `name` | `TEXT` | |
| `status` | `TEXT` | `pending` \| `in-progress` \| `done` |
| `notes` | `TEXT` | Apuntes libres de la fase |
| `sort_order` | `INTEGER` | |
| `created_at` | `TIMESTAMPTZ` | |

RLS: via JOIN con `projects`

### `phase_tasks`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `UUID` | PK |
| `phase_id` | `UUID` | FK → `project_phases.id`, CASCADE DELETE |
| `text` | `TEXT` | Texto de la tarea |
| `done` | `BOOLEAN` | |
| `priority` | `TEXT` | `none` \| `low` \| `medium` \| `high` |
| `content` | `TEXT` | Apuntes de la tarea (Markdown) |
| `sort_order` | `INTEGER` | |
| `created_at` | `TIMESTAMPTZ` | |
| `updated_at` | `TIMESTAMPTZ` | |

### `task_links`
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `UUID` | PK |
| `task_id` | `UUID` | FK → `phase_tasks.id`, CASCADE DELETE |
| `url` | `TEXT` | |
| `label` | `TEXT` | Texto del enlace |
| `sort_order` | `INTEGER` | |

### `project_types` (dinámicos por usuario)
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK → `profiles.id` |
| `name` | `TEXT` | |
| `icon` | `TEXT` | Nombre icono Lucide |
| `color` | `TEXT` | Hex color |
| `sort_order` | `INTEGER` | |

### `project_statuses` (dinámicos por usuario)
| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `UUID` | PK |
| `user_id` | `UUID` | FK → `profiles.id` |
| `name` | `TEXT` | |
| `color` | `TEXT` | Hex color |
| `is_default` | `BOOLEAN` | Estado por defecto en creación |
| `sort_order` | `INTEGER` | |

---

## Data layer — `src/lib/supabase/projects.ts`

### Project types / statuses
```ts
getProjectTypes(client, userId): Promise<ProjectTypeRecord[]>
createProjectType(client, userId, input): Promise<ProjectTypeRecord>
deleteProjectType(client, typeId): Promise<void>

getProjectStatuses(client, userId): Promise<ProjectStatusRecord[]>
createProjectStatus(client, userId, input): Promise<ProjectStatusRecord>
deleteProjectStatus(client, statusId): Promise<void>

seedUserDefaults(client, userId, { types, statuses }): Promise<void>
// Puebla tipos/estados por defecto para usuarios nuevos
```

### Projects CRUD
```ts
getProjects(client, userId): Promise<ProjectListItem[]>
getProject(client, projectId): Promise<Project>
createProject(client, userId, input): Promise<Project>
updateProject(client, projectId, input): Promise<Project>
deleteProject(client, projectId): Promise<void>
```

### Phases CRUD
```ts
createPhase(client, input): Promise<ProjectPhase>
updatePhase(client, phaseId, input): Promise<void>
deletePhase(client, phaseId): Promise<void>
reorderPhases(client, items: { id, sort_order }[]): Promise<void>
```

### Tasks CRUD
```ts
createTask(client, input): Promise<PhaseTask>
updateTask(client, taskId, input): Promise<void>
deleteTask(client, taskId): Promise<void>
reorderTasks(client, items: { id, sort_order }[]): Promise<void>
```

### Task links
```ts
createTaskLink(client, input): Promise<TaskLink>
updateTaskLink(client, linkId, label): Promise<void>
deleteTaskLink(client, linkId): Promise<void>
```

### Logo (Supabase Storage)
```ts
uploadProjectLogo(client, userId, projectId, file): Promise<string>
// Returns public URL. Bucket: 'project-logos'. Path: '{userId}/{projectId}.{ext}'

deleteProjectLogo(client, userId, projectId, currentUrl): Promise<void>
```

---

## Zustand store — `src/stores/projects-store.ts`

### Estado
```ts
projects: ProjectListItem[]       // Lista para la vista /proyectos
activeProject: Project | null     // Proyecto abierto en /proyectos/[id]
loading: boolean
error: string | null
viewMode: 'list' | 'kanban'
filters: { status: string; search: string }
```

### Acciones principales
```ts
fetchProjects(userId): Promise<void>
fetchProject(projectId): Promise<void>
addProject(userId, input): Promise<Project | null>
editProject(projectId, input): Promise<void>   // optimistic + rollback
removeProject(projectId): Promise<void>         // optimistic + rollback

addPhase(input): Promise<void>
editPhase(phaseId, input): Promise<void>        // optimistic + rollback
removePhase(phaseId): Promise<void>             // optimistic + rollback

addTask(input): Promise<void>
editTask(taskId, input): Promise<void>          // optimistic + rollback
removeTask(taskId): Promise<void>               // optimistic + rollback

reorderPhasesAction(orderedIds): Promise<void>  // optimistic + rollback
reorderTasksAction(phaseId, orderedIds): Promise<void>

setViewMode(mode): void
setFilters(partial): void
clearActiveProject(): void
```

### Selectores
```ts
useFilteredProjects(): ProjectListItem[]
// Filtra por status + búsqueda de texto (name, stack, tags)

useProjectsByStatus(statuses: string[]): Record<string, ProjectListItem[]>
// Agrupa proyectos filtrados por nombre de estado — usado por Kanban
```

---

## Componentes — `src/components/modules/projects/`

| Componente | Archivo | Responsabilidad |
|---|---|---|
| `ProjectIcon` | `project-icon.tsx` | Renderiza icono Lucide por nombre. Exporta `ICON_MAP` con 76 iconos |
| `StatusBadge` | `status-badge.tsx` | Badge con color dinámico del estado del proyecto |
| `ProjectCard` | `project-card.tsx` | Card de lista: logo/icono, nombre, badge, stack, tags, progress, contadores. Soporta highlight de búsqueda |
| `ProjectsHeader` | `projects-header.tsx` | Título del módulo + stats inline + botón "Nuevo proyecto" |
| `ProjectsToolbar` | `projects-toolbar.tsx` | Pills lista/kanban + búsqueda con debounce 300ms + filtros por estado |
| `ProjectsList` | `projects-list.tsx` | Grid responsive de `ProjectCard` con empty state |
| `ProjectsKanban` | `projects-kanban.tsx` | Columnas dinámicas por estados del usuario (dnd-kit) |
| `ProjectsEmpty` | `projects-empty.tsx` | Empty state genérico o específico de búsqueda |
| `ProjectsLoading` | `projects-loading.tsx` | Skeleton cards para estado de carga |
| `ProjectsView` | `projects-view.tsx` | Orquestador: carga proyectos, tipos/estados, abre modal, muestra activity feed |
| `ProjectDetail` | `project-detail.tsx` | Detalle completo: 3 visualizaciones, CRUD fases/tareas inline, apuntes con debounce 800ms, drag & drop |
| `ProjectModal` | `project-modal.tsx` | Modal crear/editar: IconPicker (76 iconos), LogoUpload, TypeStatusSelect, preview |
| `ExportModal` | `export-modal.tsx` | Exportación Markdown/JSON con preview, copiar y descargar |
| `IconPicker` | `icon-picker.tsx` | Grid 8 cols, 5 categorías, búsqueda por nombre |
| `LogoUpload` | `logo-upload.tsx` | Drag & drop, validación tipo/tamaño, preview circular |
| `ConfirmModal` | `confirm-modal.tsx` | Modal reutilizable para acciones destructivas |
| `TypeStatusSelect` | `type-status-manager.tsx` | Select + botón "+" para crear tipo/estado inline con color picker |
| `ActivityFeed` | `activity-feed.tsx` | Feed de actividad reciente del módulo |

---

## Páginas

### `/proyectos` — `src/app/(dashboard)/proyectos/page.tsx`
Server Component. Obtiene el `userId` del usuario autenticado y renderiza `<ProjectsView userId={...} />`.

### `/proyectos/[id]` — `src/app/(dashboard)/proyectos/[id]/page.tsx`
Server Component. Pasa el `id` del proyecto y `userId` a `<ProjectDetail />`.

---

## Decisiones técnicas

- **Tipos y estados dinámicos**: No son enums fijos en SQL sino tablas `project_types` y `project_statuses` por usuario. Esto permite que cada usuario personalice su flujo de trabajo.
- **Optimistic updates**: Todas las mutaciones (edit, remove, reorder) aplican el cambio en el store inmediatamente y revierten si falla la llamada a Supabase, mostrando un Toast de error.
- **Drag & drop**: Implementado con `@dnd-kit/core` + `@dnd-kit/sortable`. Las fases y las tareas dentro de cada fase son reordenables independientemente. El reordenamiento persiste en Supabase actualizando `sort_order` de todos los items en una sola operación batch.
- **Logo storage**: Los logos se guardan en el bucket `project-logos` de Supabase Storage con la ruta `{userId}/{projectId}.{ext}`. Son imágenes públicas accedidas vía URL pública.
- **Apuntes con debounce**: El campo `content` de las tareas se guarda automáticamente tras 800ms de inactividad para evitar llamadas excesivas a la API.
- **Búsqueda client-side**: El filtrado de proyectos es completamente local sobre el array `projects[]` del store. No se hacen llamadas adicionales a Supabase al buscar.
