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

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Clinical Modules Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Clinical medical curriculum modules & lead examiner assignments for <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedYear?.name || 'current session'}</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchModules(selectedYearId, true)}
            disabled={refreshing || isYearLoading}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all"
            title="Refresh database records"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all shrink-0"
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

      {/* Modules Data View Grouped by Study Level */}
      {loading || isYearLoading ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center text-slate-400">
          <Loader2 className="size-6 animate-spin mx-auto mb-2 text-blue-500" />
          Loading clinical modules hierarchy for {selectedYear?.name || 'session'}...
        </div>
      ) : groupedModulesByLevel.length > 0 ? (
        <div className="space-y-6">
          {groupedModulesByLevel.map((group) => (
            <div
              key={group.levelName}
              className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden"
            >
              {/* Group Header */}
              <div className="p-5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <GraduationCap className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {group.levelName}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {group.modules.length} Clinical Module{group.modules.length > 1 ? 's' : ''} Enrolled
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-100/70 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold text-xs">
                  Active Cohort
                </span>
              </div>

              {/* Modules Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-[10px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-3.5">Module Name</th>
                      <th className="px-6 py-3.5">Assigned Lead Professor</th>
                      <th className="px-6 py-3.5">Contact Email</th>
                      <th className="px-6 py-3.5">OSCE Stations</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.modules.map((m) => {
                      const isUpdatingThis = updatingProfId === m.id
                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <BookOpen className="size-4" />
                              </div>
                              <span>{m.module_name}</span>
                            </div>
                          </td>

                          {/* Quick Professor Reassignment Select Cell */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5 max-w-xs min-w-[220px]">
                              {isUpdatingThis ? (
                                <Loader2 className="size-4 animate-spin text-sky-600 shrink-0" />
                              ) : (
                                <Stethoscope className="size-4 text-slate-400 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
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
                                  placeholder="Unassigned Lead"
                                  searchable={professors.length > 5}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            {m.responsible_professor?.email ? (
                              <span className="font-mono text-slate-600 dark:text-slate-300">
                                {m.responsible_professor.email}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                            )}
                          </td>

                          <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {m.station_count} Station{m.station_count !== 1 ? 's' : ''}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(m)}
                                className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                                title="Edit Module"
                              >
                                <Edit2 className="size-4" />
                              </button>
                              <button
                                onClick={() => setDeletingModule(m)}
                                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="Delete Module"
                              >
                                <Trash2 className="size-4" />
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
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center text-slate-400">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Clinical Module</h3>
                  <p className="text-xs text-slate-500">Register new clinical module for {selectedYear?.name || 'session'}.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Module Name
                </label>
                <input
                  type="text"
                  required
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  placeholder="e.g. Cardiologie"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {studyLevels.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-300">
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

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  <span>Save Module</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODULE MODAL */}
      {editingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Edit2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Clinical Module</h3>
                  <p className="text-xs text-slate-500">Update module name, level, and assigned professor.</p>
                </div>
              </div>
              <button
                onClick={() => setEditingModule(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Module Name
                </label>
                <input
                  type="text"
                  required
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingModule(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="size-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Module?</h3>
                <p className="text-xs text-slate-500">Curriculum removal alert.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{deletingModule.module_name}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setDeletingModule(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>Remove Module</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
