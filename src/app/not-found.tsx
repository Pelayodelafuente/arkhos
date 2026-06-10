import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <p className="font-mono text-sm text-text-muted">404</p>
        <p className="font-serif text-4xl text-foreground">Esta página no existe</p>
        <p className="max-w-md text-sm text-text-secondary">
          La ruta que buscas no está en Arkhos. Puede que el enlace sea antiguo o que la página se
          haya movido.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
      >
        Volver al dashboard
      </Link>
    </div>
  )
}
