'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  BookOpen,
  Calendar,
  CheckCircle2,
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

export default function ProfessorPenaltiesPage() {
  const { selectedYear } = useAcademicYear()
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

  const fetchPenaltiesData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const params = new URLSearchParams()
      if (selectedYear?.id) {
        params.set('academic_year_id', selectedYear.id)
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

  // Load when academic year or server-side filters change
  useEffect(() => {
    fetchPenaltiesData()
  }, [selectedYear?.id, selectedModuleId, selectedStationId])

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

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedModuleId('all')
    setSelectedStationId('all')
    setSortOrder('date_desc')
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60">
              <ShieldAlert className="size-3 text-rose-600 dark:text-rose-400" />
              <span>Auditing & Safety Compliance</span>
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
            Live records of candidate safety breaches, procedure protocol infractions, and scoring deductions logged during live OSCE evaluations across your assigned modules.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
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
        {/* Card 1: Total Penalties Logged */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Total Penalties Logged
            </span>
            <div className="size-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/60 dark:border-rose-900/60 shadow-xs">
              <ShieldAlert className="size-5" />
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-8 w-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                {summary.total_penalties}
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Protocol breaches & deductions
            </p>
          </div>
        </div>

        {/* Card 2: Total Points Deducted */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Total Points Deducted
            </span>
            <div className="size-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-900/60 shadow-xs">
              <AlertTriangle className="size-5" />
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <div className="text-2xl md:text-3xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                -{summary.total_points_deducted.toFixed(1)} <span className="text-sm font-bold">PTS</span>
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Cumulative examination impact
            </p>
          </div>
        </div>

        {/* Card 3: Average Deduction */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Average Deduction
            </span>
            <div className="size-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-900/60 shadow-xs">
              <Sliders className="size-5" />
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-8 w-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                {summary.average_deduction.toFixed(2)} <span className="text-sm font-bold text-slate-400">PTS</span>
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Average loss per infraction
            </p>
          </div>
        </div>

        {/* Card 4: Impacted Candidates */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Impacted Candidates
            </span>
            <div className="size-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-900/60 shadow-xs">
              <Users className="size-5" />
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-8 w-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
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

          {/* Module Filter Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedModuleId}
              onChange={(e) => {
                setSelectedModuleId(e.target.value)
                setSelectedStationId('all')
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="all">All Assigned Modules ({modulesList.length})</option>
              {modulesList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Station Filter Dropdown */}
          <div className="md:col-span-2">
            <select
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(e.target.value)}
              disabled={filteredStationOptions.length === 0}
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer disabled:opacity-50"
            >
              <option value="all">All Stations ({filteredStationOptions.length})</option>
              {filteredStationOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  Station #{s.number} - {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order Selector */}
          <div className="md:col-span-2">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortField)}
              className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="date_desc">Date (Newest First)</option>
              <option value="date_asc">Date (Oldest First)</option>
              <option value="points_desc">Points (Highest First)</option>
              <option value="points_asc">Points (Lowest First)</option>
              <option value="student_name">Student Name (A-Z)</option>
            </select>
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
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-4">
            <Loader2 className="size-8 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400">Loading clinical deduction records...</p>
          </div>
        ) : displayedPenalties.length === 0 ? (
          <div className="p-12 md:p-16 text-center space-y-4">
            <div className="size-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs">
              {hasActiveFilters ? <Filter className="size-8" /> : <ShieldCheck className="size-8" />}
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {hasActiveFilters ? 'No Matching Deductions Found' : 'No Clinical Penalties Logged'}
              </h3>
              <p className="text-xs text-slate-400">
                {hasActiveFilters
                  ? 'No deduction records match your current search criteria or filter selections. Try adjusting or clearing your filters.'
                  : 'All candidates in your assigned stations and modules have completed evaluations without recorded safety infractions or deductions.'}
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
                <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Student / ID</th>
                  <th className="py-4 px-6">Station & Module</th>
                  <th className="py-4 px-6">Infraction Reason</th>
                  <th className="py-4 px-6 text-right">Deduction (Points)</th>
                  <th className="py-4 px-6">Evaluated Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {displayedPenalties.map((item) => {
                  const initials = item.student_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'ST'

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Column 1: Student Name / ID */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700 shadow-xs">
                            {initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {item.student_name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
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
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                              <Hash className="size-2.5 text-emerald-500" />
                              Station {item.station_number}
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
                        <div className="space-y-1 min-w-0 max-w-sm">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                            {item.reason}
                          </p>
                          {item.criteria_title && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700 truncate max-w-xs">
                              <ShieldAlert className="size-3 text-amber-500 shrink-0" />
                              <span className="truncate">{item.criteria_title}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 4: Deduction Amount (Points) */}
                      <td className="py-4 px-6 text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-black bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60 shadow-xs tabular-nums">
                          <MinusCircle className="size-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>-{item.deduction_amount.toFixed(2)} PTS</span>
                        </span>
                      </td>

                      {/* Column 5: Timestamp / Evaluated Date */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Calendar className="size-3 text-slate-400" />
                            {new Date(item.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="size-3 text-slate-400" />
                            {new Date(item.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
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
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-400 font-semibold">
            <span>
              Showing {displayedPenalties.length} of {penalties.length} logged deductions
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              Total Points Deducted:{' '}
              <strong className="text-rose-600 dark:text-rose-400">
                -{displayedPenalties.reduce((sum, p) => sum + p.deduction_amount, 0).toFixed(2)} PTS
              </strong>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
