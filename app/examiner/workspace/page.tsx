'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Clock,
  FileText,
  GraduationCap,
  HelpCircle,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  LogOut,
  Menu,
  PanelLeft,
  PanelLeftClose,
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
  Users,
  FileEdit,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { useToast } from '@/context/ToastContext'
import { ExaminerSidebar, ExaminerNavTab } from '@/components/examiner/ExaminerSidebar'
import { Select } from '@/components/ui/Select'
import { ClinicalPenaltiesCard } from '@/components/examiner/ClinicalPenaltiesCard'
import { CreateCandidatePenaltyModal } from '@/components/examiner/CreateCandidatePenaltyModal'
import {
  CandidatePenaltyItem,
  getCandidatePenaltiesAction,
  submitAssessmentAction,
} from '@/app/actions/candidatePenalties'

interface StudentAnswerItem {
  question_id: string
  selected_options: string[]
  evaluation_score?: number
  points_awarded?: number
}

interface StudentItem {
  id?: string
  matricule: string
  first_name: string
  last_name: string
  full_name: string
  group_id: string
  group_name: string
  section_id?: string | null
  section_name: string
  level_name?: string
  academic_year_label?: string
  import_index?: number
  attempt_id: string | null
  status: 'pending' | 'present' | 'in_progress' | 'completed'
  final_score: number | null
  saved_answers?: StudentAnswerItem[]
  penalties?: CandidatePenaltyItem[]
}

interface SectionItem {
  id: string
  section_name: string
  level_id: string
}

interface GroupItem {
  id: string
  group_name: string
  section_id: string
  section_name?: string
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
  level_name?: string
  academic_year_id?: string | null
  academic_year_label?: string
}

interface ExamMeta {
  id: string
  station_id: string
  session_type: string
  exam_date: string
  created_at?: string
}

type SortField = 'default' | 'name_asc' | 'name_desc' | 'status'

function ExaminerWorkspaceContent() {
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
  const [sections, setSections] = useState<SectionItem[]>([])
  const [groups, setGroups] = useState<GroupItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Examiner Sidebar & Tab Navigation States
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<ExaminerNavTab>('roster')

  // Load persisted collapse state on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('examiner_sidebar_collapsed')
      if (saved === 'true') {
        setSidebarCollapsed(true)
      }
    }
  }, [])

  const handleSetSidebarCollapsed = (
    value: boolean | ((prev: boolean) => boolean)
  ) => {
    setSidebarCollapsed((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      if (typeof window !== 'undefined') {
        localStorage.setItem('examiner_sidebar_collapsed', String(next))
      }
      return next
    })
  }

  const toggleSidebarCollapsed = () => {
    handleSetSidebarCollapsed((prev) => !prev)
  }

  // Ctrl+B shortcut to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebarCollapsed()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSection, setSelectedSection] = useState('ALL')
  const [selectedGroupName, setSelectedGroupName] = useState('ALL')
  const [sortField, setSortField] = useState<SortField>('default')

  // Evaluation & Candidate Selection
  const [activeStudent, setActiveStudent] = useState<StudentItem | null>(null)
  const [answersState, setAnswersState] = useState<
    Record<
      string,
      {
        selected_option_ids: string[]
        evaluation_score?: number
        comment?: string
      }
    >
  >({})
  const [candidatePenalties, setCandidatePenalties] = useState<CandidatePenaltyItem[]>([])
  const [loadingCandidatePenalties, setLoadingCandidatePenalties] = useState<boolean>(false)
  const [isCreatePenaltyOpen, setIsCreatePenaltyOpen] = useState(false)
  const [submittingAttempt, setSubmittingAttempt] = useState(false)

  // Active Exam Session
  const activeExam = useMemo(
    () => exams.find((e) => e.id === activeExamId) || exams[0] || null,
    [exams, activeExamId]
  )

  // Lock Terminal & Clear Credentials Action
  const handleLockStation = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('examiner_pin')
      sessionStorage.removeItem('examiner_station')
      sessionStorage.removeItem('examiner_exams')
      sessionStorage.removeItem('last_examiner_station_id')
      sessionStorage.removeItem('evaluator_pin')
      sessionStorage.removeItem('evaluator_station')
      sessionStorage.removeItem('evaluator_exams')
    }
    router.push('/examiner')
  }

  // 1. Initial Load of Station & Student Roster + Clean Ugly Raw UUID from Address Bar
  useEffect(() => {
    let stationId = stationIdParam

    if (typeof window !== 'undefined') {
      if (stationIdParam) {
        // Cache ID in local & session storage
        localStorage.setItem('last_examiner_station_id', stationIdParam)
        sessionStorage.setItem('last_examiner_station_id', stationIdParam)
        localStorage.setItem('last_evaluator_station_id', stationIdParam)
        sessionStorage.setItem('last_evaluator_station_id', stationIdParam)
        document.cookie = `examiner_station_id=${stationIdParam}; path=/; max-age=86400; SameSite=Lax`

        // Immediately strip ugly ?station_id=... from browser address bar
        window.history.replaceState({}, '', window.location.pathname)
      } else {
        // Fallback to storage or cookie
        stationId =
          localStorage.getItem('last_examiner_station_id') ||
          sessionStorage.getItem('last_examiner_station_id') ||
          localStorage.getItem('last_evaluator_station_id')

        if (!stationId) {
          const storedStation =
            sessionStorage.getItem('examiner_station') ||
            sessionStorage.getItem('evaluator_station')
          if (storedStation) {
            try {
              const parsed = JSON.parse(storedStation)
              if (parsed?.id) stationId = parsed.id
            } catch {}
          }
        }

        if (!stationId) {
          const cookieMatch =
            document.cookie.match(/examiner_station_id=([^;]+)/) ||
            document.cookie.match(/evaluator_station_id=([^;]+)/)
          if (cookieMatch) {
            stationId = cookieMatch[1]
          }
        }
      }
    }

    if (!stationId) {
      router.push('/examiner')
      return
    }

    loadDashboardData(stationId)
  }, [stationIdParam])

  async function loadDashboardData(stationId: string, examId?: string) {
    try {
      setLoading(true)
      const url = `/api/examiner/students?station_id=${stationId}${examId ? `&exam_id=${examId}` : ''}`
      const res = await fetch(url)
      const data = await res.json()

      if (!res.ok || !data.success) {
        showError(data.error || 'Failed to load examiner workspace.')
        router.push('/examiner')
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
      setSections(data.sections || [])
      setGroups(data.groups || [])
      setStudents(data.students || [])

      setCandidatePenalties([])
    } catch (err: any) {
      showError(err?.message || 'Error fetching examiner data.')
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
    setCandidatePenalties([])
    loadDashboardData(station.id, newExamId)
  }

  // Deduplicated group names for the group dropdown filter
  const deduplicatedGroupNames = useMemo(() => {
    let filteredGroups = groups
    if (selectedSection !== 'ALL') {
      filteredGroups = groups.filter((g) => g.section_id === selectedSection)
    }
    const names = Array.from(new Set(filteredGroups.map((g) => g.group_name).filter(Boolean)))
    names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    return names
  }, [groups, selectedSection])

  // Filtered & Sorted Candidate Roster
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

    // 2. Section Filter
    if (selectedSection !== 'ALL') {
      list = list.filter((s) => s.section_id === selectedSection)
    }

    // 3. Deduplicated Group Filter
    if (selectedGroupName !== 'ALL') {
      list = list.filter((s) => s.group_name === selectedGroupName)
    }

    // 4. Sort Order
    if (sortField === 'name_asc') {
      list.sort((a, b) => a.full_name.localeCompare(b.full_name))
    } else if (sortField === 'name_desc') {
      list.sort((a, b) => b.full_name.localeCompare(a.full_name))
    } else if (sortField === 'status') {
      const statusWeight: Record<string, number> = {
        in_progress: 0,
        pending: 1,
        present: 1,
        completed: 2,
      }
      list.sort((a, b) => (statusWeight[a.status] ?? 99) - (statusWeight[b.status] ?? 99))
    } else {
      // Default: Preserve Excel import order
      list.sort((a, b) => (a.import_index ?? 0) - (b.import_index ?? 0))
    }

    return list
  }, [students, searchQuery, selectedSection, selectedGroupName, sortField])

  // Aggregate Counts (Strictly Completed & Pending)
  const completedCount = useMemo(
    () => students.filter((s) => s.status === 'completed').length,
    [students]
  )
  const pendingCount = useMemo(
    () => students.length - completedCount,
    [students.length, completedCount]
  )

  // Memoized Dropdown Options for Custom Select UI
  const examOptions = useMemo(
    () =>
      exams.map((ex) => ({
        value: ex.id,
        label: `${ex.session_type ? ex.session_type.toUpperCase() + ' Session' : 'Regular'} · ${ex.exam_date}`,
      })),
    [exams]
  )

  const sectionOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Sections' },
      ...sections.map((sec) => ({
        value: sec.id,
        label: `Section ${sec.section_name}`,
      })),
    ],
    [sections]
  )

  const groupOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Groups' },
      ...deduplicatedGroupNames.map((gName) => ({
        value: gName,
        label: gName.startsWith('Group') ? gName : `Group ${gName}`,
      })),
    ],
    [deduplicatedGroupNames]
  )

  const sortOptions = useMemo(
    () => [
      { value: 'default', label: 'Default (Excel)' },
      { value: 'name_asc', label: 'Name (A-Z)' },
      { value: 'name_desc', label: 'Name (Z-A)' },
      { value: 'status', label: 'By Status' },
    ],
    []
  )

  // Start or Re-evaluate Examination on Candidate (Populates previously saved answers)
  const handleStartExamination = (student: StudentItem) => {
    setActiveStudent(student)
    setActiveTab('roster')

    // Populate local candidate penalties for this candidate view
    if (student.penalties && student.penalties.length > 0) {
      setCandidatePenalties(student.penalties)
    } else if (student.attempt_id) {
      setCandidatePenalties([])
      setLoadingCandidatePenalties(true)
      getCandidatePenaltiesAction(student.attempt_id)
        .then((res) => {
          if (res.success && res.penalties) {
            setCandidatePenalties(res.penalties)
          }
        })
        .catch((err) => console.error('Error fetching candidate penalties:', err))
        .finally(() => setLoadingCandidatePenalties(false))
    } else {
      setCandidatePenalties([])
    }

    // Initialize answer state, populating with existing answers if available
    const initialAnswers: typeof answersState = {}
    questions.forEach((q) => {
      const existing = student.saved_answers?.find((a) => a.question_id === q.id)
      if (existing) {
        initialAnswers[q.id] = {
          selected_option_ids: existing.selected_options || [],
          evaluation_score:
            typeof existing.evaluation_score === 'number'
              ? existing.evaluation_score
              : typeof existing.points_awarded === 'number'
              ? existing.points_awarded
              : q.question_type === 'Q&A' ? 0 : undefined,
        }
      } else {
        initialAnswers[q.id] = {
          selected_option_ids: [],
          evaluation_score: q.question_type === 'Q&A' ? 0 : undefined,
        }
      }
    })
    setAnswersState(initialAnswers)

    // Update status to in_progress if currently pending
    if (student.status === 'pending' || student.status === 'present') {
      setStudents((prev) =>
        prev.map((s) =>
          (student.id ? s.id === student.id : s.matricule === student.matricule)
            ? { ...s, status: 'in_progress' }
            : s
        )
      )
    }
  }

  // Checklist Selection Handlers
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
        const correctIds = q.options.filter((o) => o.is_correct).map((o) => o.id)
        const selectedIds = state.selected_option_ids

        if (correctIds.length > 0 && selectedIds.length > 0) {
          const falsePositives = selectedIds.filter((id) => !correctIds.includes(id)).length
          const truePositives = selectedIds.filter((id) => correctIds.includes(id)).length

          if (falsePositives === 0 && truePositives === correctIds.length) {
            earned += maxVal
          } else if (falsePositives === 0 && truePositives > 0) {
            earned += Number(((truePositives / correctIds.length) * maxVal).toFixed(2))
          }
        }
      }
    })

    return { earned: Math.round(earned * 100) / 100, max }
  }, [questions, answersState])

  // Deductions calculation strictly from local candidatePenalties state array
  const totalDeductions = useMemo(() => {
    return candidatePenalties.reduce((sum, p) => sum + Number(p.points), 0)
  }, [candidatePenalties])

  // Net score awarded to active candidate
  const netScore = useMemo(() => {
    return Math.max(0, Math.round((calculatedPoints.earned + totalDeductions) * 100) / 100)
  }, [calculatedPoints.earned, totalDeductions])

  // Modal Submit Handler (+ Record Deduction): appends directly to local component state array
  const handleAddLocalPenalty = (newPenalty: { id: string; reason: string; points: number }) => {
    setCandidatePenalties((prev) => [
      ...prev,
      {
        id: newPenalty.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `penalty-${Date.now()}`),
        exam_attempt_id: activeStudent?.attempt_id || '',
        reason: newPenalty.reason,
        points: -Math.abs(newPenalty.points),
      },
    ])
    showSuccess(`Recorded deduction: "${newPenalty.reason}" (${-Math.abs(newPenalty.points)} pts)`)
  }

  // Delete candidate penalty from local state array
  const handleDeletePenalty = (targetId: string) => {
    setCandidatePenalties((prev) => prev.filter((p) => p.id !== targetId))
    showSuccess('Deduction removed.')
  }

  // Submit Completed Assessment (Submit & Next Candidate)
  const handleSubmitAttempt = async () => {
    if (!activeStudent || !activeExamId || !station) return

    setSubmittingAttempt(true)

    try {
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
          points_awarded: pts,
          comment: state?.comment || '',
        }
      })

      // Unified Server Action commits answers AND local penalties in a single atomic payload
      const res = await submitAssessmentAction({
        student_id: activeStudent.id,
        matricule: activeStudent.matricule,
        exam_id: activeExamId,
        station_id: station.id,
        answers: answersPayload,
        penalties: candidatePenalties,
        graded_by_prof_id: undefined,
      })

      if (!res.success) {
        showError(res.error || 'Failed to submit candidate score.')
        return
      }

      const updatedSavedAnswers = answersPayload.map((ans) => ({
        question_id: ans.question_id,
        selected_options: ans.selected_options,
        evaluation_score: ans.points_awarded,
        points_awarded: ans.points_awarded,
      }))

      const wasAlreadyCompleted = activeStudent.status === 'completed'
      const finalRecordedScore = typeof res.final_score === 'number' ? res.final_score : netScore

      if (wasAlreadyCompleted) {
        showSuccess(`Marksheet successfully updated for ${activeStudent.full_name}: ${finalRecordedScore} pts`)
      } else {
        showSuccess(`Score recorded for ${activeStudent.full_name}: ${finalRecordedScore} pts`)
      }

      const currentStudentId = activeStudent.id
      const currentMatricule = activeStudent.matricule
      const resolvedAttemptId = res.attempt_id || activeStudent.attempt_id
      const savedPenaltiesForStudent = [...candidatePenalties]

      setStudents((prev) =>
        prev.map((s) =>
          (currentStudentId ? s.id === currentStudentId : s.matricule === currentMatricule)
            ? {
                ...s,
                status: 'completed',
                final_score: finalRecordedScore,
                attempt_id: resolvedAttemptId,
                saved_answers: updatedSavedAnswers,
                penalties: savedPenaltiesForStudent,
              }
            : s
        )
      )

      // Clear local state when transitioning to the next student
      setCandidatePenalties([])

      // Auto-advance to next pending candidate only if not re-evaluating
      const remainingPending = filteredStudents.filter(
        (s) => s.matricule !== currentMatricule && (s.status === 'pending' || s.status === 'present')
      )

      if (!wasAlreadyCompleted && remainingPending.length > 0) {
        handleStartExamination(remainingPending[0])
      } else {
        setActiveStudent((prev) =>
          prev
            ? {
                ...prev,
                status: 'completed',
                final_score: finalRecordedScore,
                saved_answers: updatedSavedAnswers,
                penalties: savedPenaltiesForStudent,
                attempt_id: resolvedAttemptId,
              }
            : null
        )
        setCandidatePenalties(savedPenaltiesForStudent)
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
          Connecting to Examiner Terminal...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200 overflow-hidden">
      {/* Dedicated Examiner Sidebar */}
      <ExaminerSidebar
        station={station}
        activeExam={activeExam}
        completedCount={completedCount}
        pendingCount={pendingCount}
        totalCount={students.length}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLockStation={handleLockStation}
        collapsed={sidebarCollapsed}
        setCollapsed={handleSetSidebarCollapsed}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-300 ease-in-out">
        {/* ========================================================================= */}
        {/* 1. TOP DOCK / EXAMINER TERMINAL HEADER                                   */}
        {/* ========================================================================= */}
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between transition-colors shrink-0">
          {/* Left Station Metadata + Mobile Hamburger + Desktop Collapse Button */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Open sidebar"
            >
              <Menu className="size-5" />
            </button>

            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              title={sidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              className="hidden md:flex items-center justify-center size-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="size-4 text-slate-600 dark:text-slate-300" />
              ) : (
                <PanelLeftClose className="size-4 text-slate-600 dark:text-slate-300" />
              )}
            </button>

            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-black text-sm shadow-md shadow-orange-500/20 shrink-0">
              {station?.station_number || 1}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-xs md:max-w-md">
                  {station?.title || 'Clinical Station'}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                  Active
                </span>
                {station?.academic_year_label && (
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {station.academic_year_label}
                  </span>
                )}
                {station?.level_name && (
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
                    {station.level_name}
                  </span>
                )}
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
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Clock className="size-3.5" />
              <span>{pendingCount} Pending</span>
            </div>
          </div>

          {/* Right Controls: Session Selector + Theme + Lock */}
          <div className="flex items-center gap-2.5">
            {exams.length > 0 && (
              <div className="w-[170px] sm:w-[220px]">
                <Select
                  size="sm"
                  value={activeExamId}
                  onChange={(val) => handleExamChange(val)}
                  options={examOptions}
                  placeholder="Select Session"
                />
              </div>
            )}

            <ThemeToggle />

            <button
              type="button"
              onClick={handleLockStation}
              title="Lock Terminal / Exit Station"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 dark:hover:border-rose-900/40 transition-colors cursor-pointer"
            >
              <Lock className="size-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </header>

        {/* View Switcher: Active Station Spec | Completed Marksheets | Candidate Roster & Checklist */}
        {activeTab === 'station' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/50 dark:bg-slate-950">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Station Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                      Station #{station?.station_number} Criteria Spec
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {questions.length} Checklist Items
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {station?.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Module: <span className="font-semibold text-slate-700 dark:text-slate-300">{station?.module_name}</span> | Study Level: <span className="font-semibold text-slate-700 dark:text-slate-300">{station?.level_name || 'All'}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('roster')}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
                >
                  <ClipboardCheck className="size-4" />
                  <span>Resume Assessment</span>
                </button>
              </div>

              {/* Questions Specification List */}
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          {q.question_type === 'SCQ' ? 'Single Choice' : q.question_type === 'MCQ' ? 'Multiple Choice' : 'Examiner Rating'}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs border border-amber-200/60 dark:border-amber-800/40">
                        Max {q.max_scale_value} pts
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {q.question_text}
                    </p>

                    {q.question_type === 'Q&A' ? (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                        Examiner clinical scale from 0 to {q.max_scale_value} points based on performance.
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        {q.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                              opt.is_correct
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-medium'
                                : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <span>{opt.text}</span>
                            {opt.is_correct && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                                Key
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'marksheets' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/50 dark:bg-slate-950">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Completed Marksheets & Candidate Log
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Station #{station?.station_number}: {station?.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('roster')}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
                >
                  <ClipboardCheck className="size-4" />
                  <span>Return to Active Roster</span>
                </button>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Enrolled</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">{students.length}</div>
                  <span className="text-[10px] text-slate-500">Candidates in cohort</span>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {completedCount} <span className="text-sm font-normal text-slate-400">({students.length > 0 ? Math.round((completedCount / students.length) * 100) : 0}%)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Scored marksheets</span>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending</span>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{pendingCount}</div>
                  <span className="text-[10px] text-slate-500">Awaiting evaluation</span>
                </div>
              </div>

              {/* Results Table */}
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Candidate Assessment Log</h3>
                  <span className="text-xs text-slate-400 font-medium">Preserving Excel import sequence</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-400 uppercase font-semibold text-[10px]">
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Matricule</th>
                        <th className="py-3 px-4">Candidate Name</th>
                        <th className="py-3 px-4">Section / Group</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Awarded Score</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {students.map((st, i) => (
                        <tr key={st.matricule} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {st.import_index !== undefined && st.import_index !== null ? st.import_index + 1 : i + 1}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                            {st.matricule}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                            {st.full_name}
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                            {st.section_name} · {st.group_name}
                          </td>
                          <td className="py-3 px-4">
                            {st.status === 'completed' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Completed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            {st.final_score !== null ? (
                              <span className="text-amber-600 dark:text-amber-400">{st.final_score} pts</span>
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleStartExamination(st)}
                              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-amber-500 hover:text-white dark:bg-slate-800 dark:hover:bg-amber-500 transition-all text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <FileEdit className="size-3" />
                              <span>{st.status === 'completed' ? 'Edit Marksheet' : 'Evaluate'}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================================= */
          /* 2. DUAL-PANE MAIN WORKSPACE: CANDIDATE ROSTER + GRADING CHECKLIST        */
          /* ======================================================================= */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
            {/* LEFT COLUMN: CANDIDATE ROSTER PANEL */}
            <aside className="w-full md:w-96 lg:w-[410px] border-r border-slate-200/80 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900/60 shrink-0">
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

                {/* Filter Bar: Section + Deduplicated Group + Sort */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  <Select
                    size="sm"
                    value={selectedSection}
                    onChange={(val) => {
                      setSelectedSection(val)
                      setSelectedGroupName('ALL')
                    }}
                    options={sectionOptions}
                    placeholder="Section"
                  />

                  <Select
                    size="sm"
                    value={selectedGroupName}
                    onChange={(val) => setSelectedGroupName(val)}
                    options={groupOptions}
                    placeholder="Group"
                  />

                  <Select
                    size="sm"
                    value={sortField}
                    onChange={(val) => setSortField(val as SortField)}
                    options={sortOptions}
                    placeholder="Sort By"
                  />
                </div>
              </div>

              {/* Roster Candidate List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredStudents.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Users className="size-8 mx-auto stroke-1" />
                    <p className="text-xs font-semibold">No candidates found.</p>
                    <p className="text-[11px]">Adjust your search query or group filter.</p>
                  </div>
                ) : (
                  filteredStudents.map((st) => {
                    const isSelected = activeStudent?.id ? activeStudent.id === st.id : activeStudent?.matricule === st.matricule
                    const isCompleted = st.status === 'completed'
                    const isEvaluating = st.status === 'in_progress'

                    return (
                      <div
                        key={st.id || st.matricule}
                        onClick={() => handleStartExamination(st)}
                        className={`p-3 sm:p-3.5 transition-all cursor-pointer border-l-4 ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 dark:bg-amber-500/15'
                            : isCompleted
                            ? 'border-emerald-500/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            : isEvaluating
                            ? 'border-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Candidate Avatar */}
                            <div
                              className={`size-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelected
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : isCompleted
                                  ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {isCompleted ? (
                                <Check className="size-4 stroke-[3]" />
                              ) : (
                                st.first_name[0] || 'C'
                              )}
                            </div>

                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {st.full_name}
                              </h4>
                              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                                {st.matricule}
                              </p>

                              {/* Section & Group Badges */}
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                {st.academic_year_label && (
                                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                    {st.academic_year_label}
                                  </span>
                                )}
                                {st.section_name && (
                                  <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-200/60 dark:border-purple-900/40">
                                    {st.section_name.startsWith('Section') ? st.section_name : `Sec ${st.section_name}`}
                                  </span>
                                )}
                                {st.group_name && (
                                  <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-900/40">
                                    {st.group_name.startsWith('Group') ? st.group_name : `Group ${st.group_name}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            {isCompleted ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                                <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Submitted - Click to Edit</span>
                              </span>
                            ) : isEvaluating ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 animate-pulse">
                                Assessing
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Card Action Buttons */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                          {isCompleted ? (
                            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              Score: {st.final_score !== null ? `${st.final_score} pts` : 'Scored'}
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400">
                              {isEvaluating ? 'In Progress' : 'Pending Evaluation'}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartExamination(st)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-600 text-white shadow-sm'
                                : isCompleted
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'
                                : 'bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300'
                            }`}
                          >
                            {isCompleted ? (
                              <>
                                <FileEdit className="size-3" />
                                <span>Edit Marksheet</span>
                              </>
                            ) : isEvaluating ? (
                              <>
                                <span>Resume</span>
                                <ArrowRight className="size-3" />
                              </>
                            ) : (
                              <>
                                <span>Assess</span>
                                <ArrowRight className="size-3" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </aside>

            {/* RIGHT PANE: LIVE GRADING CHECKLIST WORKSPACE */}
            <main className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-slate-50/70 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
              {!activeStudent ? (
                <div className="m-auto max-w-md text-center p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="size-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                    <Stethoscope className="size-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Ready to Assess Candidate
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Select a candidate from the left roster to open the live station checklist, record responses, and submit the final score.
                    </p>
                  </div>

                  {filteredStudents.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleStartExamination(filteredStudents[0])}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      Start First Candidate
                    </button>
                  )}
                </div>
              ) : (
                <div className="max-w-4xl w-full mx-auto space-y-6 pb-24">
                  {/* Active Candidate Header */}
                  <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-orange-500/20">
                          {activeStudent.first_name[0] || 'C'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                              {activeStudent.full_name}
                            </h2>
                            <span className="font-mono text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              {activeStudent.matricule}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Section: {activeStudent.section_name} · Group: {activeStudent.group_name}
                          </p>
                        </div>
                      </div>

                      {/* Live Score Counter & Penalties Badge */}
                      <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap justify-end">
                        {/* Dedicated Red Penalty Badge */}
                        <div
                          className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all ${
                            totalDeductions < 0
                              ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 shadow-sm shadow-rose-500/10 ring-1 ring-rose-400/30'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/60 text-slate-400'
                          }`}
                        >
                          <AlertTriangle
                            className={`size-4 shrink-0 ${
                              totalDeductions < 0
                                ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                                : 'text-slate-400'
                            }`}
                          />
                          <div className="text-right">
                            <span className="text-[9px] uppercase tracking-wider font-bold block leading-tight">
                              Penalties
                            </span>
                            <span
                              className={`text-sm font-black font-mono ${
                                totalDeductions < 0
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {totalDeductions < 0 ? `${totalDeductions.toFixed(1)} pts` : '0.0 pts'}
                            </span>
                          </div>
                        </div>

                        {/* Current Net Score */}
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 p-2.5 px-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                          <div className="text-right">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block leading-tight">
                              Current Score
                            </span>
                            <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                              {netScore}{' '}
                              <span className="text-xs font-normal text-slate-400">/ {calculatedPoints.max}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Edit Mode Notice Banner for Completed Marksheet */}
                    {activeStudent.status === 'completed' && (
                      <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300">
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <FileEdit className="size-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Submitted Marksheet (Editing Mode)</span>
                          <span className="hidden sm:inline text-[11px] font-normal text-emerald-700/80 dark:text-emerald-400/80">
                            — Previously recorded: {activeStudent.final_score ?? 0} pts. Modifying scores will update the existing record.
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0">
                          Re-evaluating
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Checklist Scoring Items */}
                  <div className="space-y-4">
                    {questions.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 border rounded-2xl bg-white dark:bg-slate-900">
                        No criteria configured for this station exam session.
                      </div>
                    ) : (
                      questions.map((q, idx) => {
                        const state = answersState[q.id] || { selected_option_ids: [] }
                        const isMCQ = q.question_type === 'MCQ'
                        const isSCQ = q.question_type === 'SCQ'
                        const isQA = q.question_type === 'Q&A'
                        const maxVal = Number(q.max_scale_value) || 10

                        return (
                          <div
                            key={q.id}
                            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="flex size-6 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-200/60 dark:border-amber-800/60">
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                  {isSCQ ? 'Single Choice' : isMCQ ? 'Multiple Choice' : 'Clinical Rating'}
                                </span>
                              </div>
                              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                                Max {maxVal} pts
                              </span>
                            </div>

                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                              {q.question_text}
                            </p>

                            {/* Q&A Rating Scale */}
                            {isQA && (
                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                    Awarded Points:
                                  </label>
                                  <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                                    {state.evaluation_score ?? 0} / {maxVal}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={maxVal}
                                  step={0.5}
                                  value={state.evaluation_score ?? 0}
                                  onChange={(e) => handleRatingScoreChange(q.id, Number(e.target.value))}
                                  className="w-full accent-amber-500 cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                  <span>0 pts (Inadequate)</span>
                                  <span>{Math.round(maxVal / 2)} pts (Competent)</span>
                                  <span>{maxVal} pts (Mastery)</span>
                                </div>
                              </div>
                            )}

                            {/* Options for MCQ / SCQ */}
                            {(isSCQ || isMCQ) && (
                              <div className="space-y-2 pt-1">
                                {q.options.map((opt) => {
                                  const isSelected = state.selected_option_ids.includes(opt.id)

                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => handleOptionSelect(q.id, opt.id, isMCQ)}
                                      className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                                        isSelected
                                          ? 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-100 shadow-sm'
                                          : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
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

                  {/* Clinical Deductions & Penalties Section (Candidate-Isolated Feed) */}
                  <ClinicalPenaltiesCard
                    penalties={candidatePenalties}
                    studentName={activeStudent.full_name}
                    totalDeductionPoints={totalDeductions}
                    onOpenAddModal={() => setIsCreatePenaltyOpen(true)}
                    onDeletePenalty={handleDeletePenalty}
                    isLoading={loadingCandidatePenalties}
                  />

                  {/* Ad-Hoc Candidate Penalty Creation Modal */}
                  {station && (
                    <CreateCandidatePenaltyModal
                      isOpen={isCreatePenaltyOpen}
                      onClose={() => setIsCreatePenaltyOpen(false)}
                      studentName={activeStudent.full_name}
                      onAddPenalty={handleAddLocalPenalty}
                    />
                  )}

                  {/* Bottom Sticky Submission Bar */}
                  <div className="sticky bottom-4 z-20 p-4 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
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
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                        title="Reset Checklist"
                      >
                        <RotateCcw className="size-4" />
                      </button>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block leading-tight">
                          Total Awarded:
                        </span>
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-black font-mono flex-wrap">
                          <span className="text-slate-700 dark:text-slate-200">
                            Earned: <strong className="text-emerald-600 dark:text-emerald-400">{calculatedPoints.earned}</strong>
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">|</span>
                          <span className="text-slate-700 dark:text-slate-200">
                            Deductions:{' '}
                            <strong className={totalDeductions < 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-400 font-bold'}>
                              {totalDeductions < 0 ? `${totalDeductions.toFixed(1)}` : '-0.0'}
                            </strong>
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">|</span>
                          <span className="text-slate-700 dark:text-slate-200">
                            Net Total:{' '}
                            <strong className="text-amber-600 dark:text-amber-400">
                              {netScore}
                            </strong>{' '}
                            <span className="text-[11px] font-normal text-slate-400">/ {calculatedPoints.max} pts</span>
                          </span>
                        </div>
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
                          <span>{activeStudent.status === 'completed' ? 'Updating Marksheet...' : 'Submitting Assessment...'}</span>
                        </>
                      ) : (
                        <>
                          {activeStudent.status === 'completed' ? (
                            <>
                              <FileEdit className="size-4" />
                              <span>Update Marksheet</span>
                            </>
                          ) : (
                            <>
                              <Send className="size-4" />
                              <span>Submit & Next Candidate</span>
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ExaminerWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
          <Loader2 className="size-8 animate-spin text-amber-500" />
          <p className="text-sm font-semibold text-slate-500 animate-pulse">
            Connecting to Examiner Terminal...
          </p>
        </div>
      }
    >
      <ExaminerWorkspaceContent />
    </Suspense>
  )
}
