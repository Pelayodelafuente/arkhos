// ══════════════════════════════════════
// Arkhos — Projects Module Types
// ══════════════════════════════════════

// ─── Enums ────────────────────────────

export const PROJECT_TYPES = ['Web', 'CLI', 'API', 'Mobile', 'Script', 'Design', 'Other'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_STATUSES = ['active', 'paused', 'done', 'idea'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PHASE_STATUSES = ['pending', 'in-progress', 'done'] as const;
export type PhaseStatus = (typeof PHASE_STATUSES)[number];

export const TASK_PRIORITIES = ['none', 'low', 'medium', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// ─── Icon mapping by project type ─────

export const PROJECT_TYPE_ICONS: Record<ProjectType, string> = {
  Web: 'Globe',
  CLI: 'Terminal',
  API: 'Zap',
  Mobile: 'Smartphone',
  Script: 'Code',
  Design: 'Pen',
  Other: 'Box',
};

// ─── Status display config ────────────

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  active: { label: 'Activo', color: '#5B8C6A' },
  paused: { label: 'Pausado', color: '#9B7A4A' },
  done: { label: 'Completado', color: '#4A7A9B' },
  idea: { label: 'Idea', color: '#888780' },
};

export const PHASE_STATUS_CONFIG: Record<PhaseStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: '#888780' },
  'in-progress': { label: 'En progreso', color: '#C4704A' },
  done: { label: 'Completada', color: '#5B8C6A' },
};

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  none: { label: 'Sin prioridad', color: '#888780' },
  low: { label: 'Baja', color: '#4A7A9B' },
  medium: { label: 'Media', color: '#9B7A4A' },
  high: { label: 'Alta', color: '#C4704A' },
};

// ─── Domain models ────────────────────

export interface TaskLink {
  id: string;
  task_id: string;
  url: string;
  label: string;
  sort_order: number;
}

export interface PhaseTask {
  id: string;
  phase_id: string;
  text: string;
  done: boolean;
  priority: TaskPriority;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  links: TaskLink[];
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  status: PhaseStatus;
  notes: string;
  sort_order: number;
  created_at: string;
  tasks: PhaseTask[];
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  type: ProjectType;
  status: ProjectStatus;
  stack: string[];
  tags: string[];
  start_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  phases: ProjectPhase[];
}

// ─── Input types (for create/update) ──

export interface CreateProjectInput {
  name: string;
  icon?: string;
  type?: ProjectType;
  status?: ProjectStatus;
  stack?: string[];
  tags?: string[];
  start_date?: string | null;
}

export interface UpdateProjectInput {
  name?: string;
  icon?: string;
  type?: ProjectType;
  status?: ProjectStatus;
  stack?: string[];
  tags?: string[];
  start_date?: string | null;
  sort_order?: number;
}

export interface CreatePhaseInput {
  project_id: string;
  name: string;
  status?: PhaseStatus;
  notes?: string;
  sort_order?: number;
}

export interface UpdatePhaseInput {
  name?: string;
  status?: PhaseStatus;
  notes?: string;
  sort_order?: number;
}

export interface CreateTaskInput {
  phase_id: string;
  text: string;
  priority?: TaskPriority;
  content?: string;
  sort_order?: number;
}

export interface UpdateTaskInput {
  text?: string;
  done?: boolean;
  priority?: TaskPriority;
  content?: string;
  sort_order?: number;
}

export interface CreateTaskLinkInput {
  task_id: string;
  url: string;
  label?: string;
  sort_order?: number;
}

// ─── List item (without nested data) ──

export type ProjectListItem = Omit<Project, 'phases'> & {
  phase_count: number;
  task_count: number;
  done_task_count: number;
};

// ─── Default phases for new projects ──

export const DEFAULT_PHASES = [
  'Planificación',
  'Diseño',
  'Desarrollo',
  'Testing',
  'Deploy',
] as const;

// ─── View modes ───────────────────────

export type ViewMode = 'list' | 'kanban';

export interface ProjectFilters {
  status: ProjectStatus | 'all';
  tag: string | null;
  search: string;
}
