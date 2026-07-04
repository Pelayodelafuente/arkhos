import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

// ── GitHub en Proyectos ──────────────────────────────────────────────────────
// Devuelve actividad del repo vinculado a un proyecto (repository_url):
// meta del repo + últimos commits + estado del último workflow (CI).
// El owner/repo se deriva SIEMPRE del proyecto del usuario (RLS) — esta ruta
// no es un proxy abierto a GitHub. GITHUB_TOKEN (opcional) sube el rate limit
// de 60 → 5000 req/h; las respuestas se cachean 5 min en el Data Cache.

const querySchema = z.object({ projectId: z.uuid() });

const GH_HEADERS: Record<string, string> = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'arkhos-app',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

const REVALIDATE = 300; // 5 min

export interface GitHubRepoInfo {
  fullName: string;
  htmlUrl: string;
  description: string | null;
  stars: number;
  openIssues: number;
  defaultBranch: string;
  pushedAt: string;
  language: string | null;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export interface GitHubWorkflowRun {
  name: string;
  status: string;
  conclusion: string | null;
  branch: string;
  url: string;
  updatedAt: string;
}

export interface GitHubPanelData {
  repo: GitHubRepoInfo;
  commits: GitHubCommit[];
  lastRun: GitHubWorkflowRun | null;
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?(?:$|[?#])/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

async function gh(path: string): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    headers: GH_HEADERS,
    next: { revalidate: REVALIDATE },
  });
}

export async function GET(req: NextRequest) {
  const { success } = await rateLimit(req, { limit: 30, window: 60 });
  if (!success) {
    return NextResponse.json({ error: 'Demasiadas peticiones. Espera un momento.' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    projectId: req.nextUrl.searchParams.get('projectId'),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'projectId inválido' }, { status: 400 });
  }

  // RLS: solo devuelve el proyecto si es del usuario
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, repository_url')
    .eq('id', parsed.data.projectId)
    .single();
  if (error || !project?.repository_url) {
    return NextResponse.json({ error: 'Proyecto sin repositorio vinculado' }, { status: 404 });
  }

  const target = parseGitHubUrl(project.repository_url);
  if (!target) {
    return NextResponse.json({ error: 'La URL del repositorio no es de GitHub' }, { status: 422 });
  }

  const base = `/repos/${target.owner}/${target.repo}`;
  try {
    const [repoRes, commitsRes, runsRes] = await Promise.all([
      gh(base),
      gh(`${base}/commits?per_page=8`),
      gh(`${base}/actions/runs?per_page=1`),
    ]);

    if (repoRes.status === 404) {
      return NextResponse.json({ error: 'Repositorio no encontrado (¿privado sin GITHUB_TOKEN?)' }, { status: 404 });
    }
    if (repoRes.status === 403 || repoRes.status === 429) {
      return NextResponse.json({ error: 'Rate limit de GitHub alcanzado, prueba en unos minutos' }, { status: 503 });
    }
    if (!repoRes.ok) {
      return NextResponse.json({ error: 'GitHub no disponible' }, { status: 502 });
    }

    const repoJson = await repoRes.json();
    const repo: GitHubRepoInfo = {
      fullName: repoJson.full_name,
      htmlUrl: repoJson.html_url,
      description: repoJson.description ?? null,
      stars: repoJson.stargazers_count ?? 0,
      openIssues: repoJson.open_issues_count ?? 0,
      defaultBranch: repoJson.default_branch ?? 'main',
      pushedAt: repoJson.pushed_at ?? '',
      language: repoJson.language ?? null,
    };

    let commits: GitHubCommit[] = [];
    if (commitsRes.ok) {
      const list = (await commitsRes.json()) as Array<{
        sha: string;
        html_url: string;
        commit: { message: string; author: { name?: string; date?: string } | null };
        author: { login?: string } | null;
      }>;
      commits = list.map((c) => ({
        sha: c.sha.substring(0, 7),
        message: (c.commit?.message ?? '').split('\n')[0],
        author: c.author?.login ?? c.commit?.author?.name ?? 'desconocido',
        date: c.commit?.author?.date ?? '',
        url: c.html_url,
      }));
    }

    let lastRun: GitHubWorkflowRun | null = null;
    if (runsRes.ok) {
      const runs = await runsRes.json();
      const r = runs?.workflow_runs?.[0];
      if (r) {
        lastRun = {
          name: r.name ?? 'CI',
          status: r.status ?? 'unknown',
          conclusion: r.conclusion ?? null,
          branch: r.head_branch ?? '',
          url: r.html_url ?? repo.htmlUrl,
          updatedAt: r.updated_at ?? '',
        };
      }
    }

    return NextResponse.json({ repo, commits, lastRun } satisfies GitHubPanelData);
  } catch {
    return NextResponse.json({ error: 'GitHub no disponible' }, { status: 502 });
  }
}
