'use client';

import { useState, useMemo } from 'react';
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Search, Download,
  CheckSquare, Square, ChevronRight,
} from 'lucide-react';
import { useProjectsStore } from '@/stores/projects-store';
import {
  TASK_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
  TASK_STATUSES,
  TASK_PRIORITIES,
  type ProjectPhase,
  type PhaseTask,
  type TaskStatus,
  type TaskPriority,
} from '@/types/projects';

// ─── Helpers ─────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function isOverdue(date: string): boolean {
  return new Date(date) < new Date(new Date().toDateString());
}

function downloadCSV(rows: FlatTask[]) {
  const headers = ['Nombre','Fase','Prioridad','Estado','Inicio','Límite','Subtareas'];
  const lines = rows.map((r) => [
    `"${r.text.replace(/"/g, '""')}"`,
    `"${r.phaseName}"`,
    TASK_PRIORITY_CONFIG[r.priority].label,
    TASK_STATUS_CONFIG[r.status].label,
    r.start_date ?? '',
    r.due_date ?? '',
    `${r.subtasks.filter((s) => s.completed).length}/${r.subtasks.length}`,
  ].join(','));
  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tareas.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Types ───────────────────────────

interface FlatTask extends PhaseTask {
  phaseName: string;
  phaseId: string;
}

type SortColumn = 'text' | 'phaseName' | 'priority' | 'status' | 'start_date' | 'due_date' | 'subtasks';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<TaskPriority, number> = { none: 0, low: 1, medium: 2, high: 3, urgent: 4 };
const STATUS_ORDER: Record<TaskStatus, number> = { todo: 0, in_progress: 1, review: 2, done: 3 };

// ─── Sort icon ───────────────────────

function SortIcon({ col, sortCol, sortDir }: { col: SortColumn; sortCol: SortColumn; sortDir: SortDir }) {
  if (col !== sortCol) return <ChevronsUpDown size={12} className="text-text-tertiary opacity-50" />;
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-accent" />
    : <ChevronDown size={12} className="text-accent" />;
}

// ─── Props ───────────────────────────

interface TableViewProps {
  phases: ProjectPhase[];
  projectId: string;
  userId: string;
  onOpenTask: (task: PhaseTask) => void;
}

// ─── Main component ──────────────────

export default function TableView({ phases, projectId: _projectId, userId: _userId, onOpenTask }: TableViewProps) {
  const removeTask = useProjectsStore((s) => s.removeTask);
  const changeTaskStatus = useProjectsStore((s) => s.changeTaskStatus);

  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [sortCol, setSortCol] = useState<SortColumn>('text');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<TaskStatus>('in_progress');
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 50;

  // Flatten tasks from phases
  const allTasks = useMemo<FlatTask[]>(() =>
    phases.flatMap((phase) =>
      phase.tasks.map((task) => ({
        ...task,
        phaseName: phase.name,
        phaseId: phase.id,
      }))
    ), [phases]);

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allTasks.filter((t) => {
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (q && !t.text.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allTasks, search, filterPriority, filterStatus]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'text': cmp = a.text.localeCompare(b.text); break;
        case 'phaseName': cmp = a.phaseName.localeCompare(b.phaseName); break;
        case 'priority': cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]; break;
        case 'status': cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]; break;
        case 'start_date': cmp = (a.start_date ?? '').localeCompare(b.start_date ?? ''); break;
        case 'due_date': cmp = (a.due_date ?? '').localeCompare(b.due_date ?? ''); break;
        case 'subtasks': cmp = a.subtasks.length - b.subtasks.length; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortCol, sortDir]);

  // Pagination
  const paginated = sorted.slice(0, page * PAGE_SIZE);
  const hasMore = sorted.length > paginated.length;

  function handleSort(col: SortColumn) {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === paginated.length) setSelected(new Set());
    else setSelected(new Set(paginated.map((t) => t.id)));
  }

  async function handleBulkStatus() {
    for (const id of selected) {
      await changeTaskStatus(id, bulkStatus);
    }
    setSelected(new Set());
  }

  async function handleBulkDelete() {
    if (!confirmBulkDelete) {
      setConfirmBulkDelete(true);
      setTimeout(() => setConfirmBulkDelete(false), 3000);
      return;
    }
    for (const id of selected) {
      await removeTask(id);
    }
    setSelected(new Set());
    setConfirmBulkDelete(false);
  }

  const th = (col: SortColumn, label: string) => (
    <th
      className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-text-tertiary hover:text-foreground"
      onClick={() => handleSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </div>
    </th>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar tareas..."
            className="w-full rounded-md border border-border bg-card py-1.5 pl-8 pr-3 text-sm text-foreground placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>

        {/* Priority filter */}
        <select
          value={filterPriority}
          onChange={(e) => { setFilterPriority(e.target.value as TaskPriority | 'all'); setPage(1); }}
          className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
        >
          <option value="all">Todas las prioridades</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>{TASK_PRIORITY_CONFIG[p].label}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as TaskStatus | 'all'); setPage(1); }}
          className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
        >
          <option value="all">Todos los estados</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>{TASK_STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        {/* Export CSV */}
        <button
          onClick={() => downloadCSV(sorted)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
        >
          <Download size={13} strokeWidth={2} />
          CSV
        </button>

        {/* Count */}
        <span className="ml-auto text-xs text-text-tertiary font-mono">
          {filtered.length} tarea{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-sand px-3 py-2">
          <span className="text-xs font-medium text-foreground">{selected.size} seleccionadas</span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as TaskStatus)}
              className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>{TASK_STATUS_CONFIG[s].label}</option>
              ))}
            </select>
            <button
              onClick={handleBulkStatus}
              className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#a85838]"
            >
              Aplicar estado
            </button>
            <button
              onClick={handleBulkDelete}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                confirmBulkDelete
                  ? 'bg-red-600 text-white'
                  : 'border border-border bg-card text-text-secondary hover:border-red-300 hover:text-red-500'
              }`}
            >
              {confirmBulkDelete ? 'Confirmar eliminación' : 'Eliminar'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-text-tertiary">
          No hay tareas que coincidan con los filtros
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-sand/50">
                <th className="w-8 px-3 py-2">
                  <button onClick={toggleSelectAll} className="text-text-tertiary hover:text-foreground">
                    {selected.size === paginated.length && paginated.length > 0
                      ? <CheckSquare size={14} strokeWidth={2} className="text-accent" />
                      : <Square size={14} strokeWidth={2} />
                    }
                  </button>
                </th>
                {th('text', 'Nombre')}
                {th('phaseName', 'Fase')}
                {th('priority', 'Prioridad')}
                {th('status', 'Estado')}
                {th('start_date', 'Inicio')}
                {th('due_date', 'Límite')}
                {th('subtasks', 'Subtareas')}
                <th className="w-8 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((task) => {
                const isSelected = selected.has(task.id);
                const priorityColor = TASK_PRIORITY_CONFIG[task.priority].color;
                const statusColor = TASK_STATUS_CONFIG[task.status].color;
                const overdue = task.due_date && isOverdue(task.due_date) && !task.done;
                return (
                  <tr
                    key={task.id}
                    onClick={() => onOpenTask(task)}
                    className={`cursor-pointer border-b border-border/50 transition-colors last:border-b-0 hover:bg-sand/30 ${
                      isSelected ? 'bg-[rgba(196,112,74,0.04)]' : ''
                    } ${task.done ? 'opacity-60' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelect(task.id)}
                        className="text-text-tertiary hover:text-foreground"
                      >
                        {isSelected
                          ? <CheckSquare size={14} strokeWidth={2} className="text-accent" />
                          : <Square size={14} strokeWidth={2} />
                        }
                      </button>
                    </td>

                    {/* Name */}
                    <td className="px-3 py-2.5">
                      <span className={`text-sm font-medium ${task.done ? 'line-through text-text-tertiary' : 'text-foreground'}`}>
                        {task.text}
                      </span>
                    </td>

                    {/* Phase */}
                    <td className="px-3 py-2.5">
                      <span className="rounded-md bg-sand px-1.5 py-0.5 text-[10px] text-text-secondary">
                        {task.phaseName}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="px-3 py-2.5">
                      {task.priority !== 'none' && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: `${priorityColor}18`, color: priorityColor }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: priorityColor }} />
                          {TASK_PRIORITY_CONFIG[task.priority].label}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: statusColor }}
                      >
                        {TASK_STATUS_CONFIG[task.status].label}
                      </span>
                    </td>

                    {/* Start date */}
                    <td className="px-3 py-2.5">
                      {task.start_date && (
                        <span className="font-mono text-[10px] text-text-tertiary">
                          {formatDate(task.start_date)}
                        </span>
                      )}
                    </td>

                    {/* Due date */}
                    <td className="px-3 py-2.5">
                      {task.due_date && (
                        <span className={`font-mono text-[10px] ${overdue ? 'font-medium text-red-500' : 'text-text-tertiary'}`}>
                          {formatDate(task.due_date)}
                        </span>
                      )}
                    </td>

                    {/* Subtasks */}
                    <td className="px-3 py-2.5">
                      {task.subtasks.length > 0 && (
                        <span className="font-mono text-[10px] text-text-tertiary">
                          {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
                        </span>
                      )}
                    </td>

                    {/* Chevron */}
                    <td className="px-3 py-2.5">
                      <ChevronRight size={13} className="text-text-tertiary" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg border border-border bg-card py-2 text-xs text-text-secondary transition-colors hover:border-accent hover:text-accent"
        >
          Mostrar más ({sorted.length - paginated.length} restantes)
        </button>
      )}
    </div>
  );
}
