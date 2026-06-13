"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff, Check, Copy, Calendar } from "lucide-react"
import { Modal, Button } from "@/components/ui"
import { getOrCreateFeedToken } from "@/lib/supabase/agenda"

interface Props {
  open: boolean
  onClose: () => void
  userId: string
}

function urlB64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const arr = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function CronosSettings({ open, onClose, userId }: Props) {
  const [feedUrl, setFeedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pushState, setPushState] = useState<"unsupported" | "off" | "on" | "working">("off")

  useEffect(() => {
    if (!open) return
    let active = true

    getOrCreateFeedToken(userId)
      .then((token) => {
        if (active) setFeedUrl(`${window.location.origin}/api/agenda/feed/${token}`)
      })
      .catch(() => {})

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported")
    } else {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => active && setPushState(sub ? "on" : "off"))
        .catch(() => active && setPushState("off"))
    }

    return () => {
      active = false
    }
  }, [open, userId])

  async function copyUrl() {
    if (!feedUrl) return
    await navigator.clipboard.writeText(feedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function enablePush() {
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapid) {
      alert("Falta configurar la clave VAPID pública.")
      return
    }
    setPushState("working")
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setPushState("off")
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapid),
      })
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } }
      await fetch("/api/agenda/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          device: navigator.userAgent.slice(0, 100),
        }),
      })
      setPushState("on")
    } catch {
      setPushState("off")
    }
  }

  async function disablePush() {
    setPushState("working")
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch("/api/agenda/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setPushState("off")
    } catch {
      setPushState("on")
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Notificaciones y sincronización">
      <div className="flex flex-col gap-6">
        {/* Feed ICS para Proton */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Calendar size={15} style={{ color: "var(--module-agenda)" }} />
            Ver Cronos en Proton Calendar
          </div>
          <p className="text-xs text-text-tertiary">
            Copia esta URL privada y, en Proton Calendar, ve a Ajustes → Otros calendarios →
            Añadir calendario desde URL. Tus eventos aparecerán en tu móvil.
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={feedUrl ?? "Generando…"}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 truncate rounded-lg border bg-white/60 px-2.5 py-1.5 font-mono text-xs text-text-secondary"
              style={{ borderColor: "var(--border-stone)" }}
            />
            <Button variant="secondary" size="sm" onClick={copyUrl} disabled={!feedUrl}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </Button>
          </div>
        </section>

        <div className="h-px bg-border" />

        {/* Web Push */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell size={15} style={{ color: "var(--module-agenda)" }} />
            Notificaciones push
          </div>
          {pushState === "unsupported" ? (
            <p className="text-xs text-text-tertiary">
              Tu navegador no soporta notificaciones. En iPhone, instala Arkhos en la pantalla de
              inicio (Compartir → Añadir a inicio) y vuelve a abrir esta ventana.
            </p>
          ) : (
            <>
              <p className="text-xs text-text-tertiary">
                Recibe avisos de tus eventos en este dispositivo, aunque Arkhos esté cerrado.
              </p>
              {pushState === "on" ? (
                <Button variant="secondary" size="sm" onClick={disablePush} className="w-fit">
                  <BellOff size={14} /> Desactivar
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={enablePush}
                  loading={pushState === "working"}
                  className="w-fit"
                >
                  <Bell size={14} /> Activar notificaciones
                </Button>
              )}
            </>
          )}
        </section>
      </div>
    </Modal>
  )
}
