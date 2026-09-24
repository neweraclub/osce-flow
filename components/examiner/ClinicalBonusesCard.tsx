'use client'

import React from 'react'
import {
  Award,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { CandidateBonusItem } from '@/app/actions/candidateBonuses'

interface ClinicalBonusesCardProps {
  bonuses: CandidateBonusItem[]
  studentName?: string
  totalBonusPoints: number
  onOpenAddModal: () => void
  onDeleteBonus: (bonusId: string) => void
  deletingBonusId?: string | null
  isLoading?: boolean
}

export function ClinicalBonusesCard({
  bonuses,
  studentName,
  totalBonusPoints,
  onOpenAddModal,
  onDeleteBonus,
  deletingBonusId,
  isLoading = false,
}: ClinicalBonusesCardProps) {
  const bonusCount = bonuses.length

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-950/70 shadow-sm space-y-4 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100 dark:border-emerald-950/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-900/60 shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400">
                Clinical Bonuses & Merit Points
              </h3>
              {bonusCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/80 flex items-center gap-1">
                  <Award className="size-3 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    {bonusCount} {bonusCount === 1 ? 'bonus' : 'bonuses'} awarded (
                    {totalBonusPoints > 0 ? `+${totalBonusPoints.toFixed(1)} pts` : '+0.0 pts'})
                  </span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Candidate-specific merit points, protocol mastery, and exceptional clinical actions recorded during this station encounter.
            </p>
          </div>
        </div>

        {/* Action Button: + Add Bonus Item */}
        <button
          type="button"
          onClick={onOpenAddModal}
          className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200/90 dark:border-emerald-900/70 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60 transition-all shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <Plus className="size-3.5 stroke-[2.5]" />
          <span>Add Bonus Item</span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="size-5 animate-spin text-emerald-500" />
          <span className="text-xs font-medium text-slate-400">Loading candidate merit bonuses...</span>
        </div>
      ) : bonuses.length === 0 ? (
        /* Empty State */
        <div className="p-6 text-center rounded-2xl border border-dashed border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-1.5">
          <Award className="size-6 text-emerald-400 mx-auto opacity-70" />
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            No merit bonuses logged for this candidate.
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Click &quot;Add Bonus Item&quot; above to record protocol mastery, exceptional patient communication, or sterile technique precision.
          </p>
        </div>
      ) : (
        /* Feed of Candidate Bonuses */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bonuses.map((item) => {
            const rawPts = Number(item.points) || 0
            const displayPts = `+${Math.abs(rawPts).toFixed(1)}`
            const isDeleting = deletingBonusId === item.id

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/70 text-slate-900 dark:text-white flex items-start justify-between gap-3 shadow-sm transition-all animate-in fade-in"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-bold leading-tight text-emerald-950 dark:text-emerald-100">
                      {item.reason}
                    </span>
                  </div>
                  {item.created_at && (
                    <span className="text-[10px] font-mono text-slate-400 block pl-3.5">
                      Awarded at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Bonus Badge */}
                  <span className="px-2 py-1 rounded-xl text-xs font-mono font-bold bg-emerald-600 text-white shadow-sm shadow-emerald-600/20">
                    [ {displayPts} ]
                  </span>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => onDeleteBonus(item.id)}
                    disabled={isDeleting}
                    title="Remove bonus"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isDeleting ? (
                      <Loader2 className="size-3.5 animate-spin text-emerald-500" />
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
