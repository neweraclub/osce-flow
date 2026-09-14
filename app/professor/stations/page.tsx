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
  FileText,
  GraduationCap,
  Hash,
  Key,
  KeyRound,
  Layers,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { useAcademicYear } from '@/context/AcademicYearContext'
import { useToast } from '@/context/ToastContext'
import { getStationSlug } from '@/lib/stationSlug'

export interface StationCardItem {
  id: string
  exam_id?: string | null
  module_id: string
  station_number: number
  title: string
  access_pin: string
  weightage_percentage: number
  module_name: string
  level_id?: string
  level_name: string
  academic_year_id?: string
  academic_year_label?: string
  exam_count: number
  question_count?: number
  status?: string
  status_label?: string
  slug?: string
  created_at?: string
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

export interface AssignedModuleOption {
  id: string
  module_name: string
  level_id: string
  level_name: string
}

export interface ExamSessionItem {
  id: string
  module_id: string
  session_type: 'regular' | 'retake'
  exam_date: string
  station_id?: string | null
  created_at?: string
}

export default function ProfessorStationsPage() {
  const router = useRouter()
  const { showSuccess, showError } = useToast()
  const {
    selectedYearId,
    selectedYear,
    isLoading: isYearLoading,
  } = useAcademicYear()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Core Data
  const [assignedModules, setAssignedModules] = useState<AssignedModuleOption[]>([])
  const [selectedModuleId, setSelectedModuleId] = useState<string>('')
  const [exams, setExams] = useState<ExamSessionItem[]>([])
  const [activeExamId, setActiveExamId] = useState<string | null>(null)
  const [stations, setStations] = useState<StationCardItem[]>([])

  // Search & Filtering within active session
  const [search, setSearch] = useState('')

  // PIN Visibility toggles and copy feedback
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({})
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null)

  // --- Modal States ---
  // 1. Create Exam Session Modal
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false)
  const [sessionType, setSessionType] = useState<'regular' | 'retake'>('regular')
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0])
  const [submittingSession, setSubmittingSession] = useState(false)
  const [sessionError, setSessionError] = useState('')

  // 2. Create Station Modal
  const [isCreateStationOpen, setIsCreateStationOpen] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formStationNumber, setFormStationNumber] = useState<number>(1)
  const [formAccessPin, setFormAccessPin] = useState('')
  const [formShowPin, setFormShowPin] = useState(true)
  const [formWeightage, setFormWeightage] = useState<number>(50)
  const [submittingStation, setSubmittingStation] = useState(false)
  const [stationError, setStationError] = useState('')

  // 3. Edit Station Modal
  const [editingStation, setEditingStation] = useState<StationCardItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStationNumber, setEditStationNumber] = useState<number>(1)
  const [editWeightage, setEditWeightage] = useState<number>(50)
  const [submittingEdit, setSubmittingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  // 4. Delete Confirmations
  const [deletingStation, setDeletingStation] = useState<StationCardItem | null>(null)
  const [deletingExam, setDeletingExam] = useState<ExamSessionItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Global ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateSessionOpen(false)
        setIsCreateStationOpen(false)
        setEditingStation(null)
        setDeletingStation(null)
        setDeletingExam(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fetch all modules, exams, and stations
  const fetchData = async (yearId?: string | null, isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    const targetYearId = yearId || selectedYearId

    try {
      const yearQuery = targetYearId ? `?academic_year_id=${targetYearId}` : ''
      const [modulesRes, examsRes, stationsRes] = await Promise.all([
        fetch(`/api/professor/modules${yearQuery}`),
        fetch(`/api/professor/exams`),
        fetch(`/api/professor/stations${yearQuery}`),
      ])

      const [modulesJson, examsJson, stationsJson] = await Promise.all([
        modulesRes.json(),
        examsRes.json(),
        stationsRes.json(),
      ])

      if (modulesRes.ok && modulesJson.success) {
        const mods: AssignedModuleOption[] = modulesJson.modules || []
        setAssignedModules(mods)
        if (mods.length > 0) {
          setSelectedModuleId((prev) => (prev && mods.some((m) => m.id === prev) ? prev : mods[0].id))
        } else {
          setSelectedModuleId('')
        }
      }

      if (examsRes.ok && examsJson.success) {
        setExams(examsJson.exams || [])
      }

      if (stationsRes.ok && stationsJson.success) {
        setStations(stationsJson.stations || [])
      }
    } catch (err: any) {
      showError(err?.message || 'Error connecting to server.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (selectedYearId) {
      fetchData(selectedYearId)
    } else if (!isYearLoading) {
      fetchData(null)
    }
  }, [selectedYearId, isYearLoading])

  // Active module object
  const activeModule = useMemo(() => {
    return assignedModules.find((m) => m.id === selectedModuleId) || assignedModules[0] || null
  }, [assignedModules, selectedModuleId])

  // Exams for the selected module (max 2: 1 regular, 1 retake)
  const currentModuleExams = useMemo(() => {
    if (!selectedModuleId) return []
    return exams.filter((e) => e.module_id === selectedModuleId)
  }, [exams, selectedModuleId])

  const hasRegularSession = currentModuleExams.some((e) => e.session_type === 'regular')
  const hasRetakeSession = currentModuleExams.some(
    (e) => e.session_type === 'retake' || (e as any).session_type === 'makeup'
  )
  const isMaxSessionsReached = hasRegularSession && hasRetakeSession

  // Automatically sync activeExamId when module or exams change
  useEffect(() => {
    if (currentModuleExams.length === 0) {
      setActiveExamId(null)
      return
    }

    if (!activeExamId || !currentModuleExams.some((e) => e.id === activeExamId)) {
      // Prioritize regular session, else first available
      const reg = currentModuleExams.find((e) => e.session_type === 'regular')
      setActiveExamId(reg ? reg.id : currentModuleExams[0].id)
    }
  }, [currentModuleExams, activeExamId])

  // Currently selected active exam session
  const activeExam = useMemo(() => {
    return currentModuleExams.find((e) => e.id === activeExamId) || null
  }, [currentModuleExams, activeExamId])

  // Stations belonging to the active exam session
  const activeSessionStations = useMemo(() => {
    if (!activeExam) return []
    return stations.filter((s) => s.exam_id === activeExam.id || (!s.exam_id && s.module_id === selectedModuleId))
  }, [stations, activeExam, selectedModuleId])

  // Curriculum Modules Weightage Allocation progress for active session (towards 100%)
  const totalSessionWeightage = useMemo(() => {
    return Math.round(
      activeSessionStations.reduce((sum, s) => sum + Number(s.weightage_percentage || 0), 0) * 100
    ) / 100
  }, [activeSessionStations])

  const availableWeightage = Math.max(0, Math.round((100 - totalSessionWeightage) * 100) / 100)
  const isFullyAllocated = totalSessionWeightage >= 100

  // Filtered stations by search text
  const displayedStations = useMemo(() => {
    if (!search.trim()) return activeSessionStations
    const q = search.toLowerCase().trim()
    return activeSessionStations.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        String(s.station_number).includes(q) ||
        s.access_pin.includes(q)
    )
  }, [activeSessionStations, search])

  // --- PIN Handlers ---
  const togglePinReveal = (e: React.MouseEvent, stationId: string) => {
    e.stopPropagation()
    setRevealedPins((prev) => ({
      ...prev,
      [stationId]: !prev[stationId],
    }))
  }

  const handleCopyPin = (e: React.MouseEvent, stationId: string, pin: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(pin)
    setCopiedPinId(stationId)
    setTimeout(() => setCopiedPinId(null), 2000)
    showSuccess('Station PIN copied to clipboard.')
  }

  const generateRandomPin = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setFormAccessPin(code)
  }

  // --- Modal Openers ---
  const handleOpenCreateSession = () => {
    if (isMaxSessionsReached) return
    // Auto-select whichever session type is missing
    if (!hasRegularSession) {
      setSessionType('regular')
    } else {
      setSessionType('retake')
    }
    setExamDate(new Date().toISOString().split('T')[0])
    setSessionError('')
    setIsCreateSessionOpen(true)
  }

  const handleOpenCreateStation = () => {
    if (!activeExam) {
      showError('Please create or select an exam session first.')
      return
    }
    const nextNum =
      activeSessionStations.length > 0
        ? Math.max(...activeSessionStations.map((s) => s.station_number)) + 1
        : 1
    setFormStationNumber(nextNum)
    setFormTitle(`Station ${nextNum}: Clinical Skills Assessment`)
    setFormAccessPin(Math.floor(100000 + Math.random() * 900000).toString())
    setFormShowPin(true)
    setFormWeightage(Math.min(50, availableWeightage > 0 ? availableWeightage : 50))
    setStationError('')
    setIsCreateStationOpen(true)
  }

  const handleOpenEditStation = (e: React.MouseEvent, st: StationCardItem) => {
    e.stopPropagation()
    setEditingStation(st)
    setEditTitle(st.title)
    setEditStationNumber(st.station_number)
    setEditWeightage(st.weightage_percentage)
    setEditError('')
  }

  // --- Create Exam Session Handler ---
  const handleCreateSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedModuleId) {
      setSessionError('Please select a module.')
      return
    }
    if (!examDate) {
      setSessionError('Please select an exam date.')
      return
    }

    if (sessionType === 'regular' && hasRegularSession) {
      setSessionError('A Regular Session already exists for this module.')
      return
    }
    if (sessionType === 'retake' && hasRetakeSession) {
      setSessionError('A Retake Session already exists for this module.')
      return
    }

    setSubmittingSession(true)
    setSessionError('')

    try {
      const res = await fetch('/api/professor/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: selectedModuleId,
          session_type: sessionType,
          exam_date: examDate,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success && json.exam) {
        showSuccess(`${sessionType === 'regular' ? 'Regular' : 'Retake'} Exam Session created successfully.`)
        setExams((prev) => [...prev, json.exam])
        setActiveExamId(json.exam.id)
        setIsCreateSessionOpen(false)
      } else {
        setSessionError(json.error || 'Failed to create exam session.')
      }
    } catch (err: any) {
      setSessionError(err?.message || 'Error communicating with server.')
    } finally {
      setSubmittingSession(false)
    }
  }

  // --- Create Clinical Station Handler ---
  const handleCreateStationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeExam) {
      setStationError('No active exam session selected.')
      return
    }
    if (!formTitle.trim()) {
      setStationError('Please provide a station title.')
      return
    }
    if (!formAccessPin || formAccessPin.trim().length < 4) {
      setStationError('PIN must be at least 4 characters.')
      return
    }
    if (formWeightage > availableWeightage) {
      setStationError(`Weightage exceeds available capacity (${availableWeightage}% remaining).`)
      return
    }

    setSubmittingStation(true)
    setStationError('')

    try {
      const res = await fetch('/api/professor/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: activeExam.id,
          station_number: formStationNumber,
          title: formTitle.trim(),
          access_pin: formAccessPin.trim(),
          weightage_percentage: formWeightage,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success && json.station) {
        showSuccess(`Station #${formStationNumber} created successfully.`)
        setStations((prev) => [...prev, json.station])
        setIsCreateStationOpen(false)
      } else {
        setStationError(json.error || 'Failed to create station.')
      }
    } catch (err: any) {
      setStationError(err?.message || 'Error communicating with server.')
    } finally {
      setSubmittingStation(false)
    }
  }

  // --- Edit Station Handler ---
  const handleEditStationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStation) return

    const otherWeightage = activeSessionStations
      .filter((s) => s.id !== editingStation.id)
      .reduce((sum, s) => sum + Number(s.weightage_percentage || 0), 0)
    const maxAllowed = Math.max(0, Math.round((100 - otherWeightage) * 100) / 100)

    if (editWeightage > maxAllowed) {
      setEditError(`Weightage cannot exceed ${maxAllowed}% for this session.`)
      return
    }

    setSubmittingEdit(true)
    setEditError('')

    try {
      const res = await fetch(`/api/professor/stations/${editingStation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          station_number: editStationNumber,
          weightage_percentage: editWeightage,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('Station details updated.')
        setStations((prev) =>
          prev.map((s) =>
            s.id === editingStation.id
              ? {
                  ...s,
                  title: editTitle.trim(),
                  station_number: editStationNumber,
                  weightage_percentage: editWeightage,
                }
              : s
          )
        )
        setEditingStation(null)
      } else {
        setEditError(json.error || 'Failed to update station.')
      }
    } catch (err: any) {
      setEditError(err?.message || 'Error communicating with server.')
    } finally {
      setSubmittingEdit(false)
    }
  }

  // --- Delete Handlers ---
  const handleDeleteStation = async () => {
    if (!deletingStation) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/professor/stations/${deletingStation.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('Station removed.')
        setStations((prev) => prev.filter((s) => s.id !== deletingStation.id))
        setDeletingStation(null)
      } else {
        showError(json.error || 'Failed to delete station.')
      }
    } catch {
      showError('Network error deleting station.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteExamSession = async () => {
    if (!deletingExam) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/professor/exams?id=${deletingExam.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('Exam session deleted.')
        setExams((prev) => prev.filter((e) => e.id !== deletingExam.id))
        setStations((prev) => prev.filter((s) => s.exam_id !== deletingExam.id))
        setDeletingExam(null)
      } else {
        showError(json.error || 'Failed to delete exam session.')
      }
    } catch {
      showError('Network error deleting exam session.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Refresh Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
              <Layers className="size-5" />
            </div>
            <span>Clinical Stations Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Exam First workflow: Select a curriculum module, choose a Regular or Retake session, and author clinical stations.
          </p>
        </div>

        <button
          onClick={() => fetchData(null, true)}
          disabled={refreshing || loading}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
          <Loader2 className="size-8 text-emerald-500 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading module sessions and clinical stations...</p>
        </div>
      ) : assignedModules.length === 0 ? (
        /* No Modules Assigned */
        <div className="p-12 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <GraduationCap className="size-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Clinical Modules Assigned</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            You are not currently assigned as a responsible professor for any curriculum module in the active academic year.
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* STEP 1: MODULE SELECTION LEVEL                                             */}
          {/* ========================================================================= */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-emerald-500" />
                <span>Step 1: Select Curriculum Module</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {assignedModules.length} Module{assignedModules.length !== 1 ? 's' : ''} Assigned
              </span>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              {assignedModules.map((mod) => {
                const isSelected = mod.id === selectedModuleId
                const modExamsCount = exams.filter((e) => e.module_id === mod.id).length

                return (
                  <button
                    key={mod.id}
                    onClick={() => {
                      setSelectedModuleId(mod.id)
                      setSearch('')
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white border-transparent shadow-md'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-white/10 text-emerald-400 dark:text-white'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      <BookOpen className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold leading-tight line-clamp-1">{mod.module_name}</h3>
                      <div className="flex items-center gap-2 text-[10px] opacity-80 mt-0.5">
                        <span>{mod.level_name}</span>
                        <span>•</span>
                        <span className="font-mono font-bold">
                          {modExamsCount}/2 Sessions
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* STEP 2: SESSION SELECTION LEVEL (Regular vs Retake)                         */}
          {/* ========================================================================= */}
          <section className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-blue-500" />
                  <span>Step 2: Choose Exam Session ({currentModuleExams.length}/2)</span>
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Each module permits 1 Regular Session and 1 Retake Session per academic cycle.
                </p>
              </div>

              {isMaxSessionsReached ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 self-start sm:self-auto">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <span>All Sessions Created (2/2)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenCreateSession}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 transition-all self-start sm:self-auto active:scale-95"
                >
                  <Plus className="size-4" />
                  <span>+ Create Exam Session</span>
                </button>
              )}
            </div>

            {/* Session Tabs */}
            {currentModuleExams.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div className="size-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                  <Calendar className="size-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  No Exam Sessions Created for &quot;{activeModule?.module_name}&quot;
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  To author clinical stations, schedule your first Regular or Retake exam session.
                </p>
                <button
                  onClick={handleOpenCreateSession}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all"
                >
                  <Plus className="size-4" />
                  <span>Create First Exam Session</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                {currentModuleExams.map((ex) => {
                  const isActive = ex.id === activeExamId
                  const isRetake = ex.session_type === 'retake' || (ex as any).session_type === 'makeup'
                  const sessionStationsCount = stations.filter((s) => s.exam_id === ex.id).length
                  const formattedDate = new Date(ex.exam_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })

                  return (
                    <div
                      key={ex.id}
                      onClick={() => setActiveExamId(ex.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 min-w-[240px] flex-1 sm:flex-initial ${
                        isActive
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 text-slate-900 dark:text-white ring-2 ring-emerald-500/20 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isRetake
                              ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400'
                              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          <Calendar className="size-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold capitalize">
                              {isRetake ? 'Retake Session' : 'Regular Session'}
                            </span>
                            {isActive && (
                              <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {formattedDate} • {sessionStationsCount} station{sessionStationsCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingExam(ex)
                        }}
                        title="Delete Session"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* STEP 3: STATIONS MANAGEMENT LEVEL (For the active session)                 */}
          {/* ========================================================================= */}
          {activeExam && (
            <section className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ClipboardCheck className="size-3.5 text-emerald-500" />
                  <span>Step 3: Stations for {activeExam.session_type === 'retake' ? 'Retake' : 'Regular'} Session</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {activeSessionStations.length} Station{activeSessionStations.length !== 1 ? 's' : ''} Configured
                </span>
              </div>

              {/* Curriculum Modules Weightage Allocation Progress Bar Card towards 100% */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden">
                {/* Subtle decorative gradient accent */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0 ring-1 ring-emerald-200/60 dark:ring-emerald-800/60 shadow-sm">
                      <Layers className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Curriculum Modules Weightage Allocation
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Total station weightages for this {activeExam.session_type === 'retake' ? 'Retake' : 'Regular'} session must equal 100.00%.
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border self-start sm:self-auto transition-colors ${
                      isFullyAllocated
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {isFullyAllocated ? (
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="size-3.5 text-amber-500" />
                    )}
                    <span>
                      {totalSessionWeightage}% / 100%{' '}
                      {isFullyAllocated ? '— Fully Allocated ✓' : `— ${availableWeightage}% Remaining`}
                    </span>
                  </span>
                </div>

                {/* Animated Progress Bar with percentage labels */}
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out relative ${
                        isFullyAllocated
                          ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 shadow-emerald-500/25'
                          : 'bg-gradient-to-r from-amber-500 via-orange-400 to-orange-500 shadow-amber-500/25'
                      } shadow-sm`}
                      style={{ width: `${Math.min(100, totalSessionWeightage)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/10 rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>{activeSessionStations.length} Station{activeSessionStations.length !== 1 ? 's' : ''} Configured</span>
                    <span className="font-mono">{totalSessionWeightage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Station Actions Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search stations by number, title, or PIN..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateStation}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>+ Create Clinical Station</span>
                </button>
              </div>

              {/* Stations Grid */}
              {displayedStations.length === 0 ? (
                <div className="p-10 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <ClipboardCheck className="size-8 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    No Clinical Stations Added Yet
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Click &quot;+ Create Clinical Station&quot; above to add Station #1 to this{' '}
                    {activeExam.session_type === 'retake' ? 'Retake' : 'Regular'} exam session.
                  </p>
                  <button
                    onClick={handleOpenCreateStation}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all"
                  >
                    <Plus className="size-4" />
                    <span>Create Station #1</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedStations.map((st) => {
                    const isPinRevealed = !!revealedPins[st.id]
                    const isCopied = copiedPinId === st.id
                    const stationSlug =
                      st.slug ||
                      getStationSlug({
                        station_number: st.station_number,
                        module_name: activeModule?.module_name || st.module_name,
                        id: st.id,
                      })

                    return (
                      <div
                        key={st.id}
                        onClick={() => router.push(`/professor/stations/${st.id}`)}
                        className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all cursor-pointer group"
                      >
                        <div className="space-y-3">
                          {/* Station Header Pill & Weightage */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-sm shadow-emerald-500/20">
                              <ClipboardCheck className="size-3" />
                              Station #{st.station_number}
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 tabular-nums">
                              {st.weightage_percentage}% Weightage
                            </span>
                          </div>

                          {/* Station Title */}
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {st.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                              <p className="text-xs text-slate-400">
                                {activeModule?.module_name} • {activeModule?.level_name}
                              </p>
                              {typeof st.question_count === 'number' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-200/60 dark:border-blue-800">
                                  {st.question_count} Q{st.question_count !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Live Scoring PIN Card */}
                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Key className="size-4 text-amber-500 shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                                  Tablet Scoring PIN
                                </span>
                                <span className="font-mono text-xs font-black text-slate-900 dark:text-white tracking-widest">
                                  {isPinRevealed ? st.access_pin : '••••••'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => togglePinReveal(e, st.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                aria-label="Toggle PIN Visibility"
                              >
                                {isPinRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleCopyPin(e, st.id, st.access_pin)}
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
                        </div>

                        {/* Card Footer: Action Buttons */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-0.5 text-slate-400">
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditStation(e, st)}
                              className="p-1.5 rounded-lg hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer"
                              title="Edit Station Details"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard.writeText(st.access_pin)
                                showSuccess('PIN copied!')
                              }}
                              className="p-1.5 rounded-lg hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all cursor-pointer"
                              title="Quick Copy PIN"
                            >
                              <Key className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeletingStation(st)
                              }}
                              className="p-1.5 rounded-lg hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                              title="Delete Station"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>

                          <Link
                            href={`/professor/stations/${st.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 group-hover:translate-x-1 transition-all duration-200"
                          >
                            <span>Open Checklist</span>
                            <ArrowRight className="size-3.5" />
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE EXAM SESSION MODAL (Max 2: Regular vs Retake)             */}
      {/* ========================================================================= */}
      {isCreateSessionOpen && (
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
                    Module: {activeModule?.module_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateSessionOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {sessionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{sessionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSessionSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Session Type *
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    1 Regular + 1 Retake max
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
                    disabled={hasRetakeSession}
                    onClick={() => setSessionType('retake')}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-xs font-bold transition-all relative ${
                      hasRetakeSession
                        ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                        : sessionType === 'retake'
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Layers className={`size-4 ${hasRetakeSession ? 'text-slate-400' : 'text-purple-500'}`} />
                      <span>Retake Session</span>
                    </div>
                    {hasRetakeSession && (
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

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateSessionOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSession}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {submittingSession ? (
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

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE CLINICAL STATION MODAL (Premium Redesign)                  */}
      {/* ========================================================================= */}
      {isCreateStationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 overflow-hidden">
            {/* Decorative top gradient bar */}
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                    <ClipboardCheck className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Create Clinical Station
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                        {activeModule?.module_name}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        activeExam?.session_type === 'retake'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200/60 dark:border-purple-800'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-800'
                      }`}>
                        {activeExam?.session_type === 'retake' ? 'Retake Session' : 'Regular Session'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateStationOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <X className="size-5" />
                </button>
              </div>

              {stationError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{stationError}</span>
                </div>
              )}

              <form onSubmit={handleCreateStationSubmit} className="space-y-4">
                {/* Station # & Weightage Row */}
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Hash className="size-3 text-slate-400" />
                      Station Number *
                    </label>
                    <div className="relative">
                      <Hash className="size-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        min={1}
                        value={formStationNumber}
                        onChange={(e) => setFormStationNumber(Number(e.target.value) || 1)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-span-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Percent className="size-3 text-slate-400" />
                        Weightage *
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormWeightage(availableWeightage)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer transition-colors border border-transparent hover:border-emerald-200/60"
                        title="Click to auto-fill remaining weightage"
                      >
                        Avail: {availableWeightage}%
                      </button>
                    </div>
                    <div className="relative">
                      <Percent className="size-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        step="0.01"
                        min={0.01}
                        max={100}
                        value={formWeightage}
                        onChange={(e) => setFormWeightage(Number(e.target.value) || 0)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Station Title */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <FileText className="size-3 text-slate-400" />
                    Station Title *
                  </label>
                  <div className="relative">
                    <FileText className="size-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Station 1: Cardiovascular OSCE"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Live Scoring Access PIN */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <KeyRound className="size-3 text-slate-400" />
                      Live Scoring Tablet PIN *
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPin}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                    >
                      <Sparkles className="size-3" />
                      <span>Generate Random</span>
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="size-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={formShowPin ? 'text' : 'password'}
                      value={formAccessPin}
                      onChange={(e) => setFormAccessPin(e.target.value)}
                      placeholder="e.g. 748291"
                      className="w-full pl-9 pr-10 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold tracking-wider focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setFormShowPin(!formShowPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {formShowPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Live Station Preview Card */}
                {formTitle.trim() && (
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preview</span>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-black shadow-sm shrink-0">
                          <ClipboardCheck className="size-2.5" />
                          #{formStationNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                          {formTitle.trim()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 tabular-nums">
                          {formWeightage}%
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          PIN: {formShowPin ? (formAccessPin || '—') : '••••••'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateStationOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingStation}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    {submittingStation ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="size-4" />
                        <span>Create Station</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT STATION MODAL                                               */}
      {/* ========================================================================= */}
      {editingStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                  <Edit2 className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit Station Details
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {activeModule?.module_name}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                      Station #{editingStation.station_number}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEditingStation(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditStationSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Station # *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editStationNumber}
                    onChange={(e) => setEditStationNumber(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                    required
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Weightage % *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0.01}
                    max={100}
                    value={editWeightage}
                    onChange={(e) => setEditWeightage(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Station Title *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStation(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {submittingEdit ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE CONFIRMATION MODALS                                       */}
      {/* ========================================================================= */}
      {deletingStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mx-auto">
              <Trash2 className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Station?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">{deletingStation.title}</strong>? All authoring and scoring data for this station will be removed.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeletingStation(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStation}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/25 hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mx-auto">
              <Trash2 className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Exam Session?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete this{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {deletingExam.session_type === 'retake' ? 'Retake' : 'Regular'} Session
                </strong>
                ? All associated clinical stations will also be removed.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeletingExam(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExamSession}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/25 hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
