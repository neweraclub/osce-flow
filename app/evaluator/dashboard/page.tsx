'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  CircleDot,
  Clock,
  GraduationCap,
  HelpCircle,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  LogOut,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Stethoscope,
  Trophy,
  User,
  UserCheck,
  UserMinus,
  UserX,
  Users,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useToast } from '@/context/ToastContext'

interface StudentItem {
  matricule: string
  first_name: string
  last_name: string
  full_name: string
  group_id: string
  group_name: string
  section_name: string
  attempt_id: string | null
  status: 'pending' | 'present' | 'in_progress' | 'completed' | 'absent'
  final_score: number | null
}

interface QuestionOption {
  id: string
  text: string
  is_correct: boolean
}

interface QuestionItem {
  id: string
  exam_id: string
  question_text: string
  question_type: 'MCQ' | 'SCQ' | 'Q&A'
  max_scale_value: number
  options: QuestionOption[]
  created_at?: string
}

interface StationMeta {
  id: string
  station_number: number
  title: string
  module_id: string
  module_name: string
  level_id?: string
}

interface ExamMeta {
  id: string
  station_id: string
  session_type: string
  exam_date: string
  created_at?: string
}

type SortField = 'name_asc' | 'name_desc' | 'status'

function EvaluatorDashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { showSuccess, showError } = useToast()

  const stationIdParam = searchParams.get('station_id')

  // Core Data States
  const [station, setStation] = useState<StationMeta | null>(null)
  const [exams, setExams] = useState<ExamMeta[]>([])
  const [activeExamId, setActiveExamId] = useState<string>('')
  const [questions, setQuestions] = useState<QuestionItem[]>([])
  const [students, setStudents] = useState<StudentItem[]>([])
  const [groups, setGroups] = useState<{ id: string; group_name: string }[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('ALL')
  const [sortField, setSortField] = useState<SortField>('name_asc')

  // Evaluation & Candidate Selection
  const [activeStudent, setActiveStudent] = useState<StudentItem | null>(null)
  const [answersState, setAnswersState] = useState<
    Record<
      string,
      {
        selected_option_ids: string[] // For MCQ and SCQ
        evaluation_score?: number // For Q&A
        comment?: string
      }
    >
  >({})
  const [submittingAttempt, setSubmittingAttempt] = useState(false)
  const [markingAbsentMatricule, setMarkingAbsentMatricule] = useState<string | null>(null)

  // 1. Initial Load of Station & Student Roster
  useEffect(() => {
    let stationId = stationIdParam
    if (!stationId && typeof window !== 'undefined') {
      stationId = localStorage.getItem('last_evaluator_station_id')
    }

    if (!stationId) {
      router.push('/evaluator')
      return
    }

    loadDashboardData(stationId)
  }, [stationIdParam])

  async function loadDashboardData(stationId: string, examId?: string) {
    try {
      setLoading(true)
      const url = `/api/evaluator/students?station_id=${stationId}${examId ? `&exam_id=${examId}` : ''}`
      const res = await fetch(url)
      const data = await res.json()

      if (!res.ok || !data.success) {
        showError(data.error || 'Failed to load station dashboard.')
        router.push('/evaluator')
        return
      }

      setStation(data.station)
      setExams(data.exams || [])
      if (data.active_exam) {
        setActiveExamId(data.active_exam.id)
      } else if (data.exams?.length > 0) {
        setActiveExamId(data.exams[0].id)
      }
      setQuestions(data.questions || [])
      setGroups(data.groups || [])
      setStudents(data.students || [])
    } catch (err: any) {
      showError(err?.message || 'Error fetching evaluator data.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Exam Session Change
  const handleExamChange = (newExamId: string) => {
    if (newExamId === activeExamId || !station) return
    setActiveExamId(newExamId)
    setActiveStudent(null)
    setAnswersState({})
    loadDashboardData(station.id, newExamId)
  }

  // Filtered & Sorted Student Roster
  const filteredStudents = useMemo(() => {
    let list = [...students]

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (s) =>
          s.full_name.toLowerCase().includes(q) ||
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q) ||
          s.matricule.toLowerCase().includes(q)
      )
    }

    // 2. Group Filter
    if (selectedGroup !== 'ALL') {
      list = list.filter((s) => s.group_id === selectedGroup)
    }

    // 3. Sort
    list.sort((a, b) => {
      if (sortField === 'name_asc') {
        return a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)
      }
      if (sortField === 'name_desc') {
        return b.last_name.localeCompare(a.last_name) || b.first_name.localeCompare(a.first_name)
      }
      if (sortField === 'status') {
        const order = { in_progress: 0, present: 1, pending: 2, completed: 3, absent: 4 }
        return (order[a.status] ?? 5) - (order[b.status] ?? 5)
      }
      return 0
    })

    return list
  }, [students, searchQuery, selectedGroup, sortField])

  // Stats Counters
  const totalStudentsCount = students.length
  const completedCount = students.filter((s) => s.status === 'completed').length
  const absentCount = students.filter((s) => s.status === 'absent').length
  const pendingCount = students.filter((s) => s.status === 'pending' || s.status === 'in_progress' || s.status === 'present').length

  // Select Student for Examination
  const handleStartExamination = (student: StudentItem) => {
    setActiveStudent(student)

    // Update local student status to in_progress if currently pending
    if (student.status === 'pending') {
      setStudents((prev) =>
        prev.map((s) => (s.matricule === student.matricule ? { ...s, status: 'in_progress' } : s))
      )
    }

    // Initialize default answer state for questions
    const initialAnswers: typeof answersState = {}
    questions.forEach((q) => {
      initialAnswers[q.id] = {
        selected_option_ids: [],
        evaluation_score: q.question_type === 'Q&A' ? 0 : undefined,
      }
    })
    setAnswersState(initialAnswers)
  }

  // Quick Action: Mark as Absent
  const handleMarkAbsent = async (student: StudentItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!activeExamId) {
      showError('Please select an active exam session first.')
      return
    }

    setMarkingAbsentMatricule(student.matricule)

    try {
      const res = await fetch('/api/evaluator/mark-absent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricule: student.matricule,
          exam_id: activeExamId,
          station_id: station?.id,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        showError(data.error || 'Failed to mark student as absent.')
        return
      }

      // Optimistically update list
      setStudents((prev) =>
        prev.map((s) =>
          s.matricule === student.matricule
            ? { ...s, status: 'absent', final_score: 0 }
            : s
        )
      )

      if (activeStudent?.matricule === student.matricule) {
        setActiveStudent(null)
      }

      showSuccess(`${student.full_name} marked as Absent.`)
    } catch (err: any) {
      showError(err?.message || 'Network error while logging absence.')
    } finally {
      setMarkingAbsentMatricule(null)
    }
  }

  // Rubric Selection Handlers
  const handleOptionSelect = (questionId: string, optionId: string, isMCQ: boolean) => {
    setAnswersState((prev) => {
      const curr = prev[questionId] || { selected_option_ids: [] }
      if (isMCQ) {
        const exists = curr.selected_option_ids.includes(optionId)
        const updated = exists
          ? curr.selected_option_ids.filter((id) => id !== optionId)
          : [...curr.selected_option_ids, optionId]
        return { ...prev, [questionId]: { ...curr, selected_option_ids: updated } }
      } else {
        // SCQ single choice
        return { ...prev, [questionId]: { ...curr, selected_option_ids: [optionId] } }
      }
    })
  }

  const handleRatingScoreChange = (questionId: string, score: number) => {
    setAnswersState((prev) => {
      const curr = prev[questionId] || { selected_option_ids: [] }
      return {
        ...prev,
        [questionId]: {
          ...curr,
          evaluation_score: score,
        },
      }
    })
  }

  // Calculate Running Score
  const calculatedPoints = useMemo(() => {
    let earned = 0
    let max = 0

    questions.forEach((q) => {
      const maxVal = Number(q.max_scale_value) || 10
      max += maxVal

      const state = answersState[q.id]
      if (!state) return

      if (q.question_type === 'Q&A') {
        const score = Number(state.evaluation_score) || 0
        earned += Math.min(score, maxVal)
      } else if (q.question_type === 'SCQ') {
        const selectedId = state.selected_option_ids[0]
        if (selectedId) {
          const opt = q.options.find((o) => o.id === selectedId)
          if (opt && opt.is_correct) {
            earned += maxVal
          }
        }
      } else if (q.question_type === 'MCQ') {
        // Multiple Choice
        const correctIds = q.options.filter((o) => o.is_correct).map((o) => o.id)
        const selectedIds = state.selected_option_ids

        if (correctIds.length > 0 && selectedIds.length > 0) {
          const falsePositives = selectedIds.filter((id) => !correctIds.includes(id)).length
          const truePositives = selectedIds.filter((id) => correctIds.includes(id)).length

          if (falsePositives === 0 && truePositives === correctIds.length) {
            earned += maxVal
          } else if (falsePositives === 0 && truePositives > 0) {
            // Partial credit proportional to correct answers
            earned += Number(((truePositives / correctIds.length) * maxVal).toFixed(2))
          }
        }
      }
    })

    return { earned: Math.round(earned * 100) / 100, max }
  }, [questions, answersState])

  // Submit Completed Assessment
  const handleSubmitAttempt = async () => {
    if (!activeStudent || !activeExamId || !station) return

    setSubmittingAttempt(true)

    try {
      // Build answer rows
      const answersPayload = questions.map((q) => {
        const state = answersState[q.id]
        const maxVal = Number(q.max_scale_value) || 10
        let pts = 0

        if (q.question_type === 'Q&A') {
          pts = state?.evaluation_score ?? 0
        } else if (q.question_type === 'SCQ') {
          const optId = state?.selected_option_ids[0]
          const opt = q.options.find((o) => o.id === optId)
          pts = opt?.is_correct ? maxVal : 0
        } else if (q.question_type === 'MCQ') {
          const correctIds = q.options.filter((o) => o.is_correct).map((o) => o.id)
          const sel = state?.selected_option_ids || []
          const falsePositives = sel.filter((id) => !correctIds.includes(id)).length
          const truePositives = sel.filter((id) => correctIds.includes(id)).length

          if (falsePositives === 0 && truePositives === correctIds.length) {
            pts = maxVal
          } else if (falsePositives === 0 && truePositives > 0) {
            pts = Number(((truePositives / correctIds.length) * maxVal).toFixed(2))
          }
        }

        return {
          question_id: q.id,
          selected_options: state?.selected_option_ids || [],
          selected_option_id: state?.selected_option_ids[0] || null,
          evaluation_score: state?.evaluation_score ?? null,
          points_awarded: pts,
        }
      })

      const res = await fetch('/api/evaluator/submit-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricule: activeStudent.matricule,
          exam_id: activeExamId,
          station_id: station.id,
          answers: answersPayload,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        showError(data.error || 'Failed to submit candidate assessment.')
        return
      }

      showSuccess(`Assessment submitted for ${activeStudent.full_name} (${data.final_score} pts).`)

      // Update student in local roster
      const currentMatricule = activeStudent.matricule
      setStudents((prev) =>
        prev.map((s) =>
          s.matricule === currentMatricule
            ? { ...s, status: 'completed', final_score: data.final_score }
            : s
        )
      )

      // Auto-advance to the next pending student in the roster
      const remainingPending = filteredStudents.filter(
        (s) => s.matricule !== currentMatricule && (s.status === 'pending' || s.status === 'present')
      )

      if (remainingPending.length > 0) {
        handleStartExamination(remainingPending[0])
      } else {
        setActiveStudent(null)
      }
    } catch (err: any) {
      showError(err?.message || 'Network error submitting candidate assessment.')
    } finally {
      setSubmittingAttempt(false)
    }
  }

  // Loading Skeleton State
  if (loading && !station) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-amber-500" />
        <p className="text-sm font-semibold text-slate-500 animate-pulse">
          Connecting to Station Terminal...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP DOCK / EVALUATOR TERMINAL HEADER                                  */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 h-16 px-5 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between transition-colors">
        {/* Left Station Metadata */}
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-black text-sm shadow-md shadow-orange-500/20">
            {station?.station_number || 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                {station?.title || 'OSCE Station'}
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                Live Station
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {station?.module_name || 'Clinical Module'}
            </p>
          </div>
        </div>

        {/* Center Progress Badge */}
        <div className="hidden lg:flex items-center gap-4 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            <span>{completedCount} Evaluated</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Clock className="size-3.5" />
            <span>{pendingCount} Pending</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
            <UserX className="size-3.5" />
            <span>{absentCount} Absent</span>
          </div>
        </div>

        {/* Right Controls: Exam Session Selector + Lock Terminal + Theme */}
        <div className="flex items-center gap-2.5">
          {exams.length > 1 && (
            <select
              value={activeExamId}
              onChange={(e) => handleExamChange(e.target.value)}
              className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  Session: {ex.session_type.toUpperCase()} ({ex.exam_date})
                </option>
              ))}
            </select>
          )}

          <ThemeToggle />

          {/* Lock / Switch Station */}
          <Link
            href="/evaluator"
            title="Lock Station Terminal"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
          >
            <Lock className="size-3.5 text-amber-500" />
            <span className="hidden sm:inline">Lock Station</span>
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. DUAL PANE WORKSPACE                                                   */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* ======================================================================= */}
        {/* LEFT PANE: STUDENT ROSTER & FILTERING                                    */}
        {/* ======================================================================= */}
        <aside className="w-full md:w-[380px] lg:w-[420px] shrink-0 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-[400px] md:h-[calc(100vh-64px)]">
          {/* Search & Header Controls */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 space-y-2.5 bg-slate-50/50 dark:bg-slate-900/50">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate name or matricule..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            {/* Filter Bar: Group + Sort */}
            <div className="flex items-center gap-2">
              {/* Group Filter */}
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="flex-1 text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 truncate"
              >
                <option value="ALL">All Groups ({totalStudentsCount})</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    Group {g.group_name}
                  </option>
                ))}
              </select>

              {/* Sort Selector */}
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="flex-1 text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 truncate"
              >
                <option value="name_asc">Sort: Name (A-Z)</option>
                <option value="name_desc">Sort: Name (Z-A)</option>
                <option value="status">Sort: Exam Status</option>
              </select>
            </div>
          </div>

          {/* Student Roster List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2 space-y-1.5">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Users className="size-8 mx-auto stroke-1" />
                <p className="text-xs font-semibold">No students found.</p>
                <p className="text-[11px]">Adjust your search query or group filter.</p>
              </div>
            ) : (
              filteredStudents.map((st) => {
                const isSelected = activeStudent?.matricule === st.matricule
                const isAbsent = st.status === 'absent'
                const isCompleted = st.status === 'completed'
                const isEvaluating = st.status === 'in_progress'

                return (
                  <div
                    key={st.matricule}
                    onClick={() => handleStartExamination(st)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer select-none group ${
                      isSelected
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-500/40 shadow-sm ring-1 ring-amber-500/30'
                        : isAbsent
                        ? 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-200/50 dark:border-rose-900/40 opacity-70 hover:opacity-100'
                        : isCompleted
                        ? 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 hover:border-emerald-500/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 hover:border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar */}
                        <div
                          className={`size-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : isAbsent
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              : isEvaluating
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/40'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {st.first_name?.[0]}
                          {st.last_name?.[0]}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {st.last_name} {st.first_name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="font-mono">{st.matricule}</span>
                            <span>•</span>
                            <span>{st.group_name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {isCompleted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                            {st.final_score !== null ? `${st.final_score} pts` : 'Scored'}
                          </span>
                        )}

                        {isAbsent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60">
                            Absent
                          </span>
                        )}

                        {isEvaluating && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-blue-500 animate-ping" />
                            Evaluating
                          </span>
                        )}

                        {st.status === 'pending' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/60 dark:border-slate-700/60">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Actions (Start Exam vs Mark Absent) */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleMarkAbsent(st, e)}
                        disabled={markingAbsentMatricule === st.matricule || isAbsent}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline flex items-center gap-1 disabled:opacity-40 disabled:no-underline"
                      >
                        {markingAbsentMatricule === st.matricule ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <UserX className="size-3" />
                        )}
                        <span>{isAbsent ? 'Logged Absent' : 'Mark Absent'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStartExamination(st)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300'
                        }`}
                      >
                        <span>{isCompleted ? 'Review' : 'Start Exam'}</span>
                        <ArrowRight className="size-3" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* ======================================================================= */}
        {/* RIGHT PANE: LIVE EXAM RUBRIC & SCORING WORKSPACE                         */}
        {/* ======================================================================= */}
        <main className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-slate-50/70 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
          {!activeStudent ? (
            /* Empty State: No student chosen yet */
            <div className="m-auto max-w-md text-center p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-4">
              <div className="size-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                <Stethoscope className="size-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Ready to Evaluate Candidate
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Select a candidate from the left roster to open the live station rubric, record responses, and submit the final score.
                </p>
              </div>

              {filteredStudents.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleStartExamination(filteredStudents[0])}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md transition-all active:scale-95"
                >
                  Start First Candidate ({filteredStudents[0].last_name})
                </button>
              )}
            </div>
          ) : (
            /* Active Candidate Live Rubric */
            <div className="max-w-4xl w-full mx-auto space-y-6 pb-20">
              {/* Active Candidate Header Card */}
              <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-bold text-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                    {activeStudent.first_name?.[0]}
                    {activeStudent.last_name?.[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {activeStudent.last_name} {activeStudent.first_name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                        Live Rubric
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold">{activeStudent.matricule}</span>
                      <span>•</span>
                      <span>{activeStudent.group_name}</span>
                      <span>•</span>
                      <span>{activeStudent.section_name}</span>
                    </div>
                  </div>
                </div>

                {/* Running Total Live Score Counter */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3">
                  <Trophy className="size-5 text-amber-500" />
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Running Score
                    </p>
                    <p className="text-base font-black text-slate-900 dark:text-white font-mono">
                      {calculatedPoints.earned}{' '}
                      <span className="text-xs text-slate-400 font-normal">/ {calculatedPoints.max} pts</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                    <HelpCircle className="size-8 mx-auto stroke-1 mb-2" />
                    <p className="text-xs font-semibold">No questions configured for this exam session.</p>
                  </div>
                ) : (
                  questions.map((q, idx) => {
                    const ans = answersState[q.id] || { selected_option_ids: [] }

                    return (
                      <div
                        key={q.id}
                        className="p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-sm space-y-4 transition-all"
                      >
                        {/* Question Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="size-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center font-mono">
                                Q{idx + 1}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  q.question_type === 'MCQ'
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60'
                                    : q.question_type === 'SCQ'
                                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/60'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60'
                                }`}
                              >
                                {q.question_type === 'Q&A' ? 'Clinical Task (Scale)' : q.question_type}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed pt-1">
                              {q.question_text}
                            </p>
                          </div>

                          <span className="text-xs font-mono font-bold text-slate-400 shrink-0">
                            Max {q.max_scale_value || 10} pts
                          </span>
                        </div>

                        {/* Question Inputs according to type */}
                        {q.question_type === 'Q&A' ? (
                          /* Continuous Rating Scale (0 to Max) */
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                              <span>Rating Scale:</span>
                              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold text-sm">
                                {ans.evaluation_score ?? 0} / {q.max_scale_value || 10} pts
                              </span>
                            </div>

                            {/* Quick Select Point Buttons */}
                            <div className="flex flex-wrap gap-1.5">
                              {Array.from({ length: (q.max_scale_value || 10) + 1 }, (_, i) => i).map((score) => {
                                const isSelected = ans.evaluation_score === score
                                return (
                                  <button
                                    key={score}
                                    type="button"
                                    onClick={() => handleRatingScoreChange(q.id, score)}
                                    className={`size-9 rounded-xl text-xs font-bold transition-all ${
                                      isSelected
                                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 scale-105'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                  >
                                    {score}
                                  </button>
                                )
                              })}
                            </div>

                            {/* Continuous Range Slider */}
                            <input
                              type="range"
                              min={0}
                              max={q.max_scale_value || 10}
                              step={1}
                              value={ans.evaluation_score ?? 0}
                              onChange={(e) => handleRatingScoreChange(q.id, Number(e.target.value))}
                              className="w-full accent-amber-500 cursor-pointer"
                            />
                          </div>
                        ) : (
                          /* MCQ & SCQ Options */
                          <div className="grid gap-2 pt-1">
                            {q.options?.map((opt) => {
                              const isSelected = ans.selected_option_ids.includes(opt.id)
                              const isMCQ = q.question_type === 'MCQ'

                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => handleOptionSelect(q.id, opt.id, isMCQ)}
                                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${
                                    isSelected
                                      ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-500/50 text-slate-900 dark:text-white shadow-sm ring-1 ring-amber-500/30'
                                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`size-5 rounded-lg flex items-center justify-center border transition-colors ${
                                        isSelected
                                          ? 'bg-amber-600 border-amber-600 text-white'
                                          : 'border-slate-300 dark:border-slate-600'
                                      }`}
                                    >
                                      {isSelected && <Check className="size-3.5 stroke-[3]" />}
                                    </div>
                                    <span className="text-xs font-semibold">{opt.text}</span>
                                  </div>

                                  {opt.is_correct && (
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                                      Key
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Bottom Sticky Submission Bar */}
              <div className="sticky bottom-4 z-20 p-4 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const resetAnswers: typeof answersState = {}
                      questions.forEach((q) => {
                        resetAnswers[q.id] = { selected_option_ids: [], evaluation_score: 0 }
                      })
                      setAnswersState(resetAnswers)
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Reset Rubric"
                  >
                    <RotateCcw className="size-4" />
                  </button>

                  <div>
                    <span className="text-xs text-slate-400 font-semibold block">Total Awarded:</span>
                    <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                      {calculatedPoints.earned} / {calculatedPoints.max} pts
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitAttempt}
                  disabled={submittingAttempt || questions.length === 0}
                  className="px-6 py-3 rounded-2xl font-bold text-xs text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {submittingAttempt ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Submitting Assessment...</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      <span>Submit & Next Student</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function EvaluatorDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
          <Loader2 className="size-8 animate-spin text-amber-500" />
          <p className="text-sm font-semibold text-slate-500 animate-pulse">
            Connecting to Station Terminal...
          </p>
        </div>
      }
    >
      <EvaluatorDashboardContent />
    </Suspense>
  )
}
