import type { ReactNode } from "react";

/**
 * Contenedor estándar de gráfica para Arkhos (Fase 0.2 — fundación viz).
 *
 * Sustituye a las cabeceras ad-hoc que cada gráfica define hoy:
 * tarjeta con borde/fondo de marca, título en DM Serif (`font-heading`),
 * subtítulo y un slot derecho (`actions`) para badges o selectores de rango.
 *
 * Presentacional y sin hooks → compatible con Server Components.
 */
interface ChartShellProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Slot derecho del header: badges, selector de periodo, toggles… */
  actions?: ReactNode;
  children: ReactNode;
  /** Clases extra para la tarjeta (p.ej. `overflow-hidden`). */
  className?: string;
  /** Clases extra para el contenedor del contenido (la gráfica). */
  contentClassName?: string;
}

export function ChartShell({
  title,
  subtitle,
  actions,
  children,
  className = "",
  contentClassName = "",
}: ChartShellProps) {
  const hasHeader = Boolean(title || subtitle || actions);

  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      {hasHeader && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <p className="font-heading text-sm text-foreground">{title}</p>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-text-tertiary">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
