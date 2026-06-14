// Shell offline de la PWA (F4.5) — precacheada por public/sw.js.
// Estática y fuera del grupo (dashboard) para renderizar sin sesión ni datos.

export const dynamic = "force-static"

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <h1 className="font-heading text-4xl text-foreground">Arkhos</h1>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-text-secondary">
        Sin conexión. Tus datos viven en la nube, así que necesitas red para
        verlos. Vuelve a intentarlo cuando recuperes la conexión.
      </p>
      <p className="mt-6 font-mono text-xs text-text-tertiary">offline</p>
    </main>
  )
}
