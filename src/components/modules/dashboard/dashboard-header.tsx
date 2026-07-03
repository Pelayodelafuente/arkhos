'use client'

import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { LiveDot } from './dashboard-view'

interface DashboardHeaderProps {
  userName: string
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 13) return 'Buenos días'
  if (hour < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

function getDateString(): string {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const MODULE_PILLS = [
  { label: 'Proyectos', href: '/proyectos', color: 'var(--module-proyectos)' },
  { label: 'Gastos', href: '/gastos', color: 'var(--module-gastos)' },
  { label: 'Patrimonio', href: '/patrimonio', color: 'var(--module-patrimonio)' },
  { label: 'Mercados', href: '/mercados', color: 'var(--module-mercados)' },
  { label: 'Notas', href: '/notas', color: 'var(--module-notas)' },
]

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const router = useRouter()
  const firstName = userName.split(' ')[0] ?? userName

  return (
    <div
      className="flex-shrink-0 border-b border-border px-4 py-3 lg:px-6 lg:py-4"
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-xl lg:text-2xl text-foreground leading-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="mt-0.5 text-xs text-text-tertiary capitalize">
            {getDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border">
            <LiveDot />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              Sistema activo
            </span>
          </div>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-text-tertiary hover:text-foreground hover:bg-sand transition-colors lg:h-7 lg:w-7"
            aria-label="Notificaciones"
          >
            <Bell size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {MODULE_PILLS.map((pill) => (
          <button
            key={pill.label}
            onClick={() => router.push(pill.href)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              borderColor: `color-mix(in srgb, ${pill.color} 25%, transparent)`,
              backgroundColor: `color-mix(in srgb, ${pill.color} 6%, transparent)`,
            }}
            aria-label={`Ir a ${pill.label}`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: pill.color }}
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium" style={{ color: pill.color }}>
              {pill.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
