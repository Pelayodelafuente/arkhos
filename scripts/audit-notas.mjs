// Playwright audit — módulo Notas canvas
// Abre un navegador visible, espera login si es necesario, luego audita automáticamente

import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'fs';

const SCREENSHOTS_DIR = 'C:/tmp/audit-notas';
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const issues = [];
const log = (type, msg, detail = '') => {
  const entry = { type, msg, detail };
  issues.push(entry);
  const icon = type === 'ERROR' ? '🔴' : type === 'WARN' ? '🟡' : '✅';
  console.log(`${icon} [${type}] ${msg}${detail ? ': ' + detail : ''}`);
};

let screenshotIdx = 0;
async function shot(page, name) {
  const path = `${SCREENSHOTS_DIR}/${String(++screenshotIdx).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`   📸 ${path}`);
}

async function waitForAuth(page) {
  const deadline = Date.now() + 120000;
  console.log('\n⏳ Esperando que llegues a /notas (máx 120s)...');
  console.log('   Si el navegador pide login → inicia sesión con Google.\n');
  let lastUrl = '';
  while (Date.now() < deadline) {
    const url = page.url();
    if (url !== lastUrl) {
      console.log(`   URL actual: ${url}`);
      lastUrl = url;
    }
    if (url.includes('/notas') && !url.includes('login') && !url.includes('auth') && !url.includes('verify')) {
      // Esperar a que la página termine de cargar
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      return true;
    }
    await page.waitForTimeout(1500);
  }
  return false;
}

async function main() {
  console.log('🚀 Iniciando auditoría del módulo Notas...\n');
  console.log('ℹ️  Se abrirá un navegador visible. Si pide login, entra con tu cuenta.\n');

  const browser = await chromium.launch({
    headless: false,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--start-maximized', '--no-sandbox'],
  });

  const ctx = await browser.newContext({ viewport: null });
  const page = await ctx.newPage();

  // Capturar errores de consola
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignorar errores de extensiones y favicon
      if (!text.includes('extension') && !text.includes('favicon') && !text.includes('net::ERR')) {
        consoleErrors.push(text);
        log('ERROR', 'Console JS error', text.slice(0, 200));
      }
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
    log('ERROR', 'Page error', err.message.slice(0, 200));
  });

  // Navegar
  await page.goto('http://localhost:3000/notas', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  const authed = await waitForAuth(page);
  if (!authed) {
    log('ERROR', 'No se llegó a /notas en 60s — abortando');
    await browser.close();
    return generateReport();
  }

  // Esperar que cargue el módulo completamente
  await page.waitForTimeout(3000);
  log('OK', 'En /notas — comenzando auditoría');
  await shot(page, 'notas-cargado');

  // ── A. CANVAS PRESENTE ───────────────────────────────────────────────────
  console.log('\n── A. Canvas presente ──');
  // ReactFlow usa .react-flow__renderer o .react-flow__viewport
  const rfViewport = await page.$('.react-flow__viewport, .react-flow__renderer');
  if (rfViewport) {
    log('OK', 'Canvas ReactFlow detectado');
  } else {
    // Buscar por otros patrones
    const canvasAlt = await page.$('[class*="canvas"], [class*="Canvas"]');
    log(canvasAlt ? 'WARN' : 'ERROR', canvasAlt ? 'Canvas encontrado (no ReactFlow)' : 'Canvas NO encontrado');
  }
  await shot(page, 'canvas');

  // ── B. TOOLBAR DEL CANVAS ────────────────────────────────────────────────
  console.log('\n── B. Toolbar del canvas ──');
  const toolbarBtns = await page.$$('[class*="toolbar"] button, [class*="Toolbar"] button');
  log(toolbarBtns.length > 0 ? 'OK' : 'ERROR', `Botones en toolbar: ${toolbarBtns.length}`);
  if (toolbarBtns.length > 0) {
    const firstBtn = toolbarBtns[0];
    const box = await firstBtn.boundingBox();
    const visible = await firstBtn.isVisible();
    log(visible && box && box.y > 0 ? 'OK' : 'ERROR', `Primer botón toolbar visible y en viewport`, JSON.stringify(box));
  }

  // ── C. NODOS Y TIPOS ─────────────────────────────────────────────────────
  console.log('\n── C. Nodos en el canvas ──');
  const allNodes = await page.$$('.react-flow__node');
  log(allNodes.length >= 0 ? 'OK' : 'WARN', `Total nodos: ${allNodes.length}`);

  // Clasificar por tipo (data-type o clase)
  const nodeTypes = {};
  for (const node of allNodes) {
    const type = await node.getAttribute('data-type') ??
      await node.evaluate(el => el.className.match(/react-flow__node-(\w+)/)?.[1] ?? 'unknown');
    nodeTypes[type] = (nodeTypes[type] ?? 0) + 1;
  }
  console.log('   Tipos:', JSON.stringify(nodeTypes));

  // ── D. GRUPOS ────────────────────────────────────────────────────────────
  console.log('\n── D. Nodos tipo grupo ──');
  const groupNodes = await page.$$(
    '.react-flow__node-group, [data-type="group"], [class*="GroupNode"], [class*="group-node"]'
  );
  log(groupNodes.length > 0 ? 'OK' : 'WARN', `Grupos encontrados: ${groupNodes.length}`);

  if (groupNodes.length === 0 && allNodes.length === 0) {
    log('WARN', 'Canvas vacío — intentando crear una nota y un grupo para testear');
    // Buscar botón de nueva nota en toolbar
    const labels = ['nota', 'note', 'añadir', 'add', 'nuevo', 'new', 'grupo', 'group'];
    for (const label of labels) {
      const btn = await page.$(`button[aria-label*="${label}" i], button[title*="${label}" i]`);
      if (btn && await btn.isVisible()) {
        log('OK', `Botón "${label}" encontrado en toolbar`);
        await btn.click();
        await page.waitForTimeout(800);
        await shot(page, `btn-${label}-clicked`);
        await page.keyboard.press('Escape');
        break;
      }
    }
  }

  if (groupNodes.length > 0) {
    // ── D1. Hover sobre grupo ────────────────────────────────────────────
    console.log('\n── D1. Hover sobre grupo ──');
    const g = groupNodes[0];
    await g.hover();
    await page.waitForTimeout(500);
    await shot(page, 'group-hover');

    // ── D2. Menú del grupo ───────────────────────────────────────────────
    console.log('\n── D2. Menú del grupo ──');
    // El fix que aplicamos usa getBoundingClientRect + fixed positioning
    const menuBtn = await page.$(
      '[class*="MoreHorizontal"], [data-lucide="more-horizontal"], [aria-label*="menú" i], [aria-label*="menu" i], [class*="group-menu-btn"], [class*="groupMenu"]'
    );
    if (menuBtn) {
      const vis = await menuBtn.isVisible();
      log(vis ? 'OK' : 'ERROR', `Botón menú grupo (MoreHorizontal) visible: ${vis}`);
      if (vis) {
        await menuBtn.click();
        await page.waitForTimeout(500);
        await shot(page, 'group-menu-abierto');
        // Verificar dropdown
        const dropdown = await page.$('[role="menu"], [class*="dropdown"], [class*="Dropdown"]');
        if (dropdown) {
          const dVis = await dropdown.isVisible();
          const dBox = await dropdown.boundingBox();
          log(dVis ? 'OK' : 'ERROR', `Dropdown menú visible: ${dVis}`);
          if (dBox) {
            const offscreen = dBox.y < 0 || dBox.x < 0 || dBox.y + dBox.height > 1080;
            log(!offscreen ? 'OK' : 'ERROR', `Dropdown dentro del viewport: ${!offscreen}`, JSON.stringify(dBox));
          }
        } else {
          log('ERROR', 'Dropdown del menú de grupo NO encontrado tras click');
        }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    } else {
      log('WARN', 'Botón MoreHorizontal no encontrado en grupo (¿sólo visible en hover cercano?)');
    }

    // ── D3. Colapsar grupo ───────────────────────────────────────────────
    console.log('\n── D3. Colapsar/Expandir grupo ──');
    const collapseBtn = await page.$('[aria-label*="colapsar" i], [aria-label*="collapse" i], [title*="colapsar" i]');
    if (collapseBtn && await collapseBtn.isVisible()) {
      log('OK', 'Botón colapsar grupo presente');
      await collapseBtn.click();
      await page.waitForTimeout(500);
      await shot(page, 'group-collapsed');
      await collapseBtn.click(); // re-expandir
      await page.waitForTimeout(300);
    } else {
      log('WARN', 'Botón colapsar grupo no encontrado');
    }
  }

  // ── E. EDGES / CONEXIONES ────────────────────────────────────────────────
  console.log('\n── E. Edges (conexiones) ──');
  const edges = await page.$$('.react-flow__edge');
  log(edges.length >= 0 ? 'OK' : 'WARN', `Edges encontrados: ${edges.length}`);

  if (edges.length > 0) {
    const e = edges[0];
    // pointer-events
    const pe = await e.evaluate(el => getComputedStyle(el).pointerEvents);
    log(pe !== 'none' ? 'OK' : 'ERROR', `Edge pointer-events: ${pe}`);

    // Hover sobre edge
    try {
      await e.hover({ timeout: 3000 });
      await page.waitForTimeout(300);
      await shot(page, 'edge-hover');
    } catch { log('WARN', 'Hover sobre edge falló'); }

    // Click en edge
    try {
      await e.click({ timeout: 3000 });
      await page.waitForTimeout(400);
      const selected = await page.$('.react-flow__edge.selected');
      log(selected ? 'OK' : 'WARN', `Click en edge → seleccionado: ${!!selected}`);
      await shot(page, 'edge-selected');
    } catch { log('WARN', 'Click en edge falló (puede no ser interactivo)'); }

    // Clic derecho en edge → menú estilos
    try {
      await e.click({ button: 'right', timeout: 3000 });
      await page.waitForTimeout(500);
      const ctxMenu = await page.$('[role="menu"], [class*="context"], [class*="Context"]');
      log(ctxMenu ? 'OK' : 'WARN', `Menú contextual edge (clic derecho): ${ctxMenu ? 'visible' : 'no apareció'}`);
      if (ctxMenu) await shot(page, 'edge-context-menu');
      await page.keyboard.press('Escape');
    } catch { log('WARN', 'Clic derecho en edge falló'); }
  }

  // ── F. PANEL DE PROPIEDADES ──────────────────────────────────────────────
  console.log('\n── F. Panel de propiedades ──');
  if (allNodes.length > 0) {
    await allNodes[0].click();
    await page.waitForTimeout(600);
    const propPanel = await page.$('[class*="properties" i], [class*="Properties"], [class*="PropertiesPanel"], [class*="prop-panel"]');
    if (propPanel) {
      const pVis = await propPanel.isVisible();
      const pBox = await propPanel.boundingBox();
      log(pVis ? 'OK' : 'ERROR', `Panel propiedades visible: ${pVis}`);
      if (pBox) {
        const offscreen = pBox.x + pBox.width > 1920 || pBox.y < 0;
        log(!offscreen ? 'OK' : 'ERROR', `Panel propiedades en viewport: ${!offscreen}`, JSON.stringify(pBox));
      }
      await shot(page, 'panel-propiedades');
    } else {
      log('WARN', 'Panel de propiedades no encontrado tras click en nodo');
    }
  }

  // ── G. MODAL DE NOTA ─────────────────────────────────────────────────────
  console.log('\n── G. Modal de nota (doble click) ──');
  if (allNodes.length > 0) {
    try {
      await allNodes[0].dblclick({ timeout: 3000 });
      await page.waitForTimeout(700);
      const modal = await page.$('[role="dialog"], [class*="modal" i], [class*="Modal"], [class*="NoteModal"]');
      log(modal ? 'OK' : 'WARN', `Modal nota: ${modal ? 'abierto' : 'no apareció'}`);
      if (modal) {
        await shot(page, 'nota-modal');
        // Verificar backlinks panel
        const backlinks = await page.$('[class*="backlink" i], [class*="Backlink"]');
        log(backlinks ? 'OK' : 'WARN', `Panel backlinks en modal: ${backlinks ? 'presente' : 'no encontrado'}`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    } catch { log('WARN', 'Doble click en nodo falló'); }
  }

  // ── H. SIDEBAR DE NOTAS ──────────────────────────────────────────────────
  console.log('\n── H. Sidebar de notas ──');
  const sidebar = await page.$('[class*="sidebar" i], [class*="Sidebar"], [class*="NotesSidebar"]');
  if (sidebar) {
    const sVis = await sidebar.isVisible();
    log(sVis ? 'OK' : 'ERROR', `Sidebar notas visible: ${sVis}`);
    // Verificar overflow-y auto que puede clipear menús
    const overflow = await sidebar.evaluate(el => getComputedStyle(el).overflowY);
    log('OK', `Sidebar overflow-y: ${overflow} ${overflow === 'auto' ? '(puede clipear menús si no son fixed)' : ''}`);
  } else {
    log('WARN', 'Sidebar de notas no encontrado');
  }

  // ── I. ZOOM Y CONTROLES ──────────────────────────────────────────────────
  console.log('\n── I. Controles de zoom ──');
  const zoomIn = await page.$('button[aria-label*="zoom in" i], button[aria-label*="acercar" i], [class*="zoom-in"]');
  const zoomOut = await page.$('button[aria-label*="zoom out" i], button[aria-label*="alejar" i], [class*="zoom-out"]');
  log(zoomIn ? 'OK' : 'WARN', `Botón zoom in: ${zoomIn ? 'presente' : 'no encontrado'}`);
  log(zoomOut ? 'OK' : 'WARN', `Botón zoom out: ${zoomOut ? 'presente' : 'no encontrado'}`);

  // ── J. SCREENSHOT FINAL ──────────────────────────────────────────────────
  await shot(page, 'estado-final');

  // ── K. OVERFLOW / CLIPPING CHECK ────────────────────────────────────────
  console.log('\n── K. Posibles problemas de overflow/clipping ──');
  const clippedContainers = await page.$$eval('*', els =>
    [...els].filter(el => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return (s.overflow === 'hidden' || s.overflowY === 'hidden' || s.overflowX === 'hidden') &&
        r.height > 80 && r.height < 900 && r.width > 100 && el.children.length > 0;
    }).map(el => ({
      tag: el.tagName,
      cls: el.className?.toString().slice(0, 100) ?? '',
      h: Math.round(el.getBoundingClientRect().height),
      overflow: getComputedStyle(el).overflow + '/' + getComputedStyle(el).overflowY,
    })).slice(0, 8)
  );
  console.log('   Contenedores con overflow hidden > 80px:');
  clippedContainers.forEach(c => console.log(`   └─ <${c.tag}> h=${c.h} [${c.overflow}] "${c.cls}"`));

  await browser.close();
  return generateReport();
}

function generateReport() {
  const errors = issues.filter(i => i.type === 'ERROR');
  const warns  = issues.filter(i => i.type === 'WARN');
  const oks    = issues.filter(i => i.type === 'OK');

  const report = { summary: { errors: errors.length, warnings: warns.length, ok: oks.length }, errors, warnings: warns };
  writeFileSync(`${SCREENSHOTS_DIR}/report.json`, JSON.stringify(report, null, 2));

  console.log('\n═══════════════════════════════════════');
  console.log('RESULTADO AUDITORÍA MÓDULO NOTAS');
  console.log('═══════════════════════════════════════');
  console.log(`🔴 Errores:    ${errors.length}`);
  console.log(`🟡 Avisos:     ${warns.length}`);
  console.log(`✅ OK:         ${oks.length}`);
  if (errors.length > 0) {
    console.log('\nErrores encontrados:');
    errors.forEach((e, i) => console.log(`  ${i+1}. ${e.msg}${e.detail ? ' — ' + e.detail.slice(0,150) : ''}`));
  }
  console.log(`\n📁 Screenshots: ${SCREENSHOTS_DIR}`);
  return report;
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
