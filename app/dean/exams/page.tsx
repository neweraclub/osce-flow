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
  Lock,
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
  exam_id: string | null
  station_number: number
  title: string
  access_pin: string
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
    section_name: string
    group_name: string
    session_type: string
    exam_date: string
    display_label: string
  } | null
}

export interface ScheduledExamOption {
  id: string
  module_name: string
  level_name: string
  section_name: string
  group_name: string
  session_type: string
  exam_date: string
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

export default function DeanStationsManagementPage() {
  const { showSuccess, showError } = useToast()
  const {
    selectedYearId,
    selectedYear,
    isLoading: isYearLoading,
  } = useAcademicYear()

  const [stations, setStations] = useState<StationItem[]>([])
  const [exams, setExams] = useState<ScheduledExamOption[]>([])
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
  const [formInvigilatorProfId, setFormInvigilatorProfId] = useState('')
  const [formExamId, setFormExamId] = useState('unassigned')
  const [formError, setFormError] = useState('')

  // Quick link target
  const [quickTargetExamId, setQuickTargetExamId] = useState<string>('unassigned')

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

  // Fetch Stations & Context Data
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
        setProfessors(json.professors || [])
      } else {
        showError(json.error || 'Failed to fetch stations blueprint data.')
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
    setFormInvigilatorProfId('')
    setFormExamId('unassigned')
    setFormError('')
    setModalMode('create')
  }

  const handleOpenEditModal = (station: StationItem) => {
    setEditingStation(station)
    setFormStationNumber(station.station_number)
    setFormTitle(station.title)
    setFormAccessPin(station.access_pin)
    setFormShowPin(true)
    setFormInvigilatorProfId(station.invigilator_prof_id || '')
    setFormExamId(station.exam_id || 'unassigned')
    setFormError('')
    setModalMode('edit')
  }

  const handleOpenQuickLink = (station: StationItem) => {
    setQuickLinkStation(station)
    setQuickTargetExamId(station.exam_id || 'unassigned')
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

    setSubmitting(true)
    setFormError('')

    const payload = {
      title: formTitle.trim(),
      station_number: formStationNumber,
      access_pin: formAccessPin.trim(),
      invigilator_prof_id: formInvigilatorProfId || null,
      exam_id: formExamId === 'unassigned' || !formExamId ? null : formExamId,
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
          showSuccess('Station blueprint created successfully.')
          setModalMode(null)
          fetchStationsData(selectedYearId)
        } else {
          setFormError(json.error || 'Failed to create station blueprint.')
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
          showSuccess('Station blueprint updated successfully.')
          setModalMode(null)
          setEditingStation(null)
          fetchStationsData(selectedYearId)
        } else {
          setFormError(json.error || 'Failed to update station blueprint.')
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
    setSubmitting(true)

    try {
      const res = await fetch(`/api/dean/stations/${quickLinkStation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: quickTargetExamId === 'unassigned' || !quickTargetExamId ? null : quickTargetExamId,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess(
          quickTargetExamId === 'unassigned'
            ? 'Station detached from exam.'
            : 'Station linked to exam session.'
        )
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
    setSubmitting(true)

    try {
      const res = await fetch(`/api/dean/stations/${deletingStation.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Station blueprint removed.')
        setDeletingStation(null)
        fetchStationsData(selectedYearId)
      } else {
        showError(json.error || 'Failed to delete station.')
      }
    } catch (err: any) {
      showError(err?.message || 'Error connecting to server.')
    } finally {
      setSubmitting(false)
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
        const matchGroup = station.linked_exam?.group_name?.toLowerCase().includes(q)
        const matchSection = station.linked_exam?.section_name?.toLowerCase().includes(q)
        const matchNumber = station.station_number.toString().includes(q)

        if (!matchTitle && !matchProf && !matchExam && !matchGroup && !matchSection && !matchNumber) {
          return false
        }
      }

      return true
    })
  }, [stations, activeTab, filterExamId, search])

  // Aggregate Stats
  const assignedCount = useMemo(() => stations.filter((s) => !!s.exam_id).length, [stations])
  const unassignedCount = useMemo(() => stations.filter((s) => !s.exam_id).length, [stations])
  const invigilatorAssignedCount = useMemo(
    () => stations.filter((s) => !!s.invigilator_prof_id).length,
    [stations]
  )

  // Select Options Builder
  const examSelectOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = [
      {
        value: 'unassigned',
        label: 'Unassigned (Attach to exam later)',
        subLabel: 'Station blueprint pool',
        icon: Unlink,
      },
    ]

    exams.forEach((e) => {
      list.push({
        value: e.id,
        label: `${e.module_name} (${e.session_type})`,
        subLabel: `${e.section_name} — ${e.group_name} • ${e.level_name}`,
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
        subLabel: 'Dean can assign invigilator later',
        icon: UserCheck,
      },
    ]

    professors.forEach((p) => {
      list.push({
        value: p.id,
        label: p.full_name,
        subLabel: p.email || 'Faculty Professor',
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
                Stations Blueprint & Allocation
              </h1>
              <p className="text-xs font-semibold text-slate-400">
                Configure clinical station containers, generate PINs, assign invigilators & link to OSCE exams
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
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-sky-700 transition-all active:scale-[0.98]"
          >
            <Plus className="size-4" />
            <span>+ Create Station</span>
          </button>
        </div>
      </div>

      {/* Strict Boundary Disclaimer Banner */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-200 text-xs font-semibold shadow-xs">
        <Info className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />
        <span>
          Clinical checklists, patient scenarios, and questions are authored exclusively by assigned invigilator
          professors in their portal.
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned to Exam</span>
            <span className="text-xl font-black text-slate-900 dark:text-white truncate">{assignedCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Unlink className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unassigned Pool</span>
            <span className="text-xl font-black text-slate-900 dark:text-white truncate">{unassignedCount}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Stethoscope className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Invigilators Set</span>
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
              <span>Assigned</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                {assignedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('unassigned')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'unassigned'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Unassigned</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                {unassignedCount}
              </span>
            </button>
          </div>

          {/* Target Exam Filter Dropdown */}
          {exams.length > 0 && (
            <div className="w-full md:w-72">
              <select
                value={filterExamId}
                onChange={(e) => setFilterExamId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              >
                <option value="ALL">All Linked Exams</option>
                {exams.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.module_name} — {e.section_name} ({e.group_name})
                  </option>
                ))}
              </select>
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
            placeholder="Filter by station title, number, professor name, module or group..."
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
          <p className="text-xs font-bold text-slate-500">Loading stations blueprint data...</p>
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
                : 'No station blueprints created yet'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {search || filterExamId !== 'ALL' || activeTab !== 'all'
                ? 'Try adjusting your search query or tab filters.'
                : 'Get started by creating your first clinical station blueprint container with a secure PIN.'}
            </p>
          </div>
          {!search && activeTab === 'all' && (
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all"
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
                  <th className="py-3.5 px-4">Invigilator Professor</th>
                  <th className="py-3.5 px-4">Target Exam</th>
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
                            <span className="text-[10px] text-slate-400">Blueprint ID: {st.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Invigilator Professor */}
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
                                {st.invigilator_professor?.email || 'Faculty Invigilator'}
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

                      {/* Column 3: Target Exam */}
                      <td className="py-4 px-4">
                        {st.linked_exam ? (
                          <div className="flex items-center gap-2">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                              <CheckCircle2 className="size-3.5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  {st.linked_exam.module_name}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {st.linked_exam.session_type}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 truncate">
                                {st.linked_exam.section_name} — {st.linked_exam.group_name} ({st.linked_exam.level_name})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <Unlink className="size-3" />
                              <span>No Exam Linked</span>
                            </span>
                            <button
                              onClick={() => handleOpenQuickLink(st)}
                              className="text-[11px] font-bold text-sky-600 hover:text-sky-700 transition-colors"
                            >
                              Link
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Column 4: Access PIN */}
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

                      {/* Column 5: Actions */}
                      <td className="py-4 pr-6 pl-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Link/Unlink Action */}
                          <button
                            onClick={() => handleOpenQuickLink(st)}
                            title={st.exam_id ? 'Reassign / Detach Exam' : 'Link to Scheduled Exam'}
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
                    {modalMode === 'create' ? 'Create Station Blueprint' : 'Edit Station Blueprint'}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Define station container, PIN code, and invigilator assignment
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

            {/* Boundary reminder */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-800 dark:text-sky-300 text-[11px] font-semibold">
              <Info className="size-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
              <span>Questions and rubrics are authored later by the assigned invigilator professor.</span>
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

              {/* Invigilator Professor Assignment */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Invigilator Professor (Optional)
                </label>
                <Select
                  options={professorSelectOptions}
                  value={formInvigilatorProfId}
                  onChange={(val) => setFormInvigilatorProfId(val)}
                  placeholder="Select Invigilator Professor..."
                  searchable={true}
                />
              </div>

              {/* Target Scheduled Exam (Optional) */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Scheduled Exam (Optional)
                </label>
                <Select
                  options={examSelectOptions}
                  value={formExamId}
                  onChange={(val) => setFormExamId(val)}
                  placeholder="Link to scheduled exam session..."
                  searchable={true}
                />
                <p className="text-[10px] text-slate-400">
                  You can keep this station unassigned and link it to an exam later.
                </p>
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
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 hover:bg-blue-700 transition-all disabled:opacity-50"
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

      {/* --- Quick Link / Detach Exam Modal --- */}
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
                    Link Station to Exam
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
                  Target Exam Session
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/25 hover:bg-sky-700 transition-all disabled:opacity-50"
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
                Are you sure you want to remove the station blueprint{' '}
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
