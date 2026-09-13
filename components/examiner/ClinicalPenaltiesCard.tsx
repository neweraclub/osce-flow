'use client'

import React from 'react'
import { AlertTriangle, Check, Plus, ShieldAlert, X } from 'lucide-react'

export interface StationCriterion {
  id: string
  station_id?: string
  title: string
  description?: string | null
  points: number // Strictly negative (e.g. -1.0, -2.0)
  created_at?: string
  updated_at?: string
}

interface ClinicalPenaltiesCardProps {
  criteria: StationCriterion[]
  selectedPenaltyIds: string[]
  totalDeductionPoints: number
  onTogglePenalty: (criterionId: string) => void
  onClearPenalties?: () => void
  onOpenAddModal?: () => void
  disabled?: boolean
}

export function ClinicalPenaltiesCard({
  criteria,
  selectedPenaltyIds,
  totalDeductionPoints,
  onTogglePenalty,
  onClearPenalties,
  onOpenAddModal,
  disabled = false,
}: ClinicalPenaltiesCardProps) {
  if (!criteria || criteria.length === 0) {
    return null
  }

  const appliedCount = selectedPenaltyIds.length

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-950/70 shadow-sm space-y-4 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-100 dark:border-rose-950/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/70 dark:border-rose-900/60 shrink-0">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-rose-600 dark:text-rose-400">
                Clinical Deductions & Penalties
              </h3>
              {appliedCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-100 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800/80 flex items-center gap-1">
                  <AlertTriangle className="size-3 text-rose-600 dark:text-rose-400" />
                  <span>
                    {appliedCount} {appliedCount === 1 ? 'deduction' : 'deductions'} applied (
                    {totalDeductionPoints < 0 ? `${totalDeductionPoints.toFixed(1)} pts` : '-0.0 pts'})
                  </span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Deduct negative points for breaches in hygiene, patient safety hazards, or clinical conduct.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onOpenAddModal && (
            <button
              type="button"
              onClick={onOpenAddModal}
              disabled={disabled}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200/90 dark:border-rose-900/70 bg-rose-50/60 dark:bg-rose-950/40 hover:bg-rose-100/70 dark:hover:bg-rose-900/60 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Plus className="size-3.5 stroke-[2.5]" />
              <span>Add Penalty Item</span>
            </button>
          )}

          {appliedCount > 0 && onClearPenalties && (
            <button
              type="button"
              onClick={onClearPenalties}
              disabled={disabled}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="size-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Penalty items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {criteria.map((item) => {
          const isSelected = selectedPenaltyIds.includes(item.id)
          const rawPts = Number(item.points) || 0
          const displayPts = rawPts < 0 ? rawPts.toFixed(1) : `-${Math.abs(rawPts).toFixed(1)}`

          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onTogglePenalty(item.id)}
              className={`group p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 cursor-pointer select-none ${
                isSelected
                  ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 text-rose-950 dark:text-rose-100 shadow-sm shadow-rose-500/10 ring-1 ring-rose-400/50 dark:ring-rose-600/40'
                  : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/60 hover:bg-rose-50/20 dark:hover:bg-rose-950/20 text-slate-700 dark:text-slate-300'
              } disabled:opacity-50 disabled:pointer-events-none`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Checkbox indicator */}
                <div
                  className={`size-5 mt-0.5 rounded-lg flex items-center justify-center border transition-colors shrink-0 ${
                    isSelected
                      ? 'bg-rose-600 border-rose-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 group-hover:border-rose-300 dark:group-hover:border-rose-700'
                  }`}
                >
                  {isSelected && <Check className="size-3.5 stroke-[3]" />}
                </div>

                <div className="space-y-1 min-w-0">
                  <span
                    className={`text-xs font-bold leading-snug block transition-colors ${
                      isSelected
                        ? 'text-rose-900 dark:text-rose-200'
                        : 'text-slate-800 dark:text-slate-200 group-hover:text-rose-900 dark:group-hover:text-rose-300'
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Negative points indicator badge */}
              <span
                className={`px-2 py-1 rounded-xl text-xs font-mono font-bold shrink-0 transition-all ${
                  isSelected
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30 ring-1 ring-rose-700'
                    : 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/70 group-hover:bg-rose-100 dark:group-hover:bg-rose-900/60'
                }`}
              >
                [ {displayPts} ]
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
