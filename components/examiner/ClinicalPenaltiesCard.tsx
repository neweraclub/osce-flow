'use client'

import React from 'react'
import {
  AlertTriangle,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2,
} from 'lucide-react'
import { CandidatePenaltyItem } from '@/app/actions/candidatePenalties'

interface ClinicalPenaltiesCardProps {
  penalties: CandidatePenaltyItem[]
  studentName?: string
  totalDeductionPoints: number
  onOpenAddModal: () => void
  onDeletePenalty: (penaltyId: string) => void
  deletingPenaltyId?: string | null
  isLoading?: boolean
}

export function ClinicalPenaltiesCard({
  penalties,
  studentName,
  totalDeductionPoints,
  onOpenAddModal,
  onDeletePenalty,
  deletingPenaltyId,
  isLoading = false,
}: ClinicalPenaltiesCardProps) {
  const penaltyCount = penalties.length

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
              {penaltyCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-100 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800/80 flex items-center gap-1">
                  <AlertTriangle className="size-3 text-rose-600 dark:text-rose-400" />
                  <span>
                    {penaltyCount} {penaltyCount === 1 ? 'deduction' : 'deductions'} logged (
                    {totalDeductionPoints < 0 ? `${totalDeductionPoints.toFixed(1)} pts` : '-0.0 pts'})
                  </span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Candidate-specific infractions recorded during this active station encounter.
            </p>
          </div>
        </div>

        {/* Action Button: + Add Penalty Item */}
        <button
          type="button"
          onClick={onOpenAddModal}
          className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200/90 dark:border-rose-900/70 bg-rose-50/60 dark:bg-rose-950/40 hover:bg-rose-100/70 dark:hover:bg-rose-900/60 transition-all shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="size-3.5 stroke-[2.5]" />
          <span>Add Penalty Item</span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="size-5 animate-spin text-rose-500" />
          <span className="text-xs font-medium text-slate-400">Loading candidate deductions...</span>
        </div>
      ) : penalties.length === 0 ? (
        /* Empty State */
        <div className="p-6 text-center rounded-2xl border border-dashed border-rose-200/60 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 space-y-1.5">
          <ShieldAlert className="size-6 text-rose-400 mx-auto opacity-70" />
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
            No deductions logged for this candidate.
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Click &quot;Add Penalty Item&quot; above to record specific hygiene breaches, consent failures, or safety infractions.
          </p>
        </div>
      ) : (
        /* Feed of Candidate Penalties */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {penalties.map((item) => {
            const rawPts = Number(item.points) || 0
            const displayPts = rawPts < 0 ? rawPts.toFixed(1) : `-${Math.abs(rawPts).toFixed(1)}`
            const isDeleting = deletingPenaltyId === item.id

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/70 text-slate-900 dark:text-white flex items-start justify-between gap-3 shadow-sm transition-all animate-in fade-in"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-xs font-bold leading-tight text-rose-950 dark:text-rose-100">
                      {item.reason}
                    </span>
                  </div>
                  {item.created_at && (
                    <span className="text-[10px] font-mono text-slate-400 block pl-3.5">
                      Logged at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Deduction Badge */}
                  <span className="px-2 py-1 rounded-xl text-xs font-mono font-bold bg-rose-600 text-white shadow-sm shadow-rose-600/20">
                    [ {displayPts} ]
                  </span>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => onDeletePenalty(item.id)}
                    disabled={isDeleting}
                    title="Remove deduction"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isDeleting ? (
                      <Loader2 className="size-3.5 animate-spin text-rose-500" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
