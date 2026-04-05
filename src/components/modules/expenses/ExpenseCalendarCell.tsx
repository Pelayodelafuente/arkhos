"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createPortal } from "react-dom"
import { Drawer } from "vaul"
import type { CalendarDay, SubscriptionWithCategory } from "@/types/expenses"
import { useIsMobile } from "@/hooks/useIsMobile"
import { ServiceAvatar } from "./ServiceAvatar"
import { ExpensePopupContent } from "./ExpensePopupContent"
import { getHeatIntensity } from "@/lib/gastos-utils"
import { formatCurrency } from "@/lib/gastos-utils"

interface ExpenseCalendarCellProps {
  day: CalendarDay
  subscriptions: SubscriptionWithCategory[]
  isSelected: boolean
  isToday: boolean
  onDayClick: (day: number, hasSubs: boolean) => void
  month: number
  year: number
  colIndex?: number
}

export function ExpenseCalendarCell({
  day,
  subscriptions,
  isSelected,
  isToday,
  onDayClick,
  month,
  year,
}: ExpenseCalendarCellProps) {
  const isMobile = useIsMobile()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})
  const cellRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const hasSubs = subscriptions.length > 0
  const totalAmount = subscriptions.reduce((acc, s) => acc + s.amount, 0)
  const heatClass = day.isCurrentMonth ? getHeatIntensity(totalAmount) : ''

  // Close popover on scroll or resize
  useEffect(() => {
    if (!popoverOpen) return
    const close = () => setPopoverOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [popoverOpen])

  // BUG-01: Intelligent popover positioning
  const updatePopoverPosition = useCallback(() => {
    if (!cellRef.current) return

    const rect = cellRef.current.getBoundingClientRect()
    const popoverWidth = 300
    const popoverHeight = 320
    const margin = 8
    const viewport = { w: window.innerWidth, h: window.innerHeight }

    const spaceRight = viewport.w - rect.right - margin
    const spaceLeft = rect.left - margin
    const spaceBelow = viewport.h - rect.bottom - margin
    const spaceAbove = rect.top - margin

    const horizontal = spaceRight >= popoverWidth ? 'right' : spaceLeft >= popoverWidth ? 'left' : 'center'
    const vertical = spaceBelow >= popoverHeight ? 'below' : 'above'

    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
      width: popoverWidth,
      maxHeight: Math.min(popoverHeight, vertical === 'below' ? spaceBelow : spaceAbove),
    }

    if (vertical === 'below') {
      style.top = rect.bottom + margin
    } else {
      style.bottom = viewport.h - rect.top + margin
    }

    if (horizontal === 'right') {
      style.left = rect.left
    } else if (horizontal === 'left') {
      style.right = viewport.w - rect.right
    } else {
      style.left = Math.max(margin, rect.left + rect.width / 2 - popoverWidth / 2)
    }

    setPopoverStyle(style)
  }, [])

  const handleClick = () => {
    onDayClick(day.day, hasSubs)
    if (hasSubs) {
      if (isMobile) {
        setDrawerOpen(true)
      } else {
        setPopoverOpen((prev) => !prev)
        setTimeout(updatePopoverPosition, 0)
      }
    }
  }


  // Outside classes
  if (!day.isCurrentMonth) {
    return (
      <div className="relative rounded-xl p-1 min-h-[48px] opacity-30 pointer-events-none">
        <span className="block text-right text-xs font-mono text-text-secondary">
          {day.day}
        </span>
      </div>
    )
  }

  const cellClasses = [
    'relative rounded-xl p-1 min-h-[48px] transition-all duration-200',
    hasSubs ? 'cursor-pointer' : 'cursor-default',
    // ring-inset uses box-shadow (no layout impact), avoids reflow caused by border-2
    isSelected ? 'bg-[rgba(196,112,74,0.10)] ring-2 ring-inset ring-[#C4704A] border border-transparent' : '',
    isToday && !isSelected ? 'bg-sand border border-border' : '',
    !isSelected && !isToday && hasSubs ? `${heatClass} border border-[rgba(74,122,155,0.12)]` : '',
    !isSelected && !isToday && !hasSubs ? 'border border-transparent' : '',
    hasSubs && !isSelected ? 'hover:bg-sand/50 hover:shadow-sm' : '',
  ].filter(Boolean).join(' ')

  const cellContent = (
    <div ref={cellRef} className={cellClasses} onClick={handleClick}>
      {/* Today animated ring */}
      {isToday && (
        <span className="absolute inset-0 rounded-xl ring-2 ring-[var(--module-gastos)]/30 animate-pulse pointer-events-none"
              style={{ animationDuration: '3s' }} />
      )}
      {/* Day number */}
      <div className="flex items-center justify-end gap-0.5">
        <span
          className={`text-right text-xs font-mono ${
            isToday ? 'font-extrabold text-accent' : 'text-text-secondary'
          }`}
        >
          {day.day}
        </span>
        {/* Today dot */}
        {isToday && (
          <span className="h-1 w-1 rounded-full bg-accent flex-shrink-0" />
        )}
      </div>

      {/* Subscription badges */}
      {hasSubs && (
        <div className="mt-0.5 flex flex-wrap gap-0.5">
          {subscriptions.slice(0, 3).map((sub) => (
            <div
              key={sub.id}
              className={`group/badge relative rounded-full ring-[1.5px] ${
                sub.cycle === 'annual' ? 'ring-[#B07A3A]' : 'ring-[#3B78B0]'
              }`}
            >
              <ServiceAvatar
                name={sub.name}
                icon={sub.icon}
                color={sub.color}
                size="xs"
                iconUrl={sub.icon_url}
                url={sub.url}
              />
              {/* Tooltip on badge hover */}
              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover/badge:opacity-100 transition-opacity z-50 whitespace-nowrap">
                <div className="rounded-lg bg-foreground text-card px-2.5 py-1.5 text-[11px] shadow-lg">
                  {sub.name} — {formatCurrency(sub.amount)}
                </div>
              </div>
            </div>
          ))}
          {subscriptions.length > 3 && (
            <span
              title={subscriptions.slice(3).map((s) => s.name).join(', ')}
              className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-mono text-text-tertiary bg-sand"
            >
              +{subscriptions.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Desktop popover via portal */}
      {!isMobile && hasSubs && typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isSelected && popoverOpen && (
              <motion.div
                ref={popoverRef}
                style={popoverStyle}
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0, boxShadow: '0 8px 32px rgba(26,23,20,0.12)' }}
                exit={{ opacity: 0, scale: 0.96, y: 4 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="rounded-2xl border border-border bg-card overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <ExpensePopupContent
                  day={day.day}
                  month={month}
                  year={year}
                  subscriptions={subscriptions}
                  onClose={() => setPopoverOpen(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )
      }
    </div>
  )

  // Mobile: wrap in Drawer
  if (isMobile && hasSubs) {
    return (
      <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        {cellContent}
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-foreground/30" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-border bg-card p-5">
            <Drawer.Handle className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
            <ExpensePopupContent
              day={day.day}
              month={month}
              year={year}
              subscriptions={subscriptions}
            />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }

  return cellContent
}
