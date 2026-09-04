'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Loader2, Pencil, X } from 'lucide-react'
import { Select, SelectOption } from '@/components/ui/Select'

export interface StudentRecord {
  matricule: string
  first_name: string
  last_name: string
  group_id: string
  group_name: string
  section_name: string
  level_name: string
  created_at: string
}

export interface FullStructureSection {
  id: string
  section_name: string
  level_id: string
  groups: Array<{
    id: string
    group_name: string
    section_id: string
  }>
}

export interface StudyLevelOption {
  id: string
  level_name: string
}

export interface EditStudentModalProps {
  student: StudentRecord
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedStudent: StudentRecord, originalMatricule: string) => void
  studyLevels: StudyLevelOption[]
  sectionsWithGroups: FullStructureSection[]
}

export function EditStudentModal({
  student,
  isOpen,
  onClose,
  onSuccess,
  studyLevels,
  sectionsWithGroups,
}: EditStudentModalProps) {
  const [matricule, setMatricule] = useState(student.matricule)
  const [firstName, setFirstName] = useState(student.first_name)
  const [lastName, setLastName] = useState(student.last_name)

  const [selectedLevelId, setSelectedLevelId] = useState<string>('')
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')
  const [selectedGroupId, setSelectedGroupId] = useState<string>(student.group_id)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  // Initialize values when student or structure changes
  useEffect(() => {
    if (!student) return
    setMatricule(student.matricule)
    setFirstName(student.first_name)
    setLastName(student.last_name)
    setSelectedGroupId(student.group_id)

    // Find current section & study level IDs
    let currentSecId = ''
    let currentLvlId = ''

    for (const sec of sectionsWithGroups) {
      const foundGrp = sec.groups.find((g) => g.id === student.group_id)
      if (foundGrp) {
        currentSecId = sec.id
        currentLvlId = sec.level_id
        break
      }
    }

    if (!currentLvlId && studyLevels.length > 0) {
      const matchedLvl = studyLevels.find((l) => l.level_name === student.level_name)
      currentLvlId = matchedLvl ? matchedLvl.id : studyLevels[0].id
    }

    setSelectedLevelId(currentLvlId)
    setSelectedSectionId(currentSecId)
  }, [student, studyLevels, sectionsWithGroups])

  // Filter sections by selected study level
  const availableSections = useMemo(() => {
    if (!selectedLevelId) return sectionsWithGroups
    return sectionsWithGroups.filter((s) => s.level_id === selectedLevelId)
  }, [sectionsWithGroups, selectedLevelId])

  // Filter groups by selected section
  const availableGroups = useMemo(() => {
    if (!selectedSectionId) {
      return availableSections.flatMap((s) => s.groups)
    }
    const matchedSec = availableSections.find((s) => s.id === selectedSectionId)
    return matchedSec ? matchedSec.groups : []
  }, [availableSections, selectedSectionId])

  // Handlers for dynamic cascade
  const handleLevelChange = (lvlId: string) => {
    setSelectedLevelId(lvlId)
    const secs = sectionsWithGroups.filter((s) => s.level_id === lvlId)
    if (secs.length > 0) {
      setSelectedSectionId(secs[0].id)
      if (secs[0].groups.length > 0) {
        setSelectedGroupId(secs[0].groups[0].id)
      } else {
        setSelectedGroupId('')
      }
    } else {
      setSelectedSectionId('')
      setSelectedGroupId('')
    }
  }

  const handleSectionChange = (secId: string) => {
    setSelectedSectionId(secId)
    const sec = sectionsWithGroups.find((s) => s.id === secId)
    if (sec && sec.groups.length > 0) {
      setSelectedGroupId(sec.groups[0].id)
    } else {
      setSelectedGroupId('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!matricule.trim() || !firstName.trim() || !lastName.trim() || !selectedGroupId) {
      setError('Matricule, first name, last name, and rotation group are required.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/dean/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_matricule: student.matricule,
          matricule: matricule.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          group_id: selectedGroupId,
        }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        onSuccess(json.student, student.matricule)
      } else {
        setError(json.error || 'Failed to update student record.')
      }
    } catch {
      setError('Network error updating student record.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const levelSelectOptions: SelectOption[] = studyLevels.map((l) => ({
    value: l.id,
    label: l.level_name,
  }))

  const sectionSelectOptions: SelectOption[] = availableSections.map((s) => ({
    value: s.id,
    label: s.section_name,
  }))

  const groupSelectOptions: SelectOption[] = availableGroups.map((g) => ({
    value: g.id,
    label: g.group_name,
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Pencil className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Student Record</h3>
              <p className="text-xs text-slate-500">Update student profile and academic placement.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Matricule */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Matricule Number
            </label>
            <input
              type="text"
              required
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              placeholder="e.g. 202531098452"
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Last Name & First Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Last Name (Nom)
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. BOUZEID"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white uppercase font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                First Name (Prénom)
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Mohamed"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Academic Structure Cascade */}
          <div className="space-y-3 pt-2">
            <Select
              label="Study Level"
              options={levelSelectOptions}
              value={selectedLevelId}
              onChange={handleLevelChange}
            />

            <Select
              label="Academic Section"
              options={sectionSelectOptions}
              value={selectedSectionId}
              onChange={handleSectionChange}
              disabled={availableSections.length === 0}
            />

            <Select
              label="Assigned Rotation Group"
              options={groupSelectOptions}
              value={selectedGroupId}
              onChange={setSelectedGroupId}
              disabled={availableGroups.length === 0}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedGroupId}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-500/25 flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
