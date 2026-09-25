'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  AlertTriangle,
  Search,
  RotateCcw,
  Sliders,
  Layers,
  ChevronDown,
  Database,
  Loader2,
  Check,
} from 'lucide-react'
import {
  PenaltyBonusTemplate,
  mapStationCriterionToTemplate,
  mapStationBonusToTemplate,
} from '@/lib/penaltyBonusTemplates'
import {
  getStationCriteriaAction,
  createStationCriterionAction,
  updateStationCriterionAction,
  deleteStationCriterionAction,
  seedStandardStationCriteriaAction,
} from '@/app/actions/stationCriteria'
import {
  getStationBonusesAction,
  createStationBonusAction,
  updateStationBonusAction,
  deleteStationBonusAction,
  seedStandardStationBonusesAction,
} from '@/app/actions/stationBonuses'
import { useToast } from '@/context/ToastContext'

interface StationOption {
  id: string
  title: string
  number: number
}

interface FrontendTemplateLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  initialType?: 'all' | 'penalty' | 'bonus'
  title?: string
  stations?: StationOption[]
  initialStationId?: string
}

export function FrontendTemplateLibraryModal({
  isOpen,
  onClose,
  initialType = 'all',
  title = 'Station Scoring Criteria & Bonuses (Database)',
  stations = [],
  initialStationId,
}: FrontendTemplateLibraryModalProps) {
  const { showSuccess, showError } = useToast()

  const [activeStationId, setActiveStationId] = useState<string>(
    initialStationId || stations[0]?.id || ''
  )
  const [stationDropdownOpen, setStationDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<PenaltyBonusTemplate[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'penalty' | 'bonus'>(initialType)
  const [searchQuery, setSearchQuery] = useState('')

  // Form Modal state for adding or editing
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PenaltyBonusTemplate | null>(null)
  const [formType, setFormType] = useState<'penalty' | 'bonus'>(
    initialType === 'bonus' ? 'bonus' : 'penalty'
  )
  const [formTitle, setFormTitle] = useState('')
  const [formValue, setFormValue] = useState<string>('0.5')
  const [formNote, setFormNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Sync activeStationId when initialStationId or stations change
  useEffect(() => {
    if (initialStationId) {
      setActiveStationId(initialStationId)
    } else if (stations.length > 0 && !activeStationId) {
      setActiveStationId(stations[0].id)
    }
  }, [initialStationId, stations, activeStationId])

  // Fetch from public.station_criteria and public.station_bonuses
  const fetchStationData = async (stationId: string) => {
    if (!stationId) return
    setLoading(true)
    try {
      const [criteriaRes, bonusesRes] = await Promise.all([
        getStationCriteriaAction(stationId),
        getStationBonusesAction(stationId),
      ])

      const penalties: PenaltyBonusTemplate[] = (criteriaRes.criteria || []).map(
        mapStationCriterionToTemplate
      )
      const bonuses: PenaltyBonusTemplate[] = (bonusesRes.bonuses || []).map(
        mapStationBonusToTemplate
      )

      setTemplates([...penalties, ...bonuses])
    } catch (err: any) {
      showError(err?.message || 'Failed to load station criteria from database.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && activeStationId) {
      fetchStationData(activeStationId)
      setActiveTab(initialType)
    }
  }, [isOpen, activeStationId, initialType])

  // Filtered list
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesType = activeTab === 'all' || tpl.type === activeTab
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        tpl.title.toLowerCase().includes(q) ||
        tpl.default_note.toLowerCase().includes(q) ||
        String(Math.abs(tpl.default_value)).includes(q)
      return matchesType && matchesSearch
    })
  }, [templates, activeTab, searchQuery])

  const penaltyCount = useMemo(() => templates.filter((t) => t.type === 'penalty').length, [templates])
  const bonusCount = useMemo(() => templates.filter((t) => t.type === 'bonus').length, [templates])
  const currentStation = stations.find((s) => s.id === activeStationId)

  const handleOpenCreate = () => {
    if (!activeStationId) {
      showError('Please select a station first.')
      return
    }
    setEditingTemplate(null)
    setFormType(activeTab === 'bonus' ? 'bonus' : 'penalty')
    setFormTitle('')
    setFormValue('0.5')
    setFormNote('')
    setIsEditorOpen(true)
  }

  const handleOpenEdit = (tpl: PenaltyBonusTemplate) => {
    setEditingTemplate(tpl)
    setFormType(tpl.type)
    setFormTitle(tpl.title)
    setFormValue(String(Math.abs(tpl.default_value)))
    setFormNote(tpl.default_note)
    setIsEditorOpen(true)
  }

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeStationId) {
      showError('No station selected.')
      return
    }
    if (!formTitle.trim()) {
      showError('Title is required.')
      return
    }

    const numericVal = parseFloat(formValue)
    if (isNaN(numericVal) || numericVal <= 0) {
      showError('Please enter a positive numeric points value (e.g. 0.5, 1.0).')
      return
    }

    setSubmitting(true)
    try {
      if (editingTemplate) {
        if (formType === 'penalty') {
          // Negative points check constraint: points < 0
          const res = await updateStationCriterionAction({
            id: editingTemplate.id,
            title: formTitle,
            description: formNote,
            points: -Math.abs(numericVal),
            station_id: activeStationId,
          })
          if (!res.success) throw new Error(res.error)
        } else {
          // Positive points check constraint: points > 0
          const res = await updateStationBonusAction({
            id: editingTemplate.id,
            title: formTitle,
            description: formNote,
            points: Math.abs(numericVal),
            station_id: activeStationId,
          })
          if (!res.success) throw new Error(res.error)
        }
        showSuccess(`Updated "${formTitle}" in database.`)
      } else {
        if (formType === 'penalty') {
          // Insert into public.station_criteria (points < 0)
          const res = await createStationCriterionAction({
            station_id: activeStationId,
            title: formTitle,
            description: formNote,
            points: -Math.abs(numericVal),
          })
          if (!res.success) throw new Error(res.error)
        } else {
          // Insert into public.station_bonuses (points > 0)
          const res = await createStationBonusAction({
            station_id: activeStationId,
            title: formTitle,
            description: formNote,
            points: Math.abs(numericVal),
          })
          if (!res.success) throw new Error(res.error)
        }
        showSuccess(`Saved "${formTitle}" to database.`)
      }

      setIsEditorOpen(false)
      await fetchStationData(activeStationId)
    } catch (err: any) {
      showError(err?.message || 'Database error saving item.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, type: 'bonus' | 'penalty', titleStr: string) => {
    try {
      if (type === 'penalty') {
        const res = await deleteStationCriterionAction(id, activeStationId)
        if (!res.success) throw new Error(res.error)
      } else {
        const res = await deleteStationBonusAction(id, activeStationId)
        if (!res.success) throw new Error(res.error)
      }
      showSuccess(`Deleted "${titleStr}" from database.`)
      await fetchStationData(activeStationId)
    } catch (err: any) {
      showError(err?.message || 'Failed to delete criteria.')
    }
  }

  const handleSeedStationPresets = async () => {
    if (!activeStationId) return
    setLoading(true)
    try {
      if (activeTab === 'penalty' || activeTab === 'all') {
        await seedStandardStationCriteriaAction(activeStationId)
      }
      if (activeTab === 'bonus' || activeTab === 'all') {
        await seedStandardStationBonusesAction(activeStationId)
      }
      showSuccess('Seeded standard presets into station database tables.')
      await fetchStationData(activeStationId)
    } catch (err: any) {
      showError(err?.message || 'Failed to seed station presets.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#12221C] border border-slate-200/80 dark:border-emerald-500/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-slate-200/80 dark:border-emerald-500/20 flex items-center justify-between gap-4 bg-slate-50/60 dark:bg-[#0B1612]">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Database className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  {title}
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-700/40">
                  PostgreSQL Tables
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Saved directly to <code className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">station_criteria</code> &amp; <code className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">station_bonuses</code> tables.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreate}
              disabled={!activeStationId}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Add Criterion</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Station Selector & Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-200/60 dark:border-emerald-500/15 bg-white dark:bg-[#12221C] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Station Selector Dropdown */}
          {stations.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setStationDropdownOpen((prev) => !prev)}
                className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-emerald-500/20 text-slate-800 dark:text-slate-200 hover:border-emerald-500 transition-colors cursor-pointer"
              >
                <span>
                  {currentStation
                    ? `Station #${currentStation.number}: ${currentStation.title}`
                    : 'Select Clinical Station'}
                </span>
                <ChevronDown className="size-3.5 text-slate-400" />
              </button>

              {stationDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-72 max-h-56 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 space-y-1">
                  {stations.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setActiveStationId(st.id)
                        setStationDropdownOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors cursor-pointer ${
                        st.id === activeStationId
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="truncate">
                        #{st.number} - {st.title}
                      </span>
                      {st.id === activeStationId && <Check className="size-3.5 text-emerald-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Type Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-[#12221C] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({templates.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('penalty')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'penalty'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              Deductions ({penaltyCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bonus')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'bonus'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              Merit Bonuses ({bonusCount})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-xs">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search criteria or description..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-[#0B1612] border border-slate-200 dark:border-emerald-500/20 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Content Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="size-7 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-semibold">
                Fetching station criteria &amp; bonuses from database...
              </p>
            </div>
          ) : !activeStationId ? (
            <div className="py-16 text-center rounded-2xl bg-slate-50/50 dark:bg-[#0B1612]/50 border border-dashed border-slate-200 dark:border-emerald-500/20 space-y-2">
              <Layers className="size-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Please select a station to configure criteria.
              </p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-14 text-center rounded-2xl bg-slate-50/50 dark:bg-[#0B1612]/50 border border-dashed border-slate-200 dark:border-emerald-500/20 space-y-3">
              <Layers className="size-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                No criteria found in database for this station.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSeedStationPresets}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Seed Standard Presets</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700"
                >
                  <Plus className="size-3.5" />
                  <span>Create Item</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredTemplates.map((tpl) => {
                const isBonus = tpl.type === 'bonus'
                const absPts = Math.abs(tpl.default_value)

                return (
                  <div
                    key={tpl.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between group ${
                      isBonus
                        ? 'bg-emerald-500/[0.04] dark:bg-emerald-950/15 border-emerald-500/25 hover:border-emerald-500/50'
                        : 'bg-rose-500/[0.04] dark:bg-rose-950/15 border-rose-500/25 hover:border-rose-500/50'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isBonus
                                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                            }`}
                          >
                            {isBonus ? (
                              <Sparkles className="size-2.5 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="size-2.5 text-rose-600" />
                            )}
                            <span>{isBonus ? 'Merit Bonus' : 'Deduction'}</span>
                          </span>

                          <span className="font-mono text-[10px] text-slate-400">
                            {isBonus ? 'station_bonuses' : 'station_criteria'}
                          </span>
                        </div>

                        {/* Points badge enforcing signs */}
                        <span
                          className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-lg shrink-0 ${
                            isBonus
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-rose-500 text-white shadow-xs'
                          }`}
                        >
                          {isBonus ? `+${absPts.toFixed(1)}` : `-${absPts.toFixed(1)}`} pts
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {tpl.title}
                        </h4>
                        {tpl.default_note && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {tpl.default_note}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200/50 dark:border-white/[0.05] flex items-center justify-between text-xs text-slate-400">
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
                        ID: {tpl.id.substring(0, 13)}...
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(tpl)}
                          className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                          title="Edit criteria"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tpl.id, tpl.type, tpl.title)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete from database"
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
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-emerald-500/20 bg-slate-50/50 dark:bg-[#0B1612] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleSeedStationPresets}
            disabled={!activeStationId || loading}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="size-3.5" />
            <span>Seed Standard Presets for Station</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* Nested Editor Modal (Create or Edit in DB) */}
        {isEditorOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-white dark:bg-[#12221C] border border-slate-200 dark:border-emerald-500/30 rounded-3xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-emerald-500/20 pb-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="size-4 text-emerald-600" />
                  <span>
                    {editingTemplate ? 'Edit Criterion' : 'New Station Criterion'}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSaveForm} className="space-y-4">
                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Table / Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!!editingTemplate}
                      onClick={() => setFormType('penalty')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formType === 'penalty'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <AlertTriangle className="size-3.5" />
                      <span>station_criteria (&lt; 0)</span>
                    </button>
                    <button
                      type="button"
                      disabled={!!editingTemplate}
                      onClick={() => setFormType('bonus')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formType === 'bonus'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <Sparkles className="size-3.5" />
                      <span>station_bonuses (&gt; 0)</span>
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Minor Aseptic Breach, Exemplary Technique..."
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B1612] border border-slate-200 dark:border-emerald-500/20 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Points Value */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Points Magnitude (Absolute value, e.g. 0.5, 1.0, 2.0) *
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="100"
                    required
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-[#0B1612] border border-slate-200 dark:border-emerald-500/20 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    {formType === 'penalty'
                      ? 'Saved as negative points (< 0) in station_criteria.'
                      : 'Saved as positive points (> 0) in station_bonuses.'}
                  </p>
                </div>

                {/* Description Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Description / Examiner Guidance
                  </label>
                  <textarea
                    rows={2}
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="Clinical justification or observation instructions..."
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B1612] border border-slate-200 dark:border-emerald-500/20 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setIsEditorOpen(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="size-3 animate-spin" />}
                    <span>{editingTemplate ? 'Update in DB' : 'Save to DB'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
