import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import type {
  Project,
  ProjectListItem,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectPhase,
  CreatePhaseInput,
  UpdatePhaseInput,
  PhaseTask,
  CreateTaskInput,
  UpdateTaskInput,
  TaskLink,
  CreateTaskLinkInput,
} from '@/types/projects';

type Client = SupabaseClient<Database>;

// Row types from Database
type ProjectRow = Database['public']['Tables']['projects']['Row'];
type PhaseRow = Database['public']['Tables']['project_phases']['Row'];
type TaskRow = Database['public']['Tables']['phase_tasks']['Row'];
type LinkRow = Database['public']['Tables']['task_links']['Row'];

// ─── Error helper ─────────────────────

class ProjectsError extends Error {
  constructor(message: string, public readonly detail?: string) {
    super(message);
    this.name = 'ProjectsError';
  }
}

function assertData<T>(
  result: { data: unknown; error: { message: string } | null },
  context: string
): T {
  if (result.error) {
    throw new ProjectsError(context, result.error.message);
  }
  if (result.data === null || result.data === undefined) {
    throw new ProjectsError(`${context}: no data returned`);
  }
  return result.data as T;
}

function assertNoError(
  result: { error: { message: string } | null },
  context: string
): void {
  if (result.error) {
    throw new ProjectsError(context, result.error.message);
  }
}

// ─── Row → Domain mappers ─────────────

function mapProject(row: ProjectRow, phases: ProjectPhase[] = []): Project {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    icon: row.icon,
    type: row.type as Project['type'],
    status: row.status as Project['status'],
    stack: row.stack ?? [],
    tags: row.tags ?? [],
    start_date: row.start_date,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    phases,
  };
}

function mapPhase(row: PhaseRow, tasks: PhaseTask[] = []): ProjectPhase {
  return {
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    status: row.status as ProjectPhase['status'],
    notes: row.notes ?? '',
    sort_order: row.sort_order,
    created_at: row.created_at,
    tasks,
  };
}

function mapTask(row: TaskRow, links: TaskLink[] = []): PhaseTask {
  return {
    id: row.id,
    phase_id: row.phase_id,
    text: row.text,
    done: row.done,
    priority: row.priority as PhaseTask['priority'],
    content: row.content ?? '',
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    links,
  };
}

// ══════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════

export async function getProjects(client: Client, userId: string): Promise<ProjectListItem[]> {
  const result = await client
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  const projects = assertData<ProjectRow[]>(result, 'Error fetching projects');

  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) return [];

  // Fetch phase + task counts
  const phasesResult = await client
    .from('project_phases')
    .select('id, project_id')
    .in('project_id', projectIds);

  const phaseRows = (phasesResult.data ?? []) as Array<{ id: string; project_id: string }>;
  const phaseIds = phaseRows.map((p) => p.id);

  let taskRows: Array<{ id: string; phase_id: string; done: boolean }> = [];
  if (phaseIds.length > 0) {
    const tasksResult = await client
      .from('phase_tasks')
      .select('id, phase_id, done')
      .in('phase_id', phaseIds);
    taskRows = (tasksResult.data ?? []) as Array<{ id: string; phase_id: string; done: boolean }>;
  }

  // Build phase_id → project_id map
  const phaseProjectMap = new Map<string, string>();
  for (const p of phaseRows) {
    phaseProjectMap.set(p.id, p.project_id);
  }

  // Build count map
  const countMap = new Map<string, { phaseCount: number; taskCount: number; doneCount: number }>();
  for (const p of phaseRows) {
    const entry = countMap.get(p.project_id) ?? { phaseCount: 0, taskCount: 0, doneCount: 0 };
    entry.phaseCount++;
    countMap.set(p.project_id, entry);
  }
  for (const t of taskRows) {
    const projectId = phaseProjectMap.get(t.phase_id);
    if (!projectId) continue;
    const entry = countMap.get(projectId) ?? { phaseCount: 0, taskCount: 0, doneCount: 0 };
    entry.taskCount++;
    if (t.done) entry.doneCount++;
    countMap.set(projectId, entry);
  }

  return projects.map((row) => {
    const counts = countMap.get(row.id) ?? { phaseCount: 0, taskCount: 0, doneCount: 0 };
    return {
      ...mapProject(row),
      phase_count: counts.phaseCount,
      task_count: counts.taskCount,
      done_task_count: counts.doneCount,
    };
  });
}

export async function getProject(client: Client, projectId: string): Promise<Project> {
  const result = await client
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  const projectRow = assertData<ProjectRow>(result, 'Error fetching project');

  // Fetch phases
  const phasesResult = await client
    .from('project_phases')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  const phaseRows = (phasesResult.data ?? []) as PhaseRow[];

  // Fetch tasks for all phases
  const phaseIds = phaseRows.map((p) => p.id);
  let taskRows: TaskRow[] = [];
  let linkRows: LinkRow[] = [];

  if (phaseIds.length > 0) {
    const tasksResult = await client
      .from('phase_tasks')
      .select('*')
      .in('phase_id', phaseIds)
      .order('sort_order', { ascending: true });

    taskRows = (tasksResult.data ?? []) as TaskRow[];

    const taskIds = taskRows.map((t) => t.id);
    if (taskIds.length > 0) {
      const linksResult = await client
        .from('task_links')
        .select('*')
        .in('task_id', taskIds)
        .order('sort_order', { ascending: true });

      linkRows = (linksResult.data ?? []) as LinkRow[];
    }
  }

  // Build link map: task_id → links
  const linkMap = new Map<string, TaskLink[]>();
  for (const link of linkRows) {
    const arr = linkMap.get(link.task_id) ?? [];
    arr.push(link as TaskLink);
    linkMap.set(link.task_id, arr);
  }

  // Build task map: phase_id → tasks
  const taskMap = new Map<string, PhaseTask[]>();
  for (const task of taskRows) {
    const arr = taskMap.get(task.phase_id) ?? [];
    arr.push(mapTask(task, linkMap.get(task.id) ?? []));
    taskMap.set(task.phase_id, arr);
  }

  const phases = phaseRows.map((p) => mapPhase(p, taskMap.get(p.id) ?? []));
  return mapProject(projectRow, phases);
}

export async function createProject(
  client: Client,
  userId: string,
  input: CreateProjectInput
): Promise<Project> {
  const projectResult = await client
    .from('projects')
    .insert({
      user_id: userId,
      name: input.name,
      icon: input.icon ?? 'Box',
      type: input.type ?? 'Web',
      status: input.status ?? 'idea',
      stack: input.stack ?? [],
      tags: input.tags ?? [],
      start_date: input.start_date ?? null,
    })
    .select()
    .single();

  const project = assertData<ProjectRow>(projectResult, 'Error creating project');

  // Create default phases
  const defaultPhases = ['Planificación', 'Diseño', 'Desarrollo', 'Testing', 'Deploy'];
  const phasesInsert = defaultPhases.map((name, i) => ({
    project_id: project.id,
    name,
    sort_order: i,
  }));

  const phasesResult = await client
    .from('project_phases')
    .insert(phasesInsert)
    .select();

  const phaseRows = assertData<PhaseRow[]>(phasesResult, 'Error creating default phases');
  const phases = phaseRows.map((p) => mapPhase(p));

  return mapProject(project, phases);
}

export async function updateProject(
  client: Client,
  projectId: string,
  input: UpdateProjectInput
): Promise<Project> {
  const result = await client
    .from('projects')
    .update(input)
    .eq('id', projectId)
    .select()
    .single();

  assertData<ProjectRow>(result, 'Error updating project');
  return getProject(client, projectId);
}

export async function deleteProject(client: Client, projectId: string): Promise<void> {
  assertNoError(
    await client.from('projects').delete().eq('id', projectId),
    'Error deleting project'
  );
}

// ══════════════════════════════════════
// PHASES
// ══════════════════════════════════════

export async function createPhase(
  client: Client,
  input: CreatePhaseInput
): Promise<ProjectPhase> {
  const result = await client
    .from('project_phases')
    .insert({
      project_id: input.project_id,
      name: input.name,
      status: input.status ?? 'pending',
      notes: input.notes ?? '',
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  const phase = assertData<PhaseRow>(result, 'Error creating phase');
  return mapPhase(phase);
}

export async function updatePhase(
  client: Client,
  phaseId: string,
  input: UpdatePhaseInput
): Promise<void> {
  assertNoError(
    await client.from('project_phases').update(input).eq('id', phaseId),
    'Error updating phase'
  );
}

export async function deletePhase(client: Client, phaseId: string): Promise<void> {
  assertNoError(
    await client.from('project_phases').delete().eq('id', phaseId),
    'Error deleting phase'
  );
}

// ══════════════════════════════════════
// TASKS
// ══════════════════════════════════════

export async function createTask(
  client: Client,
  input: CreateTaskInput
): Promise<PhaseTask> {
  const result = await client
    .from('phase_tasks')
    .insert({
      phase_id: input.phase_id,
      text: input.text,
      priority: input.priority ?? 'none',
      content: input.content ?? '',
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  const task = assertData<TaskRow>(result, 'Error creating task');
  return mapTask(task);
}

export async function updateTask(
  client: Client,
  taskId: string,
  input: UpdateTaskInput
): Promise<void> {
  assertNoError(
    await client.from('phase_tasks').update(input).eq('id', taskId),
    'Error updating task'
  );
}

export async function deleteTask(client: Client, taskId: string): Promise<void> {
  assertNoError(
    await client.from('phase_tasks').delete().eq('id', taskId),
    'Error deleting task'
  );
}

export async function reorderTasks(
  client: Client,
  tasks: Array<{ id: string; sort_order: number }>
): Promise<void> {
  const updates = tasks.map((t) =>
    client.from('phase_tasks').update({ sort_order: t.sort_order }).eq('id', t.id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    throw new ProjectsError('Error reordering tasks', failed.error.message);
  }
}

// ══════════════════════════════════════
// TASK LINKS
// ══════════════════════════════════════

export async function addTaskLink(
  client: Client,
  input: CreateTaskLinkInput
): Promise<TaskLink> {
  const result = await client
    .from('task_links')
    .insert({
      task_id: input.task_id,
      url: input.url,
      label: input.label ?? '',
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  return assertData<LinkRow>(result, 'Error adding task link') as TaskLink;
}

export async function removeTaskLink(client: Client, linkId: string): Promise<void> {
  assertNoError(
    await client.from('task_links').delete().eq('id', linkId),
    'Error removing task link'
  );
}
