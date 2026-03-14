import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { logActivity } from '@/lib/supabase/activity';
import {
  getProjects,
  getProject,
  createProject as createProjectApi,
  updateProject as updateProjectApi,
  deleteProject as deleteProjectApi,
  createPhase as createPhaseApi,
  updatePhase as updatePhaseApi,
  deletePhase as deletePhaseApi,
  createTask as createTaskApi,
  updateTask as updateTaskApi,
  deleteTask as deleteTaskApi,
  reorderPhases as reorderPhasesApi,
  reorderTasks as reorderTasksApi,
} from '@/lib/supabase/projects';
import type {
  Project,
  ProjectListItem,
  CreateProjectInput,
  UpdateProjectInput,
  CreatePhaseInput,
  UpdatePhaseInput,
  CreateTaskInput,
  UpdateTaskInput,
  ViewMode,
  ProjectFilters,
} from '@/types/projects';
import { useUIStore } from './ui-store';

// ─── Store interface ──────────────────

interface ProjectsState {
  projects: ProjectListItem[];
  activeProject: Project | null;
  loading: boolean;
  error: string | null;
  viewMode: ViewMode;
  filters: ProjectFilters;
}

interface ProjectsActions {
  fetchProjects: (userId: string) => Promise<void>;
  fetchProject: (projectId: string) => Promise<void>;
  addProject: (userId: string, input: CreateProjectInput) => Promise<Project | null>;
  editProject: (projectId: string, input: UpdateProjectInput) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;

  addPhase: (input: CreatePhaseInput) => Promise<void>;
  editPhase: (phaseId: string, input: UpdatePhaseInput) => Promise<void>;
  removePhase: (phaseId: string) => Promise<void>;

  addTask: (input: CreateTaskInput) => Promise<void>;
  editTask: (taskId: string, input: UpdateTaskInput) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;

  reorderPhasesAction: (orderedIds: string[]) => Promise<void>;
  reorderTasksAction: (phaseId: string, orderedIds: string[]) => Promise<void>;

  setViewMode: (mode: ViewMode) => void;
  setFilters: (filters: Partial<ProjectFilters>) => void;
  clearActiveProject: () => void;
}

type ProjectsStore = ProjectsState & ProjectsActions;

// ─── Toast helper ─────────────────────

function toast(message: string, variant: 'success' | 'error') {
  useUIStore.getState().addToast(message, variant);
}

// ─── Store ────────────────────────────

export const useProjectsStore = create<ProjectsStore>((set, get) => ({
  // State
  projects: [],
  activeProject: null,
  loading: false,
  error: null,
  viewMode: 'list',
  filters: { status: 'all', search: '' },

  // ── Projects ────────────────────────

  fetchProjects: async (userId) => {
    set({ loading: true, error: null });
    try {
      const client = createClient();
      const projects = await getProjects(client, userId);
      set({ projects, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar proyectos';
      set({ error: msg, loading: false });
      toast(msg, 'error');
    }
  },

  fetchProject: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const client = createClient();
      const project = await getProject(client, projectId);
      set({ activeProject: project, loading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar proyecto';
      set({ error: msg, loading: false });
      toast(msg, 'error');
    }
  },

  addProject: async (userId, input) => {
    try {
      const client = createClient();
      const project = await createProjectApi(client, userId, input);

      // Optimistic: add to list
      const listItem: ProjectListItem = {
        ...project,
        phase_count: project.phases.length,
        task_count: 0,
        done_task_count: 0,
      };
      set((s) => ({ projects: [listItem, ...s.projects] }));
      logActivity(client, userId, 'proyectos', 'project_created', project.name);
      toast('Proyecto creado', 'success');
      return project;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear proyecto';
      toast(msg, 'error');
      return null;
    }
  },

  editProject: async (projectId, input) => {
    // Optimistic update in list
    const prev = get().projects;
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, ...input } : p
      ),
    }));

    try {
      const client = createClient();
      const updated = await updateProjectApi(client, projectId, input);
      set({ activeProject: updated });
      logActivity(client, updated.user_id, 'proyectos', 'project_edited', updated.name);
      toast('Proyecto actualizado', 'success');
    } catch (e) {
      set({ projects: prev });
      const msg = e instanceof Error ? e.message : 'Error al actualizar proyecto';
      toast(msg, 'error');
    }
  },

  removeProject: async (projectId) => {
    const prev = get().projects;
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== projectId),
    }));

    try {
      const client = createClient();
      const deleted = prev.find((p) => p.id === projectId);
      await deleteProjectApi(client, projectId);
      if (get().activeProject?.id === projectId) {
        set({ activeProject: null });
      }
      if (deleted) {
        logActivity(client, deleted.user_id, 'proyectos', 'project_deleted', deleted.name);
      }
      toast('Proyecto eliminado', 'success');
    } catch (e) {
      set({ projects: prev });
      const msg = e instanceof Error ? e.message : 'Error al eliminar proyecto';
      toast(msg, 'error');
    }
  },

  // ── Phases ──────────────────────────

  addPhase: async (input) => {
    try {
      const client = createClient();
      const phase = await createPhaseApi(client, input);
      const active = get().activeProject;
      if (active && active.id === input.project_id) {
        set({ activeProject: { ...active, phases: [...active.phases, phase] } });
      }
      toast('Fase creada', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear fase';
      toast(msg, 'error');
    }
  },

  editPhase: async (phaseId, input) => {
    const active = get().activeProject;
    if (!active) return;

    // Optimistic
    const prevPhases = active.phases;
    set({
      activeProject: {
        ...active,
        phases: active.phases.map((p) =>
          p.id === phaseId ? { ...p, ...input } : p
        ),
      },
    });

    try {
      const client = createClient();
      await updatePhaseApi(client, phaseId, input);
    } catch (e) {
      set({ activeProject: { ...active, phases: prevPhases } });
      const msg = e instanceof Error ? e.message : 'Error al actualizar fase';
      toast(msg, 'error');
    }
  },

  removePhase: async (phaseId) => {
    const active = get().activeProject;
    if (!active) return;

    const prevPhases = active.phases;
    set({
      activeProject: {
        ...active,
        phases: active.phases.filter((p) => p.id !== phaseId),
      },
    });

    try {
      const client = createClient();
      await deletePhaseApi(client, phaseId);
      toast('Fase eliminada', 'success');
    } catch (e) {
      set({ activeProject: { ...active, phases: prevPhases } });
      const msg = e instanceof Error ? e.message : 'Error al eliminar fase';
      toast(msg, 'error');
    }
  },

  // ── Tasks ───────────────────────────

  addTask: async (input) => {
    try {
      const client = createClient();
      const task = await createTaskApi(client, input);
      const active = get().activeProject;
      if (active) {
        set({
          activeProject: {
            ...active,
            phases: active.phases.map((p) =>
              p.id === input.phase_id
                ? { ...p, tasks: [...p.tasks, task] }
                : p
            ),
          },
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear tarea';
      toast(msg, 'error');
    }
  },

  editTask: async (taskId, input) => {
    const active = get().activeProject;
    if (!active) return;

    // Optimistic
    const prevPhases = active.phases;
    set({
      activeProject: {
        ...active,
        phases: active.phases.map((p) => ({
          ...p,
          tasks: p.tasks.map((t) =>
            t.id === taskId ? { ...t, ...input } : t
          ),
        })),
      },
    });

    try {
      const client = createClient();
      await updateTaskApi(client, taskId, input);
    } catch (e) {
      set({ activeProject: { ...active, phases: prevPhases } });
      const msg = e instanceof Error ? e.message : 'Error al actualizar tarea';
      toast(msg, 'error');
    }
  },

  removeTask: async (taskId) => {
    const active = get().activeProject;
    if (!active) return;

    const prevPhases = active.phases;
    set({
      activeProject: {
        ...active,
        phases: active.phases.map((p) => ({
          ...p,
          tasks: p.tasks.filter((t) => t.id !== taskId),
        })),
      },
    });

    try {
      const client = createClient();
      await deleteTaskApi(client, taskId);
    } catch (e) {
      set({ activeProject: { ...active, phases: prevPhases } });
      const msg = e instanceof Error ? e.message : 'Error al eliminar tarea';
      toast(msg, 'error');
    }
  },

  // ── Reorder ────────────────────────

  reorderPhasesAction: async (orderedIds) => {
    const active = get().activeProject;
    if (!active) return;

    const prevPhases = active.phases;
    const reordered = orderedIds
      .map((id) => active.phases.find((p) => p.id === id))
      .filter(Boolean) as typeof active.phases;
    const withOrder = reordered.map((p, i) => ({ ...p, sort_order: i }));

    set({ activeProject: { ...active, phases: withOrder } });

    try {
      const client = createClient();
      await reorderPhasesApi(client, withOrder.map((p, i) => ({ id: p.id, sort_order: i })));
    } catch (e) {
      set({ activeProject: { ...active, phases: prevPhases } });
      const msg = e instanceof Error ? e.message : 'Error al reordenar fases';
      toast(msg, 'error');
    }
  },

  reorderTasksAction: async (phaseId, orderedIds) => {
    const active = get().activeProject;
    if (!active) return;

    const prevPhases = active.phases;
    const phase = active.phases.find((p) => p.id === phaseId);
    if (!phase) return;

    const reordered = orderedIds
      .map((id) => phase.tasks.find((t) => t.id === id))
      .filter(Boolean) as typeof phase.tasks;
    const withOrder = reordered.map((t, i) => ({ ...t, sort_order: i }));

    set({
      activeProject: {
        ...active,
        phases: active.phases.map((p) =>
          p.id === phaseId ? { ...p, tasks: withOrder } : p
        ),
      },
    });

    try {
      const client = createClient();
      await reorderTasksApi(client, withOrder.map((t, i) => ({ id: t.id, sort_order: i })));
    } catch (e) {
      set({ activeProject: { ...active, phases: prevPhases } });
      const msg = e instanceof Error ? e.message : 'Error al reordenar tareas';
      toast(msg, 'error');
    }
  },

  // ── UI state ────────────────────────

  setViewMode: (mode) => set({ viewMode: mode }),

  setFilters: (partial) =>
    set((s) => ({ filters: { ...s.filters, ...partial } })),

  clearActiveProject: () => set({ activeProject: null }),
}));

// ─── Selectors ────────────────────────

export function useFilteredProjects(): ProjectListItem[] {
  const projects = useProjectsStore((s: ProjectsStore) => s.projects);
  const filters = useProjectsStore((s: ProjectsStore) => s.filters);

  return projects.filter((p) => {
    if (filters.status !== 'all' && p.status !== filters.status) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.stack.some((s) => s.toLowerCase().includes(q))
      );
    }
    return true;
  });
}

export function useProjectsByStatus(statuses: string[]): Record<string, ProjectListItem[]> {
  const filtered = useFilteredProjects();
  const result: Record<string, ProjectListItem[]> = {};
  for (const status of statuses) {
    result[status] = filtered.filter((p) => p.status === status);
  }
  return result;
}
