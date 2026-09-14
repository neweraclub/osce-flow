'use client'

import React, { useState, useEffect, useRef, use } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  HelpCircle,
  Key,
  Layers,
  ListPlus,
  Loader2,
  Plus,
  Radio,
  RefreshCw,
  Sliders,
  Sparkles,
  Stethoscope,
  Trash2,
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

export const QUESTION_TYPES = [
  {
    value: 'MCQ' as const,
    title: 'Multiple Choice (MCQ)',
    badge: 'MCQ',
    description: 'Multiple correct answers allowed',
    icon: CheckSquare,
    iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
    badgeColor: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/50',
  },
  {
    value: 'SCQ' as const,
    title: 'Single Choice (SCQ)',
    badge: 'SCQ',
    description: 'Single correct answer only',
    icon: CircleDot,
    iconBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
    badgeColor: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-900/50',
  },
  {
    value: 'Q&A' as const,
    title: 'Clinical Task (Q&A)',
    badge: 'Scale',
    description: 'Continuous scale grading checklist',
    icon: Sliders,
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
    badgeColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/50',
  },
]

export default function ProfessorExamQuestionsPage({
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

  // Add / Edit Question Modal State
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuestionRecord | null>(null)
  const [deletingQuestion, setDeletingQuestion] = useState<QuestionRecord | null>(null)
  const [exitingQuestionIds, setExitingQuestionIds] = useState<Set<string>>(new Set())

  // Form Fields
  const [formText, setFormText] = useState('')
  const [formType, setFormType] = useState<'MCQ' | 'SCQ' | 'Q&A'>('MCQ')
  const selectedTypeConfig = QUESTION_TYPES.find((t) => t.value === formType) || QUESTION_TYPES[0]
  const [formMaxScale, setFormMaxScale] = useState<number>(10)
  const [formOptions, setFormOptions] = useState<QuestionOptionItem[]>([
    { id: 'opt_1', text: '', is_correct: true },
    { id: 'opt_2', text: '', is_correct: false },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Custom Dropdown State for Question Type
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const typeDropdownRef = useRef<HTMLDivElement>(null)

  // Outside click listener for type dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setTypeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Global ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (typeDropdownOpen) {
          setTypeDropdownOpen(false)
          return
        }
        setIsQuestionModalOpen(false)
        setEditingQuestion(null)
        setDeletingQuestion(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [typeDropdownOpen])

  const fetchExamQuestions = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch(`/api/professor/exams/${examId}/questions`)
      const json = await res.json()

      if (res.ok && json.success) {
        setExam(json.exam || null)
        setStation(json.station || null)
        setQuestions(json.questions || [])
      } else {
        showError(json.error || 'Failed to fetch exam questions.')
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
      fetchExamQuestions()
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

  // --- Modal Openers ---
  const handleOpenAddQuestion = () => {
    setEditingQuestion(null)
    setFormText('')
    setFormType('MCQ')
    setFormMaxScale(10)
    setFormOptions([
      { id: 'opt_1', text: '', is_correct: true },
      { id: 'opt_2', text: '', is_correct: false },
      { id: 'opt_3', text: '', is_correct: false },
    ])
    setFormError('')
    setTypeDropdownOpen(false)
    setIsQuestionModalOpen(true)
  }

  const handleOpenEditQuestion = (q: QuestionRecord) => {
    setEditingQuestion(q)
    setFormText(q.question_text)
    setFormType(q.question_type)
    setFormMaxScale(q.max_scale_value || 10)
    if (Array.isArray(q.options) && q.options.length > 0) {
      setFormOptions(q.options)
    } else {
      setFormOptions([
        { id: 'opt_1', text: '', is_correct: true },
        { id: 'opt_2', text: '', is_correct: false },
      ])
    }
    setFormError('')
    setTypeDropdownOpen(false)
    setIsQuestionModalOpen(true)
  }

  // --- Dynamic Option Helpers ---
  const handleAddOption = () => {
    const nextId = `opt_${Date.now()}`
    setFormOptions((prev) => [...prev, { id: nextId, text: '', is_correct: false }])
  }

  const handleRemoveOption = (id: string) => {
    if (formOptions.length <= 2) {
      showError('At least 2 choices are required for multiple choice questions.')
      return
    }
    setFormOptions((prev) => prev.filter((opt) => opt.id !== id))
  }

  const handleOptionTextChange = (id: string, text: string) => {
    setFormOptions((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, text } : opt))
    )
  }

  const handleToggleCorrect = (id: string) => {
    if (formType === 'SCQ') {
      // Single choice: only one can be true
      setFormOptions((prev) =>
        prev.map((opt) => ({ ...opt, is_correct: opt.id === id }))
      )
    } else {
      // Multiple choice: can toggle
      setFormOptions((prev) =>
        prev.map((opt) => (opt.id === id ? { ...opt, is_correct: !opt.is_correct } : opt))
      )
    }
  }

  // --- Save / Update Question ---
  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formText.trim()) {
      setFormError('Please enter the question prompt or task instructions.')
      return
    }

    // Validate options if MCQ/SCQ
    if (formType === 'MCQ' || formType === 'SCQ') {
      const emptyOptions = formOptions.some((opt) => !opt.text.trim())
      if (emptyOptions) {
        setFormError('All choice options must have text filled in.')
        return
      }

      const hasCorrect = formOptions.some((opt) => opt.is_correct)
      if (!hasCorrect) {
        setFormError('Please check at least one choice as the correct answer.')
        return
      }
    }

    setSubmitting(true)
    setFormError('')

    const payload = {
      exam_id: examId,
      question_text: formText.trim(),
      question_type: formType,
      max_scale_value: formMaxScale,
      options: formType === 'Q&A' ? [] : formOptions,
    }

    try {
      if (editingQuestion) {
        const res = await fetch('/api/professor/questions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingQuestion.id,
            ...payload,
          }),
        })
        const json = await res.json()

        if (res.ok && json.success) {
          showSuccess('Question updated successfully.')
          setIsQuestionModalOpen(false)
          setEditingQuestion(null)
          fetchExamQuestions(true)
        } else {
          setFormError(json.error || 'Failed to update question.')
        }
      } else {
        const res = await fetch('/api/professor/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()

        if (res.ok && json.success) {
          showSuccess('Question added to exam session.')
          setIsQuestionModalOpen(false)
          fetchExamQuestions(true)
        } else {
          setFormError(json.error || 'Failed to add question.')
        }
      }
    } catch {
      setFormError('Network error communicating with server.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Delete Question (Optimistic with Rollback & Exit Transition) ---
  const handleConfirmDeleteQuestion = async () => {
    if (!deletingQuestion) return

    const target = deletingQuestion
    const targetIndex = questions.findIndex((q) => q.id === target.id)

    // 1. Immediately dismiss modal so interface is instantly responsive
    setDeletingQuestion(null)

    // 2. Trigger smooth exit transition on card
    setExitingQuestionIds((prev) => new Set(prev).add(target.id))

    // 3. Remove from active state after exit animation completes
    setTimeout(() => {
      setQuestions((current) => current.filter((q) => q.id !== target.id))
      setExitingQuestionIds((prev) => {
        const next = new Set(prev)
        next.delete(target.id)
        return next
      })
    }, 200)

    // 4. Background asynchronous database deletion
    try {
      const res = await fetch(`/api/professor/questions?id=${target.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Question deleted.')
      } else {
        // Rollback: restore item to original position
        setQuestions((current) => {
          if (current.some((q) => q.id === target.id)) return current
          const restored = [...current]
          if (targetIndex >= 0 && targetIndex <= restored.length) {
            restored.splice(targetIndex, 0, target)
          } else {
            restored.push(target)
          }
          return restored
        })
        showError(json.error || 'Failed to delete question. Changes restored.')
      }
    } catch {
      // Rollback on network/connection failure
      setQuestions((current) => {
        if (current.some((q) => q.id === target.id)) return current
        const restored = [...current]
        if (targetIndex >= 0 && targetIndex <= restored.length) {
          restored.splice(targetIndex, 0, target)
        } else {
          restored.push(target)
        }
        return restored
      })
      showError('Network error deleting question. Item restored.')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumb Navigation */}
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
          <span className="text-slate-900 dark:text-white font-extrabold">
            Questions & Scoring Checklist
          </span>
        </div>

        <button
          onClick={() => fetchExamQuestions(true)}
          disabled={refreshing || loading}
          aria-label="Refresh exam questions"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
          <Loader2 className="size-8 text-emerald-500 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading exam questions...</p>
        </div>
      ) : !exam ? (
        <div className="p-12 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <AlertCircle className="size-8 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Exam Session Not Found</h3>
          <p className="text-xs text-slate-400">The requested exam session could not be resolved.</p>
        </div>
      ) : (
        <>
          {/* Header Banner: Exam & Station Metadata */}
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-800 text-white shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-xs">
                    Station #{station?.station_number}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      exam.session_type === 'makeup'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {exam.session_type === 'makeup' ? 'Makeup Session' : 'Regular Session'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {station?.module_name}
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                  {station?.title}
                </h1>

                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Calendar className="size-4 text-emerald-400 shrink-0" />
                  <span>
                    Exam Date:{' '}
                    <strong className="text-white">
                      {new Date(exam.exam_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Tablet Access PIN Pill */}
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-between gap-4 min-w-[200px]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                    <Key className="size-4.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                      Scoring PIN
                    </span>
                    <span className="font-mono text-sm font-black text-white tracking-widest">
                      {pinRevealed ? station?.access_pin : '••••••'}
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

          {/* Question List Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="size-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Questions & Scoring Criteria ({questions.length})</span>
                </h2>
                <p className="text-xs font-medium text-slate-400">
                  MCQ, Single Choice (SCQ), and Clinical Q&A scoring items for live evaluation
                </p>
              </div>

              <button
                onClick={handleOpenAddQuestion}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-[0.98]"
              >
                <Plus className="size-4" />
                <span>+ Add Question</span>
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="p-12 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
                <div className="size-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <HelpCircle className="size-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No Questions Authored Yet
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Click "+ Add Question" to create your first multiple choice question, single choice question, or clinical scoring task.
                </p>
                <button
                  onClick={handleOpenAddQuestion}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all"
                >
                  <Plus className="size-4" />
                  <span>Create First Question</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const isMCQorSCQ = q.question_type === 'MCQ' || q.question_type === 'SCQ'
                  const parsedOptions: QuestionOptionItem[] = Array.isArray(q.options) ? q.options : []
                  const isExiting = exitingQuestionIds.has(q.id)

                  return (
                    <div
                      key={q.id}
                      className={`p-5 md:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 ${
                        isExiting
                          ? 'transition-all duration-200 opacity-0 scale-95 pointer-events-none'
                          : 'transition-all duration-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="flex size-8 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-black shrink-0 mt-0.5">
                            #{idx + 1}
                          </span>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  q.question_type === 'MCQ'
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/50'
                                    : q.question_type === 'SCQ'
                                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-900/50'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/50'
                                }`}
                              >
                                {q.question_type === 'MCQ'
                                  ? 'Multiple Choice (MCQ)'
                                  : q.question_type === 'SCQ'
                                  ? 'Single Choice (SCQ)'
                                  : 'Clinical Task (Q&A)'}
                              </span>

                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                Max Scale: {q.max_scale_value || 10} pts
                              </span>
                            </div>

                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                              {q.question_text}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleOpenEditQuestion(q)}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Edit Question"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            onClick={() => setDeletingQuestion(q)}
                            className="p-2 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            aria-label="Delete Question"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      {/* Render Choices if MCQ/SCQ */}
                      {isMCQorSCQ && parsedOptions.length > 0 && (
                        <div className="pt-2 pl-11 space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                            Answer Choices & Answer Key:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {parsedOptions.map((opt, oIdx) => (
                              <div
                                key={opt.id || oIdx}
                                className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 ${
                                  opt.is_correct
                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="size-5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-black flex items-center justify-center shrink-0">
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span className="truncate">{opt.text}</span>
                                </div>
                                {opt.is_correct && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                    <Check className="size-3.5" />
                                    <span>Correct</span>
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Render Q&A checklist guideline */}
                      {q.question_type === 'Q&A' && (
                        <div className="pt-2 pl-11">
                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <Sliders className="size-4 text-emerald-500 shrink-0" />
                            <span>
                              Evaluator will grade this task on the live tablet using a standardized continuous scale from <strong>0</strong> to <strong>{q.max_scale_value || 10}</strong> points.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* --- Add / Edit Question Slide-Over / Modal --- */}
      {isQuestionModalOpen && (
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
                    {editingQuestion ? 'Edit Question & Scoring Criteria' : 'Add Question & Scoring Criteria'}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Station #{station?.station_number} • {station?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2 shrink-0">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmitQuestion} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-1">
                {/* Question Text */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Question Prompt / Clinical Task Instructions *
                </label>
                <textarea
                  rows={3}
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="e.g. Which of the following is the first-line medication for acute pulmonary edema with hypertension?"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Question Type & Scale */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Custom Styled Question Type Dropdown */}
                <div className="sm:col-span-2 space-y-1 relative" ref={typeDropdownRef}>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Question Type *
                  </label>
                  <button
                    type="button"
                    onClick={() => setTypeDropdownOpen((prev) => !prev)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border ${
                      typeDropdownOpen
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    } rounded-xl text-xs font-semibold text-slate-900 dark:text-white transition-all text-left`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className={`flex size-6 items-center justify-center rounded-lg ${selectedTypeConfig.iconBg} shrink-0`}>
                        <selectedTypeConfig.icon className="size-3.5" />
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {selectedTypeConfig.title}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {selectedTypeConfig.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${selectedTypeConfig.badgeColor}`}>
                        {selectedTypeConfig.badge}
                      </span>
                      <ChevronDown
                        className={`size-4 text-slate-400 transition-transform duration-200 ${
                          typeDropdownOpen ? 'rotate-180 text-emerald-500' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* Custom Dropdown Menu Popover */}
                  {typeDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl backdrop-blur-md p-2 space-y-1 animate-in fade-in zoom-in-95">
                      {QUESTION_TYPES.map((t) => {
                        const isSelected = formType === t.value
                        const Icon = t.icon
                        return (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => {
                              setFormType(t.value)
                              setTypeDropdownOpen(false)
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
                              isSelected
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 text-left">
                              <span className={`flex size-7 items-center justify-center rounded-lg ${t.iconBg} shrink-0`}>
                                <Icon className="size-4" />
                              </span>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  {t.title}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate">
                                  {t.description}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 pl-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${t.badgeColor}`}>
                                {t.badge}
                              </span>
                              {isSelected && <Check className="size-4 text-emerald-600 dark:text-emerald-400" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Maximum Scale / Points Input */}
                <div className="space-y-1 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title="Points (1 - 100)">
                    {formType === 'Q&A' ? 'Max Scale *' : 'Max Points *'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formMaxScale}
                      onChange={(e) => setFormMaxScale(parseInt(e.target.value) || 10)}
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Conditional Options Builder for MCQ / SCQ */}
              {(formType === 'MCQ' || formType === 'SCQ') && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Answer Choices & Correct Key *
                      </label>
                      <p className="text-[10px] text-slate-400">
                        {formType === 'SCQ'
                          ? 'Select the single correct radio choice'
                          : 'Check all choices that are correct'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
                    >
                      <Plus className="size-3.5" />
                      <span>Add Option</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formOptions.map((opt, idx) => (
                      <div
                        key={opt.id}
                        className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700"
                      >
                        <span className="size-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-black flex items-center justify-center shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>

                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + idx)} text...`}
                          className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        />

                        {/* Correct Selector Checkbox / Radio */}
                        <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs font-semibold select-none">
                          <input
                            type={formType === 'SCQ' ? 'radio' : 'checkbox'}
                            name="correct_choice"
                            checked={opt.is_correct}
                            onChange={() => handleToggleCorrect(opt.id)}
                            className="size-3.5 text-emerald-600 rounded focus:ring-emerald-500"
                          />
                          <span className={opt.is_correct ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}>
                            Correct
                          </span>
                        </label>

                        {formOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(opt.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            aria-label="Remove Choice"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditional Guidelines for Q&A */}
              {formType === 'Q&A' && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sliders className="size-4 text-emerald-500" />
                    <span>Clinical Competency Scale (0 – {formMaxScale} pts)</span>
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    Evaluator professors grade the student live during the examination using an incremental sliding scale.
                  </p>
                </div>
              )}
              </div>

              {/* Modal Submit Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
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
                      <span>Saving Question...</span>
                    </>
                  ) : (
                    <span>{editingQuestion ? 'Save Changes' : 'Save Question'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Delete Question Confirmation Modal --- */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mx-auto">
              <Trash2 className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Question?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to remove this question? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeletingQuestion(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteQuestion}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/25 hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Question</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
