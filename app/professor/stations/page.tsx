'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  Filter,
  GraduationCap,
  Key,
  LayoutGrid,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react'
import { useAcademicYear } from '@/context/AcademicYearContext'
import { useToast } from '@/context/ToastContext'

export interface StationCardItem {
  id: string
  module_id: string
  station_number: number
  title: string
  access_pin: string
  weightage_percentage: number
  module_name: string
  level_name: string
  exam_count: number
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

  const [stations, setStations] = useState<StationCardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filterModule, setFilterModule] = useState<string>('ALL')

  // PIN Visibility toggles and copy indicators
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({})
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null)

  const fetchStations = async (yearId?: string | null, isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    const targetYearId = yearId || selectedYearId

    try {
      const url = targetYearId
        ? `/api/professor/stations?academic_year_id=${targetYearId}`
        : '/api/professor/stations'
      const res = await fetch(url)
      const json = await res.json()

      if (res.ok && json.success) {
        setStations(json.stations || [])
      } else {
        showError(json.error || 'Failed to fetch clinical stations.')
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
      fetchStations(selectedYearId)
    }
  }, [selectedYearId])

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

  const uniqueModules = useMemo(() => {
    const list = Array.from(new Set(stations.map((s) => s.module_name))).filter(Boolean)
    return list
  }, [stations])

  const filteredStations = useMemo(() => {
    return stations.filter((st) => {
      if (filterModule !== 'ALL' && st.module_name !== filterModule) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchTitle = st.title.toLowerCase().includes(q)
        const matchModule = st.module_name.toLowerCase().includes(q)
        const matchLevel = st.level_name.toLowerCase().includes(q)
        const matchNumber = st.station_number.toString().includes(q)
        if (!matchTitle && !matchModule && !matchLevel && !matchNumber) return false
      }
      return true
    })
  }, [stations, filterModule, search])

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <LayoutGrid className="size-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Clinical Station Blueprints
              </h1>
              <p className="text-xs font-semibold text-slate-400">
                Author exam sessions, questions, and scoring rubrics for your stations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchStations(selectedYearId, true)}
            disabled={refreshing || loading}
            aria-label="Refresh stations list"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
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
            placeholder="Search station title, number, or module..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
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

        {uniqueModules.length > 0 && (
          <div className="w-full md:w-56">
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="ALL">All Clinical Modules</option>
              {uniqueModules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stations Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
          <Loader2 className="size-8 text-emerald-500 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Loading clinical stations...</p>
        </div>
      ) : filteredStations.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
          <div className="size-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <LayoutGrid className="size-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {search || filterModule !== 'ALL' ? 'No matching stations found' : 'No stations available'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {search || filterModule !== 'ALL'
              ? 'Try modifying your search or clearing the module filter.'
              : 'Stations configured by the Dean will appear here for exam authoring.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStations.map((station) => {
            const isPinRevealed = !!revealedPins[station.id]
            const isCopied = copiedPinId === station.id

            return (
              <div
                key={station.id}
                onClick={() => router.push(`/professor/stations/${station.id}`)}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-xs">
                      Station #{station.station_number}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/50">
                      {station.level_name}
                    </span>
                  </div>

                  {/* Title & Module */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                      {station.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <BookOpen className="size-3.5 text-blue-500 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {station.module_name}
                      </span>
                      {station.weightage_percentage > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {station.weightage_percentage}% Weight
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* PIN Container */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Key className="size-3.5 text-amber-500 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                          Access PIN
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white tracking-widest">
                          {isPinRevealed ? station.access_pin : '••••••'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => togglePinReveal(e, station.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
                        aria-label="Toggle PIN Visibility"
                      >
                        {isPinRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                      <button
                        onClick={(e) => handleCopyPin(e, station.id, station.access_pin)}
                        className="p-1 rounded-md text-slate-400 hover:text-emerald-600 transition-all"
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

                {/* Footer Action */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    {station.exam_count} Exam Session{station.exam_count !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                    <span>Manage Station</span>
                    <ChevronRight className="size-4" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
