"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Drawer } from "vaul"
import type { CalendarDay, SubscriptionWithCategory } from "@/types/expenses"
import { useIsMobile } from "@/hooks/useIsMobile"
import { findServiceById } from "@/data/subscriptionServices"
import { ExpensePopupContent } from "./ExpensePopupContent"

interface ExpenseCalendarCellProps {
  day: CalendarDay
  subscriptions: SubscriptionWithCategory[]
  isSelected: boolean
  isToday: boolean
  onDayClick: (day: number) => void
  month: number
  year: number
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
  const [hovered, setHovered] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const hasSubs = subscriptions.length > 0

  const cellBase = "relative rounded-xl cursor-pointer p-1 min-h-[48px] transition-all duration-200"
  const cellOutside = !day.isCurrentMonth ? "opacity-30" : ""
  const cellToday = isToday ? "bg-sand border border-border" : ""
  const cellSelected = isSelected
    ? "bg-[rgba(196,112,74,0.10)] border-2 border-accent"
    : ""
  const cellSubs =
    hasSubs && !isToday && !isSelected
      ? "bg-[rgba(74,122,155,0.04)] border border-[rgba(74,122,155,0.12)]"
      : ""
  const cellDefault =
    !hasSubs && !isToday && !isSelected ? "border border-transparent" : ""

  const handleClick = () => {
    onDayClick(day.day)
    if (isMobile && hasSubs) {
      setDrawerOpen(true)
    }
  }

  const cellContent = (
    <div
      className={`${cellBase} ${cellOutside} ${cellToday} ${cellSelected} ${cellSubs} ${cellDefault}`}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Day number */}
      <span
        className={`block text-right text-xs font-mono ${
          isToday
            ? "font-extrabold text-accent"
            : "text-text-secondary"
        }`}
      >
        {day.day}
      </span>

      {/* Subscription icons */}
      {hasSubs && (
        <div className="mt-0.5 flex flex-wrap gap-0.5">
          {subscriptions.slice(0, 2).map((sub, i) => {
            const service = findServiceById(sub.icon)
            const IconComponent = service?.icon

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut", delay: i * 0.05 }}
                className="flex h-5 w-5 items-center justify-center rounded sm:h-7 sm:w-7"
                style={{ backgroundColor: `${sub.color}1A` }}
              >
                {IconComponent ? (
                  <IconComponent width={14} height={14} className="sm:w-4 sm:h-4" />
                ) : (
                  <span
                    className="text-[9px] font-semibold sm:text-[10px]"
                    style={{ color: sub.color }}
                  >
                    {sub.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </motion.div>
            )
          })}
          {subscriptions.length > 2 && (
            <span className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-mono text-text-tertiary bg-sand sm:h-7 sm:w-7 sm:text-[10px]">
              +{subscriptions.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Desktop HoverCard */}
      {!isMobile && hovered && hasSubs && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 rounded-xl border border-border bg-card p-4"
            style={{ boxShadow: "var(--shadow-modal)" }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <ExpensePopupContent
              day={day.day}
              month={month}
              year={year}
              subscriptions={subscriptions}
            />
          </motion.div>
        </AnimatePresence>
      )}
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
