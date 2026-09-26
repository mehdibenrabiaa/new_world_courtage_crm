"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
]
const DAYS_FR = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOffset(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}
function isSameDay(a?: Date, b?: Date) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function Calendar({
  selected,
  onSelect,
  className,
  markedDates,
  secondaryMarkedDates,
  month: monthProp,
  onMonthChange,
}: {
  selected?: Date
  onSelect?: (date: Date) => void
  className?: string
  // ISO ("YYYY-MM-DD") dates to show a small dot under — e.g. days a
  // consultant has blocked off, so that's visible at a glance instead of
  // having to click through every day to check.
  markedDates?: Set<string>
  // A second, differently-colored dot — e.g. days that already have a
  // real booking, distinct from a deliberate block. A date in both sets
  // gets both dots.
  secondaryMarkedDates?: Set<string>
  // Controlled month navigation, for a caller (e.g. a calendar editor) that
  // needs to know which month is showing so it can fetch that month's data.
  month?: Date
  onMonthChange?: (month: Date) => void
}) {
  const [internalMonth, setInternalMonth] = React.useState(() => selected ?? new Date())
  const month = monthProp ?? internalMonth
  function setMonth(next: Date) {
    setInternalMonth(next)
    onMonthChange?.(next)
  }
  const year = month.getFullYear()
  const m = month.getMonth()
  const today = new Date()

  const daysInMonth = getDaysInMonth(year, m)
  const offset = getFirstDayOffset(year, m)
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className={cn("p-3 flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setMonth(new Date(year, m - 1, 1))}
        >
          <ChevronLeftIcon size={16} />
        </Button>
        <span className="text-sm font-medium">{MONTHS_FR[m]} {year}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setMonth(new Date(year, m + 1, 1))}
        >
          <ChevronRightIcon size={16} />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS_FR.map((d) => (
          <span key={d} className="text-[11px] font-medium text-muted-foreground py-1">{d}</span>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <span key={`empty-${i}`} />
          const date = new Date(year, m, day)
          const selectedDay = isSameDay(date, selected)
          const isToday = isSameDay(date, today)
          const iso = toISODate(date)
          const isMarked = markedDates?.has(iso)
          const isSecondaryMarked = secondaryMarkedDates?.has(iso)
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect?.(date)}
              className={cn(
                "relative size-8 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                selectedDay && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                !selectedDay && isToday && "font-semibold text-primary"
              )}
            >
              {day}
              {(isMarked || isSecondaryMarked) && (
                <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                  {isMarked && (
                    <span className={cn("size-1.5 rounded-full bg-destructive", selectedDay && "bg-primary-foreground")} />
                  )}
                  {isSecondaryMarked && (
                    <span className={cn("size-1.5 rounded-full bg-blue-500", selectedDay && "bg-primary-foreground")} />
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
