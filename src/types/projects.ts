// ══════════════════════════════════════
// Arkhos — Projects Module Types
// ══════════════════════════════════════

// ─── Phase & Task enums (unchanged) ──

export const PHASE_STATUSES = ['pending', 'in-progress', 'done'] as const;
export type PhaseStatus = (typeof PHASE_STATUSES)[number];

export const TASK_PRIORITIES = ['none', 'low', 'medium', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// ─── Phase/Task status display config ─

export const PHASE_STATUS_CONFIG: Record<PhaseStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: '#6B6F62' },
  'in-progress': { label: 'En progreso', color: '#8AAC7E' },
  done: { label: 'Completada', color: '#8AAC7E' },
};

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  none: { label: 'Sin prioridad', color: '#6B6F62' },
  low: { label: 'Baja', color: '#8AAC7E' },
  medium: { label: 'Media', color: '#C9A96E' },
  high: { label: 'Alta', color: '#C87A8A' },
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
  { name: 'Web', icon: 'Globe', color: '#8AAC7E' },
];

export const DEFAULT_PROJECT_STATUSES: Omit<CreateProjectStatusInput, 'sort_order'>[] = [
  { name: 'Idea', color: '#6B6F62', is_default: true },
  { name: 'Activo', color: '#8AAC7E' },
  { name: 'Pausado', color: '#C9A96E' },
  { name: 'Completado', color: '#8AAC7E' },
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
  logo_url: string | null;
  type: string;
  status: string;
  stack: string[];
  tags?: string[];
  start_date?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  phases: ProjectPhase[];
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

// ─── View modes ───────────────────────

export type ViewMode = 'list' | 'kanban';

export interface ProjectFilters {
  status: string;
  search: string;
}
