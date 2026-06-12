// ══════════════════════════════════════
// Arkhos — Modelos de IA (constante única, F4.1)
// ══════════════════════════════════════
//
// claude-sonnet-4-20250514 quedó deprecado (retiro 2026-06-15) → claude-sonnet-4-6.
// Los alias sin fecha apuntan siempre a la revisión vigente del modelo.
//
// Nota sobre prompt caching: los system prompts de las rutas actuales son cortos
// (< 2048 tokens, mínimo cacheable de Sonnet 4.6) y contienen datos por-request
// (patrimonio, contexto de mercado), así que un cache_control no produciría hits.
// Si algún prompt crece con contexto estable (p. ej. tool-use F4.2), añadir
// cache_control en el bloque estable del system.

/** Modelo principal: chat, análisis de mercados y proyectos */
export const AI_MODEL = 'claude-sonnet-4-6'

/** Modelo rápido/económico: tareas simples de Notas (tags, resúmenes) */
export const AI_MODEL_FAST = 'claude-haiku-4-5'
