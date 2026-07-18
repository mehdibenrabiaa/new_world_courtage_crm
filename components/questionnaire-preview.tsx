"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckCircle2Icon,
  Phone,
  X,
} from "lucide-react"
import type { Question } from "@/lib/api"
import styles from "./questionnaire-preview.module.css"

// This renders questions using the *website's* actual visual language —
// same header, colors, radii, typography, card/radio/checkbox shapes,
// copied from new_world/pages/assurance-transport/taxi/devis/index.js and
// components/CarInsuranceForm.js + global.css — not the CRM's own component
// library, so admins see exactly what the live form will look like.
// Scoped via .site in questionnaire-preview.module.css so the site's CSS
// variables never leak into the CRM's own theme tokens.

type Answer = string | string[]

const MONTHS: [string, string][] = [
  ["01", "Janvier"], ["02", "Février"], ["03", "Mars"], ["04", "Avril"],
  ["05", "Mai"], ["06", "Juin"], ["07", "Juillet"], ["08", "Août"],
  ["09", "Septembre"], ["10", "Octobre"], ["11", "Novembre"], ["12", "Décembre"],
]
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1959 }, (_, i) => String(CURRENT_YEAR - i))

// Mirrors CarInsuranceForm.js's skip-logic so the preview matches the live site.
function isStepSkipped(step: Question, answers: Record<number, Answer>) {
  if (!step.rules || step.rules.length === 0) return false
  return step.rules.some((rule) => {
    if (rule.action !== "skip") return false
    const sourceValue = answers[rule.source_question_id]
    if (rule.operator === "not_equals") return sourceValue !== rule.value
    return sourceValue === rule.value
  })
}

function findVisibleStepIndex(steps: Question[], fromIdx: number, dir: 1 | -1, answers: Record<number, Answer>) {
  let i = fromIdx
  while (i >= 0 && i < steps.length && isStepSkipped(steps[i], answers)) {
    i += dir
  }
  return i
}

export function QuestionnairePreview({
  questions,
  open,
  onOpenChange,
}: {
  questions: Question[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const sorted = useMemo(() => [...questions].sort((a, b) => a.order - b.order), [questions])
  const [stepIdx, setStepIdx] = useState(0)
  const [direction, setDirection] = useState<"next" | "prev">("next")
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const step = sorted[stepIdx]
  const isLast = findVisibleStepIndex(sorted, stepIdx + 1, 1, answers) >= sorted.length

  function reset(nextOpen: boolean) {
    if (!nextOpen) {
      setStepIdx(0)
      setDirection("next")
      setAnswers({})
      setError(null)
      setDone(false)
    }
    onOpenChange(nextOpen)
  }

  function setAnswer(id: number, value: Answer) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
    setError(null)
  }

  function advance(currentAnswers: Record<number, Answer>) {
    setError(null)
    const next = findVisibleStepIndex(sorted, stepIdx + 1, 1, currentAnswers)
    if (next >= sorted.length) setDone(true)
    else {
      setDirection("next")
      setStepIdx(next)
    }
  }

  function next() {
    // Mirrors CarInsuranceForm.handleNext: checkboxes are never blocked by
    // the required check, everything else needs a non-empty answer.
    if (!(!step.required || step.type === "checkbox")) {
      const answer = answers[step.id] ?? ""
      if (answer === "") {
        setError("Ce champ est requis.")
        return
      }
    }
    advance(answers)
  }

  function selectAndAdvance(id: number, value: string) {
    const nextAnswers = { ...answers, [id]: value }
    setAnswer(id, value)
    setTimeout(() => advance(nextAnswers), 200)
  }

  function back() {
    setError(null)
    const prev = findVisibleStepIndex(sorted, stepIdx - 1, -1, answers)
    if (prev >= 0) {
      setDirection("prev")
      setStepIdx(prev)
    }
  }

  if (!step) return null

  const answer = answers[step.id]

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent
        showCloseButton={false}
        className="!fixed !inset-0 !top-0 !left-0 !w-screen !h-screen !max-w-none !translate-x-0 !translate-y-0 !rounded-none !p-0 !gap-0 !ring-0 !bg-white overflow-y-auto"
      >
        <DialogTitle className="sr-only">
          {done ? "Aperçu terminé" : `Aperçu du questionnaire — question ${stepIdx + 1} sur ${sorted.length}`}
        </DialogTitle>

        <div className={styles.site}>
          {/* CRM chrome — not part of the real site, just orients the admin */}
          <div className="flex items-center justify-between bg-gray-900 text-white text-xs px-4 py-1.5">
            <span>Aperçu — les réponses ne sont pas enregistrées</span>
            <button
              type="button"
              onClick={() => reset(false)}
              className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
            >
              <X size={13} />
              Fermer l&apos;aperçu
            </button>
          </div>

          {/* Real site header, copied from assurance-transport/taxi/devis */}
          <header
            className="sticky top-0 z-40 w-full"
            style={{ background: "linear-gradient(90deg,rgba(232, 232, 232, 1) 0%, rgba(255, 255, 255, 1) 100%)" }}
          >
            <div className="flex items-center justify-between px-4 lg:px-12 h-16">
              <Image src="/nwc_logo.svg" alt="New World Courtage" width={120} height={33} className="h-7 w-auto" />
              <span className="flex items-center gap-2.5 border border-[var(--color-brand)] text-[var(--color-brand)] rounded-lg px-4 py-2.5">
                <Phone size={18} className="shrink-0" />
                <span className="text-sm font-semibold">07 45 89 18 65</span>
              </span>
            </div>
          </header>

          <main className="min-h-screen bg-white">
            <div className="max-w-4xl mx-auto px-4 lg:px-6 py-10 lg:py-16">
              {done ? (
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <CheckCircle2Icon size={44} className="text-[var(--color-brand)]" />
                  <p className="text-lg font-semibold text-[var(--color-text)]">Aperçu terminé</p>
                  <p className="text-base text-gray-500 max-w-md">
                    Toutes les questions ont été validées. C&apos;est à ce moment que le formulaire
                    enverrait la demande sur le vrai site.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-10">
                  <div
                    key={step.id}
                    className={`flex flex-col gap-5 max-w-2xl ${direction === "next" ? styles.slideInRight : styles.slideInLeft}`}
                  >
                    <div className="flex flex-col gap-2">
                      {step.eyebrow && (
                        <p className="text-sm uppercase tracking-wide text-gray-500 font-medium">{step.eyebrow}</p>
                      )}
                      <p className="text-2xl sm:text-[35px] font-semibold leading-snug text-[var(--color-text)]">
                        {step.question}
                        {!step.required && (
                          <span className="ml-2 font-normal text-sm text-gray-400">(optionnel)</span>
                        )}
                      </p>
                      {step.hint && <p className="text-sm text-gray-400">{step.hint}</p>}
                    </div>

                    {/* Radio — card style */}
                    {step.type === "radio" && step.card && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {step.options.map((o) => {
                            const selected = answer === o.value
                            return (
                              <label
                                key={o.id}
                                className={`flex items-center justify-between gap-3 rounded-md border p-4 cursor-pointer transition-colors ${
                                  selected
                                    ? "border-[var(--color-brand)] bg-[var(--color-brand)]/5"
                                    : error
                                      ? "border-[var(--color-error)]"
                                      : "border-gray-200 hover:border-[var(--color-brand)]"
                                }`}
                                onClick={() => selectAndAdvance(step.id, o.value)}
                              >
                                <span className="text-sm font-medium text-[rgba(0,0,0,0.88)]">{o.label}</span>
                              </label>
                            )
                          })}
                        </div>
                        {error && <p className="text-xs text-[var(--color-error)] mt-0.5">{error}</p>}
                      </>
                    )}

                    {/* Radio — inline style */}
                    {step.type === "radio" && !step.card && (
                      <>
                        <div className="flex flex-col gap-3">
                          {step.options.map((o) => {
                            const selected = answer === o.value
                            return (
                              <label
                                key={o.id}
                                className="flex items-center gap-2.5 cursor-pointer"
                                onClick={() => selectAndAdvance(step.id, o.value)}
                              >
                                <span className={`text-base ${selected ? "font-semibold" : ""} text-[rgba(0,0,0,0.88)]`}>{o.label}</span>
                              </label>
                            )
                          })}
                        </div>
                        {error && <p className="text-xs text-[var(--color-error)] mt-0.5">{error}</p>}
                      </>
                    )}

                    {/* Checkbox */}
                    {step.type === "checkbox" && (
                      <div className="flex flex-wrap gap-x-6 gap-y-4">
                        {step.options.map((o) => {
                          const list = Array.isArray(answer) ? answer : []
                          const selected = list.includes(o.value)
                          return (
                            <label
                              key={o.id}
                              className="flex items-center gap-2.5 cursor-pointer group"
                              onClick={() =>
                                setAnswer(step.id, selected ? list.filter((v) => v !== o.value) : [...list, o.value])
                              }
                            >
                              <span
                                className={`w-5 h-5 border-2 rounded-[3px] flex items-center justify-center shrink-0 transition-colors ${
                                  selected
                                    ? "border-[var(--color-brand)] bg-[var(--color-brand)]"
                                    : "border-[#d9d9d9] bg-white group-hover:border-[var(--color-brand)]"
                                }`}
                              >
                                {selected && (
                                  <svg width="11" height="9" viewBox="0 0 10 8" fill="none">
                                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </span>
                              <span className="text-base text-[rgba(0,0,0,0.88)]">{o.label}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}

                    {/* Select */}
                    {step.type === "select" && (
                      <>
                        <div className="relative w-full max-w-sm">
                          <select
                            value={typeof answer === "string" ? answer : ""}
                            onChange={(e) => setAnswer(step.id, e.target.value)}
                            className={`w-full h-[50px] appearance-none rounded-md border bg-white px-3 pr-9 text-sm text-[rgba(0,0,0,0.88)] shadow-xs outline-none transition-colors focus-visible:border-[var(--color-brand)] ${
                              error ? "border-[var(--color-error)]" : "border-gray-200"
                            }`}
                          >
                            <option value="" disabled>Sélectionnez une option</option>
                            {step.options.map((o) => (
                              <option key={o.id} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <ChevronDownIcon size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        {error && <p className="text-xs text-[var(--color-error)] mt-0.5">{error}</p>}
                      </>
                    )}

                    {/* Month + year dropdowns */}
                    {step.type === "input" && step.input_type === "month" && (
                      <>
                        <div className="flex gap-3 max-w-md">
                          {(() => {
                            const [yearPart, monthPart] = typeof answer === "string" && answer ? answer.split("-") : ["", ""]
                            const selectCls = `flex-1 h-[50px] appearance-none rounded-md border bg-white px-3 pr-9 text-sm text-[rgba(0,0,0,0.88)] shadow-xs outline-none transition-colors focus-visible:border-[var(--color-brand)] ${
                              error ? "border-[var(--color-error)]" : "border-gray-200"
                            }`
                            return (
                              <>
                                <div className="relative flex-1">
                                  <select
                                    value={monthPart}
                                    onChange={(e) => setAnswer(step.id, `${yearPart || CURRENT_YEAR}-${e.target.value}`)}
                                    className={selectCls}
                                  >
                                    <option value="" disabled>Mois</option>
                                    {MONTHS.map(([v, label]) => (
                                      <option key={v} value={v}>{label}</option>
                                    ))}
                                  </select>
                                  <ChevronDownIcon size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                                <div className="relative flex-1">
                                  <select
                                    value={yearPart}
                                    onChange={(e) => setAnswer(step.id, `${e.target.value}-${monthPart || "01"}`)}
                                    className={selectCls}
                                  >
                                    <option value="" disabled>Année</option>
                                    {YEARS.map((y) => (
                                      <option key={y} value={y}>{y}</option>
                                    ))}
                                  </select>
                                  <ChevronDownIcon size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                              </>
                            )
                          })()}
                        </div>
                        {error && <p className="text-xs text-[var(--color-error)] mt-0.5">{error}</p>}
                      </>
                    )}

                    {/* Year-only dropdown */}
                    {step.type === "input" && step.input_type === "year" && (
                      <>
                        <div className="relative max-w-[160px]">
                          <select
                            value={typeof answer === "string" ? answer : ""}
                            onChange={(e) => setAnswer(step.id, e.target.value)}
                            className={`w-full h-[50px] appearance-none rounded-md border bg-white px-3 pr-9 text-sm text-[rgba(0,0,0,0.88)] shadow-xs outline-none transition-colors focus-visible:border-[var(--color-brand)] ${
                              error ? "border-[var(--color-error)]" : "border-gray-200"
                            }`}
                          >
                            <option value="" disabled>Année</option>
                            {YEARS.map((y) => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                          <ChevronDownIcon size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        {error && <p className="text-xs text-[var(--color-error)] mt-0.5">{error}</p>}
                      </>
                    )}

                    {/* Input — text / number / email / tel / date */}
                    {step.type === "input" && !["month", "year"].includes(step.input_type || "") && (
                      <>
                        <input
                          type={step.input_type || "text"}
                          placeholder={step.placeholder || ""}
                          value={typeof answer === "string" ? answer : ""}
                          onChange={(e) => setAnswer(step.id, step.uppercase ? e.target.value.toUpperCase() : e.target.value)}
                          className={`max-w-sm w-full h-[50px] rounded-md border bg-white px-3 text-sm text-[rgba(0,0,0,0.88)] shadow-xs outline-none transition-colors focus-visible:border-[var(--color-brand)] ${
                            error ? "border-[var(--color-error)]" : "border-gray-200"
                          }`}
                        />
                        {error && <p className="text-xs text-[var(--color-error)] mt-0.5">{error}</p>}
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={back}
                      disabled={findVisibleStepIndex(sorted, stepIdx - 1, -1, answers) < 0}
                      className="inline-flex items-center justify-center gap-1 h-9 px-4 rounded-[var(--radius)] text-sm font-medium border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <ChevronLeftIcon size={16} />
                      Retour
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      className={`inline-flex items-center justify-center gap-1 h-9 px-4 rounded-[var(--radius)] text-sm font-medium text-white font-semibold transition-colors ${styles.ctaBtn}`}
                    >
                      {isLast ? "Envoyer ma demande" : "Suivant"}
                      {!isLast && <ChevronRightIcon size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}
