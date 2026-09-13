'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Edit2,
  Hash,
  Layers,
  Loader2,
  Percent,
  X,
} from 'lucide-react'
import { Select } from '@/components/ui/Select'

export interface AssignedModuleOption {
  id: string
  module_name: string
  level_name: string
}

export interface EditStationFormValues {
  title: string
  station_number: number
  weightage_percentage: number
  module_id: string
}

export interface EditStationModalProps {
  isOpen: boolean
  onClose: () => void
  station: {
    id: string
    title: string
    station_number: number
    weightage_percentage: number
    module_id: string
    module_name?: string
    level_name?: string
  }
  assignedModules: AssignedModuleOption[]
  moduleWeightageMap?: Record<string, number> | Map<string, number>
  onSave: (values: EditStationFormValues) => Promise<void>
}

export function EditStationModal({
  isOpen,
  onClose,
  station,
  assignedModules,
  moduleWeightageMap,
  onSave,
}: EditStationModalProps) {
  const [title, setTitle] = useState(station.title || '')
  const [stationNumber, setStationNumber] = useState<number>(station.station_number || 1)
  const [weightage, setWeightage] = useState<number>(station.weightage_percentage || 0)
  const [moduleId, setModuleId] = useState(station.module_id || '')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Calculate cumulative module weightage and remaining available capacity
  const currentModuleTotal = React.useMemo(() => {
    if (!moduleId || !moduleWeightageMap) return 0
    if (moduleWeightageMap instanceof Map) {
      return moduleWeightageMap.get(moduleId) || 0
    }
    return moduleWeightageMap[moduleId] || 0
  }, [moduleId, moduleWeightageMap])

  const isSameModule = station.module_id === moduleId
  const existingStationWeight = isSameModule ? Number(station.weightage_percentage || 0) : 0
  const otherStationsWeight = Math.max(0, currentModuleTotal - existingStationWeight)
  const availableWeightage = Math.max(0, Math.round((100 - otherStationsWeight) * 100) / 100)
  const isWeightageExceeded = Number(weightage || 0) > availableWeightage

  // Sync form state whenever station prop changes or modal opens
  useEffect(() => {
    if (isOpen && station) {
      setTitle(station.title || '')
      setStationNumber(station.station_number || 1)
      setWeightage(Number(station.weightage_percentage) || 0)
      setModuleId(station.module_id || '')
      setFormError('')
      setSaving(false)
    }
  }, [isOpen, station])

  // Global ESC key listener
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, saving, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setFormError('Please enter a Station Name.')
      return
    }

    const parsedNum = Math.floor(Number(stationNumber))
    if (isNaN(parsedNum) || parsedNum < 1) {
      setFormError('Station Number must be at least 1.')
      return
    }

    const parsedWeight = Math.max(0, Math.min(100, Number(weightage) || 0))

    if (!moduleId) {
      setFormError('Please select an Assigned Module.')
      return
    }

    if (parsedWeight > availableWeightage) {
      setFormError(
        `Total station weightage for this module cannot exceed 100% (Maximum available: ${availableWeightage}%).`
      )
      return
    }

    setSaving(true)
    setFormError('')

    try {
      await onSave({
        title: title.trim(),
        station_number: parsedNum,
        weightage_percentage: parsedWeight,
        module_id: moduleId,
      })
      onClose()
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save station details.')
    } finally {
      setSaving(false)
    }
  }

  const moduleOptions = assignedModules.map((m) => ({
    value: m.id,
    label: m.module_name,
    subLabel: m.level_name,
  }))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-station-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose()
        }
      }}
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
              <Edit2 className="size-4.5" />
            </div>
            <div>
              <h2
                id="edit-station-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
              >
                Edit Station Details
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Update station name, number, module, and weightage
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
            aria-label="Close modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Error Banner */}
        {formError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Assigned Module Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Assigned Module <span className="text-rose-500">*</span>
            </label>
            <Select
              size="md"
              value={moduleId}
              onChange={(val) => setModuleId(val)}
              options={moduleOptions}
              placeholder="Select Assigned Module"
              searchable
            />
            <p className="text-[11px] text-slate-400">
              Restricted strictly to clinical modules assigned to your profile.
            </p>
          </div>

          {/* Station Number & Station Name */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  value={stationNumber}
                  onChange={(e) => setStationNumber(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Station Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Cardiovascular Examination"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                required
              />
            </div>
          </div>

          {/* Exam Weightage */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Exam Weightage (%)
              </label>
              {moduleId && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                    isWeightageExceeded
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                      : availableWeightage === 0
                      ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  <Percent className="size-2.5" />
                  <span>Available Module Weightage: {availableWeightage}%</span>
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={weightage}
                onChange={(e) => setWeightage(parseFloat(e.target.value) || 0)}
                className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 shadow-xs ${
                  isWeightageExceeded
                    ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'
                }`}
                placeholder="0 - 100"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                %
              </span>
            </div>

            {isWeightageExceeded ? (
              <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 animate-in fade-in">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>
                  Total station weightage for this module cannot exceed 100% (Maximum available: {availableWeightage}%).
                </span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Percentage contribution of this station towards the overall exam score.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || isWeightageExceeded}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/25 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Edit2 className="size-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
