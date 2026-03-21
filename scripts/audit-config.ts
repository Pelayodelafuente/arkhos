import type { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditInteraction {
  /** Descriptive name for the interaction */
  name: string;
  /** Playwright action to execute */
  action: (page: Page) => Promise<void>;
  /** Whether to take a screenshot after the action (default true) */
  screenshotAfter?: boolean;
  /** Milliseconds to wait after the action (default 500) */
  waitAfter?: number;
}

export interface AuditRoute {
  /** URL path to navigate to */
  path: string;
  /** Display name for the module */
  module: string;
  /** Selector to wait for after navigation */
  waitForSelector?: string;
  /** List of interactions to perform on this route */
  interactions: AuditInteraction[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BASE_URL = process.env.AUDIT_BASE_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

export const AUDIT_ROUTES: AuditRoute[] = [
  // 1. Dashboard
  {
    path: '/',
    module: 'Dashboard',
    waitForSelector: 'h1.font-heading',
    interactions: [],
  },

  // 2. Proyectos
  {
    path: '/proyectos',
    module: 'Proyectos',
    waitForSelector: 'button:has-text("Nuevo proyecto")',
    interactions: [
      {
        name: 'Abrir modal nuevo proyecto',
        action: async (page: Page) => {
          await page
            .locator('button:has-text("Nuevo proyecto")')
            .first()
            .click()
            .catch(() => {});
          await page.waitForTimeout(400);
        },
        screenshotAfter: true,
        waitAfter: 0,
      },
      {
        name: 'Cerrar modal nuevo proyecto',
        action: async (page: Page) => {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        },
        screenshotAfter: false,
      },
      {
        name: 'Screenshot del canvas completo',
        action: async (page: Page) => {
          await page.waitForTimeout(300);
        },
        screenshotAfter: true,
        waitAfter: 0,
      },
    ],
  },

  // 3. Proyecto Detalle (placeholder — orchestrator replaces __FIRST_PROJECT__)
  {
    path: '/proyectos/__FIRST_PROJECT__',
    module: 'Proyecto Detalle',
    waitForSelector: '.font-heading',
    interactions: [
      {
        name: 'Expandir primera fase',
        action: async (page: Page) => {
          await page
            .locator('button:has(svg.lucide-chevron-right)')
            .first()
            .click()
            .catch(() => {});
          await page.waitForTimeout(300);
        },
        screenshotAfter: false,
      },
      {
        name: 'Screenshot con fase expandida',
        action: async (_page: Page) => {
          // No action — just capture the expanded state
        },
        screenshotAfter: true,
        waitAfter: 0,
      },
    ],
  },

  // 4. Gastos
  {
    path: '/gastos',
    module: 'Gastos',
    waitForSelector: 'h1.font-heading',
    interactions: [
      {
        name: 'Abrir graficos',
        action: async (page: Page) => {
          await page
            .locator('button:has-text("Grafico")')
            .first()
            .click()
            .catch(() => {});
          await page.waitForTimeout(600);
        },
        screenshotAfter: true,
        waitAfter: 0,
      },
      {
        name: 'Cerrar graficos',
        action: async (page: Page) => {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        },
        screenshotAfter: false,
      },
      {
        name: 'Abrir Smart Add',
        action: async (page: Page) => {
          await page
            .locator('button:has-text("Smart Add")')
            .first()
            .click()
            .catch(() => {});
          await page.waitForTimeout(400);
        },
        screenshotAfter: true,
        waitAfter: 0,
      },
      {
        name: 'Escribir en Smart Add',
        action: async (page: Page) => {
          const input = page.locator('input:visible').first();
          const isVisible = await input.isVisible().catch(() => false);
          if (isVisible) {
            await input.fill('Netflix 15\u20AC mensual');
            await page.waitForTimeout(300);
          }
        },
        screenshotAfter: true,
        waitAfter: 0,
      },
      {
        name: 'Cerrar Smart Add',
        action: async (page: Page) => {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        },
        screenshotAfter: false,
      },
      {
        name: 'Filtro mensual',
        action: async (page: Page) => {
          await page
            .locator('button:has-text("Mensual")')
            .first()
            .click()
            .catch(() => {});
          await page.waitForTimeout(300);
        },
        screenshotAfter: true,
        waitAfter: 0,
      },
      {
        name: 'Filtro anual',
        action: async (page: Page) => {
          await page
            .locator('button:has-text("Anual")')
            .first()
            .click()
            .catch(() => {});
          await page.waitForTimeout(300);
        },
        screenshotAfter: true,
        waitAfter: 0,
      },
      {
        name: 'Filtro todo',
        action: async (page: Page) => {
          await page
            .locator('button:has-text("Todo")')
            .first()
            .click()
            .catch(() => {});
          await page.waitForTimeout(300);
        },
        screenshotAfter: false,
      },
    ],
  },

  // 5. Notas
  {
    path: '/notas',
    module: 'Notas',
    waitForSelector: 'input[placeholder*="Buscar notas"]',
    interactions: [
      {
        name: 'Vista lista',
        action: async (page: Page) => {
          await page.waitForTimeout(200);
        },
        screenshotAfter: true,
        waitAfter: 0,
      },
      {
        name: 'Cambiar a canvas',
        action: async (page: Page) => {
          await page
            .locator('button')
            .filter({ hasText: /canvas/i })
            .first()
            .click({ timeout: 3000 })
            .catch(() => {});
          await page.waitForTimeout(500);
        },
        screenshotAfter: true,
        waitAfter: 0,
      },
      {
        name: 'Volver a lista',
        action: async (page: Page) => {
          await page
            .locator('button')
            .filter({ hasText: /lista/i })
            .first()
            .click({ timeout: 3000 })
            .catch(() => {});
          await page.waitForTimeout(300);
        },
        screenshotAfter: false,
      },
    ],
  },

  // 6. Seguridad
  {
    path: '/settings/security',
    module: 'Seguridad',
    waitForSelector: 'h1.font-heading',
    interactions: [],
  },
];
