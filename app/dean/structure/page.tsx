'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  ChevronRight,
  FolderPlus,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { useAcademicYear } from '@/context/AcademicYearContext'

export interface AcademicYearOption {
  id: string
  year_label: string
}

export interface StudyLevel {
  id: string
  level_name: string
}

export interface GroupItem {
  id: string
  group_name: string
  section_id: string
  studentsCount: number
}

export interface SectionItem {
  id: string
  section_name: string
  level_id: string
  groups: GroupItem[]
}

export default function AcademicStructurePage() {
  const { showSuccess, showError } = useToast()
  const {
    selectedYearId: globalYearId,
    setSelectedYearId: setGlobalYearId,
    years: globalYears,
  } = useAcademicYear()

  const [studyLevels, setStudyLevels] = useState<StudyLevel[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([])
  const [sections, setSections] = useState<SectionItem[]>([])
  const [selectedYearId, setSelectedYearId] = useState<string>('')
  const [selectedLevelId, setSelectedLevelId] = useState<string>('')
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // In-flight deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Modals state
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false)
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false)
  const [deletingElement, setDeletingElement] = useState<{ type: 'section' | 'group'; id: string; name: string } | null>(null)

  // Form states
  const [sectionName, setSectionName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [formError, setFormError] = useState('')

  // Global Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddSectionOpen(false)
        setIsAddGroupOpen(false)
        setDeletingElement(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const fetchStructure = async (yearId?: string, isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    const targetYearId = yearId || globalYearId

    try {
      const url = targetYearId ? `/api/dean/structure?academic_year_id=${targetYearId}` : '/api/dean/structure'
      const res = await fetch(url)
      const json = await res.json()

      if (res.ok && json.success) {
        if (json.activeYearId) {
          setSelectedYearId(json.activeYearId)
          if (!globalYearId) {
            setGlobalYearId(json.activeYearId)
          }
        }
        setAcademicYears(json.academicYears || [])
        setSections(json.sections || [])

        if (json.studyLevels && json.studyLevels.length > 0) {
          setStudyLevels(json.studyLevels)
          const exists = json.studyLevels.some((l: any) => l.id === selectedLevelId)
          if (!selectedLevelId || !exists) {
            setSelectedLevelId(json.studyLevels[0].id)
          }
        }
      } else {
        showError(json.error || 'Failed to fetch structure.')
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
    if (globalYearId) {
      setSelectedYearId(globalYearId)
      fetchStructure(globalYearId)
    } else {
      fetchStructure()
    }
  }, [globalYearId])

  const filteredSections = sections.filter((s) => s.level_id === selectedLevelId)
  const activeSection = sections.find((s) => s.id === selectedSectionId) || (filteredSections.length > 0 ? filteredSections[0] : null)

  const handleAddSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sectionName.trim()) {
      setFormError('Section name is required (e.g. Section A).')
      return
    }
    if (!selectedLevelId || !selectedYearId) {
      setFormError('Please select a study level and academic year.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const res = await fetch('/api/dean/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'section',
          section_name: sectionName.trim(),
          level_id: selectedLevelId,
        }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Academic section created successfully.')
        setIsAddSectionOpen(false)
        setSectionName('')
        fetchStructure(selectedYearId, true)
      } else {
        const msg = json.error || 'Failed to create section.'
        setFormError(msg)
        showError(msg)
      }
    } catch {
      const msg = 'Network error saving section.'
      setFormError(msg)
      showError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) {
      setFormError('Group name is required (e.g. Group 01).')
      return
    }
    if (!activeSection) {
      setFormError('Please select a parent section.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const res = await fetch('/api/dean/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          group_name: groupName.trim(),
          section_id: activeSection.id,
        }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Rotation group created successfully.')
        setIsAddGroupOpen(false)
        setGroupName('')
        fetchStructure(selectedYearId, true)
      } else {
        const msg = json.error || 'Failed to create group.'
        setFormError(msg)
        showError(msg)
      }
    } catch {
      const msg = 'Network error saving group.'
      setFormError(msg)
      showError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Deletion with In-Flight Row Loading Spinner (Section & Group)
  const handleDeleteConfirm = async () => {
    if (!deletingElement) return
    const target = deletingElement

    // Close modal & set in-flight deleting ID
    setDeletingElement(null)
    setDeletingId(target.id)

    try {
      const res = await fetch(`/api/dean/structure?type=${target.type}&id=${target.id}`, {
        method: 'DELETE',
      })

      const json = await res.json()

      if (res.ok && json.success) {
        if (target.type === 'section') {
          setSections((prev) => prev.filter((s) => s.id !== target.id))
        } else {
          setSections((prev) =>
            prev.map((sec) => ({
              ...sec,
              groups: sec.groups.filter((g) => g.id !== target.id),
            }))
          )
        }
        showSuccess(`${target.type === 'section' ? 'Section' : 'Group'} removed successfully.`)
      } else {
        showError(json.error || `Failed to remove ${target.type}. Please try again.`)
      }
    } catch {
      showError(`Failed to remove ${target.type}. Please try again.`)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Academic Year Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
              Academic Organization
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Academic Hierarchy Manager
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Configure dual-tier academic hierarchy: Study Level &rarr; Sections &rarr; Rotation Squads.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchStructure(globalYearId || selectedYearId, true)}
            disabled={refreshing}
            className="p-2.5 rounded-lg bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#161B2A] transition-all"
            title="Refresh structure"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Segmented Pill Control for Study Level Navigation */}
      <div className="sticky top-20 z-10 p-1.5 rounded-xl bg-white/80 dark:bg-[#0F121C]/80 backdrop-blur-md border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex items-center gap-1.5 overflow-x-auto">
        {studyLevels.map((lvl) => {
          const isActive = lvl.id === selectedLevelId
          return (
            <button
              key={lvl.id}
              onClick={() => {
                setSelectedLevelId(lvl.id)
                setSelectedSectionId('')
              }}
              className={`px-4 py-2 rounded-lg font-semibold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-[#161B2A]/70'
              }`}
            >
              <GraduationCap className={`size-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{lvl.level_name}</span>
            </button>
          )
        })}
      </div>

      {/* Cascading Content: Left (Sections List) & Right (Groups Roster) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Sections Tier (Master List) */}
        <div className="lg:col-span-5 rounded-xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Academic Sections</h3>
              <p className="text-[11px] text-slate-400">Available sections for selected level</p>
            </div>
            <button
              onClick={() => {
                setSectionName('')
                setFormError('')
                setIsAddSectionOpen(true)
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 transition-colors font-semibold text-xs flex items-center gap-1.5"
            >
              <Plus className="size-3.5" />
              Add Section
            </button>
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <div className="space-y-2.5 animate-pulse">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={`skel-sec-${idx}`}
                    className="p-4 rounded-xl border border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#161B2A]/40 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-slate-200 dark:bg-[#161B2A]" />
                      <div className="space-y-1.5">
                        <div className="h-4 w-28 rounded bg-slate-200 dark:bg-[#161B2A]" />
                        <div className="h-3 w-16 rounded bg-slate-200/70 dark:bg-[#161B2A]/70" />
                      </div>
                    </div>
                    <div className="size-6 rounded bg-slate-200 dark:bg-[#161B2A]" />
                  </div>
                ))}
              </div>
            ) : filteredSections.length > 0 ? (
              filteredSections.map((sec) => {
                const isSelected = activeSection?.id === sec.id
                const isDeleting = deletingId === sec.id
                return (
                  <div
                    key={sec.id}
                    onClick={() => !isDeleting && setSelectedSectionId(sec.id)}
                    className={`relative group p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      isDeleting
                        ? 'opacity-50 pointer-events-none bg-slate-100/50 dark:bg-[#161B2A]/50'
                        : isSelected
                        ? 'border-indigo-500/60 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-[0_0_16px_rgba(79,70,229,0.08)] ring-1 ring-indigo-500/30'
                        : 'border-slate-200/80 dark:border-white/[0.06] bg-slate-50/40 dark:bg-[#161B2A]/30 hover:border-slate-300 dark:hover:border-white/[0.12] hover:bg-slate-50 dark:hover:bg-[#161B2A]/70'
                    }`}
                  >
                    {/* Left Accent indicator for active item */}
                    {isSelected && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-[#4F46E5] shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                    )}

                    <div className="flex items-center gap-3 pl-1.5">
                      <div className={`size-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isSelected 
                          ? 'bg-[#4F46E5] text-white shadow-xs' 
                          : 'bg-slate-200/70 dark:bg-[#161B2A] text-slate-600 dark:text-slate-300 border border-slate-300/50 dark:border-white/[0.05]'
                      }`}>
                        <Layers className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{sec.section_name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-medium">{sec.groups.length} Rotation Squads</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingElement({ type: 'section', id: sec.id, name: sec.section_name })
                        }}
                        disabled={isDeleting}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                        title="Delete section"
                      >
                        {isDeleting ? (
                          <Loader2 className="size-4 animate-spin text-indigo-500" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </button>
                      <ChevronRight className={`size-4 transition-transform ${isSelected ? 'text-indigo-500 translate-x-0.5' : 'text-slate-400'}`} />
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-white/[0.08] rounded-xl">
                No sections defined for this level.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Rotation Groups Roster (Detail Canvas) */}
        <div className="lg:col-span-7 rounded-xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {activeSection ? `Rotation Groups · ${activeSection.section_name}` : 'Rotation Groups Roster'}
              </h3>
              <p className="text-[11px] text-slate-400">Student candidate distribution & squad capacity telemetry</p>
            </div>
            {activeSection && (
              <button
                onClick={() => {
                  setGroupName('')
                  setFormError('')
                  setIsAddGroupOpen(true)
                }}
                className="px-3 py-1.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-xs shadow-sm shadow-indigo-500/20 transition-all flex items-center gap-1.5"
              >
                <Plus className="size-3.5" />
                Add Group
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={`skel-grp-${idx}`}
                  className="p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#161B2A]/40 space-y-3 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-slate-200 dark:bg-[#161B2A] shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-[#161B2A]" />
                      <div className="h-2.5 w-32 rounded bg-slate-200/70 dark:bg-[#161B2A]/70" />
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-[#161B2A]" />
                </div>
              ))
            ) : activeSection && activeSection.groups.length > 0 ? (
              activeSection.groups.map((grp) => {
                const isDeleting = deletingId === grp.id
                const targetCapacity = 30
                const enrolled = grp.studentsCount || 0
                const percent = Math.min(100, Math.round((enrolled / targetCapacity) * 100))
                const isNearCapacity = percent >= 80

                return (
                  <div
                    key={grp.id}
                    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between space-y-3 ${
                      isDeleting
                        ? 'opacity-50 pointer-events-none bg-slate-100/50 dark:bg-[#161B2A]/50 border-slate-200 dark:border-white/[0.08]'
                        : 'border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#161B2A]/40 hover:bg-slate-50 dark:hover:bg-[#161B2A]/70 hover:border-slate-300 dark:hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs shrink-0">
                          <Users className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{grp.group_name}</p>
                          <span className="text-[10px] text-slate-400 font-medium">Candidate Rotation Unit</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setDeletingElement({ type: 'group', id: grp.id, name: grp.group_name })}
                        disabled={isDeleting}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                        title="Remove group"
                      >
                        {isDeleting ? (
                          <Loader2 className="size-4 animate-spin text-indigo-500" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Visual Candidate Capacity Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Capacity:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {enrolled} <span className="text-slate-400 font-normal">/ {targetCapacity} enrolled</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-white/[0.08] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isNearCapacity
                              ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                              : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                          }`}
                          style={{ width: `${Math.max(6, percent)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="sm:col-span-2 py-14 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-white/[0.08] rounded-xl">
                {activeSection ? 'No rotation groups added to this section yet.' : 'Select an academic section on the left to inspect squad roster.'}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ADD SECTION MODAL */}
      {isAddSectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <FolderPlus className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Academic Section</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Create new section for selected level.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddSectionOpen(false)}
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

            <form onSubmit={handleAddSectionSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Section Name
                </label>
                <input
                  type="text"
                  required
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="e.g. Section A"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#161B2A] border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsAddSectionOpen(false)}
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
                  <span>Create Section</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD GROUP MODAL */}
      {isAddGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Users className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Rotation Group</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Create student rotation squad in {activeSection?.section_name}.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddGroupOpen(false)}
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

            <form onSubmit={handleAddGroupSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Group 01"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#161B2A] border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsAddGroupOpen(false)}
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
                  <span>Create Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingElement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="size-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Remove {deletingElement.type === 'section' ? 'Section' : 'Rotation Group'}?
                </h3>
                <p className="text-xs text-slate-400">Structural deletion alert.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-900 dark:text-white">{deletingElement.name}</strong>? This will cascade to related dependencies.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                onClick={() => setDeletingElement(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161B2A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold shadow-sm shadow-rose-600/25 flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                <span>Remove Element</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
