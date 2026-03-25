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
  ProjectTypeRecord,
  ProjectStatusRecord,
  CreateProjectTypeInput,
  CreateProjectStatusInput,
  Subtask,
  TimeEntry,
  CreateTimeEntryInput,
  ProjectLink,
  CreateProjectLinkInput,
  UpdateProjectLinkInput,
  ProjectTemplate,
  TemplatePhase,
} from '@/types/projects';

type Client = SupabaseClient<Database>;

// Row types from Database
type ProjectRow = Database['public']['Tables']['projects']['Row'];
type PhaseRow = Database['public']['Tables']['project_phases']['Row'];
type TaskRow = Database['public']['Tables']['phase_tasks']['Row'];
type LinkRow = Database['public']['Tables']['task_links']['Row'];
type TypeRow = Database['public']['Tables']['project_types']['Row'];
type StatusRow = Database['public']['Tables']['project_statuses']['Row'];
type TimeEntryRow = Database['public']['Tables']['project_time_entries']['Row'];
type ProjectLinkRow = Database['public']['Tables']['project_links']['Row'];
type TemplateRow = Database['public']['Tables']['project_templates']['Row'];

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

function mapProject(row: ProjectRow, phases: ProjectPhase[] = [], links: ProjectLink[] = []): Project {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    description: row.description ?? null,
    icon: row.icon,
    logo_url: row.logo_url,
    type: row.type,
    status: row.status,
    stack: row.stack ?? [],
    tags: row.tags ?? [],
    start_date: row.start_date ?? null,
    target_date: row.target_date ?? null,
    repository_url: row.repository_url ?? null,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    phases,
    links,
  };
}

function mapPhase(row: PhaseRow, tasks: PhaseTask[] = []): ProjectPhase {
  return {
    id: row.id,
    project_id: row.project_id,
    name: row.name,
    status: row.status as ProjectPhase['status'],
    notes: row.notes ?? '',
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    color: row.color ?? 'default',
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
    status: (row.status as PhaseTask['status']) ?? 'todo',
    description: row.description ?? '',
    content: row.content ?? '',
    due_date: row.due_date ?? null,
    start_date: row.start_date ?? null,
    estimated_hours: row.estimated_hours ?? 0,
    tracked_seconds: row.tracked_seconds ?? 0,
    labels: row.labels ?? [],
    subtasks: (row.subtasks as Subtask[]) ?? [],
    assigned_role: row.assigned_role ?? '',
    color: row.color ?? 'default',
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    links,
  };
}

// ══════════════════════════════════════
// PROJECT TYPES (user-defined)
// ══════════════════════════════════════

export async function getProjectTypes(client: Client, userId: string): Promise<ProjectTypeRecord[]> {
  const result = await client
    .from('project_types')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  return assertData<TypeRow[]>(result, 'Error fetching project types') as ProjectTypeRecord[];
}

export async function createProjectType(
  client: Client,
  userId: string,
  input: CreateProjectTypeInput
): Promise<ProjectTypeRecord> {
  const result = await client
    .from('project_types')
    .insert({
      user_id: userId,
      name: input.name,
      icon: input.icon ?? 'Box',
      color: input.color ?? '#888780',
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  return assertData<TypeRow>(result, 'Error creating project type') as ProjectTypeRecord;
}

export async function deleteProjectType(client: Client, typeId: string): Promise<void> {
  assertNoError(
    await client.from('project_types').delete().eq('id', typeId),
    'Error deleting project type'
  );
}

// ══════════════════════════════════════
// PROJECT STATUSES (user-defined)
// ══════════════════════════════════════

export async function getProjectStatuses(client: Client, userId: string): Promise<ProjectStatusRecord[]> {
  const result = await client
    .from('project_statuses')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  return assertData<StatusRow[]>(result, 'Error fetching project statuses') as ProjectStatusRecord[];
}

export async function createProjectStatus(
  client: Client,
  userId: string,
  input: CreateProjectStatusInput
): Promise<ProjectStatusRecord> {
  const result = await client
    .from('project_statuses')
    .insert({
      user_id: userId,
      name: input.name,
      color: input.color ?? '#888780',
      is_default: input.is_default ?? false,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  return assertData<StatusRow>(result, 'Error creating project status') as ProjectStatusRecord;
}

export async function deleteProjectStatus(client: Client, statusId: string): Promise<void> {
  assertNoError(
    await client.from('project_statuses').delete().eq('id', statusId),
    'Error deleting project status'
  );
}

/** Seed default types and statuses for a new user (if they have none). */
export async function seedUserDefaults(
  client: Client,
  userId: string,
  defaults: {
    types: Array<{ name: string; icon?: string; color?: string }>;
    statuses: Array<{ name: string; color?: string; is_default?: boolean }>;
  }
): Promise<void> {
  const [existingTypes, existingStatuses] = await Promise.all([
    client.from('project_types').select('id').eq('user_id', userId).limit(1),
    client.from('project_statuses').select('id').eq('user_id', userId).limit(1),
  ]);

  if (!existingTypes.data?.length) {
    const inserts = defaults.types.map((t, i) => ({
      user_id: userId,
      name: t.name,
      icon: t.icon ?? 'Box',
      color: t.color ?? '#888780',
      sort_order: i,
    }));
    await client.from('project_types').insert(inserts);
  }

  if (!existingStatuses.data?.length) {
    const inserts = defaults.statuses.map((s, i) => ({
      user_id: userId,
      name: s.name,
      color: s.color ?? '#888780',
      is_default: s.is_default ?? false,
      sort_order: i,
    }));
    await client.from('project_statuses').insert(inserts);
  }
}

// ══════════════════════════════════════
// PROJECT LOGO (Supabase Storage)
// ══════════════════════════════════════

export async function uploadProjectLogo(
  client: Client,
  userId: string,
  projectId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png';
  const path = `${userId}/${projectId}.${ext}`;

  const { error } = await client.storage
    .from('project-logos')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new ProjectsError('Error uploading logo', error.message);

  const { data } = client.storage.from('project-logos').getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteProjectLogo(
  client: Client,
  userId: string,
  projectId: string,
  currentUrl: string
): Promise<void> {
  // Extract file path from the public URL
  const parts = currentUrl.split('/project-logos/');
  const filePath = parts[1];
  if (!filePath) return;

  const { error } = await client.storage.from('project-logos').remove([filePath]);
  if (error) throw new ProjectsError('Error deleting logo', error.message);

  // Clear logo_url on the project
  assertNoError(
    await client.from('projects').update({ logo_url: null }).eq('id', projectId),
    'Error clearing logo_url'
  );
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

  // Fetch project links
  const projectLinksResult = await client
    .from('project_links')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  const projectLinks = (projectLinksResult.data ?? []) as ProjectLinkRow[] as ProjectLink[];

  const phases = phaseRows.map((p) => mapPhase(p, taskMap.get(p.id) ?? []));
  return mapProject(projectRow, phases, projectLinks);
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
      status: input.status ?? 'Idea',
      stack: input.stack ?? [],
      tags: [],
      logo_url: input.logo_url ?? null,
    })
    .select()
    .single();

  const project = assertData<ProjectRow>(projectResult, 'Error creating project');

  // No default phases — user creates their own
  return mapProject(project, []);
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

export async function reorderPhases(
  client: Client,
  phases: Array<{ id: string; sort_order: number }>
): Promise<void> {
  const updates = phases.map((p) =>
    client.from('project_phases').update({ sort_order: p.sort_order }).eq('id', p.id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    throw new ProjectsError('Error reordering phases', failed.error.message);
  }
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

// ══════════════════════════════════════
// TIME ENTRIES
// ══════════════════════════════════════

export async function getTimeEntries(client: Client, projectId: string): Promise<TimeEntry[]> {
  const result = await client
    .from('project_time_entries')
    .select('*')
    .eq('project_id', projectId)
    .order('started_at', { ascending: false });

  return assertData<TimeEntryRow[]>(result, 'Error fetching time entries') as TimeEntry[];
}

export async function createTimeEntry(
  client: Client,
  userId: string,
  input: CreateTimeEntryInput
): Promise<TimeEntry> {
  const result = await client
    .from('project_time_entries')
    .insert({
      user_id: userId,
      task_id: input.task_id,
      project_id: input.project_id,
      started_at: input.started_at,
      ended_at: input.ended_at,
      duration: input.duration,
      note: input.note ?? null,
    })
    .select()
    .single();

  return assertData<TimeEntryRow>(result, 'Error creating time entry') as TimeEntry;
}

export async function deleteTimeEntry(client: Client, entryId: string): Promise<void> {
  assertNoError(
    await client.from('project_time_entries').delete().eq('id', entryId),
    'Error deleting time entry'
  );
}

export async function getTaskTimeEntries(client: Client, taskId: string): Promise<TimeEntry[]> {
  const result = await client
    .from('project_time_entries')
    .select('*')
    .eq('task_id', taskId)
    .order('started_at', { ascending: false });

  return assertData<TimeEntryRow[]>(result, 'Error fetching task time entries') as TimeEntry[];
}

// ══════════════════════════════════════
// PROJECT LINKS
// ══════════════════════════════════════

export async function getProjectLinks(client: Client, projectId: string): Promise<ProjectLink[]> {
  const result = await client
    .from('project_links')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  return assertData<ProjectLinkRow[]>(result, 'Error fetching project links') as ProjectLink[];
}

export async function createProjectLink(
  client: Client,
  userId: string,
  input: CreateProjectLinkInput
): Promise<ProjectLink> {
  const result = await client
    .from('project_links')
    .insert({
      user_id: userId,
      project_id: input.project_id,
      label: input.label,
      url: input.url,
      icon: input.icon ?? 'Link',
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();

  return assertData<ProjectLinkRow>(result, 'Error creating project link') as ProjectLink;
}

export async function updateProjectLink(
  client: Client,
  linkId: string,
  input: UpdateProjectLinkInput
): Promise<void> {
  assertNoError(
    await client.from('project_links').update(input).eq('id', linkId),
    'Error updating project link'
  );
}

export async function deleteProjectLink(client: Client, linkId: string): Promise<void> {
  assertNoError(
    await client.from('project_links').delete().eq('id', linkId),
    'Error deleting project link'
  );
}

export async function reorderProjectLinks(
  client: Client,
  links: Array<{ id: string; sort_order: number }>
): Promise<void> {
  const updates = links.map((l) =>
    client.from('project_links').update({ sort_order: l.sort_order }).eq('id', l.id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    throw new ProjectsError('Error reordering project links', failed.error.message);
  }
}

// ══════════════════════════════════════
// PROJECT TEMPLATES
// ══════════════════════════════════════

export async function getProjectTemplates(client: Client, userId: string): Promise<ProjectTemplate[]> {
  const result = await client
    .from('project_templates')
    .select('*')
    .or(`user_id.eq.${userId},is_system.eq.true`)
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: false });

  const rows = assertData<TemplateRow[]>(result, 'Error fetching project templates');
  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    description: row.description ?? null,
    type: row.type,
    phases: (row.phases as unknown as TemplatePhase[]) ?? [],
    is_system: row.is_system,
    created_at: row.created_at,
  }));
}

export async function createProjectTemplate(
  client: Client,
  userId: string,
  input: { name: string; description?: string; type: string; phases: TemplatePhase[] }
): Promise<ProjectTemplate> {
  const result = await client
    .from('project_templates')
    .insert({
      user_id: userId,
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      phases: JSON.parse(JSON.stringify(input.phases)),
      is_system: false,
    })
    .select()
    .single();

  const row = assertData<TemplateRow>(result, 'Error creating project template');
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    description: row.description ?? null,
    type: row.type,
    phases: (row.phases as unknown as TemplatePhase[]) ?? [],
    is_system: row.is_system,
    created_at: row.created_at,
  };
}

export async function deleteProjectTemplate(client: Client, templateId: string): Promise<void> {
  assertNoError(
    await client.from('project_templates').delete().eq('id', templateId),
    'Error deleting project template'
  );
}

// ══════════════════════════════════════
// CONTEXT PANEL QUERIES
// ══════════════════════════════════════

export interface UpcomingDeadline {
  task_text: string;
  due_date: string;
  project_name: string;
  project_id: string;
}

export async function getUpcomingDeadlines(
  client: Client,
  userId: string,
  limit = 5
): Promise<UpcomingDeadline[]> {
  const result = await client
    .from('phase_tasks')
    .select(`
      text,
      due_date,
      status,
      project_phases!inner (
        project_id,
        projects!inner (
          id,
          name,
          user_id
        )
      )
    `)
    .not('due_date', 'is', null)
    .neq('status', 'done')
    .order('due_date', { ascending: true })
    .limit(limit * 3); // over-fetch to account for user filtering

  interface DeadlineRow {
    text: string;
    due_date: string;
    status: string;
    project_phases: {
      project_id: string;
      projects: {
        id: string;
        name: string;
        user_id: string;
      };
    };
  }

  const rows = (result.data ?? []) as DeadlineRow[];
  return rows
    .filter((r) => r.project_phases?.projects?.user_id === userId)
    .slice(0, limit)
    .map((r) => ({
      task_text: r.text,
      due_date: r.due_date,
      project_name: r.project_phases?.projects?.name ?? '',
      project_id: r.project_phases?.projects?.id ?? '',
    }));
}

export interface WeeklySummary {
  tasksCompleted: number;
  secondsTracked: number;
}

export async function getWeeklySummary(
  client: Client,
  userId: string
): Promise<WeeklySummary> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoISO = weekAgo.toISOString();

  // Count tasks completed this week
  const tasksResult = await client
    .from('phase_tasks')
    .select('id, project_phases!inner(project_id, projects!inner(user_id))')
    .eq('status', 'done')
    .gte('updated_at', weekAgoISO);

  interface TaskCountRow {
    id: string;
    project_phases: {
      project_id: string;
      projects: {
        user_id: string;
      };
    };
  }

  const taskRows = (tasksResult.data ?? []) as TaskCountRow[];
  const tasksCompleted = taskRows.filter(
    (r) => r.project_phases?.projects?.user_id === userId
  ).length;

  // Sum time tracked this week
  const timeResult = await client
    .from('project_time_entries')
    .select('duration')
    .eq('user_id', userId)
    .gte('started_at', weekAgoISO);

  const timeRows = (timeResult.data ?? []) as Array<{ duration: number }>;
  const secondsTracked = timeRows.reduce((sum, r) => sum + (r.duration ?? 0), 0);

  return { tasksCompleted, secondsTracked };
}
