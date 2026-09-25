'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Filter,
  GraduationCap,
  Hash,
  HelpCircle,
  Layers,
  Loader2,
  MinusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useAcademicYear } from '@/context/AcademicYearContext'
import { useToast } from '@/context/ToastContext'
import { FrontendTemplateLibraryModal } from '@/components/templates/FrontendTemplateLibraryModal'

export interface PenaltyRecord {
  id: string
  exam_attempt_id: string
  student_id: string
  student_name: string
  student_matricule: string
  group_name: string
  station_id: string
  station_number: number
  station_title: string
  module_id: string
  module_name: string
  exam_session_id: string
  session_type: string
  exam_date: string
  reason: string
  criteria_title: string | null
  deduction_amount: number
  points: number
  created_at: string
}

export interface SummaryMetrics {
  total_penalties: number
  total_points_deducted: number
  average_deduction: number
  impacted_students_count: number
  impacted_stations_count: number
}

export interface FilterModuleOption {
  id: string
  name: string
}

export interface FilterStationOption {
  id: string
  number: number
  title: string
  moduleId?: string
  moduleName?: string
}

type SortField = 'date_desc' | 'date_asc' | 'points_desc' | 'points_asc' | 'student_name'

const SORT_OPTIONS: { value: SortField; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'date_desc', label: 'Date (Newest First)', icon: Clock },
  { value: 'date_asc', label: 'Date (Oldest First)', icon: Calendar },
  { value: 'points_desc', label: 'Points (Highest First)', icon: ArrowUpDown },
  { value: 'points_asc', label: 'Points (Lowest First)', icon: ArrowUpDown },
  { value: 'student_name', label: 'Student Name (A-Z)', icon: Users },
]

export default function ProfessorPenaltiesPage() {
  const { selectedYear, selectedYearId } = useAcademicYear()
  const { showError, showSuccess } = useToast()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [penalties, setPenalties] = useState<PenaltyRecord[]>([])
  const [summary, setSummary] = useState<SummaryMetrics>({
    total_penalties: 0,
    total_points_deducted: 0,
    average_deduction: 0,
    impacted_students_count: 0,
    impacted_stations_count: 0,
  })

  // Filter options from API
  const [modulesList, setModulesList] = useState<FilterModuleOption[]>([])
  const [stationsList, setStationsList] = useState<FilterStationOption[]>([])

  // User filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all')
  const [selectedStationId, setSelectedStationId] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<SortField>('date_desc')
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)

  // Custom Popover Dropdown States & Refs
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false)
  const [stationDropdownOpen, setStationDropdownOpen] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  const moduleDropdownRef = useRef<HTMLDivElement>(null)
  const stationDropdownRef = useRef<HTMLDivElement>(null)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  // Outside click & ESC listener for custom popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(target)) {
        setModuleDropdownOpen(false)
      }
      if (stationDropdownRef.current && !stationDropdownRef.current.contains(target)) {
        setStationDropdownOpen(false)
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(target)) {
        setSortDropdownOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setModuleDropdownOpen(false)
        setStationDropdownOpen(false)
        setSortDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const fetchPenaltiesData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const params = new URLSearchParams()
      const targetYearId = selectedYearId || selectedYear?.id
      if (targetYearId) {
        params.set('academic_year_id', targetYearId)
      }
      if (selectedModuleId && selectedModuleId !== 'all') {
        params.set('module_id', selectedModuleId)
      }
      if (selectedStationId && selectedStationId !== 'all') {
        params.set('station_id', selectedStationId)
      }
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }

      const res = await fetch(`/api/professor/penalties?${params.toString()}`)
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load deductions and penalties.')
      }

      setPenalties(json.penalties || [])
      if (json.summary) {
        setSummary(json.summary)
      }
      if (json.filters?.modules) {
        setModulesList(json.filters.modules)
      }
      if (json.filters?.stations) {
        setStationsList(json.filters.stations)
      }

      if (isManualRefresh) {
        showSuccess('Deductions data refreshed successfully.')
      }
    } catch (err: any) {
      console.error('Error fetching penalties:', err)
      showError(err?.message || 'Error connecting to deductions service.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Reset module and station selections when active academic year changes
  useEffect(() => {
    setSelectedModuleId('all')
    setSelectedStationId('all')
  }, [selectedYearId, selectedYear?.id])

  // Load when academic year or server-side filters change
  useEffect(() => {
    fetchPenaltiesData()
  }, [selectedYearId, selectedYear?.id, selectedModuleId, selectedStationId])

  // Available stations filtered by selected module
  const filteredStationOptions = useMemo(() => {
    if (selectedModuleId === 'all') return stationsList
    return stationsList.filter((s) => s.moduleId === selectedModuleId)
  }, [stationsList, selectedModuleId])

  // Client-side sorting and text filtering for instant responsiveness
  const displayedPenalties = useMemo(() => {
    let list = [...penalties]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (p) =>
          p.student_name.toLowerCase().includes(q) ||
          p.student_matricule.toLowerCase().includes(q) ||
          p.reason.toLowerCase().includes(q) ||
          p.station_title.toLowerCase().includes(q) ||
          p.module_name.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      switch (sortOrder) {
        case 'date_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'points_desc':
          return b.deduction_amount - a.deduction_amount
        case 'points_asc':
          return a.deduction_amount - b.deduction_amount
        case 'student_name':
          return a.student_name.localeCompare(b.student_name)
        default:
          return 0
      }
    })

    return list
  }, [penalties, searchQuery, sortOrder])

  const hasActiveFilters =
    searchQuery.trim() !== '' || selectedModuleId !== 'all' || selectedStationId !== 'all'

  const selectedModule = modulesList.find((m) => m.id === selectedModuleId)
  const selectedStation = filteredStationOptions.find((s) => s.id === selectedStationId)
  const selectedSortOption = SORT_OPTIONS.find((s) => s.value === sortOrder) || SORT_OPTIONS[0]

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedModuleId('all')
    setSelectedStationId('all')
    setSortOrder('date_desc')
    setModuleDropdownOpen(false)
    setStationDropdownOpen(false)
    setSortDropdownOpen(false)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60">
              <ShieldAlert className="size-3 text-rose-600 dark:text-rose-400" />
              <span>Auditing & Clinical Compliance</span>
            </span>
            {selectedYear && (
              <span className="text-xs font-semibold text-slate-400">
                • {selectedYear.year_label}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Clinical Deductions & Penalties
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
            Live records of candidate protocol infractions, procedure errors, and scoring deductions logged during live OSCE evaluations across your assigned modules.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center flex-wrap">
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            title="Manage & Preview Standardized Deduction Templates"
          >
            <Sliders className="size-4" />
            <span>Deduction Presets & Templates</span>
          </button>

          <button
            onClick={() => fetchPenaltiesData(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh records"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin text-emerald-600' : 'text-slate-400'}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Infractions */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/15 shadow-xs space-y-3 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Total Infractions
            </span>
            <div className="size-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/30 shadow-xs">
              <ShieldAlert className="size-5" />
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-8 w-16 bg-slate-100 dark:bg-emerald-950/40 rounded-lg animate-pulse" />
            ) : (
              <div className="text-3xl font-mono font-black text-slate-900 dark:text-white tabular-nums">
                {summary.total_penalties}
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Protocol breaches & deductions
            </p>
          </div>
        </div>

        {/* Card 2: Cumulative Lost Points */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/15 shadow-xs space-y-3 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Cumulative Lost Points
            </span>
            <div className="size-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/30 shadow-xs">
              <AlertTriangle className="size-5" />
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 dark:bg-emerald-950/40 rounded-lg animate-pulse" />
            ) : (
              <div className="text-3xl font-mono font-black text-rose-600 dark:text-rose-400 tabular-nums">
                -{summary.total_points_deducted.toFixed(2)} <span className="text-sm font-bold text-rose-500/70">pts</span>
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Cumulative examination impact
            </p>
          </div>
        </div>

        {/* Card 3: Average Penalty */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/15 shadow-xs space-y-3 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Average Penalty
            </span>
            <div className="size-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-xs">
              <Sliders className="size-5" />
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-8 w-20 bg-slate-100 dark:bg-emerald-950/40 rounded-lg animate-pulse" />
            ) : (
              <div className="text-3xl font-mono font-black text-amber-600 dark:text-amber-400 tabular-nums">
                -{summary.average_deduction.toFixed(2)} <span className="text-sm font-bold text-amber-500/70">pts</span>
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Average loss per infraction
            </p>
          </div>
        </div>

        {/* Card 4: Unique Flagged Students */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/15 shadow-xs space-y-3 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Unique Flagged Students
            </span>
            <div className="size-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-xs">
              <Users className="size-5" />
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-8 w-16 bg-slate-100 dark:bg-emerald-950/40 rounded-lg animate-pulse" />
            ) : (
              <div className="text-3xl font-mono font-black text-slate-900 dark:text-white tabular-nums">
                {summary.impacted_students_count}
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Across {summary.impacted_stations_count} clinical stations
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Controls Toolbar */}
      <div className="p-4 md:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, matricule, reason, station..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Module Filter Custom Popover Dropdown */}
          <div className="md:col-span-3 relative" ref={moduleDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setModuleDropdownOpen((prev) => !prev)
                setStationDropdownOpen(false)
                setSortDropdownOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border transition-all cursor-pointer ${
                moduleDropdownOpen
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 text-slate-900 dark:text-white'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <BookOpen className="size-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {selectedModule ? selectedModule.name : `All Assigned Modules (${modulesList.length})`}
                </span>
              </div>
              <ChevronDown
                className={`size-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  moduleDropdownOpen ? 'rotate-180 text-emerald-500' : ''
                }`}
              />
            </button>

            {moduleDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-full sm:min-w-[260px] max-h-64 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl backdrop-blur-md p-1.5 space-y-0.5 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModuleId('all')
                    setSelectedStationId('all')
                    setModuleDropdownOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                    selectedModuleId === 'all'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Layers className="size-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">All Assigned Modules</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {modulesList.length}
                    </span>
                    {selectedModuleId === 'all' && (
                      <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                </button>

                {modulesList.map((m) => {
                  const isSelected = selectedModuleId === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedModuleId(m.id)
                        setSelectedStationId('all')
                        setModuleDropdownOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BookOpen className="size-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{m.name}</span>
                      </div>
                      {isSelected && (
                        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Station Filter Custom Popover Dropdown */}
          <div className="md:col-span-2 relative" ref={stationDropdownRef}>
            <button
              type="button"
              disabled={filteredStationOptions.length === 0}
              onClick={() => {
                if (filteredStationOptions.length === 0) return
                setStationDropdownOpen((prev) => !prev)
                setModuleDropdownOpen(false)
                setSortDropdownOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border transition-all ${
                filteredStationOptions.length === 0
                  ? 'opacity-50 cursor-not-allowed border-slate-200/80 dark:border-slate-800 text-slate-400'
                  : stationDropdownOpen
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 text-slate-900 dark:text-white cursor-pointer'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Hash className="size-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {selectedStation
                    ? `Station #${selectedStation.number} - ${selectedStation.title}`
                    : `All Stations (${filteredStationOptions.length})`}
                </span>
              </div>
              <ChevronDown
                className={`size-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  stationDropdownOpen ? 'rotate-180 text-emerald-500' : ''
                }`}
              />
            </button>

            {stationDropdownOpen && filteredStationOptions.length > 0 && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-full sm:min-w-[280px] max-h-64 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl backdrop-blur-md p-1.5 space-y-0.5 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStationId('all')
                    setStationDropdownOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                    selectedStationId === 'all'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Layers className="size-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">All Stations</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {filteredStationOptions.length}
                    </span>
                    {selectedStationId === 'all' && (
                      <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                </button>

                {filteredStationOptions.map((s) => {
                  const isSelected = selectedStationId === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedStationId(s.id)
                        setStationDropdownOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="size-5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-black text-[10px] flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
                          #{s.number}
                        </span>
                        <span className="truncate">{s.title}</span>
                      </div>
                      {isSelected && (
                        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sort Order Custom Popover Dropdown */}
          <div className="md:col-span-2 relative" ref={sortDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setSortDropdownOpen((prev) => !prev)
                setModuleDropdownOpen(false)
                setStationDropdownOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border transition-all cursor-pointer ${
                sortDropdownOpen
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 text-slate-900 dark:text-white'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <selectedSortOption.icon className="size-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{selectedSortOption.label}</span>
              </div>
              <ChevronDown
                className={`size-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  sortDropdownOpen ? 'rotate-180 text-emerald-500' : ''
                }`}
              />
            </button>

            {sortDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-full sm:min-w-[220px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl backdrop-blur-md p-1.5 space-y-0.5 animate-in fade-in zoom-in-95">
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortOrder === opt.value
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSortOrder(opt.value)
                        setSortDropdownOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="size-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{opt.label}</span>
                      </div>
                      {isSelected && (
                        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Filter status row & active pills */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span>Showing <strong className="text-slate-700 dark:text-slate-200">{displayedPenalties.length}</strong> of {penalties.length} recorded infractions</span>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                Filters Active
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors cursor-pointer"
            >
              <X className="size-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Tabular View of Clinical Deductions */}
      <div className="rounded-xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/15 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-4">
            <Loader2 className="size-8 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400">Loading clinical deduction records...</p>
          </div>
        ) : displayedPenalties.length === 0 ? (
          <div className="p-12 md:p-16 text-center space-y-4">
            <div className="size-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
              {hasActiveFilters ? <Filter className="size-8" /> : <ShieldCheck className="size-8" />}
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {hasActiveFilters ? 'No Matching Deductions Found' : 'No Clinical Penalties Logged'}
              </h3>
              <p className="text-xs text-slate-400">
                {hasActiveFilters
                  ? 'No deduction records match your current search criteria or filter selections. Try adjusting or clearing your filters.'
                  : 'All candidates in your assigned stations and modules have completed evaluations without recorded clinical infractions or deductions.'}
              </p>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all cursor-pointer"
              >
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-emerald-500/15 bg-slate-50/70 dark:bg-[#0B1612] text-[11px] font-bold text-slate-500 dark:text-emerald-400/80 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Student / Candidate</th>
                  <th className="py-3.5 px-6">Station & Module</th>
                  <th className="py-3.5 px-6">Infraction Reason</th>
                  <th className="py-3.5 px-6 text-right">Deduction (Points)</th>
                  <th className="py-3.5 px-6">Evaluator Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-500/10 text-xs">
                {displayedPenalties.map((item) => {
                  const initials = item.student_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'ST'

                  const isMajor =
                    item.deduction_amount >= 2 ||
                    /sterile|safety|compromise|breach|violation|critical|aseptic/i.test(item.reason || '') ||
                    /safety|protocol|aseptic/i.test(item.criteria_title || '')

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-emerald-500/[0.02] dark:hover:bg-emerald-500/[0.04] transition-colors"
                    >
                      {/* Column 1: Student Name / ID */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-700 dark:to-teal-800 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-400/30 shadow-xs">
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {item.student_name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#12221C] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-emerald-500/20 tabular-nums">
                                {item.student_matricule}
                              </span>
                              {item.group_name && item.group_name !== '—' && (
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  {item.group_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Station Number & Title */}
                      <td className="py-4 px-6">
                        <div className="space-y-1 min-w-0 max-w-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                              <Hash className="size-2.5 text-emerald-500" />
                              Station {item.station_number < 10 ? `0${item.station_number}` : item.station_number}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[140px]">
                              {item.module_name}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 dark:text-slate-200 truncate" title={item.station_title}>
                            {item.station_title}
                          </p>
                        </div>
                      </td>

                      {/* Column 3: Penalty / Deduction Reason */}
                      <td className="py-4 px-6">
                        <div className="space-y-1.5 min-w-0 max-w-sm">
                          {isMajor && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0">
                              <AlertCircle className="size-3 text-rose-500" />
                              <span>Major Safety / Protocol Infraction</span>
                            </span>
                          )}
                          <p className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                            {item.reason}
                          </p>
                          {item.criteria_title && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#12221C] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-emerald-500/20 truncate max-w-xs">
                              <ShieldAlert className="size-3 text-amber-500 shrink-0" />
                              <span className="truncate">{item.criteria_title}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 4: Deduction Amount (Points) */}
                      <td className="py-4 px-6 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-black bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-xs tabular-nums">
                          <MinusCircle className="size-3.5 text-rose-500 shrink-0" />
                          <span>-{item.deduction_amount.toFixed(2)} pts</span>
                        </span>
                      </td>

                      {/* Column 5: Timestamp / Evaluated Date */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 tabular-nums">
                            <Calendar className="size-3 text-slate-400" />
                            {new Date(item.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 tabular-nums">
                            <Clock className="size-3 text-slate-400" />
                            {new Date(item.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary / Pagination Bar */}
        {!loading && displayedPenalties.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200/80 dark:border-emerald-500/15 bg-slate-50/50 dark:bg-[#0B1612] flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>
              Showing {displayedPenalties.length} of {penalties.length} logged deductions
            </span>
            <span className="text-slate-600 dark:text-slate-300 font-mono">
              Total Deducted:{' '}
              <strong className="text-rose-600 dark:text-rose-400 font-black tabular-nums">
                -{displayedPenalties.reduce((sum, p) => sum + p.deduction_amount, 0).toFixed(2)} pts
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Standardized Scoring Presets Modal (Bound to public.station_criteria) */}
      <FrontendTemplateLibraryModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        initialType="penalty"
        title="Station Clinical Deduction Criteria"
        stations={stationsList}
        initialStationId={selectedStationId !== 'all' ? selectedStationId : stationsList[0]?.id}
      />
    </div>
  )
}
