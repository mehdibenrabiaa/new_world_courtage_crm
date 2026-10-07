"use client"

// Copied (not re-implemented) from the public site's own form components —
// new_world_courtage/components/ui/{field,radio-group,checkbox}.jsx — so the
// CRM's read-only Réponses tab renders with the literal same classNames,
// colors and structure as assurance-pro-auto/garagiste/devis, not a
// CRM-themed lookalike. Trimmed to read-only usage only (no onChange
// handlers) and typed for the CRM's TS setup; keep in sync by hand if the
// public site's field.jsx/radio-group.jsx/checkbox.jsx visuals change.
//
// The public site defines --color-brand (#062499) globally; the CRM has no
// such token, so PublicFormBrandScope below defines it locally wherever
// this UI is used.

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export function PublicFormBrandScope({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      style={{ "--color-brand": "#062499" } as React.CSSProperties}
      className={className}
      {...props}
    />
  )
}

export function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & { orientation?: "vertical" | "horizontal" }) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        "group/field flex w-full gap-3",
        orientation === "vertical" ? "flex-col [&>*]:w-full" : "flex-row items-center",
        className
      )}
      {...props}
    />
  )
}

export function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("group/field-content flex flex-1 flex-col gap-1.5 leading-snug", className)}
      {...props}
    />
  )
}

export function FieldLabel({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label flex w-fit cursor-pointer gap-2 text-sm leading-snug font-medium select-none",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4",
        "has-data-[state=checked]:border-[var(--color-brand)] has-data-[state=checked]:bg-[color-mix(in_srgb,var(--color-brand)_8%,white)]",
        className
      )}
      {...props}
    />
  )
}

export function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn("flex w-fit items-center gap-2 text-sm leading-snug font-medium", className)}
      {...props}
    />
  )
}

export function RadioGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div role="radiogroup" className={cn("flex flex-wrap gap-x-6 gap-y-4", className)} {...props} />
}

export function RadioGroupItem({ className, checked }: { className?: string; checked: boolean }) {
  return (
    <span
      role="radio"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      className={cn(
        "relative flex h-5 w-5 shrink-0 rounded-full border-2 border-[#d9d9d9] bg-white transition-colors",
        checked && "border-[var(--color-brand)] bg-[var(--color-brand)]",
        className
      )}
    >
      {checked && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-white" />
        </span>
      )}
    </span>
  )
}

export function Checkbox({ className, checked }: { className?: string; checked: boolean }) {
  return (
    <span
      role="checkbox"
      aria-checked={checked}
      data-slot="checkbox"
      data-state={checked ? "checked" : "unchecked"}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-none border border-input shadow-xs transition-shadow",
        checked && "border-[var(--color-brand)] bg-[var(--color-brand)] text-white",
        className
      )}
    >
      {checked && <Check className="size-3.5" strokeWidth={3} />}
    </span>
  )
}

// The *other* checkbox look the public form uses — its plain (non-card)
// question style is a hand-drawn square + checkmark, not the Checkbox
// component above (that one's only for s.card questions).
export function PlainCheckboxSquare({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "w-5 h-5 border-2 flex items-center justify-center shrink-0 rounded-none transition-colors",
        checked ? "border-[var(--color-brand)] bg-[var(--color-brand)]" : "border-[#d9d9d9] bg-white"
      )}
    >
      {checked && (
        <svg width="11" height="9" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}
