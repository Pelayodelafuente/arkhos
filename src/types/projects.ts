// ══════════════════════════════════════
// Arkhos — Projects Module Types
// ══════════════════════════════════════

// ─── Phase & Task enums (unchanged) ──

export const PHASE_STATUSES = ['pending', 'in-progress', 'done'] as const;
export type PhaseStatus = (typeof PHASE_STATUSES)[number];

export const TASK_PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// ─── Phase/Task status display config ─

export const PHASE_STATUS_CONFIG: Record<PhaseStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: '#9a7a5a' },
  'in-progress': { label: 'En progreso', color: '#C4704A' },
  done: { label: 'Completada', color: '#056b63' },
};

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  none: { label: 'Sin prioridad', color: '#9a7a5a' },
  low: { label: 'Baja', color: '#16a34a' },
  medium: { label: 'Media', color: '#ca8a04' },
  high: { label: 'Alta', color: '#ea580c' },
  urgent: { label: 'Urgente', color: '#dc2626' },
};

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: 'Pendiente', color: '#9a7a5a' },
  in_progress: { label: 'En progreso', color: '#c4704a' },
  review: { label: 'En revisión', color: '#9a6a28' },
  done: { label: 'Completada', color: '#056b63' },
};

// ─── Dynamic project type / status ────

export interface ProjectTypeRecord {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface ProjectStatusRecord {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface CreateProjectTypeInput {
  name: string;
  icon?: string;
  color?: string;
  sort_order?: number;
}

export interface CreateProjectStatusInput {
  name: string;
  color?: string;
  is_default?: boolean;
  sort_order?: number;
}

// ─── Default seeds for new users ──────

export const DEFAULT_PROJECT_TYPES: Omit<CreateProjectTypeInput, 'sort_order'>[] = [
  { name: 'Web', icon: 'Globe', color: '#c4704a' },
];

export const DEFAULT_PROJECT_STATUSES: Omit<CreateProjectStatusInput, 'sort_order'>[] = [
  { name: 'Idea', color: '#9a7a5a', is_default: true },
  { name: 'Activo', color: '#056b63' },
  { name: 'Pausado', color: '#9a6a28' },
  { name: 'Completado', color: '#c4704a' },
];

// ─── Icon picker categories ──────────

export const ICON_CATEGORIES = {
  Desarrollo: [
    'Code', 'Terminal', 'Cpu', 'Database', 'Globe', 'Server', 'GitBranch',
    'Package', 'Layers', 'Braces', 'FileCode', 'Webhook', 'MonitorSmartphone',
    'Bug', 'Binary',
  ],
  Diseño: [
    'Pen', 'Palette', 'Layout', 'Frame', 'Crop', 'Wand2', 'Paintbrush',
    'Shapes', 'Pencil', 'PenTool', 'Brush', 'Pipette', 'Ratio', 'Grid3x3',
    'Figma',
  ],
  Negocio: [
    'Briefcase', 'Building2', 'ChartBar', 'Target', 'Users', 'Handshake',
    'LineChart', 'PieChart', 'Presentation', 'DollarSign', 'TrendingUp',
    'BadgeDollarSign', 'Store', 'Scale', 'Megaphone',
  ],
  Personal: [
    'BookOpen', 'Camera', 'Music', 'Heart', 'Star', 'Rocket', 'Lightbulb',
    'Trophy', 'Compass', 'Map', 'Bike', 'Dumbbell', 'Gamepad2', 'Headphones',
    'GraduationCap',
  ],
  Otros: [
    'Box', 'Folder', 'Archive', 'Zap', 'Shield', 'Lock', 'Bell', 'Settings',
    'Wrench', 'Cog', 'Key', 'Plug', 'Wifi', 'Cloud', 'Download',
  ],
} as const;

export type IconCategory = keyof typeof ICON_CATEGORIES;

// ─── Subtask ──────────────────────────

export type Subtask = {
  id: string;
  title: string;
  completed: boolean;
}

// ─── Domain models ────────────────────

export interface TaskLink {
  id: string;
  task_id: string;
  url: string;
  label: string;
  sort_order: number;
}

export interface Tag {
  id: string;
  project_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface TaskTag {
  task_id: string;
  tag_id: string;
}

export interface PhaseTask {
  id: string;
  phase_id: string;
  text: string;
  done: boolean;
  priority: TaskPriority;
  status: TaskStatus;
  description: string;
  content: string;
  due_date: string | null;
  start_date: string | null;
  estimated_hours: number;
  tracked_seconds: number;
  labels: string[];
  subtasks: Subtask[];
  assigned_role: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  links: TaskLink[];
  tags?: Tag[];
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  status: PhaseStatus;
  notes: string;
  start_date: string | null;
  end_date: string | null;
  color: string;
  sort_order: number;
  created_at: string;
  tasks: PhaseTask[];
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  logo_url: string | null;
  type: string;
  status: string;
  stack: string[];
  tags?: string[];
  start_date: string | null;
  target_date: string | null;
  repository_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  phases: ProjectPhase[];
  links: ProjectLink[];
}

// ─── Input types (for create/update) ──

export interface CreateProjectInput {
  name: string;
  icon?: string;
  logo_url?: string | null;
  type?: string;
  status?: string;
  stack?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  icon?: string;
  logo_url?: string | null;
  type?: string;
  status?: string;
  stack?: string[];
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
  status?: TaskStatus;
  description?: string;
  priority?: TaskPriority;
  labels?: string[];
  content?: string;
  sort_order?: number;
}

export interface UpdateTaskInput {
  text?: string;
  done?: boolean;
  priority?: TaskPriority;
  status?: TaskStatus;
  description?: string;
  due_date?: string | null;
  start_date?: string | null;
  estimated_hours?: number;
  tracked_seconds?: number;
  labels?: string[];
  subtasks?: Subtask[];
  assigned_role?: string;
  color?: string;
  content?: string;
  sort_order?: number;
}

export interface CreateTaskLinkInput {
  task_id: string;
  url: string;
  label?: string;
  sort_order?: number;
}

// ─── Time tracking ───────────────────

export interface TimeEntry {
  id: string;
  task_id: string;
  project_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration: number;
  note: string | null;
  created_at: string;
}

export interface CreateTimeEntryInput {
  task_id: string;
  project_id: string;
  started_at: string;
  ended_at: string;
  duration: number;
  note?: string;
}

// ─── Project links ──────────────────

export interface ProjectLink {
  id: string;
  project_id: string;
  user_id: string;
  label: string;
  url: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface CreateProjectLinkInput {
  project_id: string;
  label: string;
  url: string;
  icon?: string;
  sort_order?: number;
}

export interface UpdateProjectLinkInput {
  label?: string;
  url?: string;
  icon?: string;
  sort_order?: number;
}

// ─── Project templates ──────────────

export interface TemplatePhase {
  name: string;
  sort_order: number;
  tasks: { text: string; priority: TaskPriority }[];
}

export interface ProjectTemplate {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  type: string;
  phases: TemplatePhase[];
  is_system: boolean;
  created_at: string;
}

// ─── Task comments ──────────────────

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

// ─── List item (without nested data) ──

export type ProjectListItem = Omit<Project, 'phases' | 'links'> & {
  phase_count: number;
  task_count: number;
  done_task_count: number;
};

// ─── View modes ───────────────────────

export type ViewMode = 'list' | 'kanban';

export type ProjectSortBy = 'recent' | 'name' | 'progress' | 'urgent';

export interface ProjectFilters {
  status: string;
  search: string;
  sortBy: ProjectSortBy;
}
