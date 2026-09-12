'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  Filter,
  GraduationCap,
  Key,
  Layers,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { Select } from '@/components/ui/Select'
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
  level_id?: string
  level_name: string
  academic_year_id?: string
  academic_year_label?: string
  exam_count: number
  created_at?: string
}

export interface AssignedModuleOption {
  id: string
  module_name: string
  level_id: string
  level_name: string
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
  const [assignedModules, setAssignedModules] = useState<AssignedModuleOption[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filterModule, setFilterModule] = useState<string>('ALL')

  // PIN Visibility toggles and copy indicators
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({})
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null)

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingStation, setEditingStation] = useState<StationCardItem | null>(null)
  const [deletingStation, setDeletingStation] = useState<StationCardItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form Fields
  const [formModuleId, setFormModuleId] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formStationNumber, setFormStationNumber] = useState<number>(1)
  const [formAccessPin, setFormAccessPin] = useState('')
  const [formShowPin, setFormShowPin] = useState(true)
  const [formWeightage, setFormWeightage] = useState<number>(10)
  const [formError, setFormError] = useState('')

  // Global ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateOpen(false)
        setEditingStation(null)
        setDeletingStation(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fetch stations and assigned modules
  const fetchData = async (yearId?: string | null, isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    const targetYearId = yearId || selectedYearId

    try {
      const yearQuery = targetYearId ? `?academic_year_id=${targetYearId}` : ''
      const [stationsRes, modulesRes] = await Promise.all([
        fetch(`/api/professor/stations${yearQuery}`),
        fetch(`/api/professor/modules${yearQuery}`),
      ])

      const [stationsJson, modulesJson] = await Promise.all([
        stationsRes.json(),
        modulesRes.json(),
      ])

      if (stationsRes.ok && stationsJson.success) {
        setStations(stationsJson.stations || [])
      } else {
        showError(stationsJson.error || 'Failed to fetch clinical stations.')
      }

      if (modulesRes.ok && modulesJson.success) {
        setAssignedModules(modulesJson.modules || [])
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

  const generateRandomPin = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setFormAccessPin(code)
  }

  // --- Modal Openers ---
  const handleOpenCreate = () => {
    const nextNum = stations.length > 0 ? Math.max(...stations.map((s) => s.station_number)) + 1 : 1
    setFormModuleId(assignedModules.length > 0 ? assignedModules[0].id : '')
    setFormTitle(`Station ${nextNum}: Clinical Skills Assessment`)
    setFormStationNumber(nextNum)
    setFormAccessPin(Math.floor(100000 + Math.random() * 900000).toString())
    setFormShowPin(true)
    setFormWeightage(10)
    setFormError('')
    setIsCreateOpen(true)
  }

  const handleOpenEdit = (e: React.MouseEvent, st: StationCardItem) => {
    e.stopPropagation()
    setEditingStation(st)
    setFormModuleId(st.module_id)
    setFormTitle(st.title)
    setFormStationNumber(st.station_number)
    setFormAccessPin(st.access_pin)
    setFormShowPin(true)
    setFormWeightage(st.weightage_percentage)
    setFormError('')
  }

  // --- Submit Create Station ---
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formModuleId) {
      setFormError('Please select an assigned clinical module.')
      return
    }
    if (!formTitle.trim()) {
      setFormError('Station title is required.')
      return
    }
    if (!formAccessPin || formAccessPin.trim().length < 4) {
      setFormError('Access PIN must be at least 4 characters.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const res = await fetch('/api/professor/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: formModuleId,
          title: formTitle.trim(),
          station_number: formStationNumber,
          access_pin: formAccessPin.trim(),
          weightage_percentage: formWeightage,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('Station created successfully.')
        setIsCreateOpen(false)
        fetchData(selectedYearId, true)
      } else {
        setFormError(json.error || 'Failed to create station.')
      }
    } catch (err: any) {
      setFormError(err?.message || 'Error communicating with server.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Submit Edit Station ---
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStation) return
    if (!formModuleId) {
      setFormError('Please select a module.')
      return
    }
    if (!formTitle.trim()) {
      setFormError('Station title is required.')
      return
    }
    if (!formAccessPin || formAccessPin.trim().length < 4) {
      setFormError('Access PIN must be at least 4 characters.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const res = await fetch(`/api/professor/stations/${editingStation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: formModuleId,
          title: formTitle.trim(),
          station_number: formStationNumber,
          access_pin: formAccessPin.trim(),
          weightage_percentage: formWeightage,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('Station blueprint updated.')
        setEditingStation(null)
        fetchData(selectedYearId, true)
      } else {
        setFormError(json.error || 'Failed to update station.')
      }
    } catch (err: any) {
      setFormError(err?.message || 'Error communicating with server.')
    } finally {
      setSubmitting(false)
    }
  }

  // --- Submit Delete Station ---
  const handleDeleteStation = async () => {
    if (!deletingStation) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/professor/stations/${deletingStation.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Station deleted successfully.')
        setDeletingStation(null)
        fetchData(selectedYearId, true)
      } else {
        showError(json.error || 'Failed to delete station.')
      }
    } catch {
      showError('Network error deleting station.')
    } finally {
      setSubmitting(false)
    }
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
              <Layers className="size-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Clinical Stations
              </h1>
              <p className="text-xs font-semibold text-slate-400">
                Manage your clinical station blueprints, PIN credentials, and exam question rubrics
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => fetchData(selectedYearId, true)}
            disabled={refreshing || loading}
            aria-label="Refresh stations list"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleOpenCreate}
            disabled={assignedModules.length === 0}
            title={
              assignedModules.length === 0
                ? 'You have no assigned modules. Contact the Dean to assign you as lead professor.'
                : 'Create Station'
            }
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="size-4" />
            <span>+ Create Station</span>
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
            <Select
              size="sm"
              value={filterModule}
              onChange={(val) => setFilterModule(val)}
              options={[
                { value: 'ALL', label: 'All Clinical Modules' },
                ...uniqueModules.map((m) => ({ value: m, label: m })),
              ]}
              placeholder="Filter Module"
            />
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
            <Layers className="size-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {search || filterModule !== 'ALL' ? 'No matching stations found' : 'No stations created yet'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {assignedModules.length === 0
              ? 'You have not been assigned to any clinical modules yet. Contact the Dean to assign you as a lead professor.'
              : search || filterModule !== 'ALL'
              ? 'Try modifying your search or clearing the module filter.'
              : 'Click "+ Create Station" to set up your first clinical station blueprint for your assigned modules.'}
          </p>
          {assignedModules.length > 0 && !search && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:bg-emerald-700 transition-all"
            >
              <Plus className="size-4" />
              <span>Create First Station</span>
            </button>
          )}
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
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all cursor-pointer flex flex-col justify-between space-y-4 group relative"
              >
                <div className="space-y-3">
                  {/* Top Badges & Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-xs">
                        Station #{station.station_number}
                      </span>
                      {station.academic_year_label && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                          <Calendar className="size-3 text-blue-500" />
                          {station.academic_year_label}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/50">
                        {station.level_name}
                      </span>
                    </div>

                    {/* Card Actions: Edit & Delete */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleOpenEdit(e, station)}
                        title="Edit Station"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingStation(station)
                        }}
                        title="Delete Station"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Module */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                      {station.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 font-semibold text-xs">
                        <BookOpen className="size-3.5 text-blue-500 shrink-0" />
                        {station.module_name}
                      </span>
                      {station.weightage_percentage > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                          {station.weightage_percentage}% Weight
                        </span>
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

      {/* --- Create / Edit Station Modal --- */}
      {(isCreateOpen || editingStation) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                  <Layers className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingStation ? 'Edit Station Blueprint' : 'Create Station Blueprint'}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {editingStation
                      ? `Updating Station #${editingStation.station_number}`
                      : 'Define clinical station blueprint for your assigned module'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreateOpen(false)
                  setEditingStation(null)
                }}
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

            <form
              onSubmit={editingStation ? handleSubmitEdit : handleSubmitCreate}
              className="space-y-4"
            >
              {/* Module Selection */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Clinical Module * (Only your assigned modules)
                </label>
                <Select
                  size="md"
                  value={formModuleId}
                  onChange={(val) => setFormModuleId(val)}
                  options={assignedModules.map((m) => ({
                    value: m.id,
                    label: `${m.module_name} (${m.level_name})`,
                  }))}
                  placeholder="Select Clinical Module"
                />
              </div>

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
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Station Access PIN */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Access PIN * (Min 4 characters)
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPin}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
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
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold tracking-widest text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                <p className="text-[10px] text-slate-400">
                  Used by the scoring invigilator to unlock the tablet on exam day.
                </p>
              </div>

              {/* Weightage Percentage */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Weightage Percentage (0 - 100%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={formWeightage}
                    onChange={(e) => setFormWeightage(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    %
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false)
                    setEditingStation(null)
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingStation ? 'Save Changes' : 'Create Station'}</span>
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
                Delete Station #{deletingStation.station_number}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to remove{' '}
                <strong className="text-slate-800 dark:text-slate-200">{deletingStation.title}</strong>
                ? All associated exam sessions and questions will be permanently deleted.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeletingStation(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStation}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/25 hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Deleting...</span>
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
