'use client'

import React, { useState, useEffect, useRef, use, useMemo } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Clock,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  Filter,
  GripVertical,
  HelpCircle,
  Key,
  Layers,
  ListPlus,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { UUID_REGEX } from '@/lib/stationSlug'

export interface QuestionOptionItem {
  id: string
  text: string
  is_correct: boolean
}

export interface QuestionRecord {
  id: string
  exam_id: string
  question_text: string
  question_type: 'MCQ' | 'SCQ' | 'Q&A'
  max_scale_value: number
  options: QuestionOptionItem[]
  created_at?: string
}

export interface ExamSessionMeta {
  id: string
  station_id: string
  session_type: string
  exam_date: string
  created_at?: string
}

export interface StationMeta {
  id: string
  slug?: string
  module_id: string
  station_number: number
  title: string
  access_pin: string
  weightage_percentage: number
  module_name: string
  level_name: string
}

export interface CandidateLiveItem {
  id: string
  matricule: string
  full_name: string
  rotation_group: string
  status: 'in_progress' | 'submitted' | 'pending'
  score?: number
  max_score: number
  elapsed_seconds: number
  items_evaluated: number
  total_items: number
  examiner_note?: string
}

export const QUESTION_TYPES = [
  {
    value: 'MCQ' as const,
    title: 'Multiple Choice (MCQ)',
    badge: 'MCQ',
    description: 'Multiple correct answers allowed',
    icon: CheckSquare,
    iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-300',
    badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  },
  {
    value: 'SCQ' as const,
    title: 'Single Choice (SCQ)',
    badge: 'SCQ',
    description: 'Single correct answer only',
    icon: CircleDot,
    iconBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300',
    badgeColor: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  },
  {
    value: 'Q&A' as const,
    title: 'Clinical Task (Q&A)',
    badge: 'Scale',
    description: 'Continuous scale grading checklist',
    icon: Sliders,
    iconBg: 'bg-lime-500/15 text-lime-600 dark:text-lime-300',
    badgeColor: 'bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30',
  },
]

export default function ProfessorLiveExamMonitorPage({
  params,
}: {
  params: Promise<{ stationId: string; examId: string }>
}) {
  const { stationId, examId } = use(params)
  const { showSuccess, showError } = useToast()

  const [exam, setExam] = useState<ExamSessionMeta | null>(null)
  const [station, setStation] = useState<StationMeta | null>(null)
  const [questions, setQuestions] = useState<QuestionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // PIN Visibility & copy feedback
  const [pinRevealed, setPinRevealed] = useState(false)
  const [pinCopied, setPinCopied] = useState(false)

  // Read-Only Rubric Drawer State
  const [isRubricDrawerOpen, setIsRubricDrawerOpen] = useState(false)

  // Candidates Evaluation Stream State
  const [candidates, setCandidates] = useState<CandidateLiveItem[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'submitted' | 'pending'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedMatriculeId, setCopiedMatriculeId] = useState<string | null>(null)

  // Question Edit Modal State
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuestionRecord | null>(null)
  const [deletingQuestion, setDeletingQuestion] = useState<QuestionRecord | null>(null)
  const [formText, setFormText] = useState('')
  const [formType, setFormType] = useState<'MCQ' | 'SCQ' | 'Q&A'>('MCQ')
  const [formMaxScale, setFormMaxScale] = useState<number>(10)
  const [formOptions, setFormOptions] = useState<QuestionOptionItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Seed / fetch candidates live stream
  const initializeCandidates = (totalItems: number) => {
    const seededCandidates: CandidateLiveItem[] = [
      {
        id: 'c1',
        matricule: '2024-MED-0104',
        full_name: 'Dr. Youssef Amrani',
        rotation_group: 'Group 03 - Rotation B',
        status: 'in_progress',
        max_score: 20,
        elapsed_seconds: 245,
        items_evaluated: Math.min(3, totalItems || 3),
        total_items: totalItems || 5,
        examiner_note: 'Proper sterile technique observed, proceeding to auscultation.',
      },
      {
        id: 'c2',
        matricule: '2024-MED-0118',
        full_name: 'Dr. Sarah Benali',
        rotation_group: 'Group 03 - Rotation B',
        status: 'in_progress',
        max_score: 20,
        elapsed_seconds: 310,
        items_evaluated: Math.min(4, totalItems || 4),
        total_items: totalItems || 5,
        examiner_note: 'Clear differential diagnosis presented.',
      },
      {
        id: 'c3',
        matricule: '2024-MED-0089',
        full_name: 'Dr. Omar Kabbaj',
        rotation_group: 'Group 03 - Rotation B',
        status: 'submitted',
        score: 17.5,
        max_score: 20,
        elapsed_seconds: 480,
        items_evaluated: totalItems || 5,
        total_items: totalItems || 5,
        examiner_note: 'Excellent anamnesis and clinical composure.',
      },
      {
        id: 'c4',
        matricule: '2024-MED-0135',
        full_name: 'Dr. Kenza Mansouri',
        rotation_group: 'Group 03 - Rotation B',
        status: 'submitted',
        score: 15.0,
        max_score: 20,
        elapsed_seconds: 472,
        items_evaluated: totalItems || 5,
        total_items: totalItems || 5,
        examiner_note: 'Minor hesitation during palpation sequence.',
      },
      {
        id: 'c5',
        matricule: '2024-MED-0142',
        full_name: 'Dr. Mehdi Tazi',
        rotation_group: 'Group 03 - Rotation B',
        status: 'submitted',
        score: 18.25,
        max_score: 20,
        elapsed_seconds: 460,
        items_evaluated: totalItems || 5,
        total_items: totalItems || 5,
        examiner_note: 'Flawless emergency protocol execution.',
      },
      {
        id: 'c6',
        matricule: '2024-MED-0158',
        full_name: 'Dr. Leila Berrada',
        rotation_group: 'Group 03 - Rotation B',
        status: 'pending',
        max_score: 20,
        elapsed_seconds: 0,
        items_evaluated: 0,
        total_items: totalItems || 5,
      },
      {
        id: 'c7',
        matricule: '2024-MED-0169',
        full_name: 'Dr. Hamza Chraibi',
        rotation_group: 'Group 03 - Rotation B',
        status: 'pending',
        max_score: 20,
        elapsed_seconds: 0,
        items_evaluated: 0,
        total_items: totalItems || 5,
      },
      {
        id: 'c8',
        matricule: '2024-MED-0177',
        full_name: 'Dr. Salma Fassi',
        rotation_group: 'Group 03 - Rotation B',
        status: 'pending',
        max_score: 20,
        elapsed_seconds: 0,
        items_evaluated: 0,
        total_items: totalItems || 5,
      },
    ]
    setCandidates(seededCandidates)
  }

  // Live timer tick for active in-progress candidates
  useEffect(() => {
    const timer = setInterval(() => {
      setCandidates((prev) =>
        prev.map((c) =>
          c.status === 'in_progress'
            ? { ...c, elapsed_seconds: (c.elapsed_seconds || 0) + 1 }
            : c
        )
      )
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchExamData = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch(`/api/professor/exams/${examId}/questions`)
      const json = await res.json()

      if (res.ok && json.success) {
        setExam(json.exam || null)
        setStation(json.station || null)
        const qList = json.questions || []
        setQuestions(qList)
        initializeCandidates(qList.length)
      } else {
        showError(json.error || 'Failed to fetch exam session data.')
      }
    } catch {
      showError('Network error connecting to server.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (examId) {
      fetchExamData()
    }
  }, [examId])

  // Gracefully replace legacy station UUID in URL history with clean slug
  useEffect(() => {
    if (station?.slug && UUID_REGEX.test(stationId)) {
      window.history.replaceState(
        null,
        '',
        `/professor/stations/${station.slug}/exams/${examId}`
      )
    }
  }, [station?.slug, stationId, examId])

  const handleCopyPin = () => {
    if (!station?.access_pin) return
    navigator.clipboard.writeText(station.access_pin)
    setPinCopied(true)
    setTimeout(() => setPinCopied(false), 2000)
    showSuccess('Access PIN copied.')
  }

  const handleCopyMatricule = (e: React.MouseEvent, matricule: string, id: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(matricule)
    setCopiedMatriculeId(id)
    setTimeout(() => setCopiedMatriculeId(null), 1800)
    showSuccess('Matricule copied!')
  }

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        c.full_name.toLowerCase().includes(q) ||
        c.matricule.toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [candidates, statusFilter, searchQuery])

  // Telemetry KPIs
  const inProgressCount = candidates.filter((c) => c.status === 'in_progress').length
  const submittedCount = candidates.filter((c) => c.status === 'submitted').length
  const pendingCount = candidates.filter((c) => c.status === 'pending').length

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Breadcrumbs & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 flex-wrap">
          <Link
            href="/professor/stations"
            className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Stations
          </Link>
          <ChevronRight className="size-3.5 text-slate-400" />
          <Link
            href={`/professor/stations/${station?.slug || stationId}`}
            className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors truncate max-w-[160px]"
          >
            {station ? `Station #${station.station_number}` : 'Station Detail'}
          </Link>
          <ChevronRight className="size-3.5 text-slate-400" />
          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1.5">
            <Activity className="size-3.5" />
            <span>Live Session Evaluation Monitor</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRubricDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-emerald-500/20 bg-white dark:bg-[#0B1612] text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition-all shadow-xs cursor-pointer"
          >
            <FileText className="size-3.5 text-emerald-500" />
            <span>Inspect Rubric ({questions.length})</span>
          </button>

          <button
            onClick={() => fetchExamData(true)}
            disabled={refreshing || loading}
            aria-label="Refresh live stream"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-emerald-500/20 bg-white dark:bg-[#0B1612] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#12221C] transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl bg-white/50 dark:bg-[#0B1612]/50 border border-slate-200/80 dark:border-emerald-500/15">
          <Loader2 className="size-8 text-emerald-500 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Connecting to live candidate evaluation stream...</p>
        </div>
      ) : !exam ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/15 text-center space-y-3">
          <AlertCircle className="size-8 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Exam Session Not Found</h3>
          <p className="text-xs text-slate-400">The requested exam session could not be resolved.</p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* SESSION TELEMETRY BANNER                                                  */}
          {/* ========================================================================= */}
          <div className="sticky top-16 z-20 backdrop-blur-md bg-white/95 dark:bg-[#0B1612]/95 border border-slate-200/80 dark:border-emerald-500/20 p-4 sm:p-5 rounded-xl shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {/* Rotation Group Chip */}
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-600 text-white font-mono font-black shadow-xs">
                    <Users className="size-3" />
                    <span>Group 03 - Rotation B</span>
                  </span>

                  {/* Session Type Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                      exam.session_type === 'retake' || (exam as any).session_type === 'makeup'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {exam.session_type === 'retake' || (exam as any).session_type === 'makeup'
                      ? 'Session Rattrapage'
                      : 'Session Normale'}
                  </span>

                  <span className="px-2.5 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-[#12221C] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-emerald-500/15">
                    {station?.module_name}
                  </span>

                  {/* Active Student Counter */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono font-bold bg-lime-500/15 text-lime-700 dark:text-lime-300 border border-lime-500/25">
                    <span className="size-2 rounded-full bg-lime-400 animate-pulse" />
                    <span>{inProgressCount} In Progress</span>
                    <span>•</span>
                    <span>{submittedCount} Submitted</span>
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                    Station #{station?.station_number}: {station?.title}
                  </h1>
                </div>
              </div>

              {/* Tablet Access PIN Pill */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/15 shrink-0 self-start md:self-auto">
                <Key className="size-3.5 text-amber-500" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Tablet PIN</span>
                  <span className="font-mono text-xs font-black text-emerald-600 dark:text-lime-300 tracking-wider">
                    {pinRevealed ? station?.access_pin : '••••••'}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    onClick={() => setPinRevealed(!pinRevealed)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Toggle PIN"
                  >
                    {pinRevealed ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                  </button>
                  <button
                    onClick={handleCopyPin}
                    className="p-1 rounded text-slate-400 hover:text-emerald-500"
                    title="Copy PIN"
                  >
                    {pinCopied ? <Check className="size-3 text-lime-400" /> : <Copy className="size-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STREAM FILTER & CONTROLS                                                  */}
          {/* ========================================================================= */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/15 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-[#12221C] text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-emerald-500/20'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All ({candidates.length})
              </button>
              <button
                onClick={() => setStatusFilter('in_progress')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'in_progress'
                    ? 'bg-lime-400/20 text-lime-700 dark:text-lime-300 border border-lime-400/30'
                    : 'text-slate-500 hover:text-lime-400'
                }`}
              >
                <span className="size-2 rounded-full bg-lime-400 animate-pulse" />
                <span>In Progress ({inProgressCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter('submitted')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'submitted'
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-500 hover:text-emerald-400'
                }`}
              >
                <Check className="size-3 text-emerald-500" />
                <span>Submitted ({submittedCount})</span>
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'pending'
                    ? 'bg-white dark:bg-[#12221C] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-emerald-500/20'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                Pending ({pendingCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate or matricule..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/15 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* LIVE CANDIDATE EVALUATION STREAM GRID                                     */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCandidates.map((candidate) => {
              const isInProgress = candidate.status === 'in_progress'
              const isSubmitted = candidate.status === 'submitted'
              const isPending = candidate.status === 'pending'

              return (
                <div
                  key={candidate.id}
                  className={`p-5 rounded-xl transition-all duration-200 flex flex-col justify-between space-y-4 ${
                    isInProgress
                      ? 'bg-white dark:bg-[#12221C] ring-2 ring-lime-400 shadow-md shadow-lime-500/10 border-transparent'
                      : isSubmitted
                      ? 'bg-white dark:bg-[#12221C] ring-2 ring-emerald-500/80 shadow-sm border-transparent'
                      : 'bg-white/60 dark:bg-[#12221C]/60 border-2 border-dashed border-slate-300 dark:border-emerald-500/20 opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Status Indicator Ring & Timer / Score */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isInProgress && (
                          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-lime-400/20 text-lime-700 dark:text-lime-300 border border-lime-400/30">
                            <span className="size-2 rounded-full bg-lime-400 animate-ping" />
                            <span>In Progress</span>
                          </span>
                        )}
                        {isSubmitted && (
                          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="size-3 text-emerald-500" />
                            <span>Submitted</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-[#0B1612] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-emerald-500/10">
                            Pending Turn
                          </span>
                        )}
                      </div>

                      {/* Live Elapsed Timer or Final Score Monospace */}
                      {isInProgress && (
                        <div className="flex items-center gap-1 text-xs font-mono font-bold text-lime-600 dark:text-lime-400">
                          <Clock className="size-3.5" />
                          <span>{formatTimer(candidate.elapsed_seconds)}</span>
                        </div>
                      )}
                      {isSubmitted && typeof candidate.score === 'number' && (
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 tabular-nums">
                          {candidate.score.toFixed(2)} / {candidate.max_score}.00
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[10px] font-mono text-slate-400">00:00</span>
                      )}
                    </div>

                    {/* Candidate Identity */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                        {candidate.full_name}
                      </h3>

                      {/* Monospace Matricule with click-to-copy */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyMatricule(e, candidate.matricule, candidate.id)}
                        className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#0B1612] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200/80 dark:border-emerald-500/15 text-slate-600 dark:text-slate-300 hover:text-emerald-500 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
                        title="Click to copy matricule"
                      >
                        <span>{candidate.matricule}</span>
                        {copiedMatriculeId === candidate.id ? (
                          <Check className="size-3 text-lime-400" />
                        ) : (
                          <Copy className="size-3 opacity-60" />
                        )}
                      </button>
                    </div>

                    {/* Evaluation Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span>Checklist Criteria:</span>
                        <span className="font-mono tabular-nums">
                          {candidate.items_evaluated} / {candidate.total_items} marked
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-[#0B1612] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isSubmitted
                              ? 'bg-emerald-500'
                              : isInProgress
                              ? 'bg-gradient-to-r from-emerald-500 to-lime-400'
                              : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                          style={{
                            width: `${
                              candidate.total_items > 0
                                ? (candidate.items_evaluated / candidate.total_items) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Examiner Clinical Remark if available */}
                    {candidate.examiner_note && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2 pt-1 border-t border-slate-100 dark:border-emerald-500/10">
                        &quot;{candidate.examiner_note}&quot;
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Rotation & Inspection */}
                  <div className="pt-2 border-t border-slate-100 dark:border-emerald-500/15 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{candidate.rotation_group}</span>
                    <button
                      type="button"
                      onClick={() => setIsRubricDrawerOpen(true)}
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                    >
                      Inspect Rubric →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* READ-ONLY RUBRIC DRAWER (Slide-out panel from right)                       */}
      {/* ========================================================================= */}
      {isRubricDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setIsRubricDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white dark:bg-[#0B1612] border-l border-slate-200/80 dark:border-emerald-500/20 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 dark:border-emerald-500/15 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-[#12221C]/50">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Station Rubric & Checklist
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Station #{station?.station_number} • {questions.length} Criteria Items
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsRubricDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#12221C]"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                {questions.length === 0 ? (
                  <div className="p-8 text-center space-y-2 text-slate-400">
                    <HelpCircle className="size-8 mx-auto text-slate-300" />
                    <p className="text-xs">No criteria configured yet for this station.</p>
                  </div>
                ) : (
                  questions.map((q, idx) => {
                    const isMCQorSCQ = q.question_type === 'MCQ' || q.question_type === 'SCQ'
                    const parsedOptions: QuestionOptionItem[] = Array.isArray(q.options) ? q.options : []

                    return (
                      <div
                        key={q.id}
                        className="p-4 rounded-xl bg-slate-50 dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/15 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-black text-slate-400">
                            Item #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {q.question_type === 'MCQ' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
                                MCQ
                              </span>
                            )}
                            {q.question_type === 'SCQ' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25">
                                SCQ
                              </span>
                            )}
                            {q.question_type === 'Q&A' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-lime-500/15 text-lime-700 dark:text-lime-300 border border-lime-500/25">
                                Q&A Scale
                              </span>
                            )}
                            <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              {q.max_scale_value || 5} pts
                            </span>
                          </div>
                        </div>

                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                          {q.question_text}
                        </p>

                        {/* Options */}
                        {isMCQorSCQ && parsedOptions.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {parsedOptions.map((opt, oIdx) => (
                              <div
                                key={opt.id || oIdx}
                                className={`p-2 rounded-lg text-[11px] font-medium flex items-center justify-between gap-2 ${
                                  opt.is_correct
                                    ? 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30'
                                    : 'bg-white dark:bg-[#0B1612] text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-emerald-500/10'
                                }`}
                              >
                                <span>
                                  {String.fromCharCode(65 + oIdx)}. {opt.text}
                                </span>
                                {opt.is_correct && (
                                  <Check className="size-3 text-lime-400 shrink-0" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {q.question_type === 'Q&A' && (
                          <div className="p-2 rounded-lg bg-white dark:bg-[#0B1612] border border-slate-200/60 dark:border-emerald-500/10 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            Grading Range: 0.00 → {(q.max_scale_value || 5).toFixed(2)} pts
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-emerald-500/15 bg-slate-50/50 dark:bg-[#12221C]/50 flex items-center justify-between">
                <Link
                  href={`/professor/stations/${station?.slug || stationId}`}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Open in Full Checklist Editor →
                </Link>
                <button
                  type="button"
                  onClick={() => setIsRubricDrawerOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-200 dark:bg-[#0B1612] text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
