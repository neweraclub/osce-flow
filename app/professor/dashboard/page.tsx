'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  AlertTriangle,
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
  GraduationCap,
  Info,
  Key,
  Layers,
  ListPlus,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { StationStatusBadge, UnscheduledStationNotice } from '@/components/stations/station-status-badge'
import { useAcademicYear } from '@/context/AcademicYearContext'
import { useToast } from '@/context/ToastContext'
import { getStationSlug } from '@/lib/stationSlug'

export interface ProfessorProfile {
  id: string
  user_id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  faculty_name: string
}

export interface AssignedModule {
  id: string
  module_name: string
  level_id: string
  level_name: string
  total_exams: number
  created_at?: string
}

export interface AssignedStation {
  id: string
  slug?: string
  module_id?: string
  station_number: number
  title: string
  access_pin: string
  weightage_percentage?: number
  exam_id: string | null
  question_count: number
  completed_count?: number
  total_candidates?: number
  progress_percentage?: number
  status: 'ready' | 'needs_setup' | 'incomplete'
  status_label: string
  created_at?: string
  module_name?: string
  level_name?: string
  linked_exam?: {
    id: string
    module_name: string
    level_name: string
    section_name: string
    group_name: string
    session_type: string
    exam_date: string
  } | null
}

export interface UpcomingExamSession {
  id: string
  module_id: string
  module_name: string
  level_name: string
  section_name: string
  group_name: string
  session_type: string
  exam_date: string
}

export interface QuestionItem {
  id: string
  station_id: string
  question_text: string
  question_type: string
  max_points: number
  created_at?: string
  options?: any[]
}

export default function ProfessorDashboardPage() {
  const router = useRouter()
  const { showSuccess, showError } = useToast()
  const {
    selectedYearId,
    selectedYear,
    isLoading: isYearLoading,
  } = useAcademicYear()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [professor, setProfessor] = useState<ProfessorProfile | null>(null)
  const [modules, setModules] = useState<AssignedModule[]>([])
  const [stations, setStations] = useState<AssignedStation[]>([])
  const [upcomingExams, setUpcomingExams] = useState<UpcomingExamSession[]>([])
  const [stats, setStats] = useState({
    assignedModulesCount: 0,
    assignedStationsCount: 0,
    upcomingSessionsCount: 0,
    readyStationsCount: 0,
    pendingStationsCount: 0,
  })

  // PIN Visibility toggles and copy feedback
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({})
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null)

  // Module Preview Modal
  const [previewModule, setPreviewModule] = useState<AssignedModule | null>(null)

  // Station Question / Checklist Builder Modal
  const [activeStationForQuestions, setActiveStationForQuestions] = useState<AssignedStation | null>(null)
  const [stationQuestions, setStationQuestions] = useState<QuestionItem[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [savingQuestion, setSavingQuestion] = useState(false)

  // Question form state
  const [newQuestionText, setNewQuestionText] = useState('')
  const [newQuestionType, setNewQuestionType] = useState('clinical_task')
  const [newQuestionPoints, setNewQuestionPoints] = useState<number>(2)
  const [questionError, setQuestionError] = useState('')

  // Global ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewModule(null)
        setActiveStationForQuestions(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fetch Dashboard Overview Payload
  const fetchOverview = async (yearId?: string | null, isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    const targetYearId = yearId || selectedYearId

    try {
      const url = targetYearId
        ? `/api/professor/overview?academic_year_id=${targetYearId}`
        : '/api/professor/overview'
      const res = await fetch(url)
      const json = await res.json()

      if (res.ok && json.success) {
        setProfessor(json.professor || null)
        setModules(json.modules || [])
        setStations(json.stations || [])
        setUpcomingExams(json.upcomingExams || [])
        setStats(
          json.stats || {
            assignedModulesCount: 0,
            assignedStationsCount: 0,
            upcomingSessionsCount: 0,
            readyStationsCount: 0,
            pendingStationsCount: 0,
          }
        )
      } else {
        showError(json.error || 'Failed to load professor dashboard.')
      }
    } catch (err: any) {
      showError(err?.message || 'Error connecting to server.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Refetch when selected academic year changes
  useEffect(() => {
    if (selectedYearId) {
      fetchOverview(selectedYearId)
    } else if (!isYearLoading) {
      fetchOverview(null)
    }
  }, [selectedYearId, isYearLoading])

  const togglePinReveal = (stationId: string) => {
    setRevealedPins((prev) => ({
      ...prev,
      [stationId]: !prev[stationId],
    }))
  }

  const handleCopyPin = (stationId: string, pin: string) => {
    navigator.clipboard.writeText(pin)
    setCopiedPinId(stationId)
    setTimeout(() => setCopiedPinId(null), 2000)
    showSuccess('Access PIN copied to clipboard.')
  }

  // --- Question Builder Modal Logic ---
  const handleOpenQuestionsModal = async (station: AssignedStation) => {
    setActiveStationForQuestions(station)
    setNewQuestionText('')
    setNewQuestionPoints(2)
    setQuestionError('')
    setLoadingQuestions(true)

    try {
      const res = await fetch(`/api/professor/questions?station_id=${station.id}`)
      const json = await res.json()

      if (res.ok && json.success) {
        setStationQuestions(json.questions || [])
      } else {
        showError(json.error || 'Failed to load station questions.')
      }
    } catch {
      showError('Network error loading station checklist.')
    } finally {
      setLoadingQuestions(false)
    }
  }

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeStationForQuestions) return
    if (!newQuestionText.trim()) {
      setQuestionError('Please enter the clinical evaluation or checklist criteria.')
      return
    }

    setSavingQuestion(true)
    setQuestionError('')

    try {
      const res = await fetch('/api/professor/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station_id: activeStationForQuestions.id,
          question_text: newQuestionText.trim(),
          question_type: newQuestionType,
          max_points: newQuestionPoints,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('Checklist criteria added.')
        setNewQuestionText('')
        setNewQuestionPoints(2)
        // Refresh question list
        const refreshRes = await fetch(
          `/api/professor/questions?station_id=${activeStationForQuestions.id}`
        )
        const refreshJson = await refreshRes.json()
        if (refreshJson.success) {
          setStationQuestions(refreshJson.questions || [])
        }
        // Background refresh overview
        fetchOverview(selectedYearId)
      } else {
        setQuestionError(json.error || 'Failed to save question criteria.')
      }
    } catch (err: any) {
      setQuestionError(err?.message || 'Error communicating with server.')
    } finally {
      setSavingQuestion(false)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!activeStationForQuestions) return

    try {
      const res = await fetch(`/api/professor/questions?id=${questionId}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Evaluation criteria removed.')
        setStationQuestions((prev) => prev.filter((q) => q.id !== questionId))
        fetchOverview(selectedYearId)
      } else {
        showError(json.error || 'Failed to remove criteria.')
      }
    } catch {
      showError('Network error removing criteria.')
    }
  }

  const totalStationPoints = useMemo(() => {
    return stationQuestions.reduce((sum, q) => sum + Number(q.max_points || 0), 0)
  }, [stationQuestions])

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Welcome Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-800 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 size-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 size-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                </span>
                <span>{selectedYear?.name || 'Active Session'}</span>
              </span>

              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-slate-300 border border-white/10">
                {professor?.faculty_name || 'Medical Faculty Workspace'}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {professor ? `Welcome back, ${professor.full_name}` : 'Welcome back, Professor'}
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-300 max-w-2xl leading-relaxed">
              Manage your clinical modules, author scoring checklists for assigned OSCE stations, and review upcoming evaluation sessions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchOverview(selectedYearId, true)}
              disabled={refreshing || loading}
              aria-label="Refresh dashboard data"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Quick Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Assigned Modules */}
        <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md flex items-center gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="size-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="size-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Assigned Modules
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white truncate">
              {stats.assignedModulesCount}
            </span>
          </div>
        </div>

        {/* Metric 2: Assigned Stations */}
        <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md flex items-center gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
            <ClipboardCheck className="size-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Clinical Stations
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white truncate">
              {stats.assignedStationsCount}
            </span>
          </div>
        </div>

        {/* Metric 3: Upcoming OSCE Sessions */}
        <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md flex items-center gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="size-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-xs">
            <Calendar className="size-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              OSCE Sessions
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white truncate">
              {stats.upcomingSessionsCount}
            </span>
          </div>
        </div>

        {/* Metric 4: Checklist Readiness */}
        <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md flex items-center gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="size-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Checklist Readiness
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white truncate">
              {stats.readyStationsCount}
              <span className="text-sm font-semibold text-slate-400">/{stats.assignedStationsCount || 0}</span>
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
          <Loader2 className="size-8 text-emerald-500 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading professor teaching responsibilities...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* 3. Section 1: Assigned Modules ("My Academic Modules") */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="size-5 text-blue-600 dark:text-blue-400" />
                  <span>My Academic Modules</span>
                </h2>
                <p className="text-xs font-medium text-slate-400">
                  Curriculum modules where you are designated as the lead responsible professor
                </p>
              </div>
            </div>

            {modules.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
                <div className="size-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                  <BookOpen className="size-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No modules assigned as lead
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  You have not been assigned as a head professor to any modules for this academic year.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((mod) => (
                  <div
                    key={mod.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                          {mod.level_name}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {mod.total_exams} Scheduled Exam{mod.total_exams !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {mod.module_name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Study Level: <strong className="text-slate-600 dark:text-slate-300">{mod.level_name}</strong>
                        </p>
                      </div>

                      {/* Module Weightage Allocation Progress */}
                      {(() => {
                        const modStations = stations.filter((s) => s.module_id === mod.id)
                        const totalWeightage = modStations.reduce(
                          (acc, s) => acc + Number(s.weightage_percentage || 0),
                          0
                        )
                        const isFullyAllocated = totalWeightage >= 100
                        const pct = Math.min(100, Math.max(0, totalWeightage))

                        return (
                          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between text-[11px] gap-2">
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                Module Weightage: {totalWeightage}% / 100%
                              </span>
                              {isFullyAllocated ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                  <CheckCircle2 className="size-3" />
                                  <span>Fully Allocated</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                                  <AlertCircle className="size-3" />
                                  <span>Unallocated Weightage Remaining</span>
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isFullyAllocated ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    <button
                      onClick={() => setPreviewModule(mod)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200/80 dark:border-slate-700 transition-all"
                    >
                      <span>View Module Details</span>
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 4. Section 2: Station Invigilation Duties ("My Clinical Stations") */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <ClipboardCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
                  <span>My Clinical Stations</span>
                </h2>
                <p className="text-xs font-medium text-slate-400">
                  Manage and configure your assigned clinical stations.
                </p>
              </div>
            </div>

            {stations.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
                <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <ClipboardCheck className="size-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No clinical stations assigned yet
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  When you are assigned clinical stations, they will appear here with access PINs and scoring checklists.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stations.map((st) => {
                  const isPinRevealed = !!revealedPins[st.id]
                  const isCopied = copiedPinId === st.id
                  const stationSlug =
                    st.slug ||
                    getStationSlug({
                      station_number: st.station_number,
                      module_name: st.module_name,
                      id: st.id,
                    })

                  return (
                    <div
                      key={st.id}
                      onClick={() => router.push(`/professor/stations/${st.id}`)}
                      className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all cursor-pointer group"
                    >
                      <div className="space-y-3.5">
                        {/* Header: Station # & Status badge */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-xs">
                            Station #{st.station_number}
                          </span>

                          <StationStatusBadge
                            status={st.question_count > 0 ? (st.linked_exam ? 'ready' : 'checklist_ready') : 'incomplete'}
                            questionCount={st.question_count}
                            hasLinkedExam={!!st.linked_exam}
                          />
                        </div>

                        {/* Title & Metadata Subtitle */}
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                            {st.title}
                          </h3>

                          {/* Clean Metadata Subtitle: Module, Level, Created Date */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                            {st.module_name && (
                              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                <BookOpen className="size-3 text-blue-500 shrink-0" />
                                <span>{st.module_name}</span>
                              </span>
                            )}
                            {st.level_name && (
                              <>
                                <span>•</span>
                                <span>{st.level_name}</span>
                              </>
                            )}
                            {st.created_at && (
                              <>
                                <span>•</span>
                                <span className="text-[11px] text-slate-400">
                                  Created {new Date(st.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Linked Exam or Action-Oriented Unscheduled Notice */}
                          {st.linked_exam ? (
                            <div className="mt-2.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                                <span>{st.linked_exam.module_name}</span>
                                <span className="text-[10px] text-slate-400 capitalize">
                                  {st.linked_exam.session_type}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                <span>{st.linked_exam.section_name} — {st.linked_exam.group_name}</span>
                                <span>•</span>
                                <span>{new Date(st.linked_exam.exam_date).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ) : (
                            <UnscheduledStationNotice />
                          )}
                        </div>

                        {/* Secure Access PIN Box */}
                        <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Key className="size-4 text-amber-500 shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                                Live Scoring Tablet PIN
                              </span>
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white tracking-widest">
                                {isPinRevealed ? st.access_pin : '••••••'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                togglePinReveal(st.id)
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                              aria-label="Toggle PIN Visibility"
                            >
                              {isPinRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopyPin(st.id, st.access_pin)
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                              aria-label="Copy Access PIN"
                            >
                              {isCopied ? (
                                <Check className="size-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Real-time Candidate Completion Progress Bar */}
                        {typeof st.completed_count === 'number' && typeof st.total_candidates === 'number' && st.total_candidates > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Users className="size-3 text-emerald-500" />
                                <span>Candidate Progress:</span>
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                                {st.completed_count} / {st.total_candidates} ({st.progress_percentage ?? 0}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, st.progress_percentage ?? 0)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Direct Navigation Action */}
                      <Link
                        href={`/professor/stations/${st.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 group-hover:bg-emerald-700 active:scale-[0.99]"
                      >
                        <span>Open Checklist</span>
                        <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* 5. Section 3: Upcoming OSCE Sessions Timeline */}
          {upcomingExams.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="size-5 text-purple-600 dark:text-purple-400" />
                    <span>Upcoming OSCE Sessions</span>
                  </h2>
                  <p className="text-xs font-medium text-slate-400">
                    Scheduled clinical examinations where you are leading the module or invigilating a station
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingExams.map((ex) => (
                  <div
                    key={ex.id}
                    className="py-3.5 first:pt-2 last:pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0 font-bold text-xs">
                        <Calendar className="size-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                            {ex.module_name}
                          </span>
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {ex.session_type}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 truncate">
                          Target: {ex.section_name} — {ex.group_name} ({ex.level_name})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {new Date(ex.exam_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* --- Module Details Preview Modal --- */}
      {previewModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <BookOpen className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {previewModule.module_name}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Curriculum Module Overview
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewModule(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Study Level:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {previewModule.level_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Scheduled Exams:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {previewModule.total_exams} Sessions
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lead Professor:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {professor?.full_name || 'You'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                As the lead module professor, you oversee the academic curriculum standards and evaluation benchmarks for this specialty across all rotation cohorts.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewModule(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Question & Checklist Builder Modal --- */}
      {activeStationForQuestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                  <ListPlus className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Station Checklist Builder: Station #{activeStationForQuestions.station_number}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {activeStationForQuestions.title} • Total Points: {totalStationPoints} pts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveStationForQuestions(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Scrollable Criteria List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Info className="size-4 shrink-0" />
                <span>
                  Define scoring checklist items for the live OSCE examination. These items will be used on the evaluator tablet.
                </span>
              </div>

              {/* Questions List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Scoring Criteria ({stationQuestions.length})
                </h4>

                {loadingQuestions ? (
                  <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin text-emerald-500" />
                    <span>Loading checklist items...</span>
                  </div>
                ) : stationQuestions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-1">
                    <p className="font-bold text-slate-600 dark:text-slate-300">
                      No scoring criteria configured yet.
                    </p>
                    <p>Add your first clinical checklist item below to mark this station as Ready.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stationQuestions.map((q, idx) => (
                      <div
                        key={q.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-black shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white break-words">
                              {q.question_text}
                            </p>
                            <span className="inline-block text-[10px] font-bold text-slate-400 uppercase">
                              Type: {q.question_type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-black text-xs border border-emerald-500/20">
                            {q.max_points} pts
                          </span>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete criterion"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Criteria Form */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Add Checklist Criterion</span>
                </h4>

                {questionError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <span>{questionError}</span>
                  </div>
                )}

                <form onSubmit={handleAddQuestion} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Clinical Task / Checklist Item Text *
                    </label>
                    <input
                      type="text"
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="e.g. Correctly palpates radial pulse & assesses rate and rhythm"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Evaluation Type
                      </label>
                      <Select
                        size="md"
                        value={newQuestionType}
                        onChange={(val) => setNewQuestionType(val)}
                        options={[
                          { value: 'clinical_task', label: 'Clinical Task Checklist' },
                          { value: 'communication', label: 'Communication & Ethics' },
                          { value: 'diagnosis', label: 'Diagnostic Accuracy' },
                          { value: 'hygiene', label: 'Hand Hygiene & Asepsis' },
                        ]}
                        placeholder="Select Type"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Max Score (Points) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={newQuestionPoints}
                        onChange={(e) => setNewQuestionPoints(parseFloat(e.target.value) || 1)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={savingQuestion}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                    >
                      {savingQuestion ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Saving Criterion...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="size-3.5" />
                          <span>Add Criterion</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-500">
                Total Station Score: <strong className="text-emerald-600 dark:text-emerald-400">{totalStationPoints} Points</strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveStationForQuestions(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
              >
                Done Authoring
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
