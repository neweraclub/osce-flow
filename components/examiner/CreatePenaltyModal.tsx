'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Check,
  FileText,
  Minus,
  Plus,
  ShieldAlert,
  Loader2,
  X,
} from 'lucide-react'
import {
  createStationCriterionAction,
  StationCriterionRecord,
} from '@/app/actions/stationCriteria'

interface CreatePenaltyModalProps {
  isOpen: boolean
  onClose: () => void
  stationId: string
  stationTitle?: string
  onCreated: (criterion: StationCriterionRecord) => void
}

const PRESET_DEDUCTIONS = [-0.5, -1.0, -1.5, -2.0, -3.0]

export function CreatePenaltyModal({
  isOpen,
  onClose,
  stationId,
  stationTitle,
  onCreated,
}: CreatePenaltyModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pointsInput, setPointsInput] = useState('-1.0')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Reset form whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setPointsInput('-1.0')
      setErrorMessage(null)
      setIsSubmitting(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Calculate parsed negative deduction value in real-time
  const parsedNum = parseFloat(pointsInput)
  const effectivePoints = !isNaN(parsedNum)
    ? parsedNum > 0
      ? -parsedNum
      : parsedNum === 0
      ? -1.0
      : parsedNum
    : -1.0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!title.trim()) {
      setErrorMessage('Please provide a penalty title.')
      return
    }

    if (isNaN(parsedNum) || parsedNum === 0) {
      setErrorMessage('Deduction points must be a valid non-zero number.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createStationCriterionAction({
        station_id: stationId,
        title: title.trim(),
        description: description.trim() || null,
        points: effectivePoints,
      })

      if (!result.success || !result.criterion) {
        setErrorMessage(result.error || 'Failed to save penalty item.')
        setIsSubmitting(false)
        return
      }

      // Optimistic update callback
      onCreated(result.criterion)
      onClose()
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unexpected error creating penalty.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog Window */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-penalty-dialog-title"
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-rose-200/80 dark:border-rose-950/70 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-rose-50/50 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-950/60 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shrink-0">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h2
                id="create-penalty-dialog-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
              >
                Add Clinical Penalty Item
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Define a custom deduction criterion for {stationTitle ? `"${stationTitle}"` : 'this station'}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Penalty Title <span className="text-rose-500">*</span></span>
              <span className="text-[10px] font-normal text-slate-400">Required</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Failed Hand Hygiene / Aseptic Field"
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
              required
              autoFocus
            />
          </div>

          {/* Deduction Points */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Deduction Points <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/60">
                Will store: {effectivePoints.toFixed(1)} pts
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={pointsInput}
                onChange={(e) => setPointsInput(e.target.value)}
                placeholder="-1.0"
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Positive inputs (e.g. 1.5) are automatically converted to negative (-1.5) to comply with database constraints.
            </p>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-400 font-semibold mr-1">Presets:</span>
              {PRESET_DEDUCTIONS.map((preset) => {
                const isSelected = effectivePoints === preset
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPointsInput(preset.toString())}
                    className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400'
                    }`}
                  >
                    {preset.toFixed(1)} pts
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Description / Clinical Rationale</span>
              <span className="text-[10px] font-normal text-slate-400">Optional</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Candidate omitted hand sanitization or breached sterile field before patient contact..."
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all resize-none"
            />
          </div>

          {/* Bound Station ID (Hidden / Displayed as small badge) */}
          <input type="hidden" name="station_id" value={stationId} />

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-md shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving Penalty...</span>
                </>
              ) : (
                <>
                  <Plus className="size-3.5 stroke-[2.5]" />
                  <span>Save Penalty Item</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
