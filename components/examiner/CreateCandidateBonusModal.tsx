'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertCircle,
  Award,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import { PresetCriterionOption } from '@/components/examiner/CreateCandidatePenaltyModal'

interface CreateCandidateBonusModalProps {
  isOpen: boolean
  onClose: () => void
  studentName: string
  presetCriteria?: PresetCriterionOption[]
  onAddBonus: (bonus: { id: string; reason: string; points: number; criteria_id?: string }) => void
}

const PRESET_BONUSES = [0.5, 1.0, 1.5, 2.0]

export function CreateCandidateBonusModal({
  isOpen,
  onClose,
  studentName,
  presetCriteria = [],
  onAddBonus,
}: CreateCandidateBonusModalProps) {
  const [reason, setReason] = useState('')
  const [pointsInput, setPointsInput] = useState('0.5')
  const [selectedCriteriaId, setSelectedCriteriaId] = useState<string | undefined>(undefined)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setReason('')
      setPointsInput('0.5')
      setSelectedCriteriaId(undefined)
      setErrorMessage(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const parsed = parseFloat(pointsInput)
  const effectivePoints = !isNaN(parsed) && parsed > 0 ? parsed : 0.5

  const handleSelectPresetTemplate = (c: PresetCriterionOption) => {
    setReason(c.title)
    setPointsInput(Math.abs(c.points).toString())
    setSelectedCriteriaId(c.id)
    setErrorMessage(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!reason.trim()) {
      setErrorMessage('Please provide a reason or criteria for the merit bonus.')
      return
    }

    if (isNaN(parsed) || parsed <= 0) {
      setErrorMessage('Bonus points must be a positive number greater than 0.')
      return
    }

    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `bonus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    // Add directly to local React state via parent callback with sanitized positive points
    onAddBonus({
      id: newId,
      reason: reason.trim(),
      points: Math.abs(effectivePoints),
      criteria_id: selectedCriteriaId,
    })

    // Reset input fields and close modal
    setReason('')
    setPointsInput('0.5')
    setSelectedCriteriaId(undefined)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bonus-modal-title"
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-emerald-200/80 dark:border-emerald-950/70 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-5 bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-950/60 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2
                id="bonus-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Award Merit Bonus to Candidate
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                Active: <span className="font-bold text-slate-800 dark:text-slate-200">{studentName}</span>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Station Preset Bonuses Selection (if configured in station_bonuses) */}
          {presetCriteria.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Preset Station Bonuses</span>
                <span className="text-[10px] text-slate-400">Click to autofill</span>
              </label>
              <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto pr-1">
                {presetCriteria.map((preset) => {
                  const isSelected = selectedCriteriaId === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPresetTemplate(preset)}
                      className={`p-2 rounded-xl text-left text-xs border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-100/80 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold ring-1 ring-emerald-500/30'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-300'
                      }`}
                    >
                      <span className="truncate font-medium">{preset.title}</span>
                      <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                        +{Number(preset.points).toFixed(1)} pts
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Reason for Merit Bonus <span className="text-emerald-500">*</span></span>
              <span className="text-[10px] font-normal text-slate-400">Required</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                // If user edits text manually, clear the preset selection if it doesn't match
                if (selectedCriteriaId) {
                  const match = presetCriteria.find((p) => p.id === selectedCriteriaId)
                  if (match && match.title !== e.target.value) {
                    setSelectedCriteriaId(undefined)
                  }
                }
              }}
              placeholder="e.g. Exemplary Aseptic Technique & Protocol Precision"
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-medium"
              required
              autoFocus
            />
          </div>

          {/* Points Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Points to Award <span className="text-emerald-500">*</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/60">
                Will store: +{effectivePoints.toFixed(1)} pts
              </span>
            </div>

            <input
              type="number"
              step="0.1"
              min="0.1"
              value={pointsInput}
              onChange={(e) => setPointsInput(e.target.value)}
              placeholder="0.5"
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-mono font-semibold bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              required
            />
            <p className="text-[10px] text-slate-400">
              Positive values increase the candidate&apos;s station net score (bounded by station max points).
            </p>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-400 font-semibold mr-1">Presets:</span>
              {PRESET_BONUSES.map((preset) => {
                const isSelected = effectivePoints === preset
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPointsInput(preset.toString())}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    +{preset.toFixed(1)} pts
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="size-3.5 stroke-[2.5]" />
              <span>Record Bonus</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
