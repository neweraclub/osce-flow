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
  academic_year_id: string
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
          academic_year_id: selectedYearId,
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
    <div className="space-y-6">
      {/* Header & Academic Year Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Academic Hierarchy Manager
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cascading structure: Study Level $\rightarrow$ Section $\rightarrow$ Rotation Squads.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchStructure(globalYearId || selectedYearId, true)}
            disabled={refreshing}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
            title="Refresh structure"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Study Level Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {studyLevels.map((lvl) => {
          const isActive = lvl.id === selectedLevelId
          return (
            <button
              key={lvl.id}
              onClick={() => {
                setSelectedLevelId(lvl.id)
                setSelectedSectionId('')
              }}
              className={`px-5 py-3 rounded-2xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <GraduationCap className="size-4" />
              <span>{lvl.level_name}</span>
            </button>
          )
        })}
      </div>

      {/* Cascading Content: Left (Sections List) & Right (Groups Roster) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Sections Tier */}
        <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Academic Sections</h3>
              <p className="text-xs text-slate-500">Sections for selected study level</p>
            </div>
            <button
              onClick={() => {
                setSectionName('')
                setFormError('')
                setIsAddSectionOpen(true)
              }}
              className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="size-4" />
              Add Section
            </button>
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Loader2 className="size-6 animate-spin mx-auto mb-2 text-blue-500" />
                Loading sections...
              </div>
            ) : filteredSections.length > 0 ? (
              filteredSections.map((sec) => {
                const isSelected = activeSection?.id === sec.id
                const isDeleting = deletingId === sec.id
                return (
                  <div
                    key={sec.id}
                    onClick={() => !isDeleting && setSelectedSectionId(sec.id)}
                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      isDeleting
                        ? 'opacity-50 pointer-events-none bg-slate-100/50 dark:bg-slate-800/50'
                        : isSelected
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-sm'
                        : 'border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        <Layers className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{sec.section_name}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">{sec.groups.length} Rotation Groups</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingElement({ type: 'section', id: sec.id, name: sec.section_name })
                        }}
                        disabled={isDeleting}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                        title="Delete section"
                      >
                        {isDeleting ? (
                          <Loader2 className="size-4 animate-spin text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </button>
                      <ChevronRight className={`size-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                No sections defined for this level.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Groups Tier */}
        <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {activeSection ? `Rotation Groups in ${activeSection.section_name}` : 'Rotation Groups'}
              </h3>
              <p className="text-xs text-slate-500">Student rotation squads & enrolled capacity</p>
            </div>
            {activeSection && (
              <button
                onClick={() => {
                  setGroupName('')
                  setFormError('')
                  setIsAddGroupOpen(true)
                }}
                className="p-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors flex items-center gap-1.5"
              >
                <Plus className="size-4" />
                Add Group
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeSection && activeSection.groups.length > 0 ? (
              activeSection.groups.map((grp) => {
                const isDeleting = deletingId === grp.id
                return (
                  <div
                    key={grp.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between ${
                      isDeleting
                        ? 'opacity-50 pointer-events-none bg-slate-100/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                        : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs">
                        <Users className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{grp.group_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono font-semibold">{grp.studentsCount} Students Enrolled</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDeletingElement({ type: 'group', id: grp.id, name: grp.group_name })}
                      disabled={isDeleting}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                      title="Remove group"
                    >
                      {isDeleting ? (
                        <Loader2 className="size-4 animate-spin text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  </div>
                )
              })
            ) : (
              <div className="sm:col-span-2 py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                {activeSection ? 'No rotation groups added to this section yet.' : 'Select a section on the left to view groups.'}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ADD SECTION MODAL */}
      {isAddSectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FolderPlus className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Academic Section</h3>
                  <p className="text-xs text-slate-500">Create new section for selected level.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddSectionOpen(false)}
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

            <form onSubmit={handleAddSectionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Section Name
                </label>
                <input
                  type="text"
                  required
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="e.g. Section A"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddSectionOpen(false)}
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
                  <span>Create Section</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD GROUP MODAL */}
      {isAddGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Users className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Rotation Group</h3>
                  <p className="text-xs text-slate-500">Create student rotation squad inside {activeSection?.section_name}.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddGroupOpen(false)}
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

            <form onSubmit={handleAddGroupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Group 01"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddGroupOpen(false)}
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
                  <span>Create Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingElement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="size-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Remove {deletingElement.type === 'section' ? 'Section' : 'Rotation Group'}?
                </h3>
                <p className="text-xs text-slate-500">Structural deletion alert.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-900 dark:text-white">{deletingElement.name}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setDeletingElement(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 flex items-center gap-2 disabled:opacity-50"
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
