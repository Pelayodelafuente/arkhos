"use client"

import { useEffect } from "react"

// Registro del service worker de la PWA (F4.5) — solo en producción para no
// interferir con HMR en desarrollo.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sin SW la app funciona igual; no es un error visible para el usuario
    })
  }, [])
  return null
}
