'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  HelpCircle,
  Key,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { DatePicker } from '@/components/ui/date-picker'
import { UUID_REGEX } from '@/lib/stationSlug'
import {
  EditStationModal,
  AssignedModuleOption,
  EditStationFormValues,
} from '@/components/stations/EditStationModal'
import { updateStationDetailsAction } from '@/app/professor/stations/actions'

export interface StationDetail {
  id: string
  slug?: string
  module_id: string
  station_number: number
  title: string
  access_pin: string
  weightage_percentage: number
  module_name: string
  level_name: string
  created_at?: string
}

export interface ExamSessionItem {
  id: string
  station_id: string
  session_type: string
  exam_date: string
  question_count: number
  created_at?: string
}

export default function ProfessorStationDetailPage({
  params,
}: {
  params: Promise<{ stationId: string }>
}) {
  const router = useRouter()
  const { stationId } = use(params)
  const { showSuccess, showError } = useToast()

  const [station, setStation] = useState<StationDetail | null>(null)
  const [exams, setExams] = useState<ExamSessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // PIN Visibility & copy feedback
  const [pinRevealed, setPinRevealed] = useState(false)
  const [pinCopied, setPinCopied] = useState(false)

  // Edit Station Details Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [assignedModules, setAssignedModules] = useState<AssignedModuleOption[]>([])
  const [moduleWeightageMap, setModuleWeightageMap] = useState<Record<string, number>>({})

  // Create Exam Session Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [sessionType, setSessionType] = useState<'regular' | 'makeup'>('regular')
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Session Limits & Availability Constraints
  const hasRegularSession = exams.some((e) => e.session_type === 'regular')
  const hasMakeupSession = exams.some((e) => e.session_type === 'makeup')
  const isMaxSessionsReached = hasRegularSession && hasMakeupSession

  const handleOpenCreateSession = () => {
    if (isMaxSessionsReached) return
    // Auto pre-select whichever session type is still missing
    if (!hasRegularSession) {
      setSessionType('regular')
    } else {
      setSessionType('makeup')
    }
    setExamDate(new Date().toISOString().split('T')[0])
    setFormError('')
    setIsCreateOpen(true)
  }

  // Delete Exam Modal
  const [deletingExam, setDeletingExam] = useState<ExamSessionItem | null>(null)
  const [exitingExamIds, setExitingExamIds] = useState<Set<string>>(new Set())

  // Global ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateOpen(false)
        setIsEditModalOpen(false)
        setDeletingExam(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const fetchStationData = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch(`/api/professor/stations/${stationId}`)
      const json = await res.json()

      if (res.ok && json.success) {
        setStation(json.station || null)
        setExams(json.exams || [])
        if (json.module_weightage_map) {
          setModuleWeightageMap(json.module_weightage_map)
        }
        if (json.assigned_modules && json.assigned_modules.length > 0) {
          setAssignedModules(json.assigned_modules)
        } else {
          // Fallback fetch modules assigned to professor
          fetch('/api/professor/modules')
            .then((r) => r.json())
            .then((mJson) => {
              if (mJson.success && mJson.modules) {
                setAssignedModules(mJson.modules)
              }
            })
            .catch(() => {})
        }
      } else {
        showError(json.error || 'Failed to fetch station details.')
      }
    } catch {
      showError('Network error connecting to server.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // --- Optimistic Update Handler for Station Details ---
  const handleSaveStationDetails = async (values: EditStationFormValues) => {
    if (!station) return

    const previousStation = { ...station }
    const previousWeightageMap = { ...moduleWeightageMap }
    const targetMod = assignedModules.find((m) => m.id === values.module_id)

    // 1. Instant Optimistic UI update on header title, weightage, and module
    setStation((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        title: values.title,
        station_number: values.station_number,
        weightage_percentage: values.weightage_percentage,
        module_id: values.module_id,
        module_name: targetMod?.module_name || prev.module_name,
        level_name: targetMod?.level_name || prev.level_name,
      }
    })

    // Optimistically update module weightage map
    setModuleWeightageMap((prev) => {
      const next = { ...prev }
      if (station.module_id) {
        next[station.module_id] = Math.max(
          0,
          (next[station.module_id] || 0) - Number(station.weightage_percentage || 0)
        )
      }
      next[values.module_id] = (next[values.module_id] || 0) + values.weightage_percentage
      return next
    })

    // 2. Immediate Toast Feedback
    showSuccess('Station details updated successfully.')

    // 3. Asynchronous Server Action execution in background
    try {
      const result = await updateStationDetailsAction({
        stationId: station.id,
        title: values.title,
        station_number: values.station_number,
        weightage_percentage: values.weightage_percentage,
        module_id: values.module_id,
      })

      if (result.success && result.station) {
        setStation((current) => (current ? { ...current, ...result.station } : null))
        if (result.station.slug && result.station.slug !== stationId) {
          window.history.replaceState(null, '', `/professor/stations/${result.station.slug}`)
        }
      } else {
        // Rollback on server validation error
        setStation(previousStation)
        setModuleWeightageMap(previousWeightageMap)
        showError(result.error || 'Failed to update station details. Changes reverted.')
      }
    } catch (err: any) {
      // Rollback on network failure
      setStation(previousStation)
      setModuleWeightageMap(previousWeightageMap)
      showError(err?.message || 'Network error updating station. Changes reverted.')
    }
  }

  useEffect(() => {
    if (stationId) {
      fetchStationData()
    }
  }, [stationId])

  // Gracefully replace legacy UUID with clean slug in browser address bar without reloading
  useEffect(() => {
    if (station?.slug && UUID_REGEX.test(stationId)) {
      window.history.replaceState(null, '', `/professor/stations/${station.slug}`)
    }
  }, [station?.slug, stationId])

  const handleCopyPin = () => {
    if (!station?.access_pin) return
    navigator.clipboard.writeText(station.access_pin)
    setPinCopied(true)
    setTimeout(() => setPinCopied(false), 2000)
    showSuccess('Station PIN copied to clipboard.')
  }

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!examDate) {
      setFormError('Please select an exam date.')
      return
    }

    if (sessionType === 'regular' && hasRegularSession) {
      setFormError('A Regular Session already exists for this station.')
      return
    }
    if (sessionType === 'makeup' && hasMakeupSession) {
      setFormError('A Makeup Session already exists for this station.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const res = await fetch('/api/professor/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station_id: station?.id || stationId,
          session_type: sessionType,
          exam_date: examDate,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('Exam session created successfully.')
        setIsCreateOpen(false)
        fetchStationData(true)
      } else {
        setFormError(json.error || 'Failed to create exam session.')
      }
    } catch (err: any) {
      setFormError(err?.message || 'Error communicating with server.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteExam = async () => {
    if (!deletingExam) return

    const target = deletingExam
    const targetIndex = exams.findIndex((e) => e.id === target.id)

    // 1. Immediately dismiss modal so interface is instantly responsive
    setDeletingExam(null)

    // 2. Trigger smooth exit transition on card
    setExitingExamIds((prev) => new Set(prev).add(target.id))

    // 3. Remove from active state after exit animation completes
    setTimeout(() => {
      setExams((current) => current.filter((e) => e.id !== target.id))
      setExitingExamIds((prev) => {
        const next = new Set(prev)
        next.delete(target.id)
        return next
      })
    }, 200)

    // 4. Background asynchronous database deletion
    try {
      const res = await fetch(`/api/professor/exams?id=${target.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Exam session deleted.')
      } else {
        // Rollback: restore item to original position
        setExams((current) => {
          if (current.some((e) => e.id === target.id)) return current
          const restored = [...current]
          if (targetIndex >= 0 && targetIndex <= restored.length) {
            restored.splice(targetIndex, 0, target)
          } else {
            restored.push(target)
          }
          return restored
        })
        showError(json.error || 'Failed to delete exam session. Changes restored.')
      }
    } catch {
      // Rollback on network/connection failure
      setExams((current) => {
        if (current.some((e) => e.id === target.id)) return current
        const restored = [...current]
        if (targetIndex >= 0 && targetIndex <= restored.length) {
          restored.splice(targetIndex, 0, target)
        } else {
          restored.push(target)
        }
        return restored
      })
      showError('Network error deleting exam. Item restored.')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/professor/stations"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to All Stations</span>
        </Link>

        <button
          onClick={() => fetchStationData(true)}
          disabled={refreshing || loading}
          aria-label="Refresh station"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
          <Loader2 className="size-8 text-emerald-500 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading station details...</p>
        </div>
      ) : !station ? (
        <div className="p-12 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <AlertCircle className="size-8 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Station Not Found</h3>
          <p className="text-xs text-slate-400">The requested station could not be found or has been removed.</p>
        </div>
      ) : (
        <>
          {/* Station Metadata Header Card */}
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-800 text-white shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-xs">
                    Station #{station.station_number}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {station.level_name}
                  </span>
                  {station.weightage_percentage > 0 && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {station.weightage_percentage}% Station Weightage
                    </span>
                  )}
                  {(() => {
                    const modTotal = moduleWeightageMap[station.module_id] ?? station.weightage_percentage
                    const isFullyAllocated = modTotal >= 100
                    return (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                          isFullyAllocated
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {isFullyAllocated ? (
                          <CheckCircle2 className="size-3 text-emerald-400" />
                        ) : (
                          <AlertCircle className="size-3 text-amber-400" />
                        )}
                        <span>
                          Module Weightage: {modTotal}% / 100%{' '}
                          {isFullyAllocated ? '(Fully Allocated)' : `(${Math.max(0, 100 - modTotal)}% Unallocated)`}
                        </span>
                      </span>
                    )
                  })()}
                </div>

                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                  {station.title}
                </h1>

                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <BookOpen className="size-4 text-blue-400 shrink-0" />
                  <span className="font-semibold text-white">{station.module_name}</span>
                </div>
              </div>

              {/* Header Right Actions: Edit Station Details & PIN Box */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                {/* Edit Station Details Button */}
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/15 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md cursor-pointer hover:border-emerald-400/50 group shrink-0"
                  aria-label="Edit Station Details"
                >
                  <Edit2 className="size-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
                  <span>Edit Station Details</span>
                </button>

                {/* Secure Tablet Access PIN Box */}
                <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-between gap-4 min-w-[200px]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                      <Key className="size-4.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                        Live Scoring PIN
                      </span>
                      <span className="font-mono text-sm font-black text-white tracking-widest">
                        {pinRevealed ? station.access_pin : '••••••'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPinRevealed(!pinRevealed)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label="Toggle PIN Visibility"
                    >
                      {pinRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                    <button
                      onClick={handleCopyPin}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-white/10 transition-colors"
                      aria-label="Copy Access PIN"
                    >
                      {pinCopied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Exam Sessions Management Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="size-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Scheduled Exam Sessions ({exams.length}/2)</span>
                </h2>
                <p className="text-xs font-medium text-slate-400">
                  Each station allows at most 1 Regular Session and 1 Makeup Session
                </p>
              </div>

              {isMaxSessionsReached ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-sm">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <span>Max Sessions Reached (2/2)</span>
                </div>
              ) : (
                <button
                  onClick={handleOpenCreateSession}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-[0.98]"
                >
                  <Plus className="size-4" />
                  <span>+ Create Exam Session</span>
                </button>
              )}
            </div>

            {exams.length === 0 ? (
              <div className="p-12 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
                <div className="size-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Calendar className="size-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No Exam Sessions Scheduled
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Click "+ Create Exam Session" to set up your first regular or makeup exam date and add scoring criteria.
                </p>
                <button
                  onClick={handleOpenCreateSession}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all"
                >
                  <Plus className="size-4" />
                  <span>Create First Session</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exams.map((exam) => {
                  const formattedDate = new Date(exam.exam_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })

                  const isExiting = exitingExamIds.has(exam.id)

                  return (
                    <div
                      key={exam.id}
                      onClick={() => router.push(`/professor/stations/${station?.slug || stationId}/exams/${exam.id}`)}
                      className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/40 flex flex-col justify-between space-y-4 group cursor-pointer ${
                        isExiting
                          ? 'transition-all duration-200 opacity-0 scale-95 pointer-events-none'
                          : 'transition-all duration-200'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          {exam.session_type === 'makeup' ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800 shadow-xs">
                              <Layers className="size-3 text-purple-500" />
                              <span>Makeup Session</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800 shadow-xs">
                              <CheckCircle2 className="size-3 text-emerald-500" />
                              <span>Regular Session</span>
                            </span>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingExam(exam)
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            aria-label="Delete Exam Session"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            <Calendar className="size-4 text-emerald-500 shrink-0" />
                            <span>{formattedDate}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            OSCE Exam Date
                          </p>
                        </div>

                        {/* Questions count pill */}
                        <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-semibold">Authored Questions:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <HelpCircle className="size-3.5 text-blue-500" />
                            <span>{exam.question_count} Question{exam.question_count !== 1 ? 's' : ''}</span>
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-400">Scoring Checklist</span>
                        <div className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                          <span>Open Question & Checklist Builder</span>
                          <ChevronRight className="size-4" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* --- Create Exam Session Modal --- */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                  <Calendar className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Create Exam Session
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Station #{station?.station_number} • {station?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateExam} className="space-y-4">
              {/* Session Type with Availability Enforcement */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Session Type *
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    1 Regular + 1 Makeup max
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={hasRegularSession}
                    onClick={() => setSessionType('regular')}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-xs font-bold transition-all relative ${
                      hasRegularSession
                        ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                        : sessionType === 'regular'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className={`size-4 ${hasRegularSession ? 'text-slate-400' : 'text-emerald-500'}`} />
                      <span>Regular Session</span>
                    </div>
                    {hasRegularSession && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        (Already Created)
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={hasMakeupSession}
                    onClick={() => setSessionType('makeup')}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-xs font-bold transition-all relative ${
                      hasMakeupSession
                        ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                        : sessionType === 'makeup'
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Layers className={`size-4 ${hasMakeupSession ? 'text-slate-400' : 'text-purple-500'}`} />
                      <span>Makeup Session</span>
                    </div>
                    {hasMakeupSession && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        (Already Created)
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Exam Date Picker */}
              <DatePicker
                label="Exam Date"
                required
                value={examDate}
                onChange={(newDate) => setExamDate(newDate)}
                disablePastDates={true}
                placeholder="Select upcoming exam date..."
                variant="emerald"
                format="MMM DD, YYYY"
              />

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Session</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Delete Exam Confirmation Modal --- */}
      {deletingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mx-auto">
              <Trash2 className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Exam Session?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to remove the exam session scheduled for{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {new Date(deletingExam.exam_date).toLocaleDateString()}
                </strong>
                ? All associated questions will also be removed.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeletingExam(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExam}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/25 hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Session</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Edit Station Details Modal --- */}
      {station && (
        <EditStationModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          station={station}
          assignedModules={assignedModules}
          moduleWeightageMap={moduleWeightageMap}
          onSave={handleSaveStationDetails}
        />
      )}
    </div>
  )
}
