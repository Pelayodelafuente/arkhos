import { ArkhosLogo, Button } from "@/components/ui";

interface AppDataSplashProps {
  status: "loading" | "error";
  error?: string | null;
  onRetry?: () => void;
}

/**
 * Pantalla de carga a pantalla completa mostrada por `AppDataLoader` mientras
 * se resuelve la megacarga única de datos al entrar al dashboard. Cubre todo
 * el viewport del contenido (no la topbar/dock, que siguen renderizando con
 * sus propios datos server-fetched).
 */
export function AppDataSplash({ status, error, onRetry }: AppDataSplashProps) {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-6 px-4 py-16">
      <ArkhosLogo size="lg" />

      {status === "loading" ? (
        <div className="flex flex-col items-center gap-3">
          <span
            aria-hidden="true"
            className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent motion-reduce:animate-none"
          />
          <p className="font-sans text-sm text-text-secondary" role="status" aria-live="polite">
            Cargando Arkhos…
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <p
            className="font-sans text-sm text-[var(--error-text)]"
            role="alert"
          >
            {error ?? "No se han podido cargar los datos."}
          </p>
          <Button variant="primary" size="md" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      )}
    </div>
  );
}
