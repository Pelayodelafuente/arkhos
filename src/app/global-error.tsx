"use client"

import { useEffect } from "react"

// Captura errores del propio layout raíz. Debe renderizar <html> y <body>
// y no depender de ningún componente del design system.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[global-error]", error.digest ?? "", error.message)
  }, [error])

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          backgroundColor: "var(--bg-card-hover)",
          color: "#1A1714",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 32,
        }}
      >
        <div>
          <p style={{ fontSize: 32, margin: 0 }}>Arkhos no ha podido arrancar</p>
          <p style={{ fontSize: 14, color: "#3D3630", maxWidth: 420 }}>
            Error crítico en la aplicación. Tus datos están a salvo.
            {error.digest ? ` · ref: ${error.digest}` : ""}
          </p>
        </div>
        <button
          onClick={reset}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "1px solid var(--border-stone)",
            backgroundColor: "var(--accent-terracotta)",
            color: "#FFFFFF",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  )
}
