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
  Link as LinkIcon,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  Unlink,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { Select, SelectOption } from '@/components/ui/Select'
import { useToast } from '@/context/ToastContext'
import { useAcademicYear } from '@/context/AcademicYearContext'

export interface StationItem {
  id: string
  exam_id: string
  station_number: number
  title: string
  access_pin: string
  weightage_percentage?: number
  invigilator_prof_id: string | null
  invigilator_prof_name: string
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

export interface ScheduledExamOption {
  id: string
  module_name: string
  level_name: string
  session_type: string
  exam_date: string
  display_label: string
}

export interface ClinicalModuleOption {
  id: string
  module_name: string
  level_name: string
}

export interface ProfessorOption {
  id: string
  user_id: string
  first_name: string
  last_name: string
  full_name: string
  email?: string
}

export default function DeanStationsManagementPage() {
  const { showSuccess, showError } = useToast()
  const {
    selectedYearId,
    selectedYear,
    isLoading: isYearLoading,
  } = useAcademicYear()

  const [stations, setStations] = useState<StationItem[]>([])
  const [exams, setExams] = useState<ScheduledExamOption[]>([])
  const [modules, setModules] = useState<ClinicalModuleOption[]>([])
  const [professors, setProfessors] = useState<ProfessorOption[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [search, setSearch] = useState('')
  const [filterExamId, setFilterExamId] = useState<string>('ALL')

  // Modals state
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingStation, setEditingStation] = useState<StationItem | null>(null)
  const [deletingStation, setDeletingStation] = useState<StationItem | null>(null)
  const [quickLinkStation, setQuickLinkStation] = useState<StationItem | null>(null)

  // Form states
  const [formTitle, setFormTitle] = useState('')
  const [formStationNumber, setFormStationNumber] = useState<number>(1)
  const [formAccessPin, setFormAccessPin] = useState('')
  const [formShowPin, setFormShowPin] = useState(true)
  const [formWeightage, setFormWeightage] = useState<number>(50)
  const [formInvigilatorProfId, setFormInvigilatorProfId] = useState('')
  const [formExamId, setFormExamId] = useState('')
  const [formError, setFormError] = useState('')

  // Quick link target
  const [quickTargetExamId, setQuickTargetExamId] = useState<string>('')

  // PIN Visibility toggles and copy indicators
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({})
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null)

  // Global ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalMode(null)
        setEditingStation(null)
        setDeletingStation(null)
        setQuickLinkStation(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fetch Stations & Context Data scoped to faculty
  const fetchStationsData = async (yearId?: string | null, isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    const targetYearId = yearId || selectedYearId

    try {
      const url = targetYearId
        ? `/api/dean/stations?academic_year_id=${targetYearId}`
        : '/api/dean/stations'
      const res = await fetch(url)
      const json = await res.json()

      if (res.ok && json.success) {
        setStations(json.stations || [])
        setExams(json.exams || [])
        setModules(json.modules || [])
        setProfessors(json.professors || [])
      } else {
        showError(json.error || 'Failed to fetch faculty clinical stations.')
      }
    } catch (err: any) {
      showError(err?.message || 'Error communicating with server.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Refetch on selectedYearId change
  useEffect(() => {
    if (selectedYearId) {
      fetchStationsData(selectedYearId)
    }
  }, [selectedYearId])

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

  const generateRandomPin = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setFormAccessPin(code)
  }

  // --- Handlers for Create / Edit Modal ---
  const handleOpenCreateModal = () => {
    const nextNumber = stations.length > 0 ? Math.max(...stations.map((s) => s.station_number)) + 1 : 1
    setFormStationNumber(nextNumber)
    setFormTitle(`Station ${nextNumber}: Clinical Case Assessment`)
    setFormAccessPin(Math.floor(100000 + Math.random() * 900000).toString())
    setFormShowPin(true)
    setFormWeightage(50)
    setFormInvigilatorProfId('')
    setFormExamId(exams.length > 0 ? exams[0].id : '')
    setFormError('')
    setModalMode('create')
  }

  const handleOpenEditModal = (station: StationItem) => {
    setEditingStation(station)
    setFormStationNumber(station.station_number)
    setFormTitle(station.title)
    setFormAccessPin(station.access_pin)
    setFormShowPin(true)
    setFormWeightage(station.weightage_percentage ?? 50)
    setFormInvigilatorProfId(station.invigilator_prof_id || '')
    setFormExamId(station.exam_id || '')
    setFormError('')
    setModalMode('edit')
  }

  const handleOpenQuickLink = (station: StationItem) => {
    setQuickLinkStation(station)
    setQuickTargetExamId(station.exam_id || '')
  }

  const handleSubmitStationForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      setFormError('Station title is required.')
      return
    }
    if (!formAccessPin || formAccessPin.trim().length < 4) {
      setFormError('Access PIN must be at least 4 characters long.')
      return
    }
    if (!formExamId || formExamId === 'unassigned') {
      setFormError('An exam session must be selected to register a clinical station.')
      return
    }

    setSubmitting(true)
    setFormError('')

    const payload = {
      title: formTitle.trim(),
      station_number: formStationNumber,
      access_pin: formAccessPin.trim(),
      weightage_percentage: formWeightage,
      invigilator_prof_id: formInvigilatorProfId || null,
      exam_id: formExamId,
    }

    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/dean/stations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()

        if (res.ok && json.success) {
          showSuccess('Clinical station created successfully.')
          setModalMode(null)
          fetchStationsData(selectedYearId)
        } else {
          setFormError(json.error || 'Failed to create clinical station.')
        }
      } else if (modalMode === 'edit') {
        if (!editingStation) return
        const res = await fetch(`/api/dean/stations/${editingStation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()

        if (res.ok && json.success) {
          showSuccess('Clinical station updated successfully.')
          setModalMode(null)
          setEditingStation(null)
          fetchStationsData(selectedYearId)
        } else {
          setFormError(json.error || 'Failed to update clinical station.')
        }
      }
    } catch (err: any) {
      setFormError(err?.message || 'Error communicating with server.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitQuickLink = async () => {
    if (!quickLinkStation) return
    if (!quickTargetExamId) {
      showError('Please select a valid exam session.')
      return
    }
    setSubmitting(true)

    try {
      const res = await fetch(`/api/dean/stations/${quickLinkStation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: quickTargetExamId,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('Station linked to exam session.')
        setQuickLinkStation(null)
        fetchStationsData(selectedYearId)
      } else {
        showError(json.error || 'Failed to update exam link.')
      }
    } catch (err: any) {
      showError(err?.message || 'Error communicating with server.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingStation) return

    const target = deletingStation
    const targetIndex = stations.findIndex((s) => s.id === target.id)

    setDeletingStation(null)
    setStations((current) => current.filter((s) => s.id !== target.id))

    try {
      const res = await fetch(`/api/dean/stations/${target.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Clinical station deleted.')
      } else {
        setStations((current) => {
          if (current.some((s) => s.id === target.id)) return current
          const restored = [...current]
          if (targetIndex >= 0 && targetIndex <= restored.length) {
            restored.splice(targetIndex, 0, target)
          } else {
            restored.push(target)
          }
          return restored
        })
        showError(json.error || 'Failed to delete station. Changes restored.')
      }
    } catch (err: any) {
      setStations((current) => {
        if (current.some((s) => s.id === target.id)) return current
        const restored = [...current]
        if (targetIndex >= 0 && targetIndex <= restored.length) {
          restored.splice(targetIndex, 0, target)
        } else {
          restored.push(target)
        }
        return restored
      })
      showError(err?.message || 'Error connecting to server. Item restored.')
    }
  }

  // Filtered stations logic
  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      // Tab filter
      if (activeTab === 'assigned' && !station.exam_id) return false
      if (activeTab === 'unassigned' && !!station.exam_id) return false

      // Exam dropdown filter
      if (filterExamId !== 'ALL' && station.exam_id !== filterExamId) {
        return false
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchTitle = station.title.toLowerCase().includes(q)
        const matchProf = station.invigilator_prof_name?.toLowerCase().includes(q)
        const matchExam = station.linked_exam?.module_name?.toLowerCase().includes(q)
        const matchNumber = station.station_number.toString().includes(q)
        const matchPin = station.access_pin.includes(q)

        if (!matchTitle && !matchProf && !matchExam && !matchNumber && !matchPin) {
          return false
        }
      }

      return true
    })
  }, [stations, activeTab, filterExamId, search])

  // Aggregate Stats
  const assignedCount = useMemo(() => stations.filter((s) => !!s.exam_id).length, [stations])
  const invigilatorAssignedCount = useMemo(
    () => stations.filter((s) => !!s.invigilator_prof_id).length,
    [stations]
  )

  // Select Options Builder
  const examSelectOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = []

    exams.forEach((e) => {
      list.push({
        value: e.id,
        label: `${e.module_name} (${e.session_type})`,
        subLabel: `${e.level_name} • ${e.exam_date || 'No Date'}`,
        icon: Calendar,
      })
    })

    return list
  }, [exams])

  const professorSelectOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = [
      {
        value: '',
        label: 'Unassigned (Assign Later)',
        subLabel: 'Dean can assign evaluator later',
        icon: UserCheck,
      },
    ]

    professors.forEach((p) => {
      list.push({
        value: p.id,
        label: p.full_name,
        subLabel: p.email || 'Faculty Evaluator',
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
                Clinical Stations Management
              </h1>
              <p className="text-xs font-semibold text-slate-400">
                Manage OSCE stations, generate secure PINs, assign evaluators, and link to faculty clinical exams
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => fetchStationsData(selectedYearId, true)}
            disabled={refreshing || loading}
            aria-label="Refresh stations"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-sky-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all active:scale-[0.98]"
          >
            <Plus className="size-4" />
            <span>Create Station</span>
          </button>
        </div>
      </div>

      {/* Faculty Scoping Context Banner */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-200 text-xs font-semibold shadow-xs">
        <Info className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />
        <span>
          Stations are scoped exclusively to your faculty. Clinical rubrics and candidate evaluations are administered by assigned faculty evaluators.
        </span>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ClipboardCheck className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Stations</span>
            <span className="text-xl font-black text-slate-900 dark:text-white truncate">{stations.length}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Linked to Exams</span>
            <span className="text-xl font-black text-slate-900 dark:text-white truncate">{assignedCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <BookOpen className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clinical Modules</span>
            <span className="text-xl font-black text-slate-900 dark:text-white truncate">{modules.length}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Stethoscope className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Evaluators Assigned</span>
            <span className="text-xl font-black text-slate-900 dark:text-white truncate">{invigilatorAssignedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>All Stations</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {stations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('assigned')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'assigned'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>With Evaluator</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                {invigilatorAssignedCount}
              </span>
            </button>
          </div>

          {/* Target Exam Filter Dropdown */}
          {exams.length > 0 && (
            <div className="w-full md:w-72">
              <Select
                size="sm"
                value={filterExamId}
                onChange={(val) => setFilterExamId(val)}
                options={[
                  { value: 'ALL', label: 'All Exam Sessions' },
                  ...exams.map((e) => ({
                    value: e.id,
                    label: `${e.module_name} (${e.session_type})`,
                  })),
                ]}
                placeholder="Filter Linked Exam"
              />
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by station title, number, PIN, evaluator professor, or module..."
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
      </div>

      {/* Main Stations Table Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
          <Loader2 className="size-8 text-sky-500 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading clinical stations...</p>
        </div>
      ) : filteredStations.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center space-y-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 mx-auto">
            <ClipboardCheck className="size-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {search || filterExamId !== 'ALL' || activeTab !== 'all'
                ? 'No matching stations found'
                : 'No clinical stations created yet'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {search || filterExamId !== 'ALL' || activeTab !== 'all'
                ? 'Try adjusting your search query or exam filter.'
                : 'Get started by creating your first clinical station container linked to a faculty exam.'}
            </p>
          </div>
          {!search && activeTab === 'all' && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
            >
              <Plus className="size-4" />
              <span>Create First Station</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 pl-6 pr-4">Station</th>
                  <th className="py-3.5 px-4">Clinical Module & Exam</th>
                  <th className="py-3.5 px-4">Evaluator Professor</th>
                  <th className="py-3.5 px-4">Weightage</th>
                  <th className="py-3.5 px-4">Access PIN</th>
                  <th className="py-3.5 pr-6 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredStations.map((st) => {
                  const isPinRevealed = !!revealedPins[st.id]
                  const isCopied = copiedPinId === st.id

                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Column 1: Station Number & Title */}
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 items-center justify-center rounded-xl bg-blue-600 text-white text-xs font-black shadow-xs shrink-0">
                            #{st.station_number}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-xs md:max-w-sm">
                              {st.title}
                            </span>
                            <span className="text-[10px] text-slate-400">Station ID: {st.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Module & Exam */}
                      <td className="py-4 px-4">
                        {st.linked_exam ? (
                          <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                              <BookOpen className="size-3.5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  {st.linked_exam.module_name}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 capitalize">
                                  {st.linked_exam.session_type}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 truncate">
                                {st.linked_exam.level_name} • {st.linked_exam.exam_date || 'Date Unset'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            <Unlink className="size-3" />
                            <span>Exam Unset</span>
                          </span>
                        )}
                      </td>

                      {/* Column 3: Evaluator Professor */}
                      <td className="py-4 px-4">
                        {st.invigilator_prof_name && st.invigilator_prof_name !== 'Unassigned' ? (
                          <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                              <Stethoscope className="size-3.5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                {st.invigilator_prof_name}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate">
                                {st.invigilator_professor?.email || 'Faculty Evaluator'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50">
                            <AlertCircle className="size-3" />
                            <span>Unassigned</span>
                          </span>
                        )}
                      </td>

                      {/* Column 4: Weightage */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Percent className="size-3 text-slate-400" />
                          <span>{st.weightage_percentage ?? 50}%</span>
                        </span>
                      </td>

                      {/* Column 5: Access PIN */}
                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                          <Key className="size-3 text-amber-500 shrink-0" />
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white tracking-widest min-w-16">
                            {isPinRevealed ? st.access_pin : '••••••'}
                          </span>
                          <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-700">
                            <button
                              onClick={() => togglePinReveal(st.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
                              aria-label="Toggle PIN reveal"
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
                      </td>

                      {/* Column 6: Actions */}
                      <td className="py-4 pr-6 pl-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Reassign Exam */}
                          <button
                            onClick={() => handleOpenQuickLink(st)}
                            title="Reassign Exam Session"
                            className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-all"
                          >
                            <LinkIcon className="size-3.5" />
                          </button>

                          {/* Edit Station */}
                          <button
                            onClick={() => handleOpenEditModal(st)}
                            aria-label="Edit Station"
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                          >
                            <Edit2 className="size-3.5" />
                          </button>

                          {/* Delete Station */}
                          <button
                            onClick={() => setDeletingStation(st)}
                            aria-label="Delete Station"
                            className="p-2 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Create / Edit Station Modal --- */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {modalMode === 'create' ? 'Create Clinical Station' : 'Edit Clinical Station'}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Define station container, PIN code, and evaluator assignment
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalMode(null)}
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

            <form onSubmit={handleSubmitStationForm} className="space-y-4">
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
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Cardiovascular Examination"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              {/* Station Access PIN */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Access PIN * (4+ characters)
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPin}
                    className="flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 transition-colors"
                  >
                    <Sparkles className="size-3" />
                    <span>Generate Random PIN</span>
                  </button>
                </div>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type={formShowPin ? 'text' : 'password'}
                    value={formAccessPin}
                    onChange={(e) => setFormAccessPin(e.target.value)}
                    placeholder="e.g. 583921"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold tracking-widest text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setFormShowPin(!formShowPin)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Toggle PIN visibility"
                  >
                    {formShowPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Target Scheduled Exam (Required by schema) */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Exam Session *
                </label>
                <Select
                  options={examSelectOptions}
                  value={formExamId}
                  onChange={(val) => setFormExamId(val)}
                  placeholder="Select Exam Session..."
                  searchable={true}
                />
                {exams.length === 0 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    No scheduled exams found for this academic session. Please register modules and exams first.
                  </p>
                )}
              </div>

              {/* Weightage Percentage */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Weightage Percentage (%)
                </label>
                <div className="relative">
                  <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={formWeightage}
                    onChange={(e) => setFormWeightage(parseFloat(e.target.value) || 50)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Invigilator Professor Assignment */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Evaluator Professor (Optional)
                </label>
                <Select
                  options={professorSelectOptions}
                  value={formInvigilatorProfId}
                  onChange={(val) => setFormInvigilatorProfId(val)}
                  placeholder="Select Evaluator Professor..."
                  searchable={true}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{modalMode === 'create' ? 'Create Station' : 'Save Changes'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Quick Link / Reassign Exam Modal --- */}
      {quickLinkStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-500/20">
                  <LinkIcon className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Reassign Exam Session
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {quickLinkStation.title} (Station #{quickLinkStation.station_number})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickLinkStation(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Exam Session *
                </label>
                <Select
                  options={examSelectOptions}
                  value={quickTargetExamId}
                  onChange={(val) => setQuickTargetExamId(val)}
                  placeholder="Select Exam Session..."
                  searchable={true}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setQuickLinkStation(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitQuickLink}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Updating Link...</span>
                  </>
                ) : (
                  <span>Update Allocation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Delete Confirmation Modal --- */}
      {deletingStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mx-auto">
              <Trash2 className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Station #{deletingStation.station_number}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to remove clinical station{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {deletingStation.title}
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
                onClick={handleConfirmDelete}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/25 transition-all disabled:opacity-50"
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
