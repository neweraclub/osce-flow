'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Edit2,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { Select, SelectOption } from '@/components/ui/Select'
import { FilterDropdown } from '@/components/ui/FilterDropdown'
import { TableToolbar } from '@/components/ui/TableToolbar'
import { useToast } from '@/context/ToastContext'
import { useAcademicYear } from '@/context/AcademicYearContext'
import { getModuleVisual } from '@/utils/getModuleIcon'
import { ModuleSpecialtyBadge } from '@/components/dean/ModuleSpecialtyBadge'

export interface ResponsibleProfessor {
  id: string
  first_name: string
  last_name: string
  full_name: string
  email?: string
}

export interface ClinicalModule {
  id: string
  module_name: string
  level_id: string
  level_name: string
  responsible_prof_id?: string
  responsible_prof_name: string
  responsible_professor?: ResponsibleProfessor | null
  station_count: number
  created_at: string
}

export interface StudyLevelOption {
  id: string
  level_name: string
}

export interface ProfessorOption {
  id: string
  first_name: string
  last_name: string
  full_name?: string
  email?: string
}

export default function ClinicalModulesPage() {
  const { showSuccess, showError } = useToast()
  const {
    selectedYearId,
    selectedYear,
    isLoading: isYearLoading,
  } = useAcademicYear()

  const [modules, setModules] = useState<ClinicalModule[]>([])
  const [studyLevels, setStudyLevels] = useState<StudyLevelOption[]>([])
  const [professors, setProfessors] = useState<ProfessorOption[]>([])

  const [filterLevelId, setFilterLevelId] = useState<string>('')
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [updatingProfId, setUpdatingProfId] = useState<string | null>(null)

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<ClinicalModule | null>(null)
  const [deletingModule, setDeletingModule] = useState<ClinicalModule | null>(null)

  // Form states
  const [moduleName, setModuleName] = useState('')
  const [selectedLevelId, setSelectedLevelId] = useState('')
  const [selectedProfId, setSelectedProfId] = useState('')
  const [formError, setFormError] = useState('')

  // Global Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddOpen(false)
        setEditingModule(null)
        setDeletingModule(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const fetchModules = async (yearId?: string | null, isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    const targetYearId = yearId || selectedYearId

    try {
      const url = targetYearId ? `/api/dean/modules?academic_year_id=${targetYearId}` : '/api/dean/modules'
      const res = await fetch(url)
      const json = await res.json()

      if (res.ok && json.success) {
        setModules(json.modules || [])
        setStudyLevels(json.studyLevels || [])
        setProfessors(json.professors || [])
      } else {
        showError(json.error || 'Failed to fetch clinical modules.')
      }
    } catch {
      showError('Network error connecting to server.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Cascade refetch whenever global academic year changes
  useEffect(() => {
    if (selectedYearId) {
      fetchModules(selectedYearId)
    } else if (!isYearLoading) {
      fetchModules(null)
    }
  }, [selectedYearId, isYearLoading])

  // Quick inline professor reassignment
  const handleQuickReassignProf = async (moduleId: string, profId: string) => {
    setUpdatingProfId(moduleId)
    const targetProf = professors.find((p) => p.id === profId)

    try {
      const res = await fetch('/api/dean/modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: moduleId,
          responsible_prof_id: profId || null,
        }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        setModules((prev) =>
          prev.map((m) => {
            if (m.id === moduleId) {
              return {
                ...m,
                responsible_prof_id: profId || undefined,
                responsible_prof_name: targetProf ? (targetProf.full_name || `Prof. ${targetProf.first_name} ${targetProf.last_name}`) : 'Unassigned',
                responsible_professor: targetProf
                  ? {
                      id: targetProf.id,
                      first_name: targetProf.first_name,
                      last_name: targetProf.last_name,
                      full_name: targetProf.full_name || `Prof. ${targetProf.first_name} ${targetProf.last_name}`,
                      email: targetProf.email,
                    }
                  : null,
              }
            }
            return m
          })
        )
        showSuccess('Lead examiner reassigned successfully.')
      } else {
        showError(json.error || 'Failed to reassign professor.')
      }
    } catch {
      showError('Network error reassigning professor.')
    } finally {
      setUpdatingProfId(null)
    }
  }

  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      const matchesLevel = !filterLevelId || m.level_id === filterLevelId
      const matchesSearch =
        m.module_name.toLowerCase().includes(search.toLowerCase()) ||
        m.level_name.toLowerCase().includes(search.toLowerCase()) ||
        m.responsible_prof_name.toLowerCase().includes(search.toLowerCase())
      return matchesLevel && matchesSearch
    })
  }, [modules, filterLevelId, search])

  // Group modules by Study Level for structured view
  const groupedModulesByLevel = useMemo(() => {
    const map = new Map<string, { levelName: string; modules: ClinicalModule[] }>()
    studyLevels.forEach((lvl) => {
      map.set(lvl.id, { levelName: lvl.level_name, modules: [] })
    })

    filteredModules.forEach((mod) => {
      const existing = map.get(mod.level_id)
      if (existing) {
        existing.modules.push(mod)
      } else {
        map.set(mod.level_id, { levelName: mod.level_name, modules: [mod] })
      }
    })

    return Array.from(map.values()).filter((group) => group.modules.length > 0)
  }, [studyLevels, filteredModules])

  const levelFilterOptions = useMemo(() => {
    return studyLevels.map((l) => ({ label: l.level_name, value: l.id }))
  }, [studyLevels])

  const modalLevelOptions: SelectOption[] = studyLevels.map((l) => ({
    value: l.id,
    label: l.level_name,
  }))

  const modalProfOptions: SelectOption[] = [
    { value: '', label: 'Unassigned Responsible Professor' },
    ...professors.map((p) => ({
      value: p.id,
      label: p.full_name || `Prof. ${p.first_name} ${p.last_name}`,
      subLabel: p.email || undefined,
    })),
  ]

  const openAddModal = () => {
    setModuleName('')
    setSelectedLevelId(studyLevels.length > 0 ? studyLevels[0].id : '')
    setSelectedProfId('')
    setFormError('')
    setIsAddOpen(true)
  }

  const openEditModal = (mod: ClinicalModule) => {
    setEditingModule(mod)
    setModuleName(mod.module_name)
    setSelectedLevelId(mod.level_id)
    setSelectedProfId(mod.responsible_prof_id || '')
    setFormError('')
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!moduleName.trim() || !selectedLevelId) {
      setFormError('Module name and target study level are required.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const res = await fetch('/api/dean/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_name: moduleName.trim(),
          level_id: selectedLevelId,
          responsible_prof_id: selectedProfId || null,
        }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Clinical module registered successfully.')
        setIsAddOpen(false)
        fetchModules(selectedYearId, true)
      } else {
        const msg = json.error || 'Failed to create module.'
        setFormError(msg)
        showError(msg)
      }
    } catch {
      const msg = 'Network error saving module.'
      setFormError(msg)
      showError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingModule) return
    if (!moduleName.trim() || !selectedLevelId) {
      setFormError('Module name and target study level are required.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const res = await fetch('/api/dean/modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingModule.id,
          module_name: moduleName.trim(),
          level_id: selectedLevelId,
          responsible_prof_id: selectedProfId || null,
        }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Clinical module updated successfully.')
        setEditingModule(null)
        fetchModules(selectedYearId, true)
      } else {
        const msg = json.error || 'Failed to update module.'
        setFormError(msg)
        showError(msg)
      }
    } catch {
      const msg = 'Network error updating module.'
      setFormError(msg)
      showError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingModule) return
    setSubmitting(true)

    try {
      const res = await fetch(`/api/dean/modules?id=${deletingModule.id}`, {
        method: 'DELETE',
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Clinical module removed.')
        setDeletingModule(null)
        fetchModules(selectedYearId, true)
      } else {
        showError(json.error || 'Failed to remove module.')
      }
    } catch {
      showError('Network error deleting module.')
    } finally {
      setSubmitting(false)
    }
  }

  const [collapsedLevels, setCollapsedLevels] = useState<Record<string, boolean>>({})

  const toggleLevelCollapse = (levelName: string) => {
    setCollapsedLevels((prev) => ({
      ...prev,
      [levelName]: !prev[levelName],
    }))
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
              Curriculum Architecture
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Clinical Modules Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Clinical medical curriculum modules & lead examiner assignments for <span className="font-semibold text-indigo-500 dark:text-indigo-400 font-mono">{selectedYear?.name || 'current session'}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchModules(selectedYearId, true)}
            disabled={refreshing || isYearLoading}
            className="p-2.5 rounded-lg bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#161B2A] transition-all"
            title="Refresh database records"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs shadow-sm shadow-indigo-500/25 transition-all shrink-0"
          >
            <Plus className="size-4" />
            Add Module
          </button>
        </div>
      </div>

      {/* Unified Toolbar for Search & Level Filtering */}
      <TableToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search module, professor, or specialty..."
        filters={
          <FilterDropdown
            label="Study Level"
            options={levelFilterOptions}
            value={filterLevelId}
            onChange={setFilterLevelId}
            placeholder="All Study Levels"
          />
        }
      />

      {/* Modules Data View: Collapsible Level Accordion Groups */}
      {loading || isYearLoading ? (
        <div className="rounded-xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-sm p-6 space-y-4 animate-pulse">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-slate-200 dark:bg-[#161B2A]" />
              <div className="space-y-1.5">
                <div className="h-4 w-40 rounded bg-slate-200 dark:bg-[#161B2A]" />
                <div className="h-3 w-28 rounded bg-slate-200/70 dark:bg-[#161B2A]/70" />
              </div>
            </div>
            <div className="h-6 w-24 rounded-full bg-slate-200 dark:bg-[#161B2A]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`skel-card-${idx}`} className="h-44 rounded-xl bg-slate-100 dark:bg-[#161B2A]/60" />
            ))}
          </div>
        </div>
      ) : groupedModulesByLevel.length > 0 ? (
        <div className="space-y-5">
          {groupedModulesByLevel.map((group) => {
            const isCollapsed = !!collapsedLevels[group.levelName]

            return (
              <div
                key={group.levelName}
                className="rounded-xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-sm overflow-hidden transition-all duration-200"
              >
                {/* Accordion Group Header */}
                <button
                  type="button"
                  onClick={() => toggleLevelCollapse(group.levelName)}
                  className="w-full p-4 bg-slate-50/70 dark:bg-[#161B2A]/40 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between hover:bg-slate-100/60 dark:hover:bg-[#161B2A]/70 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <GraduationCap className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{group.levelName}</span>
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400">
                          {group.modules.length} {group.modules.length === 1 ? 'module' : 'modules'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Clinical curriculum segment & assigned station hubs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] border border-emerald-500/20">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Active Cohort
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {isCollapsed ? 'Expand' : 'Collapse'}
                    </span>
                  </div>
                </button>

                {/* High-Density Module Cards Grid */}
                {!isCollapsed && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {group.modules.map((m) => {
                      const isUpdatingThis = updatingProfId === m.id
                      const prof = m.responsible_professor

                      return (
                        <div
                          key={m.id}
                          className="rounded-xl bg-slate-50/50 dark:bg-[#161B2A]/50 border border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] p-4 flex flex-col justify-between space-y-3.5 transition-all shadow-2xs hover:shadow-xs group"
                        >
                          {/* Structured Header Ribbon */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-[#0F121C] text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-white/[0.06]">
                                {m.level_name}
                              </span>
                              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                                {m.station_count} {m.station_count === 1 ? 'Station' : 'Stations'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <ModuleSpecialtyBadge moduleName={m.module_name} size="md" />
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {m.module_name}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ID: {m.id.substring(0, 8)}
                                  </span>
                                  <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                                    {getModuleVisual(m.module_name).specialty}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* In-Card Lead Professor Avatar Chip with Inline Select Popover */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-medium">Lead Examiner:</span>
                              {prof?.email && (
                                <span className="text-slate-400 font-mono text-[10px] truncate max-w-[140px]">
                                  {prof.email}
                                </span>
                              )}
                            </div>

                            <div className="relative">
                              <Select
                                options={[
                                  { value: '', label: '— Unassigned Lead —' },
                                  ...professors.map((p) => ({
                                    value: p.id,
                                    label: p.full_name || `Prof. ${p.first_name} ${p.last_name}`,
                                    subLabel: p.email || undefined,
                                  })),
                                ]}
                                value={m.responsible_prof_id || ''}
                                onChange={(val) => handleQuickReassignProf(m.id, val)}
                                disabled={isUpdatingThis}
                                placeholder="Unassigned Lead Examiner"
                                searchable={professors.length > 5}
                                size="sm"
                              />
                            </div>
                          </div>

                          {/* Card Footer Actions */}
                          <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-mono">
                              {m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}
                            </span>
                            <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(m)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                                title="Edit Module"
                              >
                                <Edit2 className="size-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingModule(m)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                title="Delete Module"
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
            )
          })}
        </div>
      ) : (
        <div className="p-12 rounded-xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] text-center text-slate-400">
          <BookOpen className="size-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
            No clinical modules found
          </p>
          <p className="text-xs text-slate-400">
            There are no clinical modules registered for {selectedYear?.name || 'this academic session'}.
          </p>
        </div>
      )}

      {/* ADD MODULE MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <ModuleSpecialtyBadge moduleName={moduleName || 'Cardiologie'} size="sm" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Clinical Module</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Register new clinical module for {selectedYear?.name || 'session'}.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#161B2A] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Module Name
                </label>
                <input
                  type="text"
                  required
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  placeholder="e.g. Cardiologie"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#161B2A] border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              {studyLevels.length === 0 ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                  No study levels found for {selectedYear?.name || 'this session'}. Please add study levels in Academic Structure before registering modules.
                </div>
              ) : (
                <div>
                  <Select
                    label="Target Study Level"
                    options={modalLevelOptions}
                    value={selectedLevelId}
                    onChange={setSelectedLevelId}
                  />
                </div>
              )}

              <div>
                <Select
                  label="Responsible Lead Professor"
                  options={modalProfOptions}
                  value={selectedProfId}
                  onChange={setSelectedProfId}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161B2A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-sm shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  <span>Save Module</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODULE MODAL */}
      {editingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <ModuleSpecialtyBadge moduleName={moduleName || 'Clinical Module'} size="sm" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Clinical Module</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Update module name, level, and assigned professor.</p>
                </div>
              </div>
              <button
                onClick={() => setEditingModule(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#161B2A] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Module Name
                </label>
                <input
                  type="text"
                  required
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#161B2A] border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div>
                <Select
                  label="Target Study Level"
                  options={modalLevelOptions}
                  value={selectedLevelId}
                  onChange={setSelectedLevelId}
                />
              </div>

              <div>
                <Select
                  label="Responsible Lead Professor"
                  options={modalProfOptions}
                  value={selectedProfId}
                  onChange={setSelectedProfId}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setEditingModule(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161B2A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold shadow-sm shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="size-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Module?</h3>
                <p className="text-xs text-slate-400">Curriculum removal alert.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{deletingModule.module_name}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                onClick={() => setDeletingModule(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161B2A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold shadow-sm shadow-rose-600/25 flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                <span>Remove Module</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
