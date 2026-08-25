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

export function Calendar({
  selected,
  onSelect,
  className,
}: {
  selected?: Date
  onSelect?: (date: Date) => void
  className?: string
}) {
  const [month, setMonth] = React.useState(() => selected ?? new Date())
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
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect?.(date)}
              className={cn(
                "size-8 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                selectedDay && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                !selectedDay && isToday && "font-semibold text-primary"
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
