"use client"

import { useEffect } from "react"
import { RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Visible en Vercel logs (removeConsole preserva console.error en producción)
    console.error("[error-boundary]", error.digest ?? "", error.message)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <p className="font-serif text-4xl text-foreground">Algo ha fallado</p>
        <p className="max-w-md text-sm text-text-secondary">
          Se ha producido un error inesperado al cargar esta sección. Tus datos están a salvo —
          prueba a recargar.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-text-muted">ref: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>
          <RefreshCw size={14} strokeWidth={1.75} />
          Reintentar
        </Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/")}>
          <Home size={14} strokeWidth={1.75} />
          Ir al inicio
        </Button>
      </div>
    </div>
  )
}
