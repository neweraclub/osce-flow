'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { useAcademicYear } from '@/context/AcademicYearContext'

export interface AcademicYear {
  id: string
  year_label: string
  created_at: string
  is_active: boolean
}

export default function AcademicYearsPage() {
  const { showSuccess, showError } = useToast()
  const { refreshYears } = useAcademicYear()

  const [years, setYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // In-flight deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [deletingYear, setDeletingYear] = useState<AcademicYear | null>(null)

  // Form state
  const [yearLabel, setYearLabel] = useState('')
  const [formError, setFormError] = useState('')

  // Global Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddOpen(false)
        setDeletingYear(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const fetchYears = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/dean/academic-years')
      const json = await res.json()

      if (res.ok && json.success) {
        setYears(json.academicYears || [])
      } else {
        showError(json.error || 'Failed to fetch academic years.')
      }
    } catch {
      showError('Network error connecting to server.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchYears()
  }, [])

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!yearLabel.trim() || !/^\d{4}-\d{4}$/.test(yearLabel.trim())) {
      setFormError('Academic year label must follow YYYY-YYYY format (e.g. 2025-2026).')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const res = await fetch('/api/dean/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year_label: yearLabel.trim() }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Academic year registered successfully.')
        setIsAddOpen(false)
        setYearLabel('')
        fetchYears(true)
        refreshYears()
      } else {
        const msg = json.error || 'Failed to register academic year.'
        setFormError(msg)
        showError(msg)
      }
    } catch {
      const msg = 'Network error saving academic year.'
      setFormError(msg)
      showError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Deletion with In-Flight Row Loading Spinner
  const handleDeleteConfirm = async () => {
    if (!deletingYear) return
    const targetId = deletingYear.id

    // Close modal & mark row as deleting in-flight
    setDeletingYear(null)
    setDeletingId(targetId)

    try {
      const res = await fetch(`/api/dean/academic-years?id=${targetId}`, {
        method: 'DELETE',
      })

      const json = await res.json()

      if (res.ok && json.success) {
        setYears((prev) => prev.filter((y) => y.id !== targetId))
        showSuccess('Academic year removed successfully.')
        refreshYears()
      } else {
        showError(json.error || 'Failed to remove academic year. Please try again.')
      }
    } catch {
      showError('Failed to remove academic year. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Academic Calendar Years
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage medical faculty academic session calendars.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchYears(true)}
            disabled={refreshing}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all"
            title="Refresh database records"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setYearLabel('')
              setFormError('')
              setIsAddOpen(true)
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all"
          >
            <Plus className="size-4" />
            Add Academic Year
          </button>
        </div>
      </div>

      {/* Academic Years Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/40 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Academic Year Label</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading academic years...
                  </td>
                </tr>
              ) : years.length > 0 ? (
                years.map((y) => {
                  const isDeleting = deletingId === y.id
                  return (
                    <tr
                      key={y.id}
                      className={`transition-all duration-200 ${
                        isDeleting
                          ? 'opacity-50 pointer-events-none bg-slate-100/50 dark:bg-slate-800/50'
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white font-mono text-sm">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs">
                            <Calendar className="size-5" />
                          </div>
                          <span>{y.year_label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {y.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200/60 dark:border-emerald-900/50">
                            <CheckCircle2 className="size-3.5" />
                            Active Calendar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
                            <Clock className="size-3.5" />
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">
                        {y.created_at ? new Date(y.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setDeletingYear(y)}
                          disabled={isDeleting}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                          title="Remove Academic Year"
                        >
                          {isDeleting ? (
                            <Loader2 className="size-4 animate-spin text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    No academic calendar years found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD ACADEMIC YEAR MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Calendar className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Academic Year</h3>
                  <p className="text-xs text-slate-500">Define new institutional calendar session.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Academic Year Label
                </label>
                <input
                  type="text"
                  required
                  value={yearLabel}
                  onChange={(e) => setYearLabel(e.target.value)}
                  placeholder="e.g. 2025-2026"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  <span>Save Calendar Year</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="size-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Academic Year?</h3>
                <p className="text-xs text-slate-500">Session removal confirmation.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-900 dark:text-white">{deletingYear.year_label}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setDeletingYear(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 flex items-center gap-2 disabled:opacity-50"
              >
                <span>Remove Year</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
