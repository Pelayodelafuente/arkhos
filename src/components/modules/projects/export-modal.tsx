"use client";

import { useState } from "react";
import { Copy, Download, FileText, Braces } from "lucide-react";
import { Modal, Button } from "@/components/ui";
import { useUIStore } from "@/stores/ui-store";
import { useToast } from "@/stores/ui-store";
import type { Project } from "@/types/projects";

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
    lines.push(`# ${project.name}\n`);
    lines.push(`- **Tipo**: ${project.type}`);
    lines.push(`- **Estado**: ${project.status}`);
    if (project.start_date) {
      lines.push(
        `- **Inicio**: ${new Date(project.start_date).toLocaleDateString("es-ES")}`
      );
    }
    if (project.stack.length > 0) {
      lines.push(`- **Stack**: ${project.stack.join(", ")}`);
    }
    if (project.tags?.length) {
      lines.push(`- **Tags**: ${project.tags.join(", ")}`);
    }

    const totalTasks = project.phases.reduce((s, p) => s + p.tasks.length, 0);
    const doneTasks = project.phases.reduce(
      (s, p) => s + p.tasks.filter((t) => t.done).length,
      0
    );
    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    lines.push(`- **Progreso**: ${progress}% (${doneTasks}/${totalTasks} tareas)\n`);

    for (const phase of project.phases) {
      lines.push(`## ${phase.name} [${phase.status}]\n`);
      if (phase.notes) {
        lines.push(`> ${phase.notes}\n`);
      }
      for (const task of phase.tasks) {
        const check = task.done ? "x" : " ";
        const priority =
          task.priority !== "none" ? ` [${task.priority}]` : "";
        lines.push(`- [${check}] ${task.text}${priority}`);
        for (const link of task.links) {
          lines.push(`  - [${link.label || link.url}](${link.url})`);
        }
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
