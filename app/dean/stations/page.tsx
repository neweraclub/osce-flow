'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  AlertTriangle,
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
  Filter,
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
  Sliders,
  Sparkles,
  Stethoscope,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectOption } from '@/components/ui/Select'
import { useAcademicYear } from '@/context/AcademicYearContext'
import { useToast } from '@/context/ToastContext'
import { getModuleIcon } from '@/utils/getModuleIcon'

export interface StationItem {
  id: string
  exam_id: string
  module_id?: string
  module_name?: string
  station_number: number
  title: string
  access_pin: string
  weightage_percentage: number
  question_count?: number
  invigilator_prof_id?: string | null
  invigilator_prof_name?: string
  invigilator_professor?: {
    id: string
    first_name: string
    last_name: string
    full_name: string
    email?: string
  } | null
  created_at?: string
  linked_exam?: {
    id: string
    module_name: string
    level_name: string
    session_type: string
    exam_date: string
    display_label: string
  } | null
}

export interface ModuleItem {
  id: string
  module_name: string
  level_id: string
  level_name: string
  responsible_prof_id?: string | null
  responsible_prof_name?: string
  responsible_professor?: {
    id: string
    first_name: string
    last_name: string
    full_name: string
    email?: string
  } | null
  station_count?: number
}

export interface ExamSessionItem {
  id: string
  module_id: string
  module_name?: string
  level_name?: string
  session_type: 'regular' | 'retake' | string
  exam_date: string
  display_label?: string
}

export interface ProfessorOption {
  id: string
  user_id: string
  first_name: string
  last_name: string
  full_name: string
  email?: string
}

export interface StudyLevelItem {
  id: string
  level_name: string
  academic_year_id: string
}

function DeanStationsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showSuccess, showError } = useToast()
  const {
    selectedYearId,
    selectedYear,
    isLoading: isYearLoading,
  } = useAcademicYear()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Core Data
  const [modules, setModules] = useState<ModuleItem[]>([])
  const [studyLevels, setStudyLevels] = useState<StudyLevelItem[]>([])
  const [selectedLevelId, setSelectedLevelId] = useState<string>('ALL')
  const [selectedModuleId, setSelectedModuleId] = useState<string>('')
  const [exams, setExams] = useState<ExamSessionItem[]>([])
  const [activeExamId, setActiveExamId] = useState<string | null>(null)
  const [stations, setStations] = useState<StationItem[]>([])
  const [professors, setProfessors] = useState<ProfessorOption[]>([])

  // Search & Filtering within active session
  const [search, setSearch] = useState('')

  // PIN Visibility toggles, copy feedback, and publish status
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({})
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null)
  const [publishedMap, setPublishedMap] = useState<Record<string, boolean>>({})

  const handleTogglePublish = (e: React.MouseEvent, stationId: string) => {
    e.stopPropagation()
    setPublishedMap((prev) => {
      const current = prev[stationId] ?? true
      const next = !current
      showSuccess(`Station status updated to ${next ? 'Published' : 'Draft'}.`)
      return { ...prev, [stationId]: next }
    })
  }

  // --- Modals ---
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
  const [formInvigilatorProfId, setFormInvigilatorProfId] = useState<string>('')
  const [submittingStation, setSubmittingStation] = useState(false)
  const [stationError, setStationError] = useState('')

  // 3. Edit Station Modal
  const [editingStation, setEditingStation] = useState<StationItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStationNumber, setEditStationNumber] = useState<number>(1)
  const [editAccessPin, setEditAccessPin] = useState('')
  const [editShowPin, setEditShowPin] = useState(true)
  const [editWeightage, setEditWeightage] = useState<number>(50)
  const [editInvigilatorProfId, setEditInvigilatorProfId] = useState<string>('')
  const [submittingEdit, setSubmittingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  // 4. Delete Confirmations
  const [deletingStation, setDeletingStation] = useState<StationItem | null>(null)
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

  // Read URL query params on initial load
  useEffect(() => {
    const queryModuleId = searchParams.get('module_id')
    const queryExamId = searchParams.get('exam_id')

    if (queryModuleId) {
      setSelectedModuleId(queryModuleId)
    }
    if (queryExamId) {
      setActiveExamId(queryExamId)
    }
  }, [searchParams])

  // Fetch all modules, exams, stations, and professors
  const fetchData = async (yearId?: string | null, isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    const targetYearId = yearId || selectedYearId

    try {
      const yearQuery = targetYearId ? `?academic_year_id=${targetYearId}` : ''
      const [stationsRes, modulesRes] = await Promise.all([
        fetch(`/api/dean/stations${yearQuery}`),
        fetch(`/api/dean/modules${yearQuery}`),
      ])

      const [stationsJson, modulesJson] = await Promise.all([
        stationsRes.json(),
        modulesRes.json(),
      ])

      if (modulesRes.ok && modulesJson.success) {
        setStudyLevels(modulesJson.studyLevels || [])
      }

      if (stationsRes.ok && stationsJson.success) {
        const fetchedModules: ModuleItem[] = stationsJson.modules || []
        setModules(fetchedModules)
        setExams(stationsJson.exams || [])
        setStations(stationsJson.stations || [])
        setProfessors(stationsJson.professors || [])

        // If no module currently selected or selected module is not in new list, pick the first
        setSelectedModuleId((prev) => {
          if (prev && fetchedModules.some((m) => m.id === prev)) return prev
          return fetchedModules.length > 0 ? fetchedModules[0].id : ''
        })
      } else {
        showError(stationsJson.error || 'Failed to fetch clinical stations.')
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

  // Filter modules by study level if multiple levels exist
  const filteredModules = useMemo(() => {
    if (selectedLevelId === 'ALL') return modules
    return modules.filter((m) => m.level_id === selectedLevelId)
  }, [modules, selectedLevelId])

  // Active module object
  const activeModule = useMemo(() => {
    return modules.find((m) => m.id === selectedModuleId) || modules[0] || null
  }, [modules, selectedModuleId])

  // Exams for the selected module (max 2: 1 regular, 1 retake)
  const currentModuleExams = useMemo(() => {
    if (!selectedModuleId) return []
    return exams.filter((e) => e.module_id === selectedModuleId)
  }, [exams, selectedModuleId])

  const hasRegularSession = currentModuleExams.some(
    (e) => String(e.session_type || '').toLowerCase() === 'regular'
  )
  const hasRetakeSession = currentModuleExams.some((e) => {
    const t = String(e.session_type || '').toLowerCase()
    return t === 'retake' || t === 'makeup'
  })
  const isMaxSessionsReached = hasRegularSession && hasRetakeSession

  // Automatically sync activeExamId when module or exams change
  useEffect(() => {
    if (currentModuleExams.length === 0) {
      setActiveExamId(null)
      return
    }

    if (!activeExamId || !currentModuleExams.some((e) => e.id === activeExamId)) {
      // Prioritize regular session, else first available
      const reg = currentModuleExams.find(
        (e) => String(e.session_type || '').toLowerCase() === 'regular'
      )
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
    return stations.filter(
      (s) => s.exam_id === activeExam.id || (!s.exam_id && s.module_id === selectedModuleId)
    )
  }, [stations, activeExam, selectedModuleId])

  // Curriculum Modules Weightage Allocation progress for active session (towards 100%)
  const totalSessionWeightage = useMemo(() => {
    return (
      Math.round(
        activeSessionStations.reduce(
          (sum, s) => sum + Number(s.weightage_percentage || 0),
          0
        ) * 100
      ) / 100
    )
  }, [activeSessionStations])

  const availableWeightage = Math.max(
    0,
    Math.round((100 - totalSessionWeightage) * 100) / 100
  )
  const isFullyAllocated = totalSessionWeightage >= 100

  // Filtered stations by search text
  const displayedStations = useMemo(() => {
    if (!search.trim()) return activeSessionStations
    const q = search.toLowerCase().trim()
    return activeSessionStations.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        String(s.station_number).includes(q) ||
        s.access_pin.includes(q) ||
        (s.invigilator_prof_name && s.invigilator_prof_name.toLowerCase().includes(q))
    )
  }, [activeSessionStations, search])

  // Professor select options for dropdowns
  const professorSelectOptions: SelectOption[] = useMemo(() => {
    const list = professors.map((p) => ({
      value: p.id,
      label: p.full_name,
      description: p.email,
    }))
    return [{ value: '', label: 'Unassigned (Select later)' }, ...list]
  }, [professors])

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

  const generateRandomEditPin = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setEditAccessPin(code)
  }

  // --- Modal Openers ---
  const handleOpenCreateSession = () => {
    if (isMaxSessionsReached) return
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
    setFormInvigilatorProfId('')
    setStationError('')
    setIsCreateStationOpen(true)
  }

  const handleOpenEditStation = (e: React.MouseEvent, st: StationItem) => {
    e.stopPropagation()
    setEditingStation(st)
    setEditTitle(st.title)
    setEditStationNumber(st.station_number)
    setEditAccessPin(st.access_pin)
    setEditShowPin(true)
    setEditWeightage(st.weightage_percentage || 50)
    setEditInvigilatorProfId(st.invigilator_prof_id || '')
    setEditError('')
  }

  // --- Create Exam Session Handler ---
  const handleCreateSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedModuleId) {
      setSessionError('Please select a curriculum module.')
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
      const res = await fetch('/api/dean/exams', {
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
        showSuccess(
          `${sessionType === 'regular' ? 'Regular' : 'Retake'} Exam Session created successfully.`
        )
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
      const res = await fetch('/api/dean/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: activeExam.id,
          station_number: formStationNumber,
          title: formTitle.trim(),
          access_pin: formAccessPin.trim(),
          weightage_percentage: formWeightage,
          invigilator_prof_id: formInvigilatorProfId || null,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess(`Station #${formStationNumber} created successfully.`)
        setIsCreateStationOpen(false)
        await fetchData(selectedYearId, false)
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
      const res = await fetch('/api/dean/stations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStation.id,
          title: editTitle.trim(),
          station_number: editStationNumber,
          access_pin: editAccessPin.trim(),
          weightage_percentage: editWeightage,
          invigilator_prof_id: editInvigilatorProfId || null,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('Station details updated.')
        setEditingStation(null)
        await fetchData(selectedYearId, false)
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
      const res = await fetch(`/api/dean/stations?id=${deletingStation.id}`, {
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
      const res = await fetch(`/api/dean/exams?id=${deletingExam.id}`, {
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
          onClick={() => fetchData(selectedYearId, true)}
          disabled={refreshing || loading}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs disabled:opacity-50 self-start sm:self-auto cursor-pointer"
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
      ) : modules.length === 0 ? (
        /* No Modules in Academic Year */
        <div className="p-12 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <GraduationCap className="size-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Clinical Modules Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No curriculum modules are configured for the active academic year. Create study levels and modules in the curriculum section.
          </p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* STEP 1: MODULE SELECTION LEVEL (Segmented control pill bar)               */}
          {/* ========================================================================= */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-emerald-500/70 flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-emerald-500" />
                <span>Step 1: Select Curriculum Module</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                {filteredModules.length} Module{filteredModules.length !== 1 ? 's' : ''} Available
              </span>
            </div>

            {/* Optional Study Level Filter Chips if multiple levels exist */}
            {studyLevels.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedLevelId('ALL')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedLevelId === 'ALL'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All Levels ({modules.length})
                </button>
                {studyLevels.map((lvl) => {
                  const count = modules.filter((m) => m.level_id === lvl.id).length
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setSelectedLevelId(lvl.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        selectedLevelId === lvl.id
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {lvl.level_name} ({count})
                    </button>
                  )
                })}
              </div>
            )}

            {/* Scrollable horizontal segmented control pill bar */}
            <div className="flex items-center gap-2 overflow-x-auto p-1.5 rounded-2xl bg-slate-100/80 dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/15 scrollbar-none">
              {filteredModules.map((mod) => {
                const isSelected = mod.id === selectedModuleId
                const modStationsCount = stations.filter((s) => s.module_id === mod.id).length
                const moduleVisual = getModuleIcon(mod.module_name)
                const FallbackIcon = moduleVisual.fallbackIcon

                return (
                  <button
                    key={mod.id}
                    onClick={() => {
                      setSelectedModuleId(mod.id)
                      setSearch('')
                    }}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-left transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-800 text-white dark:bg-[#0E281F] dark:text-emerald-100 border border-emerald-600/50 shadow-sm ring-1 ring-emerald-500/30 font-bold'
                        : 'bg-white/60 dark:bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-[#12221C] border border-transparent font-medium'
                    }`}
                  >
                    <div
                      className={`size-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600/40 text-lime-300'
                          : 'bg-slate-100 dark:bg-emerald-950/60 text-slate-500 dark:text-emerald-400'
                      }`}
                    >
                      <FallbackIcon className="size-3.5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs leading-none line-clamp-1">{mod.module_name}</span>
                      {/* Lime badge counter showing total stations */}
                      <span
                        className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md leading-none ${
                          isSelected
                            ? 'bg-lime-400 text-emerald-950 shadow-xs'
                            : 'bg-slate-200 dark:bg-emerald-950/80 text-slate-600 dark:text-emerald-300'
                        }`}
                        title={`${modStationsCount} stations`}
                      >
                        {modStationsCount}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* STEP 2: SESSION SELECTION LEVEL (Segmented Slider Mode Switcher)           */}
          {/* ========================================================================= */}
          <section className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-emerald-500/15">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-emerald-500/70 flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-emerald-500" />
                  <span>Step 2: Choose Exam Session ({currentModuleExams.length}/2)</span>
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Each module permits 1 Regular Session (Normale) and 1 Retake Session (Rattrapage) per academic cycle.
                </p>
              </div>

              {!isMaxSessionsReached && (
                <button
                  type="button"
                  onClick={handleOpenCreateSession}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto active:scale-95 cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>+ Create Exam Session</span>
                </button>
              )}
            </div>

            {/* Segmented Slider Session Switcher */}
            {currentModuleExams.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white dark:bg-[#0B1612] border border-dashed border-slate-200 dark:border-emerald-500/20 text-center space-y-3">
                <div className="size-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>Create First Exam Session</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                {/* Session Normale Tile */}
                {(() => {
                  const regEx = currentModuleExams.find(
                    (e) => String(e.session_type || '').toLowerCase() === 'regular'
                  )
                  const isActive = regEx && regEx.id === activeExamId
                  const regStations = regEx ? stations.filter((s) => s.exam_id === regEx.id).length : 0

                  if (!regEx) {
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setSessionType('regular')
                          setIsCreateSessionOpen(true)
                        }}
                        className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-emerald-500/25 bg-slate-50/50 dark:bg-[#0B1612]/50 hover:bg-emerald-50/50 dark:hover:bg-[#12221C] text-left transition-all group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-emerald-500">
                            Session Normale
                          </span>
                          <span className="text-[10px] text-emerald-600 dark:text-lime-400 font-bold flex items-center gap-1">
                            <Plus className="size-3" /> Schedule
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Not created yet. Click to schedule.</p>
                      </button>
                    )
                  }

                  const formattedDate = new Date(regEx.exam_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })

                  return (
                    <div
                      onClick={() => setActiveExamId(regEx.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/40 border-emerald-500'
                          : 'bg-white dark:bg-[#0B1612] border-slate-200/80 dark:border-emerald-500/20 text-slate-700 dark:text-slate-300 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-white/15 text-white' : 'bg-emerald-500/10 text-emerald-500'
                          }`}
                        >
                          <Calendar className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate">Session Normale</span>
                            {isActive && (
                              <span className="size-2 rounded-full bg-lime-400 animate-pulse shrink-0" />
                            )}
                          </div>
                          <p
                            className={`text-[11px] font-mono mt-0.5 truncate ${
                              isActive ? 'text-emerald-100' : 'text-slate-400'
                            }`}
                          >
                            {formattedDate} • {regStations} station{regStations !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingExam(regEx)
                        }}
                        title="Delete Regular Session"
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                          isActive
                            ? 'text-emerald-200 hover:text-white hover:bg-white/10'
                            : 'text-slate-400 hover:text-rose-500 hover:bg-rose-500/10'
                        }`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )
                })()}

                {/* Session Rattrapage Tile */}
                {(() => {
                  const retEx = currentModuleExams.find((e) => {
                    const t = String(e.session_type || '').toLowerCase()
                    return t === 'retake' || t === 'makeup'
                  })
                  const isActive = retEx && retEx.id === activeExamId
                  const retStations = retEx ? stations.filter((s) => s.exam_id === retEx.id).length : 0

                  if (!retEx) {
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setSessionType('retake')
                          setIsCreateSessionOpen(true)
                        }}
                        className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-emerald-500/25 bg-slate-50/50 dark:bg-[#0B1612]/50 hover:bg-amber-50/50 dark:hover:bg-[#12221C] text-left transition-all group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-amber-500">
                            Session Rattrapage
                          </span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                            <Plus className="size-3" /> Schedule
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Not created yet. Click to schedule.</p>
                      </button>
                    )
                  }

                  const formattedDate = new Date(retEx.exam_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })

                  return (
                    <div
                      onClick={() => setActiveExamId(retEx.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? 'border-2 border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/15 text-amber-300 shadow-md'
                          : 'bg-white dark:bg-[#0B1612] border-slate-200/80 dark:border-emerald-500/20 text-slate-700 dark:text-slate-300 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-amber-500/30 text-amber-300' : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          <Layers className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate">Session Rattrapage</span>
                            {isActive && (
                              <span className="size-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] font-mono mt-0.5 text-slate-400 truncate">
                            {formattedDate} • {retStations} station{retStations !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingExam(retEx)
                        }}
                        title="Delete Retake Session"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )
                })()}
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* STEP 3: STATIONS MANAGEMENT LEVEL (For the active session)                 */}
          {/* ========================================================================= */}
          {activeExam && (
            <section className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-emerald-500/70 flex items-center gap-1.5">
                  <ClipboardCheck className="size-3.5 text-emerald-500" />
                  <span>
                    Step 3: Stations for{' '}
                    {String(activeExam.session_type || '').toLowerCase() === 'retake'
                      ? 'Retake'
                      : 'Regular'}{' '}
                    Session
                  </span>
                </span>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  {activeSessionStations.length} Station
                  {activeSessionStations.length !== 1 ? 's' : ''} Configured
                </span>
              </div>

              {/* Curriculum Modules Weightage Allocation Progress Bar Card towards 100% */}
              <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/15 shadow-sm space-y-3 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0 ring-1 ring-emerald-500/20">
                      <Layers className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Curriculum Modules Weightage Allocation
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Total station weightages for this{' '}
                        {String(activeExam.session_type || '').toLowerCase() === 'retake'
                          ? 'Retake'
                          : 'Regular'}{' '}
                        session must equal 100.00%.
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border self-start sm:self-auto transition-colors ${
                      isFullyAllocated
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {isFullyAllocated ? (
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="size-3.5 text-amber-500" />
                    )}
                    <span>
                      {totalSessionWeightage}% / 100%{' '}
                      {isFullyAllocated ? '— Fully Allocated' : `— ${availableWeightage}% Remaining`}
                    </span>
                  </span>
                </div>

                {/* Animated Progress Bar with percentage labels */}
                <div className="space-y-1.5">
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-[#0B1612] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out relative ${
                        isFullyAllocated
                          ? 'bg-gradient-to-r from-emerald-500 to-lime-400'
                          : 'bg-gradient-to-r from-amber-500 to-orange-400'
                      }`}
                      style={{ width: `${Math.min(100, totalSessionWeightage)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>
                      {activeSessionStations.length} Station
                      {activeSessionStations.length !== 1 ? 's' : ''} Configured
                    </span>
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
                    placeholder="Search stations by number, title, PIN, or evaluator..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/15 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateStation}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/25 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>+ Create Clinical Station</span>
                </button>
              </div>

              {/* Stations Grid */}
              {displayedStations.length === 0 ? (
                <div className="p-10 rounded-2xl bg-white dark:bg-[#0B1612] border border-dashed border-slate-200 dark:border-emerald-500/20 text-center space-y-3">
                  <ClipboardCheck className="size-8 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    No Clinical Stations Added Yet
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Click &quot;+ Create Clinical Station&quot; above to add Station #1 to this{' '}
                    {String(activeExam.session_type || '').toLowerCase() === 'retake'
                      ? 'Retake'
                      : 'Regular'}{' '}
                    exam session.
                  </p>
                  <button
                    onClick={handleOpenCreateStation}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all cursor-pointer"
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
                    const isPublished = publishedMap[st.id] ?? true

                    return (
                      <div
                        key={st.id}
                        className="p-5 rounded-xl bg-white dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/15 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-lg hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:ring-1 hover:ring-emerald-500/30 transition-all group"
                      >
                        <div className="space-y-3.5">
                          {/* Station Header Pill & Big Monospace Number */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                                  <ClipboardCheck className="size-3" />
                                  <span>Station</span>
                                </span>

                                {/* Status Toggle (Published / Draft) */}
                                <button
                                  type="button"
                                  onClick={(e) => handleTogglePublish(e, st.id)}
                                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                    isPublished
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                  }`}
                                  title="Click to toggle Draft / Published status"
                                >
                                  <span
                                    className={`size-1.5 rounded-full ${
                                      isPublished ? 'bg-emerald-500' : 'bg-amber-500'
                                    }`}
                                  />
                                  <span>{isPublished ? 'Published' : 'Draft'}</span>
                                </button>
                              </div>

                              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                                {st.title}
                              </h3>
                              <p className="text-xs text-slate-400 truncate">
                                {activeModule?.module_name} • {activeModule?.level_name}
                              </p>
                            </div>

                            {/* Big Station Number Indicator stamped in bold monospace */}
                            <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-600/80 dark:text-lime-400/90 tracking-tight shrink-0">
                              #{String(st.station_number).padStart(2, '0')}
                            </span>
                          </div>

                          {/* Weightage Gauge: Visual horizontal percentage bar depicting the station's weight */}
                          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B1612] border border-slate-200/60 dark:border-emerald-500/15 space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-slate-500 dark:text-slate-400">Weightage Gauge</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-lime-400 tabular-nums">
                                {Number(st.weightage_percentage || 0).toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 dark:bg-emerald-950/60 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-lime-400 rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, Number(st.weightage_percentage || 0))
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          {/* Evaluator Professor Badge */}
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B1612] border border-slate-200/60 dark:border-emerald-500/15 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Stethoscope className="size-3.5 text-emerald-500 shrink-0" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-[9px] uppercase font-bold text-slate-400">
                                  Evaluator Examiner
                                </span>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {st.invigilator_prof_name && st.invigilator_prof_name !== 'Unassigned'
                                    ? st.invigilator_prof_name
                                    : 'Unassigned (Assign in Edit)'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Live Scoring PIN Card with 1-click clipboard toggle */}
                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0B1612] border border-slate-200/60 dark:border-emerald-500/15 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Key className="size-3.5 text-amber-500 shrink-0" />
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                Tablet PIN:
                              </span>
                              <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20 tracking-widest">
                                {isPinRevealed ? st.access_pin : '••••••'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => togglePinReveal(e, st.id)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                aria-label="Toggle PIN Visibility"
                              >
                                {isPinRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleCopyPin(e, st.id, st.access_pin)}
                                className="p-1 rounded text-slate-400 hover:text-emerald-600 transition-colors relative cursor-pointer"
                                aria-label="Copy Access PIN"
                              >
                                {isCopied ? (
                                  <Check className="size-3.5 text-lime-400" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer: Clean Edit & Delete Actions (No Checklist Editor or Live Monitor) */}
                        <div className="pt-3 border-t border-slate-100 dark:border-emerald-500/15 flex items-center justify-between text-xs text-slate-400">
                          <span className="text-[11px] font-mono">
                            {typeof st.question_count === 'number'
                              ? `${st.question_count} Criteria Items`
                              : 'Rubric Configured'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditStation(e, st)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all font-semibold cursor-pointer"
                              title="Edit Station Details & Evaluator"
                            >
                              <Edit2 className="size-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeletingStation(st)
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                              title="Delete Station"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
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
          <div className="relative w-full max-w-md max-h-[85vh] rounded-2xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/20 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
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
                type="button"
                onClick={() => setIsCreateSessionOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSessionSubmit} noValidate className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar min-h-0">
                {sessionError && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>{sessionError}</span>
                  </div>
                )}

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
                      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-xs font-bold transition-all relative cursor-pointer ${
                        hasRegularSession
                          ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                          : sessionType === 'regular'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2
                          className={`size-4 ${
                            hasRegularSession ? 'text-slate-400' : 'text-emerald-500'
                          }`}
                        />
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
                      className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-xs font-bold transition-all relative cursor-pointer ${
                        hasRetakeSession
                          ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                          : sessionType === 'retake'
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Layers
                          className={`size-4 ${
                            hasRetakeSession ? 'text-slate-400' : 'text-purple-500'
                          }`}
                        />
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
              </div>

              <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                <button
                  type="button"
                  onClick={() => setIsCreateSessionOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSession}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:bg-emerald-700 transition-all disabled:opacity-50 cursor-pointer"
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
      {/* MODAL 2: CREATE CLINICAL STATION MODAL (With Dedicated Capacity Sidebar)  */}
      {/* ========================================================================= */}
      {isCreateStationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/20 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Decorative top gradient bar */}
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shrink-0" />

            {/* Fixed Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 shrink-0">
                  <ClipboardCheck className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Create Clinical Station
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                      {activeModule?.module_name}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        String(activeExam?.session_type || '').toLowerCase() === 'retake'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200/60 dark:border-purple-800'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-800'
                      }`}
                    >
                      {String(activeExam?.session_type || '').toLowerCase() === 'retake'
                        ? 'Retake Session'
                        : 'Regular Session'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateStationOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Form wrapping scrollable content and fixed footer */}
            <form onSubmit={handleCreateStationSubmit} noValidate className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar min-h-0">
                {stationError && (
                  <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>{stationError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Dedicated Sidebar / Status & Capacity Indicator */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                          Session Capacity
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isFullyAllocated
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {isFullyAllocated ? (
                            <CheckCircle2 className="size-3 text-emerald-500" />
                          ) : (
                            <AlertCircle className="size-3 text-amber-500" />
                          )}
                          <span>{isFullyAllocated ? '100% Full' : `${availableWeightage}% Left`}</span>
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="h-2.5 w-full bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isFullyAllocated
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500'
                            }`}
                            style={{ width: `${Math.min(100, totalSessionWeightage)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>Allocated: {totalSessionWeightage}%</span>
                          <span>Remaining: {availableWeightage}%</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Stations Configured:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {activeSessionStations.length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Next Recommended:</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            Station #{formStationNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1.5">
                      <p className="font-bold flex items-center gap-1.5">
                        <Sliders className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Weightage Distribution</span>
                      </p>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[10px]">
                        The entire session requires a 100.00% total weightage. You can click the &quot;Avail&quot; button in the form to automatically fill the remaining available percentage.
                      </p>
                    </div>
                  </div>

                  {/* Right Form Fields */}
                  <div className="md:col-span-7 space-y-4">
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

                    {/* Evaluator Professor Dropdown */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Stethoscope className="size-3 text-slate-400" />
                        Evaluator Professor / Teacher
                      </label>
                      <Select
                        options={professorSelectOptions}
                        value={formInvigilatorProfId}
                        onChange={(val) => setFormInvigilatorProfId(val)}
                        placeholder="Select Evaluator Examiner (Optional)..."
                        searchable={true}
                      />
                      <p className="text-[10px] text-slate-400">
                        Assign an evaluator examiner now or configure later in station edit.
                      </p>
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
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors cursor-pointer"
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
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          {formShowPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Live Station Preview Card */}
                    {formTitle.trim() && (
                      <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Preview
                        </span>
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
                              PIN: {formShowPin ? formAccessPin || '—' : '••••••'}
                            </span>
                          </div>
                        </div>
                        {formInvigilatorProfId && (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <Stethoscope className="size-3 shrink-0" />
                            <span className="truncate">
                              Evaluator:{' '}
                              {professors.find((p) => p.id === formInvigilatorProfId)?.full_name ||
                                'Selected'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Fixed Modal Action Buttons Footer */}
              <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                <button
                  type="button"
                  onClick={() => setIsCreateStationOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStation}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT STATION MODAL                                               */}
      {/* ========================================================================= */}
      {editingStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg max-h-[85vh] rounded-2xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/20 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
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
                type="button"
                onClick={() => setEditingStation(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleEditStationSubmit} noValidate className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar min-h-0">
                {editError && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

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

                {/* Evaluator Professor Dropdown */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Stethoscope className="size-3 text-slate-400" />
                    Evaluator Professor / Teacher
                  </label>
                  <Select
                    options={professorSelectOptions}
                    value={editInvigilatorProfId}
                    onChange={(val) => setEditInvigilatorProfId(val)}
                    placeholder="Select Evaluator Examiner..."
                    searchable={true}
                  />
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
                      onClick={generateRandomEditPin}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      <Sparkles className="size-3" />
                      <span>Generate Random</span>
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="size-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={editShowPin ? 'text' : 'password'}
                      value={editAccessPin}
                      onChange={(e) => setEditAccessPin(e.target.value)}
                      placeholder="e.g. 748291"
                      className="w-full pl-9 pr-10 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold tracking-wider focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setEditShowPin(!editShowPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {editShowPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                <button
                  type="button"
                  onClick={() => setEditingStation(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:bg-emerald-700 transition-all disabled:opacity-50 cursor-pointer"
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
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/20 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mx-auto">
              <Trash2 className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Station?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete{' '}
                <strong className="text-slate-800 dark:text-slate-200">{deletingStation.title}</strong>? All
                authoring and scoring data for this station will be removed.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeletingStation(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStation}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/25 hover:bg-rose-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/20 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mx-auto">
              <Trash2 className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Exam Session?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete this{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {String(deletingExam.session_type || '').toLowerCase() === 'retake'
                    ? 'Retake'
                    : 'Regular'}{' '}
                  Session
                </strong>
                ? All associated clinical stations will also be removed.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeletingExam(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExamSession}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/25 hover:bg-rose-700 transition-all disabled:opacity-50 cursor-pointer"
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

export default function DeanStationsDrilldownPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <DeanStationsContent />
    </Suspense>
  )
}
