"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Sparkles, ArrowUp } from "lucide-react"

interface Props {
  /** Se llama cuando la IA crea/modifica eventos (para refrescar el calendario). */
  onMutated: () => void
}

const SUGGESTIONS = [
  "Comida con Marta el jueves a las 14h",
  "Bloquea 2h para terminar el informe esta semana",
  "Reunión con el banco el lunes por la mañana",
]

export function AICommandBar({ onMutated }: Props) {
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [reply, setReply] = useState<string | null>(null)
  const [error, setError] = useState(false)

  async function send(text: string) {
    const message = text.trim()
    if (!message || loading) return
    setLoading(true)
    setReply(null)
    setError(false)
    try {
      const res = await fetch("/api/agenda/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          tz_offset_min: -new Date().getTimezoneOffset(),
        }),
      })
      const body = await res.text()
      if (!res.ok) {
        setError(true)
        setReply(body || "No se pudo procesar la petición.")
      } else {
        setReply(body)
        if (res.headers.get("X-Cronos-Mutated") === "1") onMutated()
        setValue("")
      }
    } catch {
      setError(true)
      setReply("Error de red. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-5">
      <div
        className="flex items-center gap-2 rounded-2xl border bg-card px-3 py-2 transition-colors focus-within:border-accent"
        style={{ borderColor: "var(--border-stone)" }}
      >
        <Sparkles size={16} style={{ color: "var(--module-agenda)" }} />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send(value)
          }}
          disabled={loading}
          placeholder="Dile a Cronos qué agendar…"
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-text-faint"
        />
        <button
          onClick={() => send(value)}
          disabled={loading || !value.trim()}
          aria-label="Enviar"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white transition-all disabled:opacity-40"
          style={{ backgroundColor: "var(--module-agenda)" }}
        >
          {loading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <ArrowUp size={15} />
          )}
        </button>
      </div>

      {/* Sugerencias */}
      {!reply && !loading && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] text-text-tertiary transition-colors hover:border-accent hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Respuesta */}
      <AnimatePresence>
        {reply && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 rounded-xl border px-3 py-2 text-sm"
            style={{
              borderColor: error ? "var(--error-border)" : "var(--border-stone)",
              backgroundColor: error
                ? "var(--error-bg)"
                : "color-mix(in srgb, var(--module-agenda) 7%, transparent)",
              color: error ? "var(--error-text)" : "var(--text-secondary)",
            }}
          >
            {reply}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
