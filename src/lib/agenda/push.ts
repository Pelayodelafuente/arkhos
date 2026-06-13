// ══════════════════════════════════════
// Cronos — Web Push (VAPID) helpers server-side
// ══════════════════════════════════════

import webpush from "web-push"

let configured: boolean | null = null

/** Configura VAPID una vez. Devuelve false si faltan claves (fail-closed). */
export function configureWebPush(): boolean {
  if (configured !== null) return configured
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    configured = false
    return false
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:notificaciones@arkhos.pelayodelafuente.es",
    publicKey,
    privateKey
  )
  configured = true
  return true
}

export interface PushSub {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

/**
 * Envía una notificación. Devuelve 'gone' si la suscripción ya no es válida
 * (410/404) para que el llamador la elimine.
 */
export async function sendPush(
  sub: PushSub,
  payload: PushPayload
): Promise<"ok" | "gone" | "error"> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
    return "ok"
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) return "gone"
    return "error"
  }
}
