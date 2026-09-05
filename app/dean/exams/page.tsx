'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  GraduationCap,
  Info,
  Key,
  Layers,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { Select, SelectOption } from '@/components/ui/Select'
import { useToast } from '@/context/ToastContext'
import { useAcademicYear } from '@/context/AcademicYearContext'

export interface StationBlueprint {
  id: string
  exam_id: string
  station_number: number
  title: string
  access_pin: string
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
}

export interface ScheduledExam {
  id: string
  module_id: string
  module_name: string
  level_name: string
  group_id: string
  group_name: string
  section_name: string
  session_type: 'regular' | 'retake'
  exam_date: string
  station_count: number
  stations: StationBlueprint[]
  created_at?: string
}

export interface ModuleOption {
  id: string
  module_name: string
  level_id: string
  level_name: string
}

export interface GroupOption {
  id: string
  group_name: string
  section_id: string
  section_name: string
  level_name: string
  display_label: string
}

export interface ProfessorOption {
  id: string
  user_id: string
  first_name: string
  last_name: string
  full_name: string
  email?: string
}

export default function DeanExamsStationsPage() {
  const { showSuccess, showError } = useToast()
  const {
    selectedYearId,
    selectedYear,
    isLoading: isYearLoading,
  } = useAcademicYear()

  const [exams, setExams] = useState<ScheduledExam[]>([])
  const [modules, setModules] = useState<ModuleOption[]>([])
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [professors, setProfessors] = useState<ProfessorOption[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Filters & search
  const [search, setSearch] = useState('')
  const [filterModuleId, setFilterModuleId] = useState<string>('ALL')
  const [filterSessionType, setFilterSessionType] = useState<string>('ALL')

  // Expanded exam cards (for station blueprints)
  const [expandedExamIds, setExpandedExamIds] = useState<Record<string, boolean>>({})

  // Modals for Exam Management
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<ScheduledExam | null>(null)
  const [deletingExam, setDeletingExam] = useState<ScheduledExam | null>(null)

  // Modals for Station Management
  const [stationModalMode, setStationModalMode] = useState<'create' | 'edit' | null>(null)
  const [activeExamForStation, setActiveExamForStation] = useState<ScheduledExam | null>(null)
  const [editingStation, setEditingStation] = useState<StationBlueprint | null>(null)
  const [deletingStation, setDeletingStation] = useState<{ examId: string; station: StationBlueprint } | null>(null)

  // Exam Form State
  const [formModuleId, setFormModuleId] = useState('')
  const [formGroupId, setFormGroupId] = useState('')
  const [formSessionType, setFormSessionType] = useState<'regular' | 'retake'>('regular')
  const [formExamDate, setFormExamDate] = useState(new Date().toISOString().split('T')[0])
  const [examFormError, setExamFormError] = useState('')

  // Station Form State
  const [formStationNumber, setFormStationNumber] = useState<number>(1)
  const [formStationTitle, setFormStationTitle] = useState('')
  const [formAccessPin, setFormAccessPin] = useState('')
  const [formInvigilatorProfId, setFormInvigilatorProfId] = useState('')
  const [stationFormError, setStationFormError] = useState('')

  // PIN Visibility toggles and copy indicators
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({})
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null)

  // Global ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsScheduleOpen(false)
        setEditingExam(null)
        setDeletingExam(null)
        setStationModalMode(null)
        setEditingStation(null)
        setDeletingStation(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fetch Exams data
  const fetchExams = async (yearId?: string | null, isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    const targetYearId = yearId || selectedYearId

    try {
      const url = targetYearId
        ? `/api/dean/exams?academic_year_id=${targetYearId}`
        : '/api/dean/exams'
      const res = await fetch(url)
      const json = await res.json()

      if (res.ok && json.success) {
        setExams(json.exams || [])
        setModules(json.modules || [])
        setGroups(json.groups || [])
        setProfessors(json.professors || [])

        // Auto expand all exams by default if <= 5
        if ((json.exams || []).length <= 5) {
          const initialExpanded: Record<string, boolean> = {}
          json.exams.forEach((ex: ScheduledExam) => {
            initialExpanded[ex.id] = true
          })
          setExpandedExamIds(initialExpanded)
        }
      } else {
        showError(json.error || 'Failed to fetch scheduled exams.')
      }
    } catch (err: any) {
      showError(err?.message || 'Error connecting to server.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Refetch when selectedYearId changes
  useEffect(() => {
    if (selectedYearId) {
      fetchExams(selectedYearId)
    }
  }, [selectedYearId])

  const toggleExpandExam = (examId: string) => {
    setExpandedExamIds((prev) => ({
      ...prev,
      [examId]: !prev[examId],
    }))
  }

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
    showSuccess('Station PIN copied to clipboard.')
  }

  const generateRandomPin = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString()
    setFormAccessPin(randomCode)
  }

  // --- Handlers for Exam CRUD ---
  const handleOpenScheduleModal = () => {
    setFormModuleId(modules.length > 0 ? modules[0].id : '')
    setFormGroupId(groups.length > 0 ? groups[0].id : '')
    setFormSessionType('regular')
    setFormExamDate(new Date().toISOString().split('T')[0])
    setExamFormError('')
    setIsScheduleOpen(true)
  }

  const handleOpenEditExam = (exam: ScheduledExam) => {
    setEditingExam(exam)
    setFormModuleId(exam.module_id)
    setFormGroupId(exam.group_id)
    setFormSessionType(exam.session_type)
    setFormExamDate(exam.exam_date)
    setExamFormError('')
  }

  const handleSubmitScheduleExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formModuleId) {
      setExamFormError('Please select a clinical module.')
      return
    }
    if (!formGroupId) {
      setExamFormError('Please select a target rotation group.')
      return
    }
    if (!formExamDate) {
      setExamFormError('Please choose an exam date.')
      return
    }

    setSubmitting(true)
    setExamFormError('')

    try {
      const res = await fetch('/api/dean/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: formModuleId,
          group_id: formGroupId,
          session_type: formSessionType,
          exam_date: formExamDate,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('Exam session scheduled successfully.')
        setIsScheduleOpen(false)
        fetchExams(selectedYearId)
      } else {
        setExamFormError(json.error || 'Failed to schedule exam.')
      }
    } catch (err: any) {
      setExamFormError(err?.message || 'Error communicating with server.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitEditExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExam) return
    if (!formModuleId || !formGroupId || !formExamDate) {
      setExamFormError('All fields are required.')
      return
    }

    setSubmitting(true)
    setExamFormError('')

    try {
      const res = await fetch('/api/dean/exams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingExam.id,
          module_id: formModuleId,
          group_id: formGroupId,
          session_type: formSessionType,
          exam_date: formExamDate,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('Exam session updated.')
        setEditingExam(null)
        fetchExams(selectedYearId)
      } else {
        setExamFormError(json.error || 'Failed to update exam.')
      }
    } catch (err: any) {
      setExamFormError(err?.message || 'Error communicating with server.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDeleteExam = async () => {
    if (!deletingExam) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/dean/exams?id=${deletingExam.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Exam session and provisioned stations deleted.')
        setDeletingExam(null)
        fetchExams(selectedYearId)
      } else {
        showError(json.error || 'Failed to delete exam session.')
      }
    } catch (err: any) {
      showError(err?.message || 'Error connecting to server.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Handlers for Station CRUD ---
  const handleOpenAddStation = (exam: ScheduledExam) => {
    setActiveExamForStation(exam)
    const nextNumber = (exam.stations?.length || 0) + 1
    setFormStationNumber(nextNumber)
    setFormStationTitle(`Station ${nextNumber}: Clinical Evaluation`)
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString()
    setFormAccessPin(randomCode)
    setFormInvigilatorProfId(professors.length > 0 ? professors[0].id : '')
    setStationFormError('')
    setStationModalMode('create')
  }

  const handleOpenEditStation = (exam: ScheduledExam, station: StationBlueprint) => {
    setActiveExamForStation(exam)
    setEditingStation(station)
    setFormStationNumber(station.station_number)
    setFormStationTitle(station.title)
    setFormAccessPin(station.access_pin)
    setFormInvigilatorProfId(station.invigilator_prof_id || '')
    setStationFormError('')
    setStationModalMode('edit')
  }

  const handleSubmitStation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formStationTitle.trim()) {
      setStationFormError('Station title is required.')
      return
    }
    if (!formAccessPin || formAccessPin.trim().length < 4) {
      setStationFormError('Station Access PIN must be at least 4 digits.')
      return
    }

    setSubmitting(true)
    setStationFormError('')

    try {
      if (stationModalMode === 'create') {
        if (!activeExamForStation) return
        const res = await fetch('/api/dean/stations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exam_id: activeExamForStation.id,
            station_number: formStationNumber,
            title: formStationTitle.trim(),
            access_pin: formAccessPin.trim(),
            invigilator_prof_id: formInvigilatorProfId || null,
          }),
        })

        const json = await res.json()
        if (res.ok && json.success) {
          showSuccess(`Station blueprint #${formStationNumber} provisioned.`)
          setStationModalMode(null)
          setActiveExamForStation(null)
          fetchExams(selectedYearId)
        } else {
          setStationFormError(json.error || 'Failed to provision station.')
        }
      } else if (stationModalMode === 'edit') {
        if (!editingStation) return
        const res = await fetch('/api/dean/stations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingStation.id,
            station_number: formStationNumber,
            title: formStationTitle.trim(),
            access_pin: formAccessPin.trim(),
            invigilator_prof_id: formInvigilatorProfId || null,
          }),
        })

        const json = await res.json()
        if (res.ok && json.success) {
          showSuccess('Station blueprint updated.')
          setStationModalMode(null)
          setEditingStation(null)
          setActiveExamForStation(null)
          fetchExams(selectedYearId)
        } else {
          setStationFormError(json.error || 'Failed to update station.')
        }
      }
    } catch (err: any) {
      setStationFormError(err?.message || 'Error communicating with server.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDeleteStation = async () => {
    if (!deletingStation) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/dean/stations?id=${deletingStation.station.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Station removed.')
        setDeletingStation(null)
        fetchExams(selectedYearId)
      } else {
        showError(json.error || 'Failed to remove station.')
      }
    } catch (err: any) {
      showError(err?.message || 'Error connecting to server.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered list of exams
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      // Filter module
      if (filterModuleId !== 'ALL' && exam.module_id !== filterModuleId) {
        return false
      }
      // Filter session type
      if (filterSessionType !== 'ALL' && exam.session_type !== filterSessionType) {
        return false
      }
      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchModule = exam.module_name?.toLowerCase().includes(q)
        const matchGroup = exam.group_name?.toLowerCase().includes(q)
        const matchSection = exam.section_name?.toLowerCase().includes(q)
        const matchLevel = exam.level_name?.toLowerCase().includes(q)
        const matchStation = exam.stations?.some(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            (s.invigilator_prof_name && s.invigilator_prof_name.toLowerCase().includes(q))
        )
        if (!matchModule && !matchGroup && !matchSection && !matchLevel && !matchStation) {
          return false
        }
      }
      return true
    })
  }, [exams, filterModuleId, filterSessionType, search])

  // Aggregate Stats
  const totalRegularExams = useMemo(
    () => exams.filter((e) => e.session_type === 'regular').length,
    [exams]
  )
  const totalRetakeExams = useMemo(
    () => exams.filter((e) => e.session_type === 'retake').length,
    [exams]
  )
  const totalStations = useMemo(
    () => exams.reduce((acc, e) => acc + (e.stations?.length || 0), 0),
    [exams]
  )

  // Select Option Builders
  const moduleSelectOptions: SelectOption[] = useMemo(() => {
    return modules.map((m) => ({
      value: m.id,
      label: m.module_name,
      subLabel: m.level_name,
      icon: BookOpen,
    }))
  }, [modules])

  const groupSelectOptions: SelectOption[] = useMemo(() => {
    return groups.map((g) => ({
      value: g.id,
      label: `${g.section_name} — ${g.group_name}`,
      subLabel: g.level_name,
      icon: Users,
    }))
  }, [groups])

  const professorSelectOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = [
      {
        value: '',
        label: 'Unassigned (Assign Later)',
        subLabel: 'Dean can assign invigilator later',
        icon: UserCheck,
      },
    ]
    professors.forEach((p) => {
      list.push({
        value: p.id,
        label: p.full_name,
        subLabel: p.email || 'Faculty Member',
        icon: Stethoscope,
      })
    })
    return list
  }, [professors])

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-500/25">
              <ClipboardCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                OSCE Exams & Station Blueprints
              </h1>
              <p className="text-xs font-semibold text-slate-400">
                Administrative session scheduling for rotation squads & station invigilator blueprints
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => fetchExams(selectedYearId, true)}
            disabled={refreshing || loading}
            aria-label="Refresh exams list"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-sky-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleOpenScheduleModal}
            disabled={modules.length === 0 || groups.length === 0}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-sky-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="size-4" />
            <span>+ Schedule Exam</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ClipboardCheck className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Exams</span>
            <span className="text-xl font-black text-slate-900 dark:text-white truncate">{exams.length}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Regular Sessions</span>
            <span className="text-xl font-black text-slate-900 dark:text-white truncate">{totalRegularExams}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Layers className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Retake Sessions</span>
            <span className="text-xl font-black text-slate-900 dark:text-white truncate">{totalRetakeExams}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Station Blueprints</span>
            <span className="text-xl font-black text-slate-900 dark:text-white truncate">{totalStations}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by module, target squad, section, level or station title..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Module Filter */}
          <div className="w-full sm:w-56">
            <select
              value={filterModuleId}
              onChange={(e) => setFilterModuleId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="ALL">All Clinical Modules</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.module_name} ({m.level_name})
                </option>
              ))}
            </select>
          </div>

          {/* Session Type Filter */}
          <div className="w-full sm:w-40">
            <select
              value={filterSessionType}
              onChange={(e) => setFilterSessionType(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            >
              <option value="ALL">All Session Types</option>
              <option value="regular">Regular Only</option>
              <option value="retake">Retake Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
          <Loader2 className="size-8 text-sky-500 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading scheduled exams and station blueprints...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center space-y-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 mx-auto">
            <ClipboardCheck className="size-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {search || filterModuleId !== 'ALL' || filterSessionType !== 'ALL'
                ? 'No matching exams found'
                : 'No exams scheduled for this academic year'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {search || filterModuleId !== 'ALL' || filterSessionType !== 'ALL'
                ? 'Try adjusting your search criteria or clearing your filters.'
                : 'Get started by clicking "+ Schedule Exam" to set up an exam session for a rotation group.'}
            </p>
          </div>
          {modules.length > 0 && groups.length > 0 && !search && (
            <button
              onClick={handleOpenScheduleModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all"
            >
              <Plus className="size-4" />
              <span>Schedule First Exam</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExams.map((exam) => {
            const isExpanded = !!expandedExamIds[exam.id]
            const formattedDate = new Date(exam.exam_date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })

            return (
              <div
                key={exam.id}
                className="rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Exam Card Header Summary */}
                <div className="p-5 md:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 bg-gradient-to-r from-transparent via-slate-50/40 to-transparent dark:via-slate-800/20">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
                      onClick={() => toggleExpandExam(exam.id)}
                      aria-label="Toggle stations drawer"
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all mt-0.5"
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4 text-sky-500" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-base font-black text-slate-900 dark:text-white truncate">
                          {exam.module_name}
                        </span>

                        {/* Level Badge */}
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                          {exam.level_name}
                        </span>

                        {/* Session Type Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            exam.session_type === 'retake'
                              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800'
                          }`}
                        >
                          {exam.session_type === 'retake' ? 'Retake Session' : 'Regular Session'}
                        </span>
                      </div>

                      {/* Squad Target & Date Details */}
                      <div className="flex items-center gap-3 md:gap-5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Users className="size-3.5 text-blue-500" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {exam.section_name} — {exam.group_name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-amber-500" />
                          <span>{formattedDate}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5 text-emerald-500" />
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {exam.stations?.length || 0} Stations Provisioned
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 self-end lg:self-center w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleOpenAddStation(exam)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-bold hover:bg-sky-500/20 transition-all"
                    >
                      <Plus className="size-3.5" />
                      <span>Add Station</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditExam(exam)}
                      aria-label="Edit exam"
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      <Edit2 className="size-3.5" />
                    </button>

                    <button
                      onClick={() => setDeletingExam(exam)}
                      aria-label="Delete exam"
                      className="p-2 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Station Blueprints Drawer */}
                {isExpanded && (
                  <div className="p-5 md:p-6 bg-slate-50/50 dark:bg-slate-900/40 space-y-4 animate-in fade-in duration-200">
                    {/* Dean vs Professor Responsibility Info Banner */}
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-800 dark:text-sky-300 text-xs">
                      <Info className="size-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold">Administrative Blueprint Container: </span>
                        <span>
                          The Dean defines station metadata, secure PINs, and assigns invigilator professors.
                          Clinical questions, rubric checklists, and scoring criteria are authored by the assigned
                          professor in the Professor Portal.
                        </span>
                      </div>
                    </div>

                    {/* Stations List Table / Cards */}
                    {exam.stations && exam.stations.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {exam.stations.map((st) => {
                          const isPinRevealed = !!revealedPins[st.id]
                          const isCopied = copiedPinId === st.id

                          return (
                            <div
                              key={st.id}
                              className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3 relative group"
                            >
                              {/* Station Number & Title */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-600 text-white shadow-xs">
                                      Station {st.station_number}
                                    </span>
                                  </div>
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {st.title}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleOpenEditStation(exam, st)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                                    aria-label="Edit station"
                                  >
                                    <Edit2 className="size-3" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingStation({ examId: exam.id, station: st })}
                                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                                    aria-label="Delete station"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Access PIN Box */}
                              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Key className="size-3.5 text-amber-500 shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                                      Access PIN
                                    </span>
                                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white tracking-widest">
                                      {isPinRevealed ? st.access_pin : '••••••'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => togglePinReveal(st.id)}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
                                    aria-label="Toggle PIN visibility"
                                  >
                                    {isPinRevealed ? (
                                      <EyeOff className="size-3.5" />
                                    ) : (
                                      <Eye className="size-3.5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleCopyPin(st.id, st.access_pin)}
                                    className="p-1 rounded-md text-slate-400 hover:text-sky-600 transition-all"
                                    aria-label="Copy access PIN"
                                  >
                                    {isCopied ? (
                                      <Check className="size-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="size-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Assigned Invigilator Professor */}
                              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                                <Stethoscope className="size-3.5 text-sky-500 shrink-0" />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    Invigilator Professor
                                  </span>
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {st.invigilator_prof_name || (
                                      <span className="text-amber-500 font-semibold italic">
                                        Unassigned
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                        <p className="text-xs font-semibold text-slate-400">
                          No station blueprints configured for this exam session yet.
                        </p>
                        <button
                          onClick={() => handleOpenAddStation(exam)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm hover:bg-blue-700 transition-all"
                        >
                          <Plus className="size-3.5" />
                          <span>Provision First Station</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* --- Schedule Exam Modal --- */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <ClipboardCheck className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Schedule OSCE Exam Session
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Assign a clinical module to a specific rotation group
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsScheduleOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {examFormError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{examFormError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitScheduleExam} className="space-y-4">
              {/* Select Module */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Clinical Module *
                </label>
                <Select
                  options={moduleSelectOptions}
                  value={formModuleId}
                  onChange={(val) => setFormModuleId(val)}
                  placeholder="Select Clinical Module..."
                  searchable={true}
                />
              </div>

              {/* Select Target Rotation Group */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Rotation Squad (Group) *
                </label>
                <Select
                  options={groupSelectOptions}
                  value={formGroupId}
                  onChange={(val) => setFormGroupId(val)}
                  placeholder="Select Section & Group..."
                  searchable={true}
                />
                <p className="text-[10px] text-slate-400">
                  Exams cascade automatically to all enrolled students within the selected rotation squad.
                </p>
              </div>

              {/* Session Type */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Session Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormSessionType('regular')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      formSessionType === 'regular'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>Regular Session</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormSessionType('retake')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      formSessionType === 'retake'
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Layers className="size-4 text-purple-500" />
                    <span>Retake Session</span>
                  </button>
                </div>
              </div>

              {/* Exam Date */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Exam Date *
                </label>
                <input
                  type="date"
                  value={formExamDate}
                  onChange={(e) => setFormExamDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <span>Schedule Exam</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Edit Exam Modal --- */}
      {editingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-500/20">
                  <Edit2 className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Update Exam Schedule
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Modify target group or exam session parameters
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingExam(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {examFormError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{examFormError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitEditExam} className="space-y-4">
              {/* Select Module */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Clinical Module *
                </label>
                <Select
                  options={moduleSelectOptions}
                  value={formModuleId}
                  onChange={(val) => setFormModuleId(val)}
                  placeholder="Select Clinical Module..."
                  searchable={true}
                />
              </div>

              {/* Select Target Rotation Group */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Rotation Squad (Group) *
                </label>
                <Select
                  options={groupSelectOptions}
                  value={formGroupId}
                  onChange={(val) => setFormGroupId(val)}
                  placeholder="Select Section & Group..."
                  searchable={true}
                />
              </div>

              {/* Session Type */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Session Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormSessionType('regular')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      formSessionType === 'regular'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>Regular Session</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormSessionType('retake')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      formSessionType === 'retake'
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Layers className="size-4 text-purple-500" />
                    <span>Retake Session</span>
                  </button>
                </div>
              </div>

              {/* Exam Date */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Exam Date *
                </label>
                <input
                  type="date"
                  value={formExamDate}
                  onChange={(e) => setFormExamDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingExam(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/25 hover:bg-sky-700 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Saving Changes...</span>
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
                Are you sure you want to remove the exam session for{' '}
                <strong className="text-slate-800 dark:text-slate-200">{deletingExam.module_name}</strong>{' '}
                ({deletingExam.group_name})? This will also remove all{' '}
                {deletingExam.stations?.length || 0} provisioned station blueprints.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeletingExam(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExam}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/25 hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Exam</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Station Blueprint Modal (Create / Edit) --- */}
      {stationModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-500/20">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {stationModalMode === 'create' ? 'Provision Station Blueprint' : 'Edit Station Blueprint'}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {activeExamForStation
                      ? `${activeExamForStation.module_name} • ${activeExamForStation.group_name}`
                      : 'Station metadata container'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setStationModalMode(null)
                  setEditingStation(null)
                  setActiveExamForStation(null)
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Disclaimer pill */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
              <Info className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Questions, rubrics, and clinical cases are authored later by the invigilator professor.</span>
            </div>

            {stationFormError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{stationFormError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitStation} className="space-y-4">
              {/* Station Number & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Station # *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formStationNumber}
                    onChange={(e) => setFormStationNumber(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>

                <div className="space-y-1 sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Station Title *
                  </label>
                  <input
                    type="text"
                    value={formStationTitle}
                    onChange={(e) => setFormStationTitle(e.target.value)}
                    placeholder="e.g. Station 1: Cardiovascular Examination"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              {/* Station Access PIN */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Station Access PIN * (Min 4 digits)
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPin}
                    className="flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 transition-colors"
                  >
                    <Sparkles className="size-3" />
                    <span>Auto-Generate PIN</span>
                  </button>
                </div>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="text"
                    value={formAccessPin}
                    onChange={(e) => setFormAccessPin(e.target.value)}
                    placeholder="e.g. 584920"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold tracking-widest text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Invigilator professors enter this PIN to unlock and grade this station on the exam day.
                </p>
              </div>

              {/* Invigilator Professor Assignment */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Assigned Invigilator Professor
                </label>
                <Select
                  options={professorSelectOptions}
                  value={formInvigilatorProfId}
                  onChange={(val) => setFormInvigilatorProfId(val)}
                  placeholder="Select Invigilator Professor..."
                  searchable={true}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setStationModalMode(null)
                    setEditingStation(null)
                    setActiveExamForStation(null)
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Saving Station...</span>
                    </>
                  ) : (
                    <span>
                      {stationModalMode === 'create' ? 'Provision Station' : 'Save Changes'}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Delete Station Confirmation Modal --- */}
      {deletingStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mx-auto">
              <Trash2 className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Station Blueprint #{deletingStation.station.station_number}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to remove{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {deletingStation.station.title}
                </strong>
                ? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeletingStation(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStation}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/25 hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Yes, Delete Station</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
