"use client";

import { useState } from "react";
import { Copy, Download, FileText, Braces } from "lucide-react";
import { Modal, Button } from "@/components/ui";
import { useUIStore } from "@/stores/ui-store";
import { useToast } from "@/stores/ui-store";
import type { Project, TaskPriority, PhaseStatus } from "@/types/projects";

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  none: "",
  low: "baja",
  medium: "media",
  high: "alta",
  urgent: "urgente",
};

const PHASE_STATUS_LABELS: Record<PhaseStatus, string> = {
  pending: "Pendiente",
  "in-progress": "En progreso",
  done: "Completada",
};

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  return `${day} ${months[d.getMonth()]}`;
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES");
}

function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

interface ExportModalProps {
  project: Project | null;
}

type ExportFormat = "markdown" | "json";

export function ExportModal({ project }: ExportModalProps) {
  const activeModal = useUIStore((s) => s.activeModal);
  const closeModal = useUIStore((s) => s.closeModal);
  const toast = useToast();
  const [format, setFormat] = useState<ExportFormat>("markdown");

  const isOpen = activeModal === "export-project" && !!project;

  if (!project) return null;

  function generateMarkdown(): string {
    if (!project) return "";
    const lines: string[] = [];

    // Title + description
    lines.push(`# ${project.name}`);
    if (project.description) {
      lines.push(`> ${project.description}`);
    }
    lines.push("");

    // Metadata line
    const meta: string[] = [];
    meta.push(`**Estado:** ${project.status}`);
    meta.push(`**Tipo:** ${project.type}`);
    if (project.stack.length > 0) {
      meta.push(`**Stack:** ${project.stack.join(", ")}`);
    }
    lines.push(meta.join(" · "));

    // Dates line
    const dates: string[] = [];
    if (project.start_date) {
      dates.push(`**Inicio:** ${formatDateLong(project.start_date)}`);
    }
    if (project.target_date) {
      dates.push(`**Objetivo:** ${formatDateLong(project.target_date)}`);
    }
    if (dates.length > 0) {
      lines.push(dates.join(" · "));
    }
    lines.push("");

    // Progress
    const totalTasks = project.phases.reduce((s, p) => s + p.tasks.length, 0);
    const doneTasks = project.phases.reduce(
      (s, p) => s + p.tasks.filter((t) => t.done).length,
      0
    );
    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    lines.push("## Progreso");
    lines.push(`${doneTasks}/${totalTasks} tareas completadas (${progress}%)`);
    lines.push("");

    // Phases
    lines.push("## Fases");
    lines.push("");
    for (const phase of project.phases) {
      const phaseLabel = PHASE_STATUS_LABELS[phase.status] || phase.status;
      const phaseDone = phase.tasks.filter((t) => t.done).length;
      const phaseTotal = phase.tasks.length;

      lines.push(`### ${phase.name}`);
      lines.push(`**Estado:** ${phaseLabel} · **Progreso:** ${phaseDone}/${phaseTotal} tareas`);
      if (phase.notes) {
        lines.push(`> ${phase.notes}`);
      }
      lines.push("");

      for (const task of phase.tasks) {
        const check = task.done ? "x" : " ";
        let suffix = "";
        if (task.due_date) {
          suffix += ` (due: ${formatDateShort(task.due_date)})`;
        }
        if (task.priority !== "none") {
          suffix += ` (${PRIORITY_LABELS[task.priority]} prioridad)`;
        }
        lines.push(`- [${check}] ${task.text}${suffix}`);

        // Subtasks
        for (const sub of task.subtasks) {
          const subCheck = sub.completed ? "x" : " ";
          lines.push(`  - [${subCheck}] ${sub.title}`);
        }
      }
      lines.push("");
    }

    // Time tracking
    const totalSeconds = project.phases.reduce(
      (s, p) => s + p.tasks.reduce((ts, t) => ts + t.tracked_seconds, 0),
      0
    );
    if (totalSeconds > 0) {
      lines.push("## Tiempo invertido");
      lines.push(`Total: ${formatTime(totalSeconds)}`);
      lines.push("");
    }

    // Project links
    if (project.links.length > 0) {
      lines.push("## Enlaces");
      for (const link of project.links) {
        lines.push(`- [${link.label || link.url}](${link.url})`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  function generateJson(): string {
    if (!project) return "{}";
    return JSON.stringify(project, null, 2);
  }

  const content = format === "markdown" ? generateMarkdown() : generateJson();

  function handleCopy() {
    navigator.clipboard.writeText(content);
    toast.success("Copiado al portapapeles");
  }

  function handleDownload() {
    if (!project) return;
    const ext = format === "markdown" ? "md" : "json";
    const mime = format === "markdown" ? "text/markdown" : "application/json";
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Archivo descargado");
  }

  return (
    <Modal
      open={isOpen}
      onClose={closeModal}
      title="Exportar proyecto"
      className="max-w-lg"
    >
      {/* Format toggle */}
      <div className="mb-4 flex items-center gap-1 rounded-md border border-border bg-sand/40 p-0.5">
        <button
          onClick={() => setFormat("markdown")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            format === "markdown"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-foreground"
          }`}
        >
          <FileText size={13} strokeWidth={2} />
          Markdown
        </button>
        <button
          onClick={() => setFormat("json")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            format === "json"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-foreground"
          }`}
        >
          <Braces size={13} strokeWidth={2} />
          JSON
        </button>
      </div>

      {/* Preview */}
      <div className="mb-4 max-h-64 overflow-auto rounded-lg border border-border bg-sand/30 p-3">
        <pre className="whitespace-pre-wrap font-mono text-xs text-text-secondary">
          {content}
        </pre>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={handleCopy}>
          <Copy size={14} strokeWidth={2} />
          Copiar
        </Button>
        <Button size="sm" onClick={handleDownload}>
          <Download size={14} strokeWidth={2} />
          Descargar
        </Button>
      </div>
    </Modal>
  );
}
