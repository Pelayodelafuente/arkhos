"use client"

import { useState, useRef, useCallback, useEffect } from "react"
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
  colIndex: number
}

export function ExpenseCalendarCell({
  day,
  subscriptions,
  isSelected,
  isToday,
  onDayClick,
  month,
  year,
  colIndex,
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

  const handleMouseEnter = () => {
    if (!isMobile && hasSubs && !isSelected) {
      // Don't auto-open on hover, just show cursor
    }
  }

  // Close popover when selection changes
  useEffect(() => {
    if (!isSelected) setPopoverOpen(false)
  }, [isSelected])

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
    isSelected ? 'bg-[rgba(196,112,74,0.10)] border-2 border-accent' : '',
    isToday && !isSelected ? 'bg-sand border border-border' : '',
    !isSelected && !isToday && hasSubs ? `${heatClass} border border-[rgba(74,122,155,0.12)]` : '',
    !isSelected && !isToday && !hasSubs ? 'border border-transparent' : '',
    hasSubs && !isSelected ? 'hover:bg-sand/50 hover:shadow-sm' : '',
  ].filter(Boolean).join(' ')

  const cellContent = (
    <div ref={cellRef} className={cellClasses} onClick={handleClick}>
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
            <div key={sub.id} className="group/badge relative">
              <ServiceAvatar
                name={sub.name}
                icon={sub.icon}
                color={sub.color}
                size="xs"
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
            <span className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-mono text-text-tertiary bg-sand">
              +{subscriptions.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Desktop popover via portal */}
      {!isMobile && popoverOpen && hasSubs && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={popoverStyle}
            className="rounded-2xl border border-border bg-card overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <ExpensePopupContent
              day={day.day}
              month={month}
              year={year}
              subscriptions={subscriptions}
              onClose={() => setPopoverOpen(false)}
            />
          </div>,
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
