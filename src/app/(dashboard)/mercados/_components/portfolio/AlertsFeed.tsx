"use client";

import { useEffect, useRef } from "react";
import type { MarketAlert } from "@/lib/mercados/alerts";

interface Props {
  alerts: MarketAlert[];
  unreadCount: number;
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

const SEVERITY_DOT: Record<MarketAlert["severity"], string> = {
  critical: "bg-red-500",
  warning:  "bg-amber-500",
  info:     "bg-blue-400",
};

export function AlertsFeed({ alerts, unreadCount, isOpen, onClose, onMarkRead, onMarkAllRead }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-2 w-96 max-h-[480px] flex flex-col rounded-xl border border-border bg-card shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 flex-shrink-0">
        <p className="text-sm font-medium text-foreground">
          Alertas{unreadCount > 0 && <span className="ml-1.5 text-xs text-text-tertiary">({unreadCount} sin leer)</span>}
        </p>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-text-secondary hover:text-foreground transition-colors"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="overflow-y-auto flex-1">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <p className="text-sm text-text-secondary">No hay alertas pendientes</p>
            <p className="mt-1 text-xs text-text-tertiary">Las alertas aparecerán aquí cuando se crucen umbrales de mercado</p>
          </div>
        ) : (
          <ul>
            {alerts.map(alert => (
              <li
                key={alert.id}
                className={[
                  "flex gap-3 border-b border-border px-4 py-3 transition-colors last:border-0",
                  alert.is_read ? "opacity-60" : "bg-card hover:bg-sand",
                ].join(" ")}
              >
                <span
                  className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${SEVERITY_DOT[alert.severity]}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground leading-snug">{alert.title}</p>
                  <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed line-clamp-2">
                    {alert.message}
                  </p>
                  <div className="flex items-center justify-between mt-1.5 gap-2">
                    <span className="text-[10px] text-text-tertiary">{getTimeAgo(alert.triggered_at)}</span>
                    {!alert.is_read && (
                      <button
                        onClick={() => onMarkRead(alert.id)}
                        className="text-[10px] text-text-tertiary hover:text-foreground transition-colors"
                      >
                        ✓ Leída
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
