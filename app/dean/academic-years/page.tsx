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
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
              Institutional Governance
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Academic Calendar Sessions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage institutional timeline cycles, active sessions, and multi-year OSCE configurations.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchYears(true)}
            disabled={refreshing}
            className="p-2.5 rounded-lg bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#161B2A] transition-all"
            title="Refresh database records"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
          <button
            onClick={() => {
              setYearLabel('')
              setFormError('')
              setIsAddOpen(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs shadow-sm shadow-indigo-500/25 transition-all"
          >
            <Plus className="size-4" />
            Add Academic Year
          </button>
        </div>
      </div>

      {/* Grid of Sessions with elevated Active Session */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`skel-card-${idx}`}
              className="p-5 rounded-xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="size-10 rounded-lg bg-slate-200 dark:bg-[#161B2A]" />
                <div className="h-5 w-24 rounded-full bg-slate-200 dark:bg-[#161B2A]" />
              </div>
              <div className="h-6 w-32 rounded bg-slate-200 dark:bg-[#161B2A]" />
              <div className="h-4 w-40 rounded bg-slate-200 dark:bg-[#161B2A]" />
            </div>
          ))
        ) : (
          years.map((y) => {
            const isDeleting = deletingId === y.id
            const isActive = y.is_active

            return (
              <div
                key={y.id}
                className={`relative group p-5 rounded-xl border transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-[#0F121C] border-indigo-500/50 dark:border-indigo-500/60 shadow-[0_0_24px_rgba(79,70,229,0.12)] ring-1 ring-indigo-500/20'
                    : 'bg-white dark:bg-[#0F121C] border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] hover:bg-slate-50/50 dark:hover:bg-[#161B2A]/50'
                } ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {/* Active Indicator bar */}
                {isActive && (
                  <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                )}

                <div className="flex items-start justify-between gap-3 mb-3">
                  <div
                    className={`size-10 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20'
                        : 'bg-slate-100 dark:bg-[#161B2A] text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-white/[0.05]'
                    }`}
                  >
                    <Calendar className="size-5" />
                  </div>

                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] border border-emerald-500/20 shadow-xs">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active Institution-Wide
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#161B2A] text-slate-500 dark:text-slate-400 font-medium text-[11px] border border-slate-200/60 dark:border-white/[0.05]">
                      <Clock className="size-3" />
                      Archived
                    </span>
                  )}
                </div>

                <div className="space-y-1 mb-4">
                  <h3 className="font-mono text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {y.year_label}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
                    <span>Created:</span>
                    <span>{y.created_at ? new Date(y.created_at).toLocaleDateString() : 'N/A'}</span>
                  </p>
                </div>

                {/* Footer Strip with Ghost Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {isActive ? 'Primary operational year' : 'Past session record'}
                  </span>

                  {/* Clean ghost-button icon strip */}
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setDeletingYear(y)}
                      disabled={isDeleting}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                      title="Remove Academic Year"
                    >
                      {isDeleting ? (
                        <Loader2 className="size-4 animate-spin text-indigo-500" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Academic Years Table View for Full Audit */}
      <div className="rounded-xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Session Registry</h3>
            <p className="text-xs text-slate-400">Complete institutional record of academic sessions</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#161B2A] text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-white/[0.05]">
            Total: {years.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/70 dark:bg-[#161B2A]/50 text-[11px] uppercase tracking-wider font-semibold text-slate-400 border-b border-slate-100 dark:border-white/[0.06]">
              <tr>
                <th className="px-6 py-3.5">Academic Session Label</th>
                <th className="px-6 py-3.5">System Status</th>
                <th className="px-6 py-3.5">Registration Timestamp</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <tr key={`skel-row-${idx}`} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-slate-200 dark:bg-[#161B2A]" />
                        <div className="h-4 w-28 rounded bg-slate-200 dark:bg-[#161B2A]" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-24 rounded-full bg-slate-200 dark:bg-[#161B2A]" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 rounded bg-slate-200 dark:bg-[#161B2A]" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="size-7 rounded-lg bg-slate-200 dark:bg-[#161B2A] ml-auto" />
                    </td>
                  </tr>
                ))
              ) : years.length > 0 ? (
                years.map((y) => {
                  const isDeleting = deletingId === y.id
                  const isActive = y.is_active

                  return (
                    <tr
                      key={`row-${y.id}`}
                      className={`transition-colors duration-150 ${
                        isActive
                          ? 'bg-indigo-500/[0.02] dark:bg-indigo-500/[0.03]'
                          : 'hover:bg-slate-50/50 dark:hover:bg-[#161B2A]/40'
                      } ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white font-mono text-sm">
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isActive
                                ? 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20'
                                : 'bg-slate-100 dark:bg-[#161B2A] text-slate-400'
                            }`}
                          >
                            <Calendar className="size-4" />
                          </div>
                          <span>{y.year_label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] border border-emerald-500/20">
                            <CheckCircle2 className="size-3" />
                            Active Institution-Wide
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#161B2A] text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                            <Clock className="size-3" />
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {y.created_at ? new Date(y.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setDeletingYear(y)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                            title="Remove Academic Year"
                          >
                            {isDeleting ? (
                              <Loader2 className="size-4 animate-spin text-indigo-500" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </button>
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Calendar className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Academic Year</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Define new institutional calendar session.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#161B2A] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Academic Year Label
                </label>
                <input
                  type="text"
                  required
                  value={yearLabel}
                  onChange={(e) => setYearLabel(e.target.value)}
                  placeholder="e.g. 2025-2026"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#161B2A] border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Follow the standard four-digit cycle format: YYYY-YYYY.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161B2A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-sm shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  <span>Save Calendar Year</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="size-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Academic Year?</h3>
                <p className="text-xs text-slate-400">Institutional session removal confirmation.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="font-mono text-slate-900 dark:text-white">{deletingYear.year_label}</strong>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                onClick={() => setDeletingYear(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161B2A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold shadow-sm shadow-rose-600/25 flex items-center gap-2 disabled:opacity-50 transition-all"
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
