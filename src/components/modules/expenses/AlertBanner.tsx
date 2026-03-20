"use client"

import { useMemo, useState, useEffect } from "react"
import { X } from "lucide-react"
import { useExpensesStore } from "@/stores/expenses-store"
import { getDaysUntilBilling, formatCurrency, isBillingToday, isBillingTomorrow } from "@/lib/gastos-utils"
import { ServiceAvatar } from "./ServiceAvatar"

interface Alert {
  id: string
  type: 'today' | 'tomorrow' | 'renewal'
  message: string
  total?: number
  subscriptions: { name: string; icon: string; color: string; amount: number }[]
}

const DISMISS_KEY = 'arkhos-gastos-dismissed-alerts'

function getDismissed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function isDismissed(alertId: string): boolean {
  const dismissed = getDismissed()
  const ts = dismissed[alertId]
  if (!ts) return false
  // Expire after 24h
  return Date.now() - ts < 24 * 60 * 60 * 1000
}

function dismissAlert(alertId: string) {
  const dismissed = getDismissed()
  dismissed[alertId] = Date.now()
  localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed))
}

export function AlertBanner() {
  const subscriptions = useExpensesStore((s) => s.subscriptions)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const dismissed = getDismissed()
    const ids = new Set<string>()
    for (const [id, ts] of Object.entries(dismissed)) {
      if (Date.now() - ts < 24 * 60 * 60 * 1000) ids.add(id)
    }
    setDismissedIds(ids)
  }, [])

  const alerts = useMemo(() => {
    const result: Alert[] = []
    const active = subscriptions.filter((s) => s.status === 'active')

    // Billing today
    const todaySubs = active.filter((s) => isBillingToday(s.billing_day))
    if (todaySubs.length > 0) {
      const total = todaySubs.reduce((acc, s) => acc + s.amount, 0)
      const names = todaySubs.map((s) => s.name).join(' y ')
      result.push({
        id: `today-${new Date().toISOString().split('T')[0]}`,
        type: 'today',
        message: `Hoy se cobra ${names}`,
        total,
        subscriptions: todaySubs.map((s) => ({ name: s.name, icon: s.icon, color: s.color, amount: s.amount })),
      })
    }

    // Billing tomorrow
    const tomorrowSubs = active.filter((s) => isBillingTomorrow(s.billing_day))
    if (tomorrowSubs.length > 0) {
      const total = tomorrowSubs.reduce((acc, s) => acc + s.amount, 0)
      const names = tomorrowSubs.map((s) => s.name).join(' y ')
      result.push({
        id: `tomorrow-${new Date().toISOString().split('T')[0]}`,
        type: 'tomorrow',
        message: `Mañana se cobra ${names}`,
        total,
        subscriptions: tomorrowSubs.map((s) => ({ name: s.name, icon: s.icon, color: s.color, amount: s.amount })),
      })
    }

    // Annual renewals within 30 days
    const annuals = active.filter((s) => s.cycle === 'annual')
    for (const sub of annuals) {
      const days = getDaysUntilBilling(sub.billing_day)
      if (days > 0 && days <= 30) {
        result.push({
          id: `renewal-${sub.id}`,
          type: 'renewal',
          message: `${sub.name} se renueva en ${days} días`,
          total: sub.amount,
          subscriptions: [{ name: sub.name, icon: sub.icon, color: sub.color, amount: sub.amount }],
        })
      }
    }

    return result.slice(0, 2) // Max 2 alerts
  }, [subscriptions])

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id))

  if (visibleAlerts.length === 0) return null

  const handleDismiss = (alertId: string) => {
    dismissAlert(alertId)
    setDismissedIds((prev) => new Set([...prev, alertId]))
  }

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => {
        const bgClass = alert.type === 'today'
          ? 'bg-[rgba(196,112,74,0.08)] border-accent/30'
          : alert.type === 'tomorrow'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-[rgba(74,122,155,0.08)] border-[rgba(74,122,155,0.3)]'

        return (
          <div
            key={alert.id}
            className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${bgClass}`}
          >
            {alert.type === 'today' && (
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
              </span>
            )}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {alert.subscriptions.slice(0, 2).map((sub) => (
                <ServiceAvatar
                  key={sub.name}
                  name={sub.name}
                  icon={sub.name.toLowerCase().replace(/\s+/g, '-')}
                  color={sub.color}
                  size="xs"
                />
              ))}
              <span className="text-sm text-foreground truncate">{alert.message}</span>
            </div>
            {alert.total !== undefined && (
              <span className="font-mono text-sm font-semibold text-foreground flex-shrink-0">
                {formatCurrency(alert.total)}
              </span>
            )}
            <button
              onClick={() => handleDismiss(alert.id)}
              className="text-text-tertiary hover:text-foreground transition-colors flex-shrink-0"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
