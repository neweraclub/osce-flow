'use client'

import React, { useState, useEffect, useRef, use, useMemo } from 'react'
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
  CheckSquare,
  ChevronDown,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  Hash,
  HelpCircle,
  Key,
  Layers,
  ListPlus,
  Loader2,
  Percent,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
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
  exam_id?: string
  module_id: string
  station_number: number
  title: string
  access_pin: string
  weightage_percentage: number
  module_name: string
  level_name: string
  session_type?: string
  exam_date?: string
  created_at?: string
}

export interface QuestionOptionItem {
  id: string
  text: string
  is_correct: boolean
}

export interface QuestionRecord {
  id: string
  station_id: string
  question_text: string
  question_type: 'MCQ' | 'SCQ' | 'Q&A'
  max_scale_value: number
  options: QuestionOptionItem[]
  created_at?: string
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

export default function ProfessorStationDetailPage({
  params,
}: {
  params: Promise<{ stationId: string }>
}) {
  const router = useRouter()
  const { stationId } = use(params)
  const { showSuccess, showError } = useToast()

  const [station, setStation] = useState<StationDetail | null>(null)
  const [questions, setQuestions] = useState<QuestionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Status bar computations
  const totalScalePoints = useMemo(
    () => questions.reduce((sum, q) => sum + (q.max_scale_value || 10), 0),
    [questions]
  )
  const mcqCount = useMemo(() => questions.filter((q) => q.question_type === 'MCQ').length, [questions])
  const scqCount = useMemo(() => questions.filter((q) => q.question_type === 'SCQ').length, [questions])
  const qaCount = useMemo(() => questions.filter((q) => q.question_type === 'Q&A').length, [questions])

  // PIN Visibility & copy feedback
  const [pinRevealed, setPinRevealed] = useState(false)
  const [pinCopied, setPinCopied] = useState(false)

  // Edit Station Details Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [assignedModules, setAssignedModules] = useState<AssignedModuleOption[]>([])
  const [moduleWeightageMap, setModuleWeightageMap] = useState<Record<string, number>>({})

  // Add / Edit Question Modal State
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuestionRecord | null>(null)
  const [deletingQuestion, setDeletingQuestion] = useState<QuestionRecord | null>(null)
  const [exitingQuestionIds, setExitingQuestionIds] = useState<Set<string>>(new Set())

  // Question Form Fields
  const [formText, setFormText] = useState('')
  const [formType, setFormType] = useState<'MCQ' | 'SCQ' | 'Q&A'>('MCQ')
  const selectedTypeConfig = QUESTION_TYPES.find((t) => t.value === formType) || QUESTION_TYPES[0]
  const [formMaxScale, setFormMaxScale] = useState<number>(10)
  const [formOptions, setFormOptions] = useState<QuestionOptionItem[]>([
    { id: 'opt_1', text: '', is_correct: true },
    { id: 'opt_2', text: '', is_correct: false },
    { id: 'opt_3', text: '', is_correct: false },
  ])
  const [submittingQuestion, setSubmittingQuestion] = useState(false)
  const [questionFormError, setQuestionFormError] = useState('')

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
        setIsEditModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [typeDropdownOpen])

  const fetchStationData = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch(`/api/professor/stations/${stationId}`)
      const json = await res.json()

      if (res.ok && json.success) {
        setStation(json.station || null)
        if (json.questions) {
          setQuestions(json.questions)
        } else if (json.station?.id) {
          // Fallback: fetch questions by station_id
          fetch(`/api/professor/questions?station_id=${json.station.id}`)
            .then((qRes) => qRes.json())
            .then((qJson) => {
              if (qJson.success && qJson.questions) {
                setQuestions(qJson.questions)
              }
            })
            .catch(() => {})
        }

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

        // Wrap URL to clean human-readable slug if accessed via raw UUID
        const targetSlug = json.station?.slug || json.slug
        if (targetSlug && typeof window !== 'undefined' && UUID_REGEX.test(stationId)) {
          window.history.replaceState(null, '', `/professor/stations/${targetSlug}`)
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
        if (result.station.slug && typeof window !== 'undefined') {
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

  const handleCopyPin = () => {
    if (!station?.access_pin) return
    navigator.clipboard.writeText(station.access_pin)
    setPinCopied(true)
    setTimeout(() => setPinCopied(false), 2000)
    showSuccess('Station PIN copied to clipboard.')
  }

  // --- Question Modal Openers ---
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
    setQuestionFormError('')
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
    setQuestionFormError('')
    setTypeDropdownOpen(false)
    setIsQuestionModalOpen(true)
  }

  // --- Question Form Options Handlers ---
  const handleAddOption = () => {
    const nextIdx = formOptions.length + 1
    setFormOptions((prev) => [
      ...prev,
      { id: `opt_${Date.now()}_${nextIdx}`, text: '', is_correct: false },
    ])
  }

  const handleRemoveOption = (id: string) => {
    if (formOptions.length <= 2) {
      setQuestionFormError('Multiple and single choice questions require at least 2 options.')
      return
    }
    setFormOptions((prev) => prev.filter((opt) => opt.id !== id))
  }

  const handleOptionTextChange = (id: string, text: string) => {
    setFormOptions((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, text } : opt))
    )
  }

  const handleToggleOptionCorrect = (id: string) => {
    if (formType === 'SCQ') {
      // Single choice: only one can be correct
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
    if (!station) return

    if (!formText.trim()) {
      setQuestionFormError('Please enter the question prompt or task instructions.')
      return
    }

    // Validate options if MCQ/SCQ
    if (formType === 'MCQ' || formType === 'SCQ') {
      const emptyOptions = formOptions.some((opt) => !opt.text.trim())
      if (emptyOptions) {
        setQuestionFormError('All choice options must have text filled in.')
        return
      }

      const hasCorrect = formOptions.some((opt) => opt.is_correct)
      if (!hasCorrect) {
        setQuestionFormError('Please check at least one choice as the correct answer.')
        return
      }
    }

    setSubmittingQuestion(true)
    setQuestionFormError('')

    const payload = {
      station_id: station.id,
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
          fetchStationData(true)
        } else {
          setQuestionFormError(json.error || 'Failed to update question.')
        }
      } else {
        const res = await fetch('/api/professor/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()

        if (res.ok && json.success) {
          showSuccess('Question added to station checklist.')
          setIsQuestionModalOpen(false)
          fetchStationData(true)
        } else {
          setQuestionFormError(json.error || 'Failed to add question.')
        }
      }
    } catch {
      setQuestionFormError('Network error communicating with server.')
    } finally {
      setSubmittingQuestion(false)
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
      {/* Breadcrumb Navigation & Top Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 flex-wrap">
          <Link
            href="/professor/stations"
            className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Stations
          </Link>
          <ChevronRight className="size-3.5 text-slate-400" />
          <span className="text-slate-900 dark:text-white font-extrabold truncate max-w-[240px]">
            {station ? `Station #${station.station_number} • ${station.title}` : 'Station Details'}
          </span>
          <ChevronRight className="size-3.5 text-slate-400" />
          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
            Checklist Question Builder
          </span>
        </div>

        <div className="flex items-center gap-2">
          {station && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-xs cursor-pointer"
            >
              <Edit2 className="size-3.5 text-emerald-600" />
              <span>Edit Details</span>
            </button>
          )}

          <button
            onClick={() => fetchStationData(true)}
            disabled={refreshing || loading}
            aria-label="Refresh station data"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
          <Loader2 className="size-8 text-emerald-500 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading station checklist...</p>
        </div>
      ) : !station ? (
        <div className="p-12 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <AlertCircle className="size-8 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Station Not Found</h3>
          <p className="text-xs text-slate-400">The requested clinical station could not be resolved.</p>
          <Link
            href="/professor/stations"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Stations</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Header Banner: Station Details & Metadata */}
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-800 text-white shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-xs">
                    <ClipboardCheck className="size-3.5" />
                    Station #{station.station_number}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tabular-nums">
                    {station.weightage_percentage}% Weightage
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {station.module_name} • {station.level_name}
                  </span>
                  {station.session_type && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        station.session_type === 'retake'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                      }`}
                    >
                      {station.session_type === 'retake' ? 'Retake Session' : 'Regular Session'}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                  {station.title}
                </h1>

                {station.exam_date && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Calendar className="size-4 text-emerald-400 shrink-0" />
                    <span>
                      Exam Date:{' '}
                      <strong className="text-white">
                        {new Date(station.exam_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Tablet Access PIN Pill */}
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-between gap-4 min-w-[220px]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                    <Key className="size-4.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                      Tablet Scoring PIN
                    </span>
                    <span className="font-mono text-sm font-black text-white tracking-widest">
                      {pinRevealed ? station.access_pin : '••••••'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPinRevealed(!pinRevealed)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Toggle PIN Visibility"
                  >
                    {pinRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                  <button
                    onClick={handleCopyPin}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-400 hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Copy Access PIN"
                  >
                    {pinCopied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Station Scoring Setup Status Bar / Progress Indicator */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="size-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
                <Sliders className="size-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Station Questions & Scoring Status
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      questions.length > 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {questions.length > 0 ? (
                      <>
                        <CheckCircle2 className="size-3 text-emerald-500" />
                        <span>{questions.length} Items Configured</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="size-3 text-amber-500" />
                        <span>0 Items Configured</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Total Max Scale: <strong className="text-slate-700 dark:text-slate-200">{totalScalePoints} pts</strong> • {mcqCount} MCQ • {scqCount} SCQ • {qaCount} Q&A
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <ClipboardCheck className="size-3.5 text-emerald-500" />
                <span>{questions.length > 0 ? 'Ready for Tablet Scoring' : 'Needs Questions'}</span>
              </div>
            </div>
          </div>

          {/* Section 1: Questions & Scoring Checklist (public.questions where station_id = stationId) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="size-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Station Questions & Checklist ({questions.length})</span>
                </h2>
                <p className="text-xs font-medium text-slate-400">
                  MCQ, Single Choice (SCQ), and Clinical Q&A scoring items evaluated during live OSCE examinations
                </p>
              </div>

              <button
                onClick={handleOpenAddQuestion}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Add Question</span>
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
                  Click "Add Question" to build your multiple choice questions, single choice questions, or clinical scale grading checklist for this station.
                </p>
                <button
                  onClick={handleOpenAddQuestion}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all cursor-pointer"
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

                          <div className="space-y-1.5 min-w-0">
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
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            aria-label="Edit Question"
                            title="Edit Question"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            onClick={() => setDeletingQuestion(q)}
                            className="p-2 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            aria-label="Delete Question"
                            title="Delete Question"
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
                        <div className="pt-1 pl-11">
                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                            <span className="font-medium">
                              Evaluator will score performance on a continuous 0 to {q.max_scale_value || 10} point scale based on clinical execution.
                            </span>
                            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                              [0 – {q.max_scale_value || 10} pts]
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

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT QUESTION & CHECKLIST BUILDER MODAL                    */}
      {/* ========================================================================= */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[85vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                  <ListPlus className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingQuestion ? 'Edit Question & Scoring Criteria' : 'Add Question & Scoring Criteria'}
                  </h3>
                  <p className="text-xs font-medium text-slate-400">
                    Station #{station?.station_number} • {station?.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuestionModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmitQuestion} noValidate className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar min-h-0">
                {questionFormError && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2.5">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>{questionFormError}</span>
                  </div>
                )}

                {/* Question Text */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Question Prompt / Clinical Task Instructions *
                  </label>
                  <textarea
                    rows={3}
                    value={formText}
                    onChange={(e) => setFormText(e.target.value)}
                    placeholder="e.g. Which of the following is the first-line medication for acute pulmonary edema with hypertension?"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                  />
                </div>

                {/* Question Type & Scale - Side by Side */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Custom Styled Question Type Dropdown */}
                  <div className="sm:col-span-2 space-y-1.5 relative" ref={typeDropdownRef}>
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
                      } rounded-2xl text-xs font-semibold text-slate-900 dark:text-white transition-all text-left`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className={`flex size-7 items-center justify-center rounded-xl ${selectedTypeConfig.iconBg} shrink-0`}>
                          <selectedTypeConfig.icon className="size-4" />
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
                  <div className="space-y-1.5 sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                      {formType === 'Q&A' ? 'Max Scale *' : 'Max Points *'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={formMaxScale}
                        onChange={(e) => setFormMaxScale(parseInt(e.target.value) || 10)}
                        className="w-full pl-3.5 pr-11 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        PTS
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conditional Options Builder for MCQ / SCQ */}
                {(formType === 'MCQ' || formType === 'SCQ') && (
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
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
                        className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        <span>Add Option</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {formOptions.map((opt, idx) => (
                        <div
                          key={opt.id}
                          className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 transition-all hover:border-slate-300 dark:hover:border-slate-600"
                        >
                          <span className="size-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                            {String.fromCharCode(65 + idx)}
                          </span>

                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + idx)} text...`}
                            className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />

                          {/* Correct Selector Checkbox / Radio */}
                          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs font-semibold select-none transition-colors">
                            <input
                              type={formType === 'SCQ' ? 'radio' : 'checkbox'}
                              name="correct_choice"
                              checked={opt.is_correct}
                              onChange={() => handleToggleOptionCorrect(opt.id)}
                              className="size-4 text-emerald-600 rounded focus:ring-emerald-500 accent-emerald-600"
                            />
                            <span className={opt.is_correct ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}>
                              Correct
                            </span>
                          </label>

                          {formOptions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(opt.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                              aria-label="Remove Choice"
                            >
                              <Trash2 className="size-4" />
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

              {/* Fixed Modal Submit Footer */}
              <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQuestion}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
                >
                  {submittingQuestion ? (
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

      {/* ========================================================================= */}
      {/* MODAL 2: DELETE QUESTION CONFIRMATION MODAL                               */}
      {/* ========================================================================= */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mx-auto">
              <Trash2 className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Station Question?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to remove this question? This checklist item will no longer appear during candidate examinations.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeletingQuestion(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteQuestion}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/25 hover:bg-rose-700 transition-all cursor-pointer"
              >
                <span>Yes, Delete Question</span>
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* MODAL 4: EDIT STATION DETAILS MODAL                                       */}
      {/* ========================================================================= */}
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
