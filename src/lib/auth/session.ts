// ══════════════════════════════════════
// Arkhos — Caducidad de sesión por inactividad
// El middleware (src/proxy.ts) marca la última actividad en una cookie y
// cierra la sesión si se supera IDLE_TIMEOUT_MS sin ninguna request. No hay
// tope absoluto: mientras uses la app dentro de la ventana, la sesión sigue.
// ══════════════════════════════════════

/** Nombre de la cookie con el timestamp (ms) de la última actividad. */
export const ACTIVITY_COOKIE = "arkhos_last_active";

/** Ventana de inactividad tras la cual se cierra la sesión: 12 horas. */
export const IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000;

/** Vida de la propia cookie marcador (30 d); la caducidad real la decide el timestamp. */
export const ACTIVITY_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
