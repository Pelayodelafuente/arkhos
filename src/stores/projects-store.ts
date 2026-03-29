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
  createTimeEntry as createTimeEntryApi,
  createProjectLink as createProjectLinkApi,
  updateProjectLink as updateProjectLinkApi,
  deleteProjectLink as deleteProjectLinkApi,
  reorderProjectLinks as reorderProjectLinksApi,
  getTags as getTagsApi,
  createTag as createTagApi,
  updateTag as updateTagApi,
  deleteTag as deleteTagApi,
  addTagToTask as addTagToTaskApi,
  removeTagFromTask as removeTagFromTaskApi,
  getTaskComments as getTaskCommentsApi,
  addTaskComment as addTaskCommentApi,
  deleteTaskComment as deleteTaskCommentApi,
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
  TaskStatus,
  Subtask,
  CreateProjectLinkInput,
  UpdateProjectLinkInput,
  ProjectLink,
  Tag,
  TaskComment,
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
  activeTimeEntry: { taskId: string; startedAt: Date } | null;
  projectTags: Tag[];
  taskComments: Record<string, TaskComment[]>;
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

  // v2: Time tracking
  startTimer: (taskId: string) => void;
  stopTimer: (projectId: string, userId: string) => Promise<void>;

  // v2: Task status & subtasks
  changeTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  updateSubtasks: (taskId: string, subtasks: Subtask[]) => Promise<void>;

  // v2: Duplicate project
  duplicateProject: (userId: string) => Promise<string | null>;

  // v2: Project links
  addProjectLink: (userId: string, input: CreateProjectLinkInput) => Promise<void>;
  editProjectLink: (linkId: string, input: UpdateProjectLinkInput) => Promise<void>;
  removeProjectLink: (linkId: string) => Promise<void>;
  reorderProjectLinksAction: (orderedIds: string[]) => Promise<void>;

  // Tags
  fetchTags: (projectId: string) => Promise<void>;
  addTag: (projectId: string, name: string, color: string) => Promise<void>;
  updateTag: (tagId: string, data: { name?: string; color?: string }) => Promise<void>;
  removeTag: (tagId: string) => Promise<void>;
  addTagToTask: (taskId: string, tagId: string) => Promise<void>;
  removeTagFromTask: (taskId: string, tagId: string) => Promise<void>;

  // Task comments
  loadTaskComments: (taskId: string) => Promise<void>;
  addComment: (taskId: string, content: string) => Promise<void>;
  deleteComment: (taskId: string, commentId: string) => Promise<void>;

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
  filters: { status: 'all', search: '', sortBy: 'recent' as const },
  activeTimeEntry: null,
  projectTags: [],
  taskComments: {},

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

      // Also fetch tags for this project
      const tags = await getTagsApi(client, projectId);
      set({ projectTags: tags });
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
      logActivity(client, userId, 'proyectos', 'project_created', project.name, `project:${project.id}`);
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
      logActivity(client, updated.user_id, 'proyectos', 'project_edited', updated.name, `project:${projectId}`);
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
        logActivity(client, deleted.user_id, 'proyectos', 'project_deleted', deleted.name, `project:${projectId}`);
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

    // If done/status is being changed, recalculate phase status too
    const updatedPhases = active.phases.map((p) => {
      const updatedTasks = p.tasks.map((t) =>
        t.id === taskId ? { ...t, ...input } : t
      );
      const taskChanged = p.tasks.some((t) => t.id === taskId);
      if (!taskChanged || (input.done === undefined && input.status === undefined)) {
        return { ...p, tasks: updatedTasks };
      }
      const total = updatedTasks.length;
      const doneCount = updatedTasks.filter((t) => t.done).length;
      let phaseStatus: import('@/types/projects').PhaseStatus = p.status;
      if (total > 0) {
        if (doneCount === total) phaseStatus = 'done';
        else if (doneCount > 0) phaseStatus = 'in-progress';
        else phaseStatus = 'pending';
      }
      return { ...p, tasks: updatedTasks, status: phaseStatus };
    });

    set({ activeProject: { ...active, phases: updatedPhases } });

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

  // ── Time tracking (v2) ─────────────

  startTimer: (taskId) => {
    set({ activeTimeEntry: { taskId, startedAt: new Date() } });
  },

  stopTimer: async (projectId, userId) => {
    const entry = get().activeTimeEntry;
    if (!entry) return;

    const now = new Date();
    const duration = Math.round((now.getTime() - entry.startedAt.getTime()) / 1000);
    set({ activeTimeEntry: null });

    // Optimistic: add duration to task
    const active = get().activeProject;
    if (active) {
      set({
        activeProject: {
          ...active,
          phases: active.phases.map((p) => ({
            ...p,
            tasks: p.tasks.map((t) =>
              t.id === entry.taskId
                ? { ...t, tracked_seconds: t.tracked_seconds + duration }
                : t
            ),
          })),
        },
      });
    }

    try {
      const client = createClient();
      await createTimeEntryApi(client, userId, {
        task_id: entry.taskId,
        project_id: projectId,
        started_at: entry.startedAt.toISOString(),
        ended_at: now.toISOString(),
        duration,
      });
      toast('Tiempo registrado', 'success');
    } catch (e) {
      // Rollback tracked_seconds
      if (active) {
        set({
          activeProject: {
            ...active,
            phases: active.phases.map((p) => ({
              ...p,
              tasks: p.tasks.map((t) =>
                t.id === entry.taskId
                  ? { ...t, tracked_seconds: t.tracked_seconds }
                  : t
              ),
            })),
          },
        });
      }
      const msg = e instanceof Error ? e.message : 'Error al registrar tiempo';
      toast(msg, 'error');
    }
  },

  // ── Task status & subtasks (v2) ───

  changeTaskStatus: async (taskId, newStatus) => {
    const active = get().activeProject;
    if (!active) return;

    const prevPhases = active.phases;
    const done = newStatus === 'done';

    // Update task and auto-recalculate phase status
    const updatedPhases = active.phases.map((p) => {
      const updatedTasks = p.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, done } : t
      );
      const taskChanged = updatedTasks.some((t) => t.id === taskId);
      if (!taskChanged) return p;

      // Recalculate phase status based on tasks
      const total = updatedTasks.length;
      const doneCount = updatedTasks.filter((t) => t.done).length;
      let phaseStatus: import('@/types/projects').PhaseStatus = p.status;
      if (total > 0) {
        if (doneCount === total) phaseStatus = 'done';
        else if (doneCount > 0) phaseStatus = 'in-progress';
        else phaseStatus = 'pending';
      }
      return { ...p, tasks: updatedTasks, status: phaseStatus };
    });

    set({ activeProject: { ...active, phases: updatedPhases } });

    try {
      const client = createClient();
      await updateTaskApi(client, taskId, { status: newStatus, done });
    } catch (e) {
      set({ activeProject: { ...active, phases: prevPhases } });
      const msg = e instanceof Error ? e.message : 'Error al cambiar estado';
      toast(msg, 'error');
    }
  },

  updateSubtasks: async (taskId, subtasks) => {
    const active = get().activeProject;
    if (!active) return;

    const prevPhases = active.phases;
    set({
      activeProject: {
        ...active,
        phases: active.phases.map((p) => ({
          ...p,
          tasks: p.tasks.map((t) =>
            t.id === taskId ? { ...t, subtasks } : t
          ),
        })),
      },
    });

    try {
      const client = createClient();
      await updateTaskApi(client, taskId, { subtasks });
    } catch (e) {
      set({ activeProject: { ...active, phases: prevPhases } });
      const msg = e instanceof Error ? e.message : 'Error al actualizar subtareas';
      toast(msg, 'error');
    }
  },

  // ── Project links (v2) ───────────

  addProjectLink: async (userId, input) => {
    const active = get().activeProject;
    if (!active) return;

    try {
      const client = createClient();
      const link = await createProjectLinkApi(client, userId, input);
      set({
        activeProject: {
          ...active,
          links: [...(active.links || []), link],
        },
      });
      toast('Enlace añadido', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear enlace';
      toast(msg, 'error');
    }
  },

  editProjectLink: async (linkId, input) => {
    const active = get().activeProject;
    if (!active) return;

    const prevLinks = active.links || [];
    set({
      activeProject: {
        ...active,
        links: prevLinks.map((l) =>
          l.id === linkId ? { ...l, ...input } : l
        ),
      },
    });

    try {
      const client = createClient();
      await updateProjectLinkApi(client, linkId, input);
    } catch (e) {
      set({ activeProject: { ...active, links: prevLinks } });
      const msg = e instanceof Error ? e.message : 'Error al actualizar enlace';
      toast(msg, 'error');
    }
  },

  removeProjectLink: async (linkId) => {
    const active = get().activeProject;
    if (!active) return;

    const prevLinks = active.links || [];
    set({
      activeProject: {
        ...active,
        links: prevLinks.filter((l) => l.id !== linkId),
      },
    });

    try {
      const client = createClient();
      await deleteProjectLinkApi(client, linkId);
      toast('Enlace eliminado', 'success');
    } catch (e) {
      set({ activeProject: { ...active, links: prevLinks } });
      const msg = e instanceof Error ? e.message : 'Error al eliminar enlace';
      toast(msg, 'error');
    }
  },

  reorderProjectLinksAction: async (orderedIds) => {
    const active = get().activeProject;
    if (!active) return;

    const prevLinks = active.links || [];
    const reordered = orderedIds
      .map((id) => prevLinks.find((l) => l.id === id))
      .filter(Boolean) as ProjectLink[];
    const withOrder = reordered.map((l, i) => ({ ...l, sort_order: i }));

    set({ activeProject: { ...active, links: withOrder } });

    try {
      const client = createClient();
      await reorderProjectLinksApi(client, withOrder.map((l, i) => ({ id: l.id, sort_order: i })));
    } catch (e) {
      set({ activeProject: { ...active, links: prevLinks } });
      const msg = e instanceof Error ? e.message : 'Error al reordenar enlaces';
      toast(msg, 'error');
    }
  },

  // ── Tags ──────────────────────────

  fetchTags: async (projectId) => {
    try {
      const client = createClient();
      const tags = await getTagsApi(client, projectId);
      set({ projectTags: tags });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar etiquetas';
      toast(msg, 'error');
    }
  },

  addTag: async (projectId, name, color) => {
    try {
      const client = createClient();
      const tag = await createTagApi(client, projectId, name, color);
      set((s) => ({ projectTags: [...s.projectTags, tag] }));
      toast('Etiqueta creada', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear etiqueta';
      toast(msg, 'error');
    }
  },

  updateTag: async (tagId, data) => {
    const prev = get().projectTags;
    set((s) => ({
      projectTags: s.projectTags.map((t) =>
        t.id === tagId ? { ...t, ...data } : t
      ),
    }));

    try {
      const client = createClient();
      await updateTagApi(client, tagId, data);
    } catch (e) {
      set({ projectTags: prev });
      const msg = e instanceof Error ? e.message : 'Error al actualizar etiqueta';
      toast(msg, 'error');
    }
  },

  removeTag: async (tagId) => {
    const prev = get().projectTags;
    set((s) => ({
      projectTags: s.projectTags.filter((t) => t.id !== tagId),
    }));

    // Also remove this tag from any tasks in activeProject
    const active = get().activeProject;
    if (active) {
      set({
        activeProject: {
          ...active,
          phases: active.phases.map((p) => ({
            ...p,
            tasks: p.tasks.map((t) => ({
              ...t,
              tags: (t.tags ?? []).filter((tag) => tag.id !== tagId),
            })),
          })),
        },
      });
    }

    try {
      const client = createClient();
      await deleteTagApi(client, tagId);
      toast('Etiqueta eliminada', 'success');
    } catch (e) {
      set({ projectTags: prev });
      const msg = e instanceof Error ? e.message : 'Error al eliminar etiqueta';
      toast(msg, 'error');
    }
  },

  addTagToTask: async (taskId, tagId) => {
    const active = get().activeProject;
    if (!active) return;

    const tag = get().projectTags.find((t) => t.id === tagId);
    if (!tag) return;

    const prevPhases = active.phases;
    set({
      activeProject: {
        ...active,
        phases: active.phases.map((p) => ({
          ...p,
          tasks: p.tasks.map((t) =>
            t.id === taskId
              ? { ...t, tags: [...(t.tags ?? []), tag] }
              : t
          ),
        })),
      },
    });

    try {
      const client = createClient();
      await addTagToTaskApi(client, taskId, tagId);
    } catch (e) {
      set({ activeProject: { ...active, phases: prevPhases } });
      const msg = e instanceof Error ? e.message : 'Error al añadir etiqueta';
      toast(msg, 'error');
    }
  },

  removeTagFromTask: async (taskId, tagId) => {
    const active = get().activeProject;
    if (!active) return;

    const prevPhases = active.phases;
    set({
      activeProject: {
        ...active,
        phases: active.phases.map((p) => ({
          ...p,
          tasks: p.tasks.map((t) =>
            t.id === taskId
              ? { ...t, tags: (t.tags ?? []).filter((tag) => tag.id !== tagId) }
              : t
          ),
        })),
      },
    });

    try {
      const client = createClient();
      await removeTagFromTaskApi(client, taskId, tagId);
    } catch (e) {
      set({ activeProject: { ...active, phases: prevPhases } });
      const msg = e instanceof Error ? e.message : 'Error al quitar etiqueta';
      toast(msg, 'error');
    }
  },

  // ── Task comments ─────────────────

  loadTaskComments: async (taskId) => {
    try {
      const client = createClient();
      const comments = await getTaskCommentsApi(client, taskId);
      set((s) => ({
        taskComments: { ...s.taskComments, [taskId]: comments },
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar comentarios';
      toast(msg, 'error');
    }
  },

  addComment: async (taskId, content) => {
    try {
      const client = createClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) throw new Error('No autenticado');
      const comment = await addTaskCommentApi(client, taskId, user.id, content);
      set((s) => ({
        taskComments: {
          ...s.taskComments,
          [taskId]: [comment, ...(s.taskComments[taskId] ?? [])],
        },
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al añadir comentario';
      toast(msg, 'error');
    }
  },

  deleteComment: async (taskId, commentId) => {
    const prev = get().taskComments[taskId] ?? [];
    set((s) => ({
      taskComments: {
        ...s.taskComments,
        [taskId]: (s.taskComments[taskId] ?? []).filter((c) => c.id !== commentId),
      },
    }));

    try {
      const client = createClient();
      await deleteTaskCommentApi(client, commentId);
    } catch (e) {
      set((s) => ({
        taskComments: { ...s.taskComments, [taskId]: prev },
      }));
      const msg = e instanceof Error ? e.message : 'Error al eliminar comentario';
      toast(msg, 'error');
    }
  },

  // ── Duplicate project ───────────────

  duplicateProject: async (userId) => {
    const active = get().activeProject;
    if (!active) return null;

    try {
      const client = createClient();
      // Create new project
      const newProject = await createProjectApi(client, userId, {
        name: `${active.name} (copia)`,
        icon: active.icon,
        type: active.type,
        status: 'Idea',
        stack: active.stack,
      });

      // Copy phases and non-done tasks
      for (const phase of active.phases) {
        const newPhase = await createPhaseApi(client, {
          project_id: newProject.id,
          name: phase.name,
          status: 'pending',
          notes: phase.notes,
          sort_order: phase.sort_order,
        });

        const tasksToKeep = phase.tasks.filter((t) => t.status !== 'done');
        for (let i = 0; i < tasksToKeep.length; i++) {
          const t = tasksToKeep[i];
          await createTaskApi(client, {
            phase_id: newPhase.id,
            text: t.text,
            priority: t.priority,
            description: t.description,
            labels: t.labels,
            sort_order: i,
          });
        }
      }

      // Add to list
      const listItem: ProjectListItem = {
        ...newProject,
        phase_count: active.phases.length,
        task_count: active.phases.reduce((s, p) => s + p.tasks.filter((t) => t.status !== 'done').length, 0),
        done_task_count: 0,
      };
      set((s) => ({ projects: [listItem, ...s.projects] }));

      logActivity(client, userId, 'proyectos', 'project_duplicated', newProject.name, `project:${newProject.id}`);
      toast(`"${active.name}" duplicado`, 'success');
      return newProject.id;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al duplicar proyecto';
      toast(msg, 'error');
      return null;
    }
  },

  // ── UI state ────────────────────────

  setViewMode: (mode) => set({ viewMode: mode }),

  setFilters: (partial) =>
    set((s) => ({ filters: { ...s.filters, ...partial } })),

  clearActiveProject: () => set({ activeProject: null, projectTags: [], taskComments: {} }),
}));

// ─── Selectors ────────────────────────

export function useFilteredProjects(): ProjectListItem[] {
  const projects = useProjectsStore((s: ProjectsStore) => s.projects);
  const filters = useProjectsStore((s: ProjectsStore) => s.filters);

  let filtered = projects.filter((p) => {
    // Hide archived unless explicitly filtering for them
    if (filters.status !== 'Archivado' && p.status === 'Archivado') return false;
    if (filters.status !== 'all' && p.status !== filters.status) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q) ||
        p.stack.some((s) => s.toLowerCase().includes(q)) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Sort
  switch (filters.sortBy) {
    case 'name':
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'progress': {
      filtered = [...filtered].sort((a, b) => {
        const progA = a.task_count > 0 ? a.done_task_count / a.task_count : 0;
        const progB = b.task_count > 0 ? b.done_task_count / b.task_count : 0;
        return progB - progA;
      });
      break;
    }
    case 'urgent':
      filtered = [...filtered].sort((a, b) => {
        const statusOrder: Record<string, number> = { 'Activo': 0, 'Idea': 1, 'Pausado': 2, 'Completado': 3 };
        return (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
      });
      break;
    case 'recent':
    default:
      filtered = [...filtered].sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      break;
  }

  return filtered;
}

export function useProjectsByStatus(statuses: string[]): Record<string, ProjectListItem[]> {
  const filtered = useFilteredProjects();
  const result: Record<string, ProjectListItem[]> = {};
  for (const status of statuses) {
    result[status] = filtered.filter((p) => p.status === status);
  }
  return result;
}
