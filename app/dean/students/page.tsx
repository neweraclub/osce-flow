'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  AlertTriangle,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  CheckSquare,
  FileSpreadsheet,
  GraduationCap,
  Info,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Square,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { Select, SelectOption } from '@/components/ui/Select'
import { FilterDropdown } from '@/components/ui/FilterDropdown'
import { TableToolbar } from '@/components/ui/TableToolbar'
import { useTableSelection } from '@/hooks/useTableSelection'
import { useToast } from '@/context/ToastContext'
import { EditStudentModal, FullStructureSection } from '@/components/dean/EditStudentModal'

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

export interface GroupOption {
  id: string
  group_name: string
  section_id: string
}

export interface StudyLevelOption {
  id: string
  level_name: string
}

export interface AcademicYearOption {
  id: string
  year_label: string
}

export interface ParsedStudentRow {
  matricule: string
  first_name: string
  last_name: string
  section: string
  grp: string
  isValid: boolean
  isDuplicateInFile?: boolean
  errorMsg?: string
}

// Sanitization & Normalization Helpers
export const sanitizeMatricule = (val: any): string => {
  if (!val) return ''
  return String(val).trim().replace(/\s+/g, '')
}

export const sanitizeFirstName = (val: any): string => {
  if (!val) return ''
  const clean = String(val).trim().replace(/\s+/g, ' ')
  if (!clean) return ''
  return clean
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export const sanitizeLastName = (val: any): string => {
  if (!val) return ''
  return String(val).trim().replace(/\s+/g, ' ').toUpperCase()
}

export const sanitizeTitleCase = (val: any): string => {
  if (!val) return ''
  const clean = String(val).trim().replace(/\s+/g, ' ')
  if (!clean) return ''
  return clean
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function StudentsPage() {
  const { showSuccess, showError } = useToast()

  const [students, setStudents] = useState<StudentRecord[]>([])
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [studyLevels, setStudyLevels] = useState<StudyLevelOption[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([])
  const [sectionsWithGroups, setSectionsWithGroups] = useState<FullStructureSection[]>([])

  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // In-flight deletion state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Filter & Sorting states
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [sectionFilter, setSectionFilter] = useState<string>('')
  const [groupFilter, setGroupFilter] = useState<string>('')
  const [sortKey, setSortKey] = useState<'last_name' | 'first_name' | 'matricule' | 'section_name' | 'group_name'>('last_name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Multi-select hook
  const {
    selectedIds,
    isSelected,
    toggleSelect,
    toggleSelectAll,
    isAllSelected,
    clearSelection,
  } = useTableSelection<string>()

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<StudentRecord | null>(null)
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  // Form states (Single Enroll)
  const [matricule, setMatricule] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [formError, setFormError] = useState('')

  // XLSX Import States
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedYearId, setSelectedYearId] = useState<string>('')
  const [selectedLevelId, setSelectedLevelId] = useState<string>('')
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([])
  const [importFileName, setImportFileName] = useState<string>('')
  const [importError, setImportError] = useState<string>('')
  const [submittingImport, setSubmittingImport] = useState(false)

  // Global Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddOpen(false)
        setEditingStudent(null)
        setDeletingStudent(null)
        setIsBatchDeleteOpen(false)
        setIsImportOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const fetchStudents = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/dean/students')
      const json = await res.json()

      if (res.ok && json.success) {
        setStudents(json.students || [])
        setGroups(json.groups || [])
      } else {
        showError(json.error || 'Failed to fetch student cohort roster.')
      }
    } catch {
      showError('Network error connecting to server.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchStructureMetadata = async () => {
    try {
      const res = await fetch('/api/dean/structure')
      const json = await res.json()

      if (res.ok && json.success) {
        setStudyLevels(json.studyLevels || [])
        setAcademicYears(json.academicYears || [])
        setSectionsWithGroups(json.sections || [])
        if (json.activeYearId && !selectedYearId) {
          setSelectedYearId(json.activeYearId)
        }
        if (json.studyLevels && json.studyLevels.length > 0 && !selectedLevelId) {
          setSelectedLevelId(json.studyLevels[0].id)
        }
      }
    } catch {
      // Ignore metadata fetch errors
    }
  }

  useEffect(() => {
    fetchStudents()
    fetchStructureMetadata()
  }, [])

  // Extract filter options dynamically
  const levelOptions = useMemo(() => {
    const unique = Array.from(new Set(students.map((s) => s.level_name).filter(Boolean)))
    return unique.map((l) => ({ label: l, value: l }))
  }, [students])

  const sectionOptions = useMemo(() => {
    const unique = Array.from(new Set(students.map((s) => s.section_name).filter(Boolean)))
    return unique.map((sec) => ({ label: sec, value: sec }))
  }, [students])

  const groupFilterOptions = useMemo(() => {
    const unique = Array.from(new Set(students.map((s) => s.group_name).filter(Boolean)))
    return unique.map((g) => ({ label: g, value: g }))
  }, [students])

  const sortOptions = [
    { label: 'Last Name (A → Z)', value: 'last_name_asc' },
    { label: 'Last Name (Z → A)', value: 'last_name_desc' },
    { label: 'First Name (A → Z)', value: 'first_name_asc' },
    { label: 'First Name (Z → A)', value: 'first_name_desc' },
    { label: 'Matricule (Ascending)', value: 'matricule_asc' },
    { label: 'Matricule (Descending)', value: 'matricule_desc' },
  ]

  const currentSortVal = `${sortKey}_${sortOrder}`

  const handleSortOptionChange = (val: string) => {
    if (val === 'last_name_asc') {
      setSortKey('last_name')
      setSortOrder('asc')
    } else if (val === 'last_name_desc') {
      setSortKey('last_name')
      setSortOrder('desc')
    } else if (val === 'first_name_asc') {
      setSortKey('first_name')
      setSortOrder('asc')
    } else if (val === 'first_name_desc') {
      setSortKey('first_name')
      setSortOrder('desc')
    } else if (val === 'matricule_asc') {
      setSortKey('matricule')
      setSortOrder('asc')
    } else if (val === 'matricule_desc') {
      setSortKey('matricule')
      setSortOrder('desc')
    }
  }

  const toggleSort = (key: 'last_name' | 'first_name' | 'matricule' | 'section_name' | 'group_name') => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  // Filtered & Sorted Students List
  const filteredAndSortedStudents = useMemo(() => {
    const filtered = students.filter((s) => {
      const term = search.toLowerCase()
      const matchesSearch =
        s.matricule.toLowerCase().includes(term) ||
        s.first_name.toLowerCase().includes(term) ||
        s.last_name.toLowerCase().includes(term) ||
        s.group_name.toLowerCase().includes(term) ||
        s.section_name.toLowerCase().includes(term)

      const matchesLevel = !levelFilter || s.level_name === levelFilter
      const matchesSection = !sectionFilter || s.section_name === sectionFilter
      const matchesGroup = !groupFilter || s.group_name === groupFilter

      return matchesSearch && matchesLevel && matchesSection && matchesGroup
    })

    filtered.sort((a, b) => {
      let valA = ''
      let valB = ''

      if (sortKey === 'last_name') {
        valA = a.last_name
        valB = b.last_name
      } else if (sortKey === 'first_name') {
        valA = a.first_name
        valB = b.first_name
      } else if (sortKey === 'matricule') {
        valA = a.matricule
        valB = b.matricule
      } else if (sortKey === 'section_name') {
        valA = a.section_name
        valB = b.section_name
      } else if (sortKey === 'group_name') {
        valA = a.group_name
        valB = b.group_name
      }

      const cmp = valA.localeCompare(valB, undefined, { sensitivity: 'base', numeric: true })
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return filtered
  }, [students, search, levelFilter, sectionFilter, groupFilter, sortKey, sortOrder])

  const filteredMatricules = useMemo(
    () => filteredAndSortedStudents.map((s) => s.matricule),
    [filteredAndSortedStudents]
  )

  const modalGroupOptions: SelectOption[] = groups.map((g) => ({
    value: g.id,
    label: g.group_name,
  }))

  const academicYearSelectOptions: SelectOption[] = academicYears.map((y) => ({
    value: y.id,
    label: y.year_label,
  }))

  const studyLevelSelectOptions: SelectOption[] = studyLevels.map((l) => ({
    value: l.id,
    label: l.level_name,
  }))

  const openAddModal = () => {
    setMatricule('')
    setFirstName('')
    setLastName('')
    setSelectedGroupId(groups.length > 0 ? groups[0].id : '')
    setFormError('')
    setIsAddOpen(true)
  }

  const openImportModal = () => {
    setParsedRows([])
    setImportFileName('')
    setImportError('')
    setIsImportOpen(true)
    fetchStructureMetadata()
  }

  const handleEditSuccess = (updatedStudent: StudentRecord, originalMatricule: string) => {
    setEditingStudent(null)
    setStudents((prev) =>
      prev.map((s) => (s.matricule === originalMatricule ? updatedStudent : s))
    )
    showSuccess('Student record updated successfully.')
  }

  // --- XLSX Client Parsing & Resilient Normalization Logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processExcelFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    processExcelFile(file)
  }

  const processExcelFile = (file: File) => {
    setImportError('')
    setImportFileName(file.name)
    setParsedRows([])

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const sheetName = wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (rawJson.length === 0) {
          setImportError('Uploaded spreadsheet is empty.')
          return
        }

        // Standardize column key mappings
        const sampleRow = rawJson[0]
        const keys = Object.keys(sampleRow)

        const findKey = (candidates: string[]) =>
          keys.find((k) => candidates.includes(k.toLowerCase().trim().replace(/_/g, ' ')))

        const keyMatricule = findKey(['matricule', 'id', 'mat', 'registration', 'student id', 'num matricule'])
        const keyFirstName = findKey(['first name', 'firstname', 'prénom', 'prenom', 'first_name', 'fname'])
        const keyLastName = findKey(['lastname', 'last name', 'nom', 'family name', 'surname', 'last_name', 'lname'])
        const keySection = findKey(['section', 'sec', 'sec name', 'section name'])
        const keyGroup = findKey(['grp', 'group', 'groupe', 'g', 'group name'])

        const missingHeaders = []
        if (!keyMatricule) missingHeaders.push('Matricule')
        if (!keyFirstName) missingHeaders.push('First Name')
        if (!keyLastName) missingHeaders.push('Last Name')
        if (!keySection) missingHeaders.push('Section')
        if (!keyGroup) missingHeaders.push('Group (grp)')

        if (missingHeaders.length > 0) {
          setImportError(
            `Missing required column headers: ${missingHeaders.join(', ')}. Spreadsheet must include matricule, first name, last name, section, and group columns.`
          )
          return
        }

        // Sanitization & File-Level Deduplication Pass
        const seenMatricules = new Set<string>()
        const parsed: ParsedStudentRow[] = rawJson.map((row) => {
          const mat = sanitizeMatricule(row[keyMatricule!])
          const fn = sanitizeFirstName(row[keyFirstName!])
          const ln = sanitizeLastName(row[keyLastName!])
          const sec = sanitizeTitleCase(row[keySection!])
          const grp = sanitizeTitleCase(row[keyGroup!])

          let isValid = true
          let isDuplicateInFile = false
          let errorMsg = ''

          if (!mat || !fn || !ln || !sec || !grp) {
            isValid = false
            errorMsg = 'Missing required field values'
          } else if (seenMatricules.has(mat)) {
            isValid = false
            isDuplicateInFile = true
            errorMsg = 'Duplicate matricule in file'
          } else {
            seenMatricules.add(mat)
          }

          return {
            matricule: mat,
            first_name: fn,
            last_name: ln,
            section: sec,
            grp: grp,
            isValid,
            isDuplicateInFile,
            errorMsg,
          }
        })

        setParsedRows(parsed)
      } catch {
        setImportError('Failed to parse spreadsheet file. Please upload a valid .xlsx or .xls file.')
      }
    }
    reader.readAsBinaryString(file)
  }

  // Detected Sections & Groups Statistics
  const detectedSections = useMemo(() => {
    return Array.from(new Set(parsedRows.map((r) => r.section).filter(Boolean)))
  }, [parsedRows])

  const detectedGroups = useMemo(() => {
    return Array.from(new Set(parsedRows.map((r) => `${r.section}::${r.grp}`).filter(Boolean)))
  }, [parsedRows])

  const validRowsCount = useMemo(() => parsedRows.filter((r) => r.isValid).length, [parsedRows])
  const duplicateRowsCount = useMemo(() => parsedRows.filter((r) => r.isDuplicateInFile).length, [parsedRows])

  // Execute Batch Import via API
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0 || validRowsCount === 0) return
    if (!selectedYearId || !selectedLevelId) {
      setImportError('Please select a target Academic Year and Study Level.')
      return
    }

    setSubmittingImport(true)
    setImportError('')

    const validPayload = parsedRows
      .filter((r) => r.isValid)
      .map((r) => ({
        matricule: r.matricule,
        first_name: r.first_name,
        last_name: r.last_name,
        section: r.section,
        grp: r.grp,
      }))

    try {
      const res = await fetch('/api/dean/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academic_year_id: selectedYearId,
          study_level_id: selectedLevelId,
          students: validPayload,
        }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        const { importedCount, createdSectionsCount, createdGroupsCount } = json
        setIsImportOpen(false)
        fetchStudents(true)
        showSuccess(
          `Successfully imported ${importedCount} student(s) (${createdSectionsCount} section(s), ${createdGroupsCount} group(s) created).`
        )
      } else {
        const msg = json.error || 'Failed to import student cohort.'
        setImportError(msg)
        showError(msg)
      }
    } catch {
      const msg = 'Network error importing student cohort.'
      setImportError(msg)
      showError(msg)
    } finally {
      setSubmittingImport(false)
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanMat = sanitizeMatricule(matricule)
    const cleanFn = sanitizeFirstName(firstName)
    const cleanLn = sanitizeLastName(lastName)

    if (!cleanMat || !cleanFn || !cleanLn || !selectedGroupId) {
      setFormError('Matricule, first name, last name, and rotation group are required.')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const res = await fetch('/api/dean/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricule: cleanMat,
          first_name: cleanFn,
          last_name: cleanLn,
          group_id: selectedGroupId,
        }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Student enrolled successfully.')
        setIsAddOpen(false)
        fetchStudents(true)
      } else {
        const msg = json.error || 'Failed to register student.'
        setFormError(msg)
        showError(msg)
      }
    } catch {
      const msg = 'Network error enrolling student.'
      setFormError(msg)
      showError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Deletion with In-Flight Row Loading Spinner (Single Student)
  const handleDeleteConfirm = async () => {
    if (!deletingStudent) return
    const targetMatricule = deletingStudent.matricule

    // Close modal & set in-flight deleting ID
    setDeletingStudent(null)
    setDeletingId(targetMatricule)

    try {
      const res = await fetch(`/api/dean/students?matricule=${encodeURIComponent(targetMatricule)}`, {
        method: 'DELETE',
      })

      const json = await res.json()

      if (res.ok && json.success) {
        setStudents((prev) => prev.filter((s) => s.matricule !== targetMatricule))
        showSuccess('Student record removed successfully.')
      } else {
        showError(json.error || 'Failed to remove student. Please try again.')
      }
    } catch {
      showError('Failed to remove student. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  // Deletion with In-Flight Selection Loading (Batch Delete)
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    const idsToRemove = [...selectedIds]

    setIsBatchDeleteOpen(false)
    setSubmitting(true)

    try {
      let successCount = 0
      for (const mat of idsToRemove) {
        const res = await fetch(`/api/dean/students?matricule=${encodeURIComponent(mat)}`, {
          method: 'DELETE',
        })
        if (res.ok) successCount++
      }

      setStudents((prev) => prev.filter((s) => !idsToRemove.includes(s.matricule)))
      clearSelection()
      showSuccess(`Removed ${successCount} student record(s) successfully.`)
    } catch {
      showError('Failed to remove selected student records. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderSortIcon = (key: 'last_name' | 'first_name' | 'matricule' | 'section_name' | 'group_name') => {
    if (sortKey !== key) return <ArrowUpDown className="size-3.5 opacity-40 group-hover:opacity-100 transition-opacity inline ml-1" />
    return sortOrder === 'asc' ? (
      <ArrowUp className="size-3.5 text-blue-600 dark:text-blue-400 inline ml-1" />
    ) : (
      <ArrowDown className="size-3.5 text-blue-600 dark:text-blue-400 inline ml-1" />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Student Cohort Roster
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enrolled medical candidates mapped to rotation groups and academic sections.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchStudents(true)}
            disabled={refreshing}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all"
            title="Refresh cohort records"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openImportModal}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>Import Cohort (XLSX)</span>
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all"
          >
            <Plus className="size-4" />
            Enroll Student
          </button>
        </div>
      </div>

      {/* Universal Table Toolbar & Filter/Sorting Bar */}
      <TableToolbar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search matricule, candidate name, group, or section..."
        selectedIds={selectedIds}
        totalCount={students.length}
        onClearSelection={clearSelection}
        filters={
          <>
            <FilterDropdown
              label="Sort By"
              options={sortOptions}
              value={currentSortVal}
              onChange={handleSortOptionChange}
              placeholder="Sort Order"
            />
            <FilterDropdown
              label="Study Level"
              options={levelOptions}
              value={levelFilter}
              onChange={setLevelFilter}
              placeholder="All Levels"
            />
            <FilterDropdown
              label="Section"
              options={sectionOptions}
              value={sectionFilter}
              onChange={setSectionFilter}
              placeholder="All Sections"
            />
            <FilterDropdown
              label="Group"
              options={groupFilterOptions}
              value={groupFilter}
              onChange={setGroupFilter}
              placeholder="All Groups"
            />
          </>
        }
        batchActions={
          <>
            <button
              onClick={() => setIsBatchDeleteOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Trash2 className="size-3.5" />
              <span>Remove Selected</span>
            </button>
          </>
        }
      />

      {/* Students Data Table with Distinct Last Name & First Name Columns */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/40 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-4 py-4 w-12 text-center">
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(filteredMatricules)}
                    className="p-1 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {isAllSelected(filteredMatricules) ? (
                      <CheckSquare className="size-4 text-blue-600" />
                    ) : (
                      <Square className="size-4" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => toggleSort('matricule')}
                  className="px-6 py-4 cursor-pointer select-none group hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span>Matricule</span>
                  {renderSortIcon('matricule')}
                </th>
                <th
                  onClick={() => toggleSort('last_name')}
                  className="px-6 py-4 cursor-pointer select-none group hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span>Last Name (Nom)</span>
                  {renderSortIcon('last_name')}
                </th>
                <th
                  onClick={() => toggleSort('first_name')}
                  className="px-6 py-4 cursor-pointer select-none group hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span>First Name (Prénom)</span>
                  {renderSortIcon('first_name')}
                </th>
                <th
                  onClick={() => toggleSort('group_name')}
                  className="px-6 py-4 cursor-pointer select-none group hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span>Rotation Group</span>
                  {renderSortIcon('group_name')}
                </th>
                <th
                  onClick={() => toggleSort('section_name')}
                  className="px-6 py-4 cursor-pointer select-none group hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <span>Section & Study Level</span>
                  {renderSortIcon('section_name')}
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading student cohort roster...
                  </td>
                </tr>
              ) : filteredAndSortedStudents.length > 0 ? (
                filteredAndSortedStudents.map((st) => {
                  const selected = isSelected(st.matricule)
                  const isDeleting = deletingId === st.matricule
                  return (
                    <tr
                      key={st.matricule}
                      className={`transition-all duration-200 ${
                        isDeleting
                          ? 'opacity-50 pointer-events-none bg-slate-100/50 dark:bg-slate-800/50'
                          : selected
                          ? 'bg-sky-50/60 dark:bg-sky-950/40'
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="px-4 py-4 w-12 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelect(st.matricule)}
                          disabled={isDeleting}
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                        >
                          {selected ? (
                            <CheckSquare className="size-4 text-blue-600" />
                          ) : (
                            <Square className="size-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {st.matricule}
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                        {st.last_name}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                        {st.first_name}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                          {st.group_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-semibold text-[11px] border border-sky-200/60 dark:border-sky-900/50">
                          <GraduationCap className="size-3.5" />
                          {st.section_name} ({st.level_name})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingStudent(st)}
                            disabled={isDeleting}
                            className="p-2 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors disabled:opacity-50"
                            title="Edit Student Record"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={() => setDeletingStudent(st)}
                            disabled={isDeleting}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                            title="Remove Student"
                          >
                            {isDeleting ? (
                              <Loader2 className="size-4 animate-spin text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No enrolled students matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT STUDENT MODAL */}
      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          onSuccess={handleEditSuccess}
          studyLevels={studyLevels}
          sectionsWithGroups={sectionsWithGroups}
        />
      )}

      {/* XLSX COHORT IMPORT STAGED PREVIEW MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Import Student Cohort (XLSX)</h3>
                  <p className="text-xs text-slate-500">
                    Upload candidate spreadsheet with automatic normalization & structure provisioning.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {importError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-start gap-3">
                  <AlertCircle className="size-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-bold">Import Error:</span> {importError}
                  </div>
                </div>
              )}

              {/* Target Level & Year Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Target Academic Year"
                  options={academicYearSelectOptions}
                  value={selectedYearId}
                  onChange={setSelectedYearId}
                />
                <Select
                  label="Target Study Level"
                  options={studyLevelSelectOptions}
                  value={selectedLevelId}
                  onChange={setSelectedLevelId}
                />
              </div>

              {/* File Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/30 cursor-pointer transition-all text-center space-y-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
                <div className="size-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                  <Upload className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {importFileName ? importFileName : 'Click to upload or drag & drop spreadsheet'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Supports .XLSX, .XLS (5 required columns: matricule, first name, last name, section, group)
                  </p>
                </div>
              </div>

              {/* Parsed Preview Section */}
              {parsedRows.length > 0 && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Parsed Rows
                      </span>
                      <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                        {parsedRows.length}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/50">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                        Valid Candidates
                      </span>
                      <span className="text-xl font-extrabold text-blue-700 dark:text-blue-300">
                        {validRowsCount}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50">
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                        Duplicates in File
                      </span>
                      <span className="text-xl font-extrabold text-amber-700 dark:text-amber-300">
                        {duplicateRowsCount}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/50">
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                        Detected Sections
                      </span>
                      <span className="text-xl font-extrabold text-indigo-700 dark:text-indigo-300">
                        {detectedSections.length}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                        Detected Groups
                      </span>
                      <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                        {detectedGroups.length}
                      </span>
                    </div>
                  </div>

                  {/* Auto-Provisioning Pills */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Sparkles className="size-4 text-amber-500" />
                      <span>Auto-Provisioning Structure Plan</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {detectedSections.map((sec) => (
                        <span
                          key={sec}
                          className="px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/50"
                        >
                          Section: {sec}
                        </span>
                      ))}
                      {detectedGroups.map((grpKey) => {
                        const [secName, gName] = grpKey.split('::')
                        return (
                          <span
                            key={grpKey}
                            className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/50"
                          >
                            Group: {secName} &gt; {gName}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* Parsed Data Preview Table */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-[10px] uppercase font-bold text-slate-400 sticky top-0 border-b border-slate-100 dark:border-slate-800">
                          <tr>
                            <th className="px-4 py-2.5">Matricule</th>
                            <th className="px-4 py-2.5">Normalized Name</th>
                            <th className="px-4 py-2.5">Section</th>
                            <th className="px-4 py-2.5">Group</th>
                            <th className="px-4 py-2.5">Validation Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {parsedRows.slice(0, 40).map((row, idx) => (
                            <tr
                              key={idx}
                              className={
                                row.isDuplicateInFile
                                  ? 'bg-amber-50/50 dark:bg-amber-950/30'
                                  : !row.isValid
                                  ? 'bg-rose-50/50 dark:bg-rose-950/30'
                                  : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                              }
                            >
                              <td className="px-4 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                                {row.matricule || '—'}
                              </td>
                              <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                                <strong className="font-extrabold uppercase">{row.last_name}</strong> {row.first_name}
                              </td>
                              <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">
                                {row.section}
                              </td>
                              <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">
                                {row.grp}
                              </td>
                              <td className="px-4 py-2.5">
                                {row.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="size-3.5" />
                                    Valid
                                  </span>
                                ) : row.isDuplicateInFile ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950">
                                    <AlertTriangle className="size-3.5" />
                                    Duplicate in File
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                    <AlertCircle className="size-3.5" />
                                    {row.errorMsg}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={submittingImport || validRowsCount === 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50"
              >
                {submittingImport ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>Confirm & Import {validRowsCount} Candidates</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH DELETE CONFIRMATION MODAL */}
      {isBatchDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="size-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Batch Remove Students?</h3>
                <p className="text-xs text-slate-500">Candidate batch removal alert.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-slate-900 dark:text-white">{selectedIds.length} candidate(s)</strong> from the active student cohort roster?
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsBatchDeleteOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>Remove {selectedIds.length} Candidate(s)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENROLL STUDENT MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <UserPlus className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Enroll Student Candidate</h3>
                  <p className="text-xs text-slate-500">Register candidate in rotation squad.</p>
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
                  Matricule Number
                </label>
                <input
                  type="text"
                  required
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  placeholder="e.g. 202531098452"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white uppercase font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <Select
                  label="Assigned Rotation Group"
                  options={modalGroupOptions}
                  value={selectedGroupId}
                  onChange={setSelectedGroupId}
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
                  <span>Enroll Candidate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="size-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Student Record?</h3>
                <p className="text-xs text-slate-500">Candidate removal alert.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to remove candidate <strong className="text-slate-900 dark:text-white">{deletingStudent.last_name} {deletingStudent.first_name} ({deletingStudent.matricule})</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 flex items-center gap-2 disabled:opacity-50"
              >
                <span>Remove Student</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
