import { chromium } from '@playwright/test';
import type { Page, BrowserContext } from '@playwright/test';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { AUDIT_ROUTES, BASE_URL } from './audit-config';
import type { AuditRoute } from './audit-config';
import { writeReport } from './audit-reporter';
import type { AuditReport, AuditResult, ModuleAnalysis } from './audit-reporter';

// ---------------------------------------------------------------------------
// ANSI color helpers
// ---------------------------------------------------------------------------

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';

function log(msg: string): void {
  console.log(msg);
}

function logStep(step: number, total: number, msg: string): void {
  log(`${CYAN}[${step}/${total}]${RESET} ${msg}`);
}

function logSuccess(msg: string): void {
  log(`  ${GREEN}+${RESET} ${msg}`);
}

function logError(msg: string): void {
  log(`  ${RED}x${RESET} ${msg}`);
}

function logInfo(msg: string): void {
  log(`  ${DIM}${msg}${RESET}`);
}

// ---------------------------------------------------------------------------
// .env.local parser
// ---------------------------------------------------------------------------

function parseEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return env;

  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(import.meta.dirname ?? __dirname, '..');
const SESSION_PATH = path.join(PROJECT_ROOT, 'playwright', '.auth', 'session.json');
const SCREENSHOTS_DIR = path.join(PROJECT_ROOT, 'playwright', 'screenshots');
const REPORTS_DIR = path.join(PROJECT_ROOT, 'playwright', 'reports');
const SESSION_MAX_AGE_MS = 23 * 60 * 60 * 1000; // 23 hours

// ---------------------------------------------------------------------------
// PHASE 1 — Authentication
// ---------------------------------------------------------------------------

async function authenticate(
  page: Page,
  context: BrowserContext,
  env: Record<string, string>,
): Promise<void> {
  // Check for existing valid session
  if (fs.existsSync(SESSION_PATH)) {
    const stats = fs.statSync(SESSION_PATH);
    const ageMs = Date.now() - stats.mtimeMs;
    if (ageMs < SESSION_MAX_AGE_MS) {
      logSuccess('Session found and valid — reusing');
      return;
    }
    logInfo('Session expired — performing fresh login');
  } else {
    logInfo('No session found — performing fresh login');
  }

  const email = env['AUDIT_EMAIL'];
  const password = env['AUDIT_PASSWORD'];
  if (!email || !password) {
    throw new Error('AUDIT_EMAIL and AUDIT_PASSWORD must be set in .env.local');
  }

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input#email', { timeout: 10_000 });
  await page.fill('input#email', email);
  await page.fill('input#password', password);
  await page.click('button:has-text("Iniciar sesión")');
  await page.waitForSelector('h1.font-heading', { timeout: 15_000 });

  // Save session
  const sessionDir = path.dirname(SESSION_PATH);
  fs.mkdirSync(sessionDir, { recursive: true });
  await context.storageState({ path: SESSION_PATH });
  logSuccess('Authenticated and session saved');
}

// ---------------------------------------------------------------------------
// PHASE 2 — Route Crawling
// ---------------------------------------------------------------------------

function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function auditRoute(
  page: Page,
  route: AuditRoute,
  screenshotDir: string,
): Promise<AuditResult | null> {
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];
  const screenshots: string[] = [];

  // Set up console error listener
  const onConsole = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  };
  page.on('console', onConsole);

  // Set up network error listener
  const onResponse = (resp: { status: () => number; url: () => string }) => {
    if (resp.status() >= 400) {
      networkErrors.push(`${resp.status()} ${resp.url()}`);
    }
  };
  page.on('response', onResponse);

  const moduleDir = path.join(screenshotDir, sanitizeName(route.module));
  fs.mkdirSync(moduleDir, { recursive: true });

  let screenshotIndex = 1;
  const takeScreenshot = async (name: string): Promise<void> => {
    const filename = `${String(screenshotIndex).padStart(2, '0')}-${sanitizeName(name)}.png`;
    const filepath = path.join(moduleDir, filename);
    await page.screenshot({ path: filepath, fullPage: false });
    screenshots.push(filepath);
    screenshotIndex++;
  };

  try {
    // Handle the special __FIRST_PROJECT__ path
    if (route.path.includes('__FIRST_PROJECT__')) {
      await page.goto(`${BASE_URL}/proyectos`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

      const projectLink = page.locator('a[href^="/proyectos/"]').first();
      const linkVisible = await projectLink.isVisible({ timeout: 5_000 }).catch(() => false);

      if (!linkVisible) {
        logInfo('No projects found — skipping Proyecto Detalle');
        page.removeListener('console', onConsole);
        page.removeListener('response', onResponse);
        return null;
      }

      const href = await projectLink.getAttribute('href');
      if (!href) {
        logInfo('Project link has no href — skipping');
        page.removeListener('console', onConsole);
        page.removeListener('response', onResponse);
        return null;
      }

      await page.goto(`${BASE_URL}${href}`, { waitUntil: 'domcontentloaded' });
    } else {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded' });
    }

    // Screenshot #1: loading state
    await takeScreenshot('loading');

    // Wait for main selector
    if (route.waitForSelector) {
      await page
        .waitForSelector(route.waitForSelector, { timeout: 10_000 })
        .catch(() => logInfo(`Selector "${route.waitForSelector}" not found within 10s`));
    }

    // Wait for network idle
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Screenshot #2: loaded state
    await takeScreenshot('loaded');

    // Execute interactions
    for (const interaction of route.interactions) {
      await interaction.action(page);
      const waitMs = interaction.waitAfter ?? 500;
      if (waitMs > 0) {
        await page.waitForTimeout(waitMs);
      }
      if (interaction.screenshotAfter !== false) {
        await takeScreenshot(interaction.name);
      }
    }

    // Extract <main> innerHTML
    const mainHtml = await page
      .locator('main')
      .innerHTML()
      .catch(() => '');

    logSuccess(
      `${screenshots.length} screenshots, ${consoleErrors.length} console errors, ${networkErrors.length} network errors`,
    );

    return {
      module: route.module,
      route: route.path,
      screenshots,
      consoleErrors,
      networkErrors,
      analysis: null,
      _mainHtml: mainHtml,
    } as AuditResult & { _mainHtml: string };
  } finally {
    page.removeListener('console', onConsole);
    page.removeListener('response', onResponse);
  }
}

// ---------------------------------------------------------------------------
// PHASE 3 — Anthropic Analysis
// ---------------------------------------------------------------------------

function getMediaType(filepath: string): 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' {
  const ext = path.extname(filepath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}

async function analyzeWithClaude(
  result: AuditResult & { _mainHtml?: string },
  contextDocs: string,
  client: Anthropic,
): Promise<ModuleAnalysis | null> {
  const systemPrompt = `Eres un product manager senior y experto en UX auditando Arkhos, una plataforma personal de gestión modular construida con Next.js 16, TypeScript strict, Tailwind v4, Supabase y Anthropic API (ya integrada).

CONTEXTO DE LA PLATAFORMA:
${contextDocs}

Módulos existentes: Dashboard, Proyectos (canvas interactivo + IA por proyecto), Gastos (suscripciones, Smart Add, gráficos), Notas (canvas 2D con nodos, conexiones, tipos: texto/url/imagen/grupo), Settings con MFA.
Módulos planificados: Mercados (crypto + acciones + IA), Patrimonio (P&L con precios en vivo).
Stack IA: Anthropic API ya instalada y funcionando con streaming.

Estás analizando el módulo: ${result.module}

Analiza los screenshots, el HTML y los errores proporcionados. Piensa como CPO de esta plataforma. El usuario es una persona individual que gestiona su vida profesional y financiera desde aquí.

Devuelve ÚNICAMENTE un JSON válido con esta estructura, sin texto adicional ni markdown:
{
  "bugs": [
    { "title": "", "description": "", "priority": "high|medium|low", "selector": "" }
  ],
  "quickwins": [
    { "title": "", "description": "", "effort": "low", "impact": "high|medium|low" }
  ],
  "suggestions": [
    { "title": "", "description": "", "priority": "high|medium|low" }
  ],
  "strategic": [
    {
      "title": "",
      "description": "",
      "rationale": "",
      "effort": "high|medium|low",
      "impact": "high|medium|low",
      "category": "ai|ux|data|integration|automation"
    }
  ]
}

bugs → problemas de usabilidad, flujos rotos, estados sin manejar, inconsistencias visuales, errores detectados.
quickwins → mejoras de menos de 30 minutos con alto impacto visual o UX.
suggestions → features que un usuario de esta plataforma esperaría encontrar y no están en este módulo.
strategic → propuestas ambiciosas que potenciarían toda la plataforma. Piensa en: conexiones entre módulos, automatizaciones, uso de IA con el contexto cross-módulo que ya existe, features que diferenciarían Arkhos de cualquier app comercial. No te limites a lo que ves — piensa en lo que PODRÍA ser.`;

  // Build content blocks
  const contentBlocks: Anthropic.MessageCreateParams['messages'][0]['content'] = [];

  // Add screenshots as image blocks
  for (const screenshotPath of result.screenshots) {
    try {
      const imageData = await fsp.readFile(screenshotPath);
      const base64 = imageData.toString('base64');
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: getMediaType(screenshotPath),
          data: base64,
        },
      });
    } catch {
      logError(`Failed to read screenshot: ${screenshotPath}`);
    }
  }

  // Add HTML block
  const mainHtml = (result as AuditResult & { _mainHtml?: string })._mainHtml ?? '';
  if (mainHtml) {
    // Truncate to avoid token limits
    const truncatedHtml = mainHtml.length > 30_000 ? mainHtml.slice(0, 30_000) + '\n...[truncated]' : mainHtml;
    contentBlocks.push({
      type: 'text',
      text: `--- HTML de <main> ---\n${truncatedHtml}`,
    });
  }

  // Add console errors
  if (result.consoleErrors.length > 0) {
    contentBlocks.push({
      type: 'text',
      text: `--- Errores de consola ---\n${result.consoleErrors.join('\n')}`,
    });
  }

  // Add network errors
  if (result.networkErrors.length > 0) {
    contentBlocks.push({
      type: 'text',
      text: `--- Errores de red ---\n${result.networkErrors.join('\n')}`,
    });
  }

  // If no content at all, skip
  if (contentBlocks.length === 0) {
    logInfo('No content to analyze — skipping');
    return null;
  }

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-5-20250514',
      max_tokens: 8192,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: contentBlocks,
        },
      ],
    });

    // Extract text from response
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    );
    if (!textBlock) {
      logError('No text block in Anthropic response');
      return null;
    }

    const raw = textBlock.text.trim();

    // Try direct parse first
    try {
      return JSON.parse(raw) as ModuleAnalysis;
    } catch {
      // Try to extract JSON from response
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = raw.slice(firstBrace, lastBrace + 1);
        return JSON.parse(jsonStr) as ModuleAnalysis;
      }
      logError(`Failed to parse JSON from Anthropic response: ${raw.slice(0, 200)}`);
      return null;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logError(`Anthropic API error: ${message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Context docs loader
// ---------------------------------------------------------------------------

async function loadContextDocs(): Promise<string> {
  const docsDir = path.join(PROJECT_ROOT, 'docs');
  const parts: string[] = [];

  // STATUS.md
  try {
    const status = await fsp.readFile(path.join(docsDir, 'STATUS.md'), 'utf-8');
    parts.push('--- STATUS.md ---\n' + status);
  } catch {
    logInfo('STATUS.md not found');
  }

  // ARCHITECTURE.md
  try {
    const arch = await fsp.readFile(path.join(docsDir, 'ARCHITECTURE.md'), 'utf-8');
    parts.push('--- ARCHITECTURE.md ---\n' + arch);
  } catch {
    logInfo('ARCHITECTURE.md not found');
  }

  // CHANGELOG.md — last 100 lines
  try {
    const changelog = await fsp.readFile(path.join(docsDir, 'CHANGELOG.md'), 'utf-8');
    const lines = changelog.split('\n');
    const last100 = lines.slice(-100).join('\n');
    parts.push('--- CHANGELOG.md (últimas 100 líneas) ---\n' + last100);
  } catch {
    logInfo('CHANGELOG.md not found');
  }

  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// PHASE 4 — Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log(`\n${BOLD}${MAGENTA}=== Arkhos Visual Auditor ===${RESET}\n`);

  // Parse env
  const envPath = path.join(PROJECT_ROOT, '.env.local');
  const env = parseEnvFile(envPath);

  const auditEmail = env['AUDIT_EMAIL'];
  const auditPassword = env['AUDIT_PASSWORD'];
  const anthropicKey = env['ANTHROPIC_API_KEY'];

  if (!auditEmail || !auditPassword) {
    throw new Error('Missing AUDIT_EMAIL or AUDIT_PASSWORD in .env.local');
  }
  if (!anthropicKey) {
    throw new Error('Missing ANTHROPIC_API_KEY in .env.local');
  }

  const client = new Anthropic({ apiKey: anthropicKey });

  // Prepare directories
  const dateStr = new Date().toISOString().slice(0, 10);
  const screenshotDir = path.join(SCREENSHOTS_DIR, dateStr);
  fs.mkdirSync(screenshotDir, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    // Launch browser
    log(`${DIM}Launching Chromium...${RESET}`);
    browser = await chromium.launch({ headless: true });

    // Create context with stored session if available
    const contextOptions: Parameters<typeof browser.newContext>[0] = {
      viewport: { width: 1440, height: 900 },
    };

    if (fs.existsSync(SESSION_PATH)) {
      const stats = fs.statSync(SESSION_PATH);
      const ageMs = Date.now() - stats.mtimeMs;
      if (ageMs < SESSION_MAX_AGE_MS) {
        contextOptions.storageState = SESSION_PATH;
      }
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    // Authenticate
    log(`\n${BOLD}Phase 1 — Authentication${RESET}`);
    await authenticate(page, context, env);

    // Load context docs
    log(`\n${BOLD}Phase 2 — Loading context docs${RESET}`);
    const contextDocs = await loadContextDocs();
    logSuccess(`Loaded ${contextDocs.length} characters of context`);

    // Crawl routes
    log(`\n${BOLD}Phase 3 — Route crawling${RESET}`);
    const totalRoutes = AUDIT_ROUTES.length;
    const results: (AuditResult & { _mainHtml?: string })[] = [];

    for (let i = 0; i < totalRoutes; i++) {
      const route = AUDIT_ROUTES[i];
      logStep(i + 1, totalRoutes, `Auditando ${YELLOW}${route.module}${RESET}...`);

      try {
        const result = await auditRoute(page, route, screenshotDir);
        if (result) {
          results.push(result);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logError(`Route ${route.path} failed: ${message}`);
      }
    }

    // Analyze with Claude
    log(`\n${BOLD}Phase 4 — Anthropic Analysis${RESET}`);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      logStep(i + 1, results.length, `Analizando ${YELLOW}${result.module}${RESET} con Claude...`);

      try {
        const analysis = await analyzeWithClaude(result, contextDocs, client);
        result.analysis = analysis;

        if (analysis) {
          logSuccess(
            `${analysis.bugs.length} bugs, ${analysis.quickwins.length} quick wins, ` +
              `${analysis.suggestions.length} sugerencias, ${analysis.strategic.length} estratégicas`,
          );
        } else {
          logInfo('No analysis returned');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logError(`Analysis failed for ${result.module}: ${message}`);
      }
    }

    // Generate report
    log(`\n${BOLD}Phase 5 — Report generation${RESET}`);

    // Clean _mainHtml before building report
    const cleanResults: AuditResult[] = results.map(
      ({ _mainHtml: _, ...rest }) => rest as AuditResult,
    );

    const report: AuditReport = {
      date: dateStr,
      results: cleanResults,
    };

    const reportPath = writeReport(report, REPORTS_DIR);
    logSuccess(`Report written to ${reportPath}`);

    // Summary
    const totals = cleanResults.reduce(
      (acc, r) => {
        if (r.analysis) {
          acc.bugs += r.analysis.bugs.length;
          acc.quickwins += r.analysis.quickwins.length;
          acc.suggestions += r.analysis.suggestions.length;
          acc.strategic += r.analysis.strategic.length;
        }
        return acc;
      },
      { bugs: 0, quickwins: 0, suggestions: 0, strategic: 0 },
    );

    log(`\n${BOLD}${MAGENTA}=== Audit Complete ===${RESET}`);
    log(`  ${RED}Bugs:${RESET}          ${totals.bugs}`);
    log(`  ${GREEN}Quick wins:${RESET}    ${totals.quickwins}`);
    log(`  ${YELLOW}Sugerencias:${RESET}   ${totals.suggestions}`);
    log(`  ${CYAN}Estratégicas:${RESET}  ${totals.strategic}`);
    log(`  ${DIM}Report:${RESET}        ${reportPath}`);
    log('');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`${RED}${BOLD}Fatal error:${RESET} ${message}`);
  process.exit(1);
});
