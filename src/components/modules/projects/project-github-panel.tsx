"use client";

import { useCallback, useEffect, useState } from "react";
import { Github, ExternalLink, Star, CircleDot, GitBranch, RefreshCw, Loader2 } from "lucide-react";
import { useProjectsStore } from "@/stores/projects-store";
import { useUIStore } from "@/stores/ui-store";
import type { GitHubPanelData } from "@/app/api/projects/github/route";

// ---------------------------------------------------------------------------
// ProjectGitHubPanel — actividad del repositorio vinculado al proyecto
// Datos vía /api/projects/github (cache 5 min server-side). Si el proyecto no
// tiene repo, permite vincularlo aquí mismo (editProject → repository_url).
// ---------------------------------------------------------------------------

interface ProjectGitHubPanelProps {
  projectId: string;
  repositoryUrl: string | null;
}

function relativeDate(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${Math.max(mins, 1)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function CiBadge({ status, conclusion }: { status: string; conclusion: string | null }) {
  const running = status !== "completed";
  const ok = conclusion === "success";
  const color = running
    ? "var(--warning)"
    : ok
      ? "var(--success)"
      : "var(--error)";
  const bg = running ? "var(--warning-bg)" : ok ? "var(--success-bg)" : "var(--error-bg)";
  const label = running ? "En curso" : ok ? "CI verde" : conclusion === "failure" ? "CI roto" : conclusion ?? "—";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ color, background: bg }}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${running ? "animate-pulse" : ""}`} style={{ background: color }} />
      {label}
    </span>
  );
}

export function ProjectGitHubPanel({ projectId, repositoryUrl }: ProjectGitHubPanelProps) {
  const editProject = useProjectsStore((s) => s.editProject);
  const addToast = useUIStore((s) => s.addToast);

  const [data, setData] = useState<GitHubPanelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);

  const isGitHub = Boolean(repositoryUrl && /github\.com\//i.test(repositoryUrl));

  const load = useCallback(async () => {
    if (!isGitHub) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/github?projectId=${projectId}`);
      const json = await res.json();
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Error al cargar GitHub");
        setData(null);
      } else {
        setData(json as GitHubPanelData);
      }
    } catch {
      setError("Sin conexión con el servidor");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, isGitHub]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLink() {
    const url = urlInput.trim();
    if (!/^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+/i.test(url)) {
      addToast("Introduce una URL válida de GitHub (github.com/usuario/repo)", "error");
      return;
    }
    setSaving(true);
    try {
      await editProject(projectId, { repository_url: url });
      addToast("Repositorio vinculado", "success");
    } catch {
      addToast("No se pudo vincular el repositorio", "error");
    } finally {
      setSaving(false);
    }
  }

  // ── Sin repo vinculado ────────────────────────────────────────────────────
  if (!isGitHub) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-12 text-center">
        <Github size={32} strokeWidth={1.5} className="text-text-tertiary" />
        <div>
          <p className="text-sm font-semibold text-foreground">Sin repositorio vinculado</p>
          <p className="mt-1 text-xs text-text-tertiary">
            Vincula un repo de GitHub para ver commits y estado del CI aquí.
          </p>
        </div>
        <div className="flex w-full max-w-md gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleLink(); }}
            placeholder="https://github.com/usuario/repo"
            className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
          <button
            onClick={() => void handleLink()}
            disabled={saving || !urlInput.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-px disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : "Vincular"}
          </button>
        </div>
      </div>
    );
  }

  // ── Cargando ──────────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-sm text-text-tertiary">
        <Loader2 size={16} className="animate-spin" /> Consultando GitHub…
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center">
        <p className="text-sm text-text-secondary">{error}</p>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-sand"
        >
          <RefreshCw size={13} /> Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Header del repo */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Github size={20} strokeWidth={1.5} className="shrink-0 text-foreground" />
          <div className="min-w-0">
            <a
              href={data.repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 truncate text-sm font-semibold text-foreground hover:text-accent-text"
            >
              {data.repo.fullName}
              <ExternalLink size={12} className="shrink-0 opacity-60" />
            </a>
            {data.repo.description && (
              <p className="truncate text-xs text-text-tertiary">{data.repo.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          {data.repo.language && <span>{data.repo.language}</span>}
          <span className="inline-flex items-center gap-1"><Star size={12} /> {data.repo.stars}</span>
          <span className="inline-flex items-center gap-1"><CircleDot size={12} /> {data.repo.openIssues}</span>
          {data.lastRun && <CiBadge status={data.lastRun.status} conclusion={data.lastRun.conclusion} />}
        </div>
      </div>

      {/* Último workflow */}
      {data.lastRun && (
        <a
          href={data.lastRun.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3 text-xs hover:bg-sand"
        >
          <span className="inline-flex items-center gap-2 text-text-secondary">
            <GitBranch size={13} /> {data.lastRun.name} · <span className="font-mono">{data.lastRun.branch}</span>
          </span>
          <span className="text-text-tertiary">{relativeDate(data.lastRun.updatedAt)}</span>
        </a>
      )}

      {/* Commits recientes */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">Commits recientes</p>
          <button
            onClick={() => void load()}
            className="rounded-md p-1 text-text-tertiary hover:bg-sand hover:text-foreground"
            aria-label="Actualizar"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        {data.commits.length === 0 ? (
          <p className="px-5 py-6 text-center text-xs text-text-tertiary">Sin commits visibles</p>
        ) : (
          <ul>
            {data.commits.map((c) => (
              <li key={c.sha} className="border-b border-border-subtle last:border-b-0">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-sand"
                >
                  <code className="shrink-0 rounded bg-sand px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                    {c.sha}
                  </code>
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">{c.message}</span>
                  <span className="shrink-0 text-[10px] text-text-tertiary">
                    {c.author} · {relativeDate(c.date)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
