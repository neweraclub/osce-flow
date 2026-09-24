'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowUpDown,
  Award,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Filter,
  GraduationCap,
  Hash,
  Layers,
  Loader2,
  Medal,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react'
import { useAcademicYear } from '@/context/AcademicYearContext'
import { useToast } from '@/context/ToastContext'

export interface BonusRecord {
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
  bonus_amount: number
  points: number
  evaluator_name: string
  created_at: string
}

export interface SummaryMetrics {
  total_bonuses: number
  total_points_awarded: number
  average_bonus: number
  rewarded_students_count: number
  rewarded_stations_count: number
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

export interface ProfessorContext {
  id?: string
  name?: string
  faculty_name?: string
  email?: string
}

type SortField = 'date_desc' | 'date_asc' | 'points_desc' | 'points_asc' | 'student_name'

const SORT_OPTIONS: { value: SortField; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'date_desc', label: 'Date (Newest First)', icon: Clock },
  { value: 'date_asc', label: 'Date (Oldest First)', icon: Calendar },
  { value: 'points_desc', label: 'Points (Highest First)', icon: ArrowUpDown },
  { value: 'points_asc', label: 'Points (Lowest First)', icon: ArrowUpDown },
  { value: 'student_name', label: 'Student Name (A-Z)', icon: Users },
]

export default function ProfessorBonusesPage() {
  const { selectedYear, selectedYearId } = useAcademicYear()
  const { showError, showSuccess } = useToast()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [bonuses, setBonuses] = useState<BonusRecord[]>([])
  const [summary, setSummary] = useState<SummaryMetrics>({
    total_bonuses: 0,
    total_points_awarded: 0,
    average_bonus: 0,
    rewarded_students_count: 0,
    rewarded_stations_count: 0,
  })
  const [professorInfo, setProfessorInfo] = useState<ProfessorContext | null>(null)

  // Filter options from API
  const [modulesList, setModulesList] = useState<FilterModuleOption[]>([])
  const [stationsList, setStationsList] = useState<FilterStationOption[]>([])

  // User filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all')
  const [selectedStationId, setSelectedStationId] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<SortField>('date_desc')

  // Custom Popover Dropdown States & Refs
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false)
  const [stationDropdownOpen, setStationDropdownOpen] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  const moduleDropdownRef = useRef<HTMLDivElement>(null)
  const stationDropdownRef = useRef<HTMLDivElement>(null)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  // Fetch active professor session fallback
  useEffect(() => {
    async function fetchSessionInfo() {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.user) {
            const fn = (data.user.firstName || '').trim()
            const ln = (data.user.lastName || '').trim()
            const raw = `${fn} ${ln}`.trim()
            const formatted = raw ? (raw.startsWith('Prof.') ? raw : `Prof. ${raw}`) : 'Professor'
            setProfessorInfo((prev) => ({
              ...prev,
              name: prev?.name || formatted,
              faculty_name: prev?.faculty_name || data.user.facultyName || 'Faculté de Médecine',
              email: prev?.email || data.user.email,
            }))
          }
        }
      } catch {
        // Non-critical session fallback
      }
    }
    fetchSessionInfo()

    const handleUserUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail) {
        const fn = (detail.firstName || '').trim()
        const ln = (detail.lastName || '').trim()
        const raw = `${fn} ${ln}`.trim()
        const formatted = raw ? (raw.startsWith('Prof.') ? raw : `Prof. ${raw}`) : 'Professor'
        setProfessorInfo((prev) => ({
          ...prev,
          name: formatted,
          faculty_name: detail.facultyName || prev?.faculty_name || 'Faculté de Médecine',
        }))
      }
    }

    window.addEventListener('ecos:user-updated', handleUserUpdate)
    return () => {
      window.removeEventListener('ecos:user-updated', handleUserUpdate)
    }
  }, [])

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

  const fetchBonusesData = async (isManualRefresh = false) => {
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

      const res = await fetch(`/api/professor/bonuses?${params.toString()}`)
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load merit points and clinical bonuses.')
      }

      setBonuses(json.bonuses || [])
      if (json.summary) {
        setSummary(json.summary)
      }
      if (json.filters?.modules) {
        setModulesList(json.filters.modules)
      }
      if (json.filters?.stations) {
        setStationsList(json.filters.stations)
      }
      if (json.professor) {
        setProfessorInfo((prev) => ({
          ...prev,
          ...json.professor,
        }))
      }

      if (isManualRefresh) {
        showSuccess('Merit bonuses data refreshed successfully.')
      }
    } catch (err: any) {
      console.error('Error fetching bonuses:', err)
      showError(err?.message || 'Error connecting to bonuses service.')
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
    fetchBonusesData()
  }, [selectedYearId, selectedYear?.id, selectedModuleId, selectedStationId])

  // Available stations filtered by selected module
  const filteredStationOptions = useMemo(() => {
    if (selectedModuleId === 'all') return stationsList
    return stationsList.filter((s) => s.moduleId === selectedModuleId)
  }, [stationsList, selectedModuleId])

  // Client-side sorting and text filtering for instant responsiveness
  const displayedBonuses = useMemo(() => {
    let list = [...bonuses]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (b) =>
          b.student_name.toLowerCase().includes(q) ||
          b.student_matricule.toLowerCase().includes(q) ||
          b.reason.toLowerCase().includes(q) ||
          b.station_title.toLowerCase().includes(q) ||
          b.module_name.toLowerCase().includes(q)
      )
    }

    list.sort((a, b) => {
      switch (sortOrder) {
        case 'date_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'points_desc':
          return b.bonus_amount - a.bonus_amount
        case 'points_asc':
          return a.bonus_amount - b.bonus_amount
        case 'student_name':
          return a.student_name.localeCompare(b.student_name)
        default:
          return 0
      }
    })

    return list
  }, [bonuses, searchQuery, sortOrder])

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
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Page Header & Professor Identity Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
              <Sparkles className="size-3 text-emerald-600 dark:text-emerald-400" />
              <span>Clinical Merit & Recognition</span>
            </span>

            {professorInfo?.name && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-[#12221C] text-slate-700 dark:text-emerald-300 border border-slate-200/80 dark:border-emerald-500/20">
                <User className="size-3 text-emerald-600 dark:text-emerald-400" />
                <span>{professorInfo.name}</span>
                {professorInfo.faculty_name && (
                  <span className="text-slate-400 font-normal">
                    • {professorInfo.faculty_name}
                  </span>
                )}
              </span>
            )}

            {selectedYear && (
              <span className="text-xs font-semibold text-slate-400">
                • {selectedYear.year_label}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Clinical Bonuses & Merit Points
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
            Live auditing records of student merit points, protocol mastery, and exceptional clinical performances awarded across your assigned modules.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
          <button
            onClick={() => fetchBonusesData(true)}
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
        {/* Card 1: Total Bonuses */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/15 shadow-xs space-y-3 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Total Bonuses
            </span>
            <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-xs">
              <Sparkles className="size-5" />
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-8 w-16 bg-slate-100 dark:bg-emerald-950/40 rounded-lg animate-pulse" />
            ) : (
              <div className="text-3xl font-mono font-black text-slate-900 dark:text-white tabular-nums">
                {summary.total_bonuses}
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Awarded merit & stellar actions
            </p>
          </div>
        </div>

        {/* Card 2: Cumulative Gained Points */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/15 shadow-xs space-y-3 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Cumulative Gained Points
            </span>
            <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-xs">
              <TrendingUp className="size-5" />
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 dark:bg-emerald-950/40 rounded-lg animate-pulse" />
            ) : (
              <div className="text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{summary.total_points_awarded.toFixed(2)} <span className="text-sm font-bold text-emerald-500/70">pts</span>
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Cumulative positive score gain
            </p>
          </div>
        </div>

        {/* Card 3: Average Bonus */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/15 shadow-xs space-y-3 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Average Bonus
            </span>
            <div className="size-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30 shadow-xs">
              <Award className="size-5" />
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-8 w-20 bg-slate-100 dark:bg-emerald-950/40 rounded-lg animate-pulse" />
            ) : (
              <div className="text-3xl font-mono font-black text-teal-600 dark:text-teal-400 tabular-nums">
                +{summary.average_bonus.toFixed(2)} <span className="text-sm font-bold text-teal-500/70">pts</span>
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Average gain per merit record
            </p>
          </div>
        </div>

        {/* Card 4: Unique Rewarded Students */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/15 shadow-xs space-y-3 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Unique Rewarded Students
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
                {summary.rewarded_students_count}
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Across {summary.rewarded_stations_count} clinical stations
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
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
            <span>
              Showing <strong className="text-slate-700 dark:text-slate-200">{displayedBonuses.length}</strong> of{' '}
              {bonuses.length} recorded merit bonuses
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
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

      {/* 4. Tabular View of Clinical Merit Bonuses */}
      <div className="rounded-xl bg-white dark:bg-[#0B1612] border border-slate-200/80 dark:border-emerald-500/15 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-4">
            <Loader2 className="size-8 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400">Loading clinical merit & bonus records...</p>
          </div>
        ) : displayedBonuses.length === 0 ? (
          <div className="p-12 md:p-16 text-center space-y-4">
            <div className="size-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
              {hasActiveFilters ? <Filter className="size-8" /> : <Award className="size-8" />}
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {hasActiveFilters ? 'No Matching Bonuses Found' : 'No Merit Points Logged Yet'}
              </h3>
              <p className="text-xs text-slate-400">
                {hasActiveFilters
                  ? 'No bonus records match your current search criteria or filter selections. Try adjusting or clearing your filters.'
                  : 'Merit points or exceptional performance bonuses awarded by examiners will automatically appear in this central audit log.'}
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
                  <th className="py-3.5 px-6">Bonus Reason / Merit Description</th>
                  <th className="py-3.5 px-6 text-right">Bonus (Points)</th>
                  <th className="py-3.5 px-6">Evaluator & Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-500/10 text-xs">
                {displayedBonuses.map((item) => {
                  const initials =
                    item.student_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || 'ST'

                  const isMajorMerit = item.bonus_amount >= 1.0

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

                      {/* Column 3: Bonus Reason / Merit Description */}
                      <td className="py-4 px-6">
                        <div className="space-y-1.5 min-w-0 max-w-sm">
                          {isMajorMerit && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                              <Sparkles className="size-3 text-emerald-600 dark:text-emerald-400" />
                              <span>Exceptional Clinical Performance</span>
                            </span>
                          )}
                          <p className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                            {item.reason}
                          </p>
                          {item.criteria_title && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50/70 dark:bg-[#12221C] text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20 truncate max-w-xs">
                              <Medal className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="truncate">{item.criteria_title}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 4: Bonus Amount (Points) */}
                      <td className="py-4 px-6 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-black bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs tabular-nums">
                          <PlusCircle className="size-3.5 text-emerald-500 shrink-0" />
                          <span>+{item.bonus_amount.toFixed(2)} pts</span>
                        </span>
                      </td>

                      {/* Column 5: Evaluator & Timestamp */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {item.evaluator_name || 'Station Evaluator'}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            <span className="flex items-center gap-1 tabular-nums">
                              <Calendar className="size-3 text-slate-400" />
                              {new Date(item.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 tabular-nums">
                              <Clock className="size-3 text-slate-400" />
                              {new Date(item.created_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary Bar */}
        {!loading && displayedBonuses.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200/80 dark:border-emerald-500/15 bg-slate-50/50 dark:bg-[#0B1612] flex items-center justify-between text-xs text-slate-400 font-semibold flex-wrap gap-2">
            <span>
              Showing {displayedBonuses.length} of {bonuses.length} awarded merit records
            </span>
            <span className="text-slate-600 dark:text-slate-300 font-mono">
              Total Awarded:{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-black tabular-nums">
                +{displayedBonuses.reduce((sum, b) => sum + b.bonus_amount, 0).toFixed(2)} pts
              </strong>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
