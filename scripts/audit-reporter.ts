import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Bug {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  selector: string;
}

export interface QuickWin {
  title: string;
  description: string;
  effort: 'low';
  impact: 'high' | 'medium' | 'low';
}

export interface Suggestion {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface StrategicProposal {
  title: string;
  description: string;
  rationale: string;
  effort: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  category: 'ai' | 'ux' | 'data' | 'integration' | 'automation';
}

export interface ModuleAnalysis {
  bugs: Bug[];
  quickwins: QuickWin[];
  suggestions: Suggestion[];
  strategic: StrategicProposal[];
}

export interface AuditResult {
  module: string;
  route: string;
  screenshots: string[];
  consoleErrors: string[];
  networkErrors: string[];
  analysis: ModuleAnalysis | null;
}

export interface AuditReport {
  date: string;
  results: AuditResult[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRIORITY_BADGE: Record<string, string> = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
};

const CATEGORY_BADGE: Record<StrategicProposal['category'], string> = {
  ai: '🤖',
  ux: '🎨',
  data: '📊',
  integration: '🔗',
  automation: '⚡',
};

function priorityBadge(p: string): string {
  return PRIORITY_BADGE[p] ?? p;
}

function categoryBadge(c: StrategicProposal['category']): string {
  return `${CATEGORY_BADGE[c]} ${c}`;
}

function counts(analysis: ModuleAnalysis | null): {
  bugs: number;
  quickwins: number;
  suggestions: number;
  strategic: number;
} {
  if (!analysis) return { bugs: 0, quickwins: 0, suggestions: 0, strategic: 0 };
  return {
    bugs: analysis.bugs.length,
    quickwins: analysis.quickwins.length,
    suggestions: analysis.suggestions.length,
    strategic: analysis.strategic.length,
  };
}

// ---------------------------------------------------------------------------
// Report generator
// ---------------------------------------------------------------------------

export function generateReport(report: AuditReport): string {
  const lines: string[] = [];

  const push = (line: string = '') => lines.push(line);

  // ---- Header ----
  push(`# Arkhos Visual Audit — ${report.date}`);
  push();
  push('> Auditoría automatizada con Playwright + Claude claude-opus-4-5');
  push();

  // ---- Executive summary table ----
  push('## Resumen ejecutivo');
  push();
  push('| Módulo | 🔴 Bugs | 🟢 Quick wins | 🟡 Sugerencias | 🚀 Estratégicas |');
  push('|--------|---------|---------------|----------------|-----------------|');

  const totals = { bugs: 0, quickwins: 0, suggestions: 0, strategic: 0 };

  for (const result of report.results) {
    const c = counts(result.analysis);
    totals.bugs += c.bugs;
    totals.quickwins += c.quickwins;
    totals.suggestions += c.suggestions;
    totals.strategic += c.strategic;
    push(`| ${result.module} | ${c.bugs} | ${c.quickwins} | ${c.suggestions} | ${c.strategic} |`);
  }

  push(
    `| **Total** | **${totals.bugs}** | **${totals.quickwins}** | **${totals.suggestions}** | **${totals.strategic}** |`,
  );
  push();
  push('---');
  push();

  // ---- Per-module sections ----
  for (const result of report.results) {
    push(`## ${result.module}`);
    push();
    push(
      `> Ruta: \`${result.route}\` · ${result.screenshots.length} screenshots · ${result.consoleErrors.length} errores consola · ${result.networkErrors.length} errores red`,
    );
    push();

    if (!result.analysis) {
      push('⚠️ Análisis no disponible');
      push();
      renderScreenshots(result.screenshots, push);
      push('---');
      push();
      continue;
    }

    const { bugs, quickwins, suggestions, strategic } = result.analysis;

    // Bugs
    push(`### 🔴 Bugs (${bugs.length})`);
    push();
    if (bugs.length === 0) {
      push('Sin hallazgos');
    } else {
      push('| # | Título | Prioridad | Descripción | Selector |');
      push('|---|--------|-----------|-------------|----------|');
      bugs.forEach((b, i) => {
        push(
          `| ${i + 1} | ${b.title} | \`${priorityBadge(b.priority)} ${b.priority}\` | ${b.description} | \`${b.selector}\` |`,
        );
      });
    }
    push();

    // Quick wins
    push(`### 🟢 Quick Wins (${quickwins.length})`);
    push();
    if (quickwins.length === 0) {
      push('Sin hallazgos');
    } else {
      push('| # | Título | Impacto | Descripción |');
      push('|---|--------|---------|-------------|');
      quickwins.forEach((q, i) => {
        push(
          `| ${i + 1} | ${q.title} | \`${priorityBadge(q.impact)} ${q.impact}\` | ${q.description} |`,
        );
      });
    }
    push();

    // Suggestions
    push(`### 🟡 Sugerencias (${suggestions.length})`);
    push();
    if (suggestions.length === 0) {
      push('Sin hallazgos');
    } else {
      push('| # | Título | Prioridad | Descripción |');
      push('|---|--------|-----------|-------------|');
      suggestions.forEach((s, i) => {
        push(
          `| ${i + 1} | ${s.title} | \`${priorityBadge(s.priority)} ${s.priority}\` | ${s.description} |`,
        );
      });
    }
    push();

    // Strategic proposals
    push(`### 🚀 Propuestas estratégicas (${strategic.length})`);
    push();
    if (strategic.length === 0) {
      push('Sin hallazgos');
    } else {
      strategic.forEach((sp, i) => {
        push(`#### ${i + 1}. ${sp.title}`);
        push();
        push(`- **Categoría:** \`${categoryBadge(sp.category)}\``);
        push(`- **Esfuerzo:** \`${sp.effort}\` · **Impacto:** \`${sp.impact}\``);
        push(`- **Descripción:** ${sp.description}`);
        push(`- **Justificación:** ${sp.rationale}`);
        push();
      });
    }

    // Screenshots
    renderScreenshots(result.screenshots, push);

    push('---');
    push();
  }

  // ---- Footer ----
  push(
    '> Generado automáticamente por **Arkhos Visual Auditor** · Playwright + Anthropic API (claude-opus-4-5)',
  );
  push();

  return lines.join('\n');
}

function renderScreenshots(
  screenshots: string[],
  push: (line?: string) => void,
): void {
  if (screenshots.length === 0) return;
  push('### Screenshots');
  push();
  for (const s of screenshots) {
    const filename = path.basename(s);
    push(`![${filename}](${s})`);
  }
  push();
}

// ---------------------------------------------------------------------------
// File writer
// ---------------------------------------------------------------------------

export function writeReport(report: AuditReport, outputDir: string): string {
  const markdown = generateReport(report);
  const filename = `audit-${report.date}.md`;
  const filePath = path.join(outputDir, filename);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(filePath, markdown, 'utf-8');

  return filePath;
}
