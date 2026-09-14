'use client'

import React, { useEffect, useState, useRef, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Hash,
  HelpCircle,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  MinusCircle,
  Percent,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { useAcademicYear } from '@/context/AcademicYearContext'
import { useToast } from '@/context/ToastContext'
import {
  exportStudentTranscriptToPDF,
  exportStudentTranscriptToExcel,
  StudentTranscriptData,
  ModuleResultsGroup,
  EvaluatedStationBreakdown,
} from '@/lib/exportUtils'

interface StudentDirectoryRecord {
  id: string
  matricule: string
  first_name: string
  last_name: string
  full_name: string
  group_name: string
  section_name: string
  level_name: string
  academic_year_label: string
  evaluated_stations_count: number
  total_stations_count: number
  final_score: number | null
  is_passed: boolean
  status: 'passed' | 'failed' | 'in_progress' | 'pending'
  latest_attempt_date: string | null
  assigned_modules: string[]
}

interface SummaryMetrics {
  total_students: number
  evaluated_students: number
  average_score: number
  pass_rate: number
}

interface FilterModuleOption {
  id: string
  module_name: string
  level_id: string
}

type StatusFilter = 'all' | 'passed' | 'failed' | 'in_progress' | 'pending'
type SortOrder = 'name_asc' | 'name_desc' | 'score_desc' | 'score_asc' | 'matricule_asc'

const SORT_OPTIONS: { value: SortOrder; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'name_asc', label: 'Name (A to Z)', icon: Users },
  { value: 'name_desc', label: 'Name (Z to A)', icon: Users },
  { value: 'score_desc', label: 'Score (Highest First)', icon: TrendingUp },
  { value: 'score_asc', label: 'Score (Lowest First)', icon: TrendingDown },
  { value: 'matricule_asc', label: 'Matricule (Ascending)', icon: Hash },
]

const STATUS_OPTIONS: { value: StatusFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'All Candidates', icon: Layers },
  { value: 'passed', label: 'Passed (>= 10/20)', icon: CheckCircle2 },
  { value: 'failed', label: 'Retake Required (< 10/20)', icon: AlertCircle },
  { value: 'in_progress', label: 'In Progress', icon: Clock },
  { value: 'pending', label: 'Pending Evaluation', icon: MinusCircle },
]

function ProfessorStudentsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlStudentId = searchParams.get('student_id')

  const { selectedYear, selectedYearId } = useAcademicYear()
  const { showError, showSuccess, showInfo } = useToast()

  // Primary State: Directory vs Detailed Transcript
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(urlStudentId)
  const [transcriptData, setTranscriptData] = useState<StudentTranscriptData | null>(null)
  const [loadingTranscript, setLoadingTranscript] = useState(false)

  // Directory Data State
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([])
  const [summary, setSummary] = useState<SummaryMetrics>({
    total_students: 0,
    evaluated_students: 0,
    average_score: 0,
    pass_rate: 0,
  })
  const [modulesList, setModulesList] = useState<FilterModuleOption[]>([])
  const [loadingDirectory, setLoadingDirectory] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('name_asc')
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid')

  // Export Loading States
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)

  // Transcript Hierarchical Drill-Down State
  const [selectedTranscriptModuleId, setSelectedTranscriptModuleId] = useState<string | null>(null)
  const [expandedStations, setExpandedStations] = useState<Record<string, boolean>>({})

  // Evaluating Professor & Faculty Context
  const [professorName, setProfessorName] = useState<string>('Prof. Evaluating Examiner')
  const [facultyName, setFacultyName] = useState<string>('Faculty of Medicine')

  // Load active professor session on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.user) {
            if (data.user.facultyName) setFacultyName(data.user.facultyName)
            if (data.user.firstName || data.user.lastName) {
              setProfessorName(`Prof. ${data.user.firstName || ''} ${data.user.lastName || ''}`.trim())
            }
          }
        }
      } catch {
        // Fallback
      }
    }
    loadSession()
  }, [])

  // Custom Popover States & Refs
  const [moduleDropdownOpen, setModuleDropdownOpen] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  const moduleDropdownRef = useRef<HTMLDivElement>(null)
  const statusDropdownRef = useRef<HTMLDivElement>(null)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  // Sync selectedStudentId with URL param
  useEffect(() => {
    if (urlStudentId !== selectedStudentId) {
      setSelectedStudentId(urlStudentId)
    }
  }, [urlStudentId])

  // Click outside listener for custom popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (moduleDropdownRef.current && !moduleDropdownRef.current.contains(target)) {
        setModuleDropdownOpen(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setStatusDropdownOpen(false)
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(target)) {
        setSortDropdownOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setModuleDropdownOpen(false)
        setStatusDropdownOpen(false)
        setSortDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // 1. Fetch Students Directory List
  const fetchDirectory = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoadingDirectory(true)

    try {
      const params = new URLSearchParams()
      const targetYearId = selectedYearId || selectedYear?.id
      if (targetYearId) params.set('academic_year_id', targetYearId)
      if (selectedModuleId && selectedModuleId !== 'all') params.set('module_id', selectedModuleId)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (sortOrder) params.set('sort', sortOrder)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())

      const res = await fetch(`/api/professor/students?${params.toString()}`)
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load students directory.')
      }

      setStudents(json.students || [])
      if (json.summary) setSummary(json.summary)
      if (json.filters?.modules) setModulesList(json.filters.modules)
      if (json.professor?.fullName) setProfessorName(json.professor.fullName)
      if (json.professor?.facultyName) setFacultyName(json.professor.facultyName)

      if (isManualRefresh) {
        showSuccess('Candidate records updated successfully.')
      }
    } catch (err: any) {
      console.error('Error fetching directory:', err)
      showError(err?.message || 'Error connecting to student evaluation service.')
    } finally {
      setLoadingDirectory(false)
      setRefreshing(false)
    }
  }

  // Reload directory when filters or academic year change
  useEffect(() => {
    if (!selectedStudentId) {
      fetchDirectory()
    }
  }, [selectedYearId, selectedYear, selectedModuleId, statusFilter, sortOrder, selectedStudentId])

  // Debounced search query
  useEffect(() => {
    if (selectedStudentId) return
    const timer = setTimeout(() => {
      fetchDirectory()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // 2. Fetch Detailed Student Transcript
  const fetchStudentTranscript = async (studentId: string) => {
    setLoadingTranscript(true)
    setTranscriptData(null)

    try {
      const params = new URLSearchParams()
      params.set('student_id', studentId)
      if (selectedModuleId && selectedModuleId !== 'all') {
        params.set('module_id', selectedModuleId)
      }

      const res = await fetch(`/api/professor/students?${params.toString()}`)
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Unable to retrieve student transcript.')
      }

      setTranscriptData(json.transcript)
      if (json.professor?.fullName) setProfessorName(json.professor.fullName)
      if (json.professor?.facultyName) setFacultyName(json.professor.facultyName)
      // Auto-select first module if exists
      if (json.transcript?.modules?.length > 0) {
        setSelectedTranscriptModuleId(json.transcript.modules[0].module_id)
        // Automatically expand all stations for convenience
        const expanded: Record<string, boolean> = {}
        json.transcript.modules[0].stations.forEach((s: EvaluatedStationBreakdown) => {
          expanded[s.station_id] = true
        })
        setExpandedStations(expanded)
      }
    } catch (err: any) {
      console.error('Error fetching student transcript:', err)
      showError(err?.message || 'Failed to load detailed transcript.')
    } finally {
      setLoadingTranscript(false)
    }
  }

  // Load transcript when selectedStudentId changes
  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentTranscript(selectedStudentId)
    }
  }, [selectedStudentId])

  // Select a student and update URL
  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId)
    router.push(`/professor/students?student_id=${studentId}`, { scroll: false })
  }

  // Clear selected student and return to directory
  const handleBackToDirectory = () => {
    setSelectedStudentId(null)
    setTranscriptData(null)
    router.push('/professor/students', { scroll: false })
  }

  // Station expansion toggle
  const toggleStation = (stationId: string) => {
    setExpandedStations((prev) => ({
      ...prev,
      [stationId]: !prev[stationId],
    }))
  }

  const expandAllStations = (stations: EvaluatedStationBreakdown[]) => {
    const next: Record<string, boolean> = {}
    stations.forEach((s) => {
      next[s.station_id] = true
    })
    setExpandedStations(next)
  }

  const collapseAllStations = () => {
    setExpandedStations({})
  }

  // Active module in Detailed View with safe fallback to first module
  const activeTranscriptModule: ModuleResultsGroup | null = useMemo(() => {
    if (!transcriptData || !transcriptData.modules || transcriptData.modules.length === 0) return null
    if (selectedTranscriptModuleId) {
      const found = transcriptData.modules.find(
        (m: ModuleResultsGroup) => m.module_id === selectedTranscriptModuleId
      )
      if (found) return found
    }
    return transcriptData.modules[0] || null
  }, [transcriptData, selectedTranscriptModuleId])

  // Select module and expand its stations
  const handleSelectModule = (moduleId: string) => {
    setSelectedTranscriptModuleId(moduleId)
    if (transcriptData) {
      const targetMod = transcriptData.modules.find((m: ModuleResultsGroup) => m.module_id === moduleId)
      if (targetMod) {
        const nextExpanded: Record<string, boolean> = {}
        targetMod.stations.forEach((s: EvaluatedStationBreakdown) => {
          nextExpanded[s.station_id] = true
        })
        setExpandedStations(nextExpanded)
      }
    }
  }

  // Export PDF Handler
  const handleExportPDF = async () => {
    if (!transcriptData || !activeTranscriptModule) {
      showError('No transcript data available to export.')
      return
    }

    try {
      setExportingPdf(true)
      showInfo('Generating certified PDF transcript marksheet...')
      await exportStudentTranscriptToPDF(
        transcriptData.student,
        activeTranscriptModule,
        undefined,
        {
          evaluatingProfessorName: professorName,
          facultyName: facultyName,
        }
      )
      showSuccess(`PDF marksheet for ${transcriptData.student.full_name} downloaded.`)
    } catch (err: any) {
      console.error('PDF export error:', err)
      showError(err?.message || 'Failed to generate PDF export.')
    } finally {
      setExportingPdf(false)
    }
  }

  // Export Excel Handler
  const handleExportExcel = async () => {
    if (!transcriptData || !activeTranscriptModule) {
      showError('No transcript data available to export.')
      return
    }

    try {
      setExportingExcel(true)
      showInfo('Generating multi-sheet Excel marksheet workbook...')
      await exportStudentTranscriptToExcel(
        transcriptData.student,
        activeTranscriptModule,
        undefined,
        {
          evaluatingProfessorName: professorName,
          facultyName: facultyName,
        }
      )
      showSuccess(`Excel workbook for ${transcriptData.student.full_name} downloaded.`)
    } catch (err: any) {
      console.error('Excel export error:', err)
      showError(err?.message || 'Failed to generate Excel export.')
    } finally {
      setExportingExcel(false)
    }
  }

  // Quick export from Directory card
  const handleQuickExport = async (studentId: string, format: 'pdf' | 'excel', e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      showInfo(`Retrieving candidate marksheet for ${format.toUpperCase()} export...`)
      const params = new URLSearchParams()
      params.set('student_id', studentId)
      const res = await fetch(`/api/professor/students?${params.toString()}`)
      const json = await res.json()
      if (!res.ok || !json.success || !json.transcript || json.transcript.modules.length === 0) {
        throw new Error(json.error || 'Failed to retrieve student marksheet.')
      }

      const targetMod = json.transcript.modules[0]
      const profName = json.professor?.fullName || professorName
      const facName = json.professor?.facultyName || facultyName

      if (format === 'pdf') {
        await exportStudentTranscriptToPDF(json.transcript.student, targetMod, undefined, {
          evaluatingProfessorName: profName,
          facultyName: facName,
        })
        showSuccess(`PDF marksheet exported for ${json.transcript.student.full_name}.`)
      } else {
        await exportStudentTranscriptToExcel(json.transcript.student, targetMod, undefined, {
          evaluatingProfessorName: profName,
          facultyName: facName,
        })
        showSuccess(`Excel workbook exported for ${json.transcript.student.full_name}.`)
      }
    } catch (err: any) {
      console.error('Quick export error:', err)
      showError(err?.message || 'Could not export marksheet.')
    }
  }

  const selectedModuleName = useMemo(() => {
    if (selectedModuleId === 'all') return null
    return modulesList.find((m) => m.id === selectedModuleId)?.module_name || null
  }, [selectedModuleId, modulesList])

  // ===========================================================================
  // RENDER: MODE 2 - DETAILED STUDENT BREAKDOWN & TRANSCRIPT VIEW
  // ===========================================================================
  if (selectedStudentId) {
    if (loadingTranscript) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-slate-900 dark:text-white">
          <div className="p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 shadow-xl">
            <Loader2 className="size-8 animate-spin text-emerald-500" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Generating Candidate Performance Transcript...
            </p>
            <p className="text-xs text-slate-400">
              Calculating granular answers, station contributions, and clinical score deductions
            </p>
          </div>
        </div>
      )
    }

    if (!transcriptData) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-slate-900 dark:text-white">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
            <div className="size-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Transcript Not Available
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                The requested candidate marksheet could not be accessed or is outside your assigned modules.
              </p>
            </div>
            <button
              onClick={handleBackToDirectory}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <ArrowLeft className="size-4" />
              <span>Return to Candidate Directory</span>
            </button>
          </div>
        </div>
      )
    }

    const { student, modules } = transcriptData

    return (
      <div className="space-y-6 animate-in fade-in duration-200 pb-16">
        {/* Top Breadcrumb Navigation & Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 flex-wrap">
            <button
              onClick={handleBackToDirectory}
              className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Candidate Directory</span>
            </button>
            <ChevronRight className="size-3.5 text-slate-300 dark:text-slate-700" />
            <span className="text-slate-900 dark:text-white font-bold truncate max-w-[200px]">
              {student.full_name}
            </span>
            {activeTranscriptModule && (
              <>
                <ChevronRight className="size-3.5 text-slate-300 dark:text-slate-700" />
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                  {activeTranscriptModule.module_name}
                </span>
              </>
            )}
          </nav>

          {/* Action Export Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export PDF Button */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={exportingPdf}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              title="Export complete marksheet to PDF"
            >
              {exportingPdf ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileDown className="size-3.5" />
              )}
              <span>{exportingPdf ? 'Exporting PDF...' : 'Export PDF'}</span>
            </button>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              title="Export complete marksheet to Excel (.xlsx)"
            >
              {exportingExcel ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-3.5" />
              )}
              <span>{exportingExcel ? 'Exporting Excel...' : 'Export Excel'}</span>
            </button>

            {/* Print Marksheet */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer"
              title="Print official marksheet"
            >
              <Printer className="size-3.5" />
              <span className="hidden md:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={handleBackToDirectory}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Candidate Profile Header Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="absolute -top-12 -right-12 size-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div className="flex items-start gap-4">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-emerald-500/20 shrink-0">
                {student.first_name[0] || 'S'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {student.full_name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {student.matricule}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="size-3.5 text-slate-400" />
                    <span>{student.level_name}</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5 text-slate-400" />
                    <span>{student.academic_year_label}</span>
                  </span>
                  <span>·</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                    {student.section_name} · {student.group_name}
                  </span>
                </div>
              </div>
            </div>

            {/* Academic Standing Quick Tally */}
            <div className="flex items-center gap-3 self-start md:self-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
              <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  Passed Modules
                </span>
                <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300">
                  {transcriptData.passed_modules_count} / {transcriptData.total_modules_count}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State if student has no evaluated modules */}
        {modules.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <FileSpreadsheet className="size-10 text-slate-400 mx-auto stroke-1" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No Evaluated Marks Recorded
            </h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              This candidate does not have completed evaluations for your assigned modules yet. Please check back after station examiners submit their rubrics.
            </p>
          </div>
        ) : (
          <>
            {/* Level 1: Module Selector Tabs / Cards */}
            {modules.length > 1 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <BookOpen className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Assigned Modules ({modules.length})</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {modules.map((m: ModuleResultsGroup) => {
                    const isSelected = selectedTranscriptModuleId === m.module_id
                    return (
                      <button
                        key={m.module_id}
                        onClick={() => handleSelectModule(m.module_id)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {m.module_name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.is_passed
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {m.is_passed ? 'PASSED' : 'RETAKE'}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-2 font-mono">
                          <span className="text-xs text-slate-400 font-sans">Final Score:</span>
                          <span
                            className={`text-base font-black ${
                              m.is_passed
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {m.module_final_score.toFixed(2)} / 20.00
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Level 2 & 3: Active Module Stations Breakdown & Questions Checklist */}
            {activeTranscriptModule && (
              <div className="space-y-5">
                {/* Active Module Header Summary */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/40">
                        {activeTranscriptModule.session_type === 'retake'
                          ? 'Retake Exam'
                          : 'Regular Session'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          activeTranscriptModule.is_passed
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {activeTranscriptModule.is_passed ? (
                          <>
                            <CheckCircle2 className="size-3 text-emerald-500" />
                            <span>PASSED (CERTIFIED)</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="size-3 text-rose-500" />
                            <span>RETAKE REQUIRED</span>
                          </>
                        )}
                      </span>
                    </div>

                    <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
                      {activeTranscriptModule.module_name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Aggregated across {activeTranscriptModule.stations.length} clinical OSCE stations
                    </p>
                  </div>

                  {/* Module Score Meter */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-5 min-w-[240px]">
                    <div className="space-y-1 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Final Score (/20)
                      </span>
                      <div className="flex items-baseline gap-1 font-mono">
                        <span
                          className={`text-3xl font-black ${
                            activeTranscriptModule.is_passed
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {activeTranscriptModule.module_final_score.toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">/ 20.00 pts</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            activeTranscriptModule.is_passed ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, (activeTranscriptModule.module_final_score / 20) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stations Breakdown Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Station Breakdown & Evaluation Items
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => expandAllStations(activeTranscriptModule.stations)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllStations}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                {/* Station Breakdown Cards (Level 2) */}
                <div className="space-y-4">
                  {activeTranscriptModule.stations.map((st: EvaluatedStationBreakdown) => {
                    const isExpanded = !!expandedStations[st.station_id]
                    const hasPenalties = st.penalties && st.penalties.length > 0

                    return (
                      <div
                        key={st.station_id}
                        className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
                      >
                        {/* Station Card Header */}
                        <div
                          onClick={() => toggleStation(st.station_id)}
                          className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors select-none"
                        >
                          <div className="flex items-start sm:items-center gap-3.5">
                            <div className="size-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-mono font-bold text-sm shrink-0">
                              #{st.station_number}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                  {st.station_title}
                                </h4>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                                  Weightage: {st.weightage_percentage}%
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Raw Score: {st.net_station_raw_score.toFixed(2)} / {st.station_max_points} pts
                                {st.deductions_points < 0 && (
                                  <span className="text-rose-500 font-semibold ml-1.5">
                                    (Deductions: {st.deductions_points.toFixed(2)} pts)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Contribution & Toggle Icon */}
                          <div className="flex items-center gap-4 self-end sm:self-auto">
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Station Contribution
                              </span>
                              <div className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
                                {st.station_contribution.toFixed(2)}{' '}
                                <span className="text-xs font-semibold text-slate-400">
                                  / {st.station_max_contribution.toFixed(2)} pts
                                </span>
                              </div>
                            </div>
                            <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {isExpanded ? (
                                <ChevronUp className="size-4" />
                              ) : (
                                <ChevronDown className="size-4" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Station Details (Level 3 Checklist & Deductions) */}
                        {isExpanded && (
                          <div className="border-t border-slate-200/80 dark:border-slate-800 p-5 bg-slate-50/50 dark:bg-slate-950/40 space-y-5 animate-in fade-in duration-150">
                            {/* Questions Checklist */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                  <FileText className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>Evaluation Checklist Items ({st.answers.length})</span>
                                </span>
                              </div>

                              {st.answers.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">
                                  No question criteria items recorded for this station.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {st.answers.map((ans: any, idx: number) => {
                                    const isFullScore = ans.points_awarded >= ans.max_scale_value
                                    const isZeroScore = ans.points_awarded === 0

                                    return (
                                      <div
                                        key={ans.question_id || idx}
                                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                                      >
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                              Item #{idx + 1}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40">
                                              {ans.question_type}
                                            </span>
                                          </div>
                                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                            {ans.question_text}
                                          </p>

                                          {/* Options selected if any */}
                                          {ans.selected_options && ans.selected_options.length > 0 && (
                                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                              <span className="font-semibold">Selected:</span>
                                              <span>{ans.selected_options.join(', ')}</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Points awarded */}
                                        <div className="shrink-0 flex items-center gap-2">
                                          <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
                                              isFullScore
                                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                                : isZeroScore
                                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                            }`}
                                          >
                                            {ans.points_awarded.toFixed(2)} / {ans.max_scale_value.toFixed(2)} pts
                                          </span>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Clinical Deductions Section */}
                            {hasPenalties && (
                              <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <ShieldAlert className="size-3.5 text-rose-500" />
                                  <span>Clinical Deductions Applied ({st.penalties.length})</span>
                                </span>

                                <div className="space-y-1.5">
                                  {st.penalties.map((pen: any, pIdx: number) => (
                                    <div
                                      key={pen.id || pIdx}
                                      className="p-3 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between gap-3"
                                    >
                                      <div className="space-y-0.5">
                                        <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                                          {pen.reason}
                                        </p>
                                        {pen.matched_criteria_title && (
                                          <p className="text-[10px] text-rose-500 dark:text-rose-400">
                                            Criteria: {pen.matched_criteria_title}
                                          </p>
                                        )}
                                      </div>
                                      <span className="font-mono text-xs font-black text-rose-600 dark:text-rose-400 shrink-0">
                                        {pen.points > 0 ? `-${pen.points.toFixed(1)}` : pen.points.toFixed(1)} pts
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // ===========================================================================
  // RENDER: MODE 1 - STUDENT SEARCH & SELECTION GRID / DIRECTORY
  // ===========================================================================
  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Student Performance & Transcripts
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review candidate evaluations, inspect granular answers and scoring rubrics, and export enterprise PDF/Excel transcripts.
              </p>
            </div>
          </div>
        </div>

        {/* Refresh & Quick Tools */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => fetchDirectory(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`size-3.5 text-emerald-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Candidates */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Enrolled Candidates
            </span>
            <div className="size-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-900/60 shadow-xs">
              <Users className="size-5" />
            </div>
          </div>
          <div>
            {loadingDirectory ? (
              <div className="h-8 w-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                {summary.total_students}
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Across your assigned modules
            </p>
          </div>
        </div>

        {/* Evaluated Candidates */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Evaluated Candidates
            </span>
            <div className="size-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-900/60 shadow-xs">
              <CheckCircle className="size-5" />
            </div>
          </div>
          <div>
            {loadingDirectory ? (
              <div className="h-8 w-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                {summary.evaluated_students}
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              With recorded station marksheets
            </p>
          </div>
        </div>

        {/* Average Score */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Average Score
            </span>
            <div className="size-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-900/60 shadow-xs">
              <Award className="size-5" />
            </div>
          </div>
          <div>
            {loadingDirectory ? (
              <div className="h-8 w-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                {summary.average_score.toFixed(2)}{' '}
                <span className="text-sm font-bold text-slate-400">/ 20</span>
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Mean score across evaluated stations
            </p>
          </div>
        </div>

        {/* Passing Rate */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Passing Rate
            </span>
            <div className="size-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/60 dark:border-purple-900/60 shadow-xs">
              <Percent className="size-5" />
            </div>
          </div>
          <div>
            {loadingDirectory ? (
              <div className="h-8 w-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                {summary.pass_rate}%
              </div>
            )}
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Candidates achieving &gt;= 10.00 / 20
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search & Custom Popover Filters Toolbar */}
      <div className="p-4 md:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or matricule..."
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Module Filter Custom Popover Dropdown */}
          <div className="md:col-span-3 relative" ref={moduleDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setModuleDropdownOpen((prev) => !prev)
                setStatusDropdownOpen(false)
                setSortDropdownOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border transition-all cursor-pointer ${
                moduleDropdownOpen
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 text-slate-900 dark:text-white'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <BookOpen className="size-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {selectedModuleName || `All Assigned Modules (${modulesList.length})`}
                </span>
              </div>
              <ChevronDown
                className={`size-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  moduleDropdownOpen ? 'rotate-180 text-emerald-500' : ''
                }`}
              />
            </button>

            {moduleDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-full sm:min-w-[260px] max-h-64 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl backdrop-blur-md p-1.5 space-y-0.5 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModuleId('all')
                    setModuleDropdownOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                    selectedModuleId === 'all'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Layers className="size-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">All Assigned Modules</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {modulesList.length}
                    </span>
                    {selectedModuleId === 'all' && (
                      <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                </button>

                {modulesList.map((m) => {
                  const isSelected = selectedModuleId === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedModuleId(m.id)
                        setModuleDropdownOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BookOpen className="size-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{m.module_name}</span>
                      </div>
                      {isSelected && (
                        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Status Filter Custom Popover Dropdown */}
          <div className="md:col-span-3 relative" ref={statusDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setStatusDropdownOpen((prev) => !prev)
                setModuleDropdownOpen(false)
                setSortDropdownOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border transition-all cursor-pointer ${
                statusDropdownOpen
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 text-slate-900 dark:text-white'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Sliders className="size-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label || 'All Candidates'}
                </span>
              </div>
              <ChevronDown
                className={`size-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  statusDropdownOpen ? 'rotate-180 text-emerald-500' : ''
                }`}
              />
            </button>

            {statusDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-full sm:min-w-[220px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl backdrop-blur-md p-1.5 space-y-0.5 animate-in fade-in zoom-in-95">
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = statusFilter === opt.value
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(opt.value)
                        setStatusDropdownOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="size-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{opt.label}</span>
                      </div>
                      {isSelected && (
                        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sort Order Custom Popover Dropdown */}
          <div className="md:col-span-2 relative" ref={sortDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setSortDropdownOpen((prev) => !prev)
                setModuleDropdownOpen(false)
                setStatusDropdownOpen(false)
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border transition-all cursor-pointer ${
                sortDropdownOpen
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 text-slate-900 dark:text-white'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <ArrowUpDown className="size-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {SORT_OPTIONS.find((s) => s.value === sortOrder)?.label.split(' ')[0] || 'Sort'}
                </span>
              </div>
              <ChevronDown
                className={`size-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  sortDropdownOpen ? 'rotate-180 text-emerald-500' : ''
                }`}
              />
            </button>

            {sortDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-full sm:min-w-[200px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl backdrop-blur-md p-1.5 space-y-0.5 animate-in fade-in zoom-in-95">
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortOrder === opt.value
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSortOrder(opt.value)
                        setSortDropdownOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-medium border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="size-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{opt.label}</span>
                      </div>
                      {isSelected && (
                        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Layout Switcher and Active Filters Summary */}
        <div className="flex items-center justify-between pt-1 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span>
              Showing <span className="font-bold text-slate-700 dark:text-slate-200">{students.length}</span> candidates
            </span>
            {(searchQuery || selectedModuleId !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedModuleId('all')
                  setStatusFilter('all')
                }}
                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewLayout('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewLayout === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewLayout === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
              title="List View"
            >
              <List className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Candidate Directory Cards / Rows */}
      {loadingDirectory ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded-md" />
                  <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded-md" />
                </div>
              </div>
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <Users className="size-10 text-slate-400 mx-auto stroke-1" />
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Candidate Records Found
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No students matching your filter criteria were found in your assigned modules. Try clearing the search or switching module/status filters.
          </p>
        </div>
      ) : viewLayout === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((st: StudentDirectoryRecord) => {
            const hasEvaluations = st.evaluated_stations_count > 0
            const isPassed = st.is_passed

            return (
              <div
                key={st.id}
                onClick={() => handleSelectStudent(st.id)}
                className="group p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-400/80 dark:hover:border-emerald-500/60 transition-all cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                {/* Top Accent Stripe */}
                <div
                  className={`absolute top-0 inset-x-0 h-1 transition-all ${
                    st.status === 'passed'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      : st.status === 'failed'
                      ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                      : st.status === 'in_progress'
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />

                <div className="space-y-3">
                  {/* Candidate Identification */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0">
                        {st.first_name[0] || 'S'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {st.full_name}
                        </h3>
                        <span className="text-[11px] font-mono font-bold text-slate-400">
                          {st.matricule}
                        </span>
                      </div>
                    </div>

                    {/* Pass/Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                        st.status === 'passed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : st.status === 'failed'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          : st.status === 'in_progress'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {st.status === 'passed' && <CheckCircle2 className="size-3 text-emerald-500" />}
                      {st.status === 'failed' && <AlertCircle className="size-3 text-rose-500" />}
                      {st.status === 'in_progress' && <Clock className="size-3 text-amber-500" />}
                      {st.status === 'pending' && <MinusCircle className="size-3 text-slate-400" />}
                      <span>
                        {st.status === 'passed'
                          ? 'PASSED'
                          : st.status === 'failed'
                          ? 'RETAKE'
                          : st.status === 'in_progress'
                          ? 'IN PROGRESS'
                          : 'PENDING'}
                      </span>
                    </span>
                  </div>

                  {/* Academic Context Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <span className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 font-semibold">
                      {st.section_name} · {st.group_name}
                    </span>
                    <span>·</span>
                    <span>{st.level_name}</span>
                  </div>

                  {/* Score & Evaluation Meter */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {hasEvaluations ? 'Calculated Mark' : 'Evaluation Status'}
                      </span>
                      {hasEvaluations && st.final_score !== null ? (
                        <div className="flex items-baseline gap-1 font-mono">
                          <span
                            className={`text-lg font-black ${
                              isPassed
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {st.final_score.toFixed(2)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-semibold">/ 20</span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          Awaiting Examiner
                        </span>
                      )}
                    </div>

                    {/* Evaluated Stations progress */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-1">
                      <span>Stations Completed:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {st.evaluated_stations_count} / {st.total_stations_count || '–'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    <span>View Transcript</span>
                    <ArrowRight className="size-3.5" />
                  </span>

                  {/* Quick Export Tools */}
                  {hasEvaluations && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleQuickExport(st.id, 'pdf', e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Quick Export PDF"
                      >
                        <FileDown className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleQuickExport(st.id, 'excel', e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                        title="Quick Export Excel"
                      >
                        <FileSpreadsheet className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Candidate</th>
                  <th className="px-5 py-3.5">Cohort / Group</th>
                  <th className="px-5 py-3.5 text-center">Stations</th>
                  <th className="px-5 py-3.5 text-center">Score (/20)</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((st: StudentDirectoryRecord) => {
                  const hasEvaluations = st.evaluated_stations_count > 0
                  const isPassed = st.is_passed

                  return (
                    <tr
                      key={st.id}
                      onClick={() => handleSelectStudent(st.id)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0">
                            {st.first_name[0] || 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {st.full_name}
                            </p>
                            <p className="font-mono text-[11px] text-slate-400">
                              {st.matricule}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {st.section_name} · {st.group_name}
                        </p>
                        <p className="text-[11px] text-slate-400">{st.level_name}</p>
                      </td>
                      <td className="px-5 py-4 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {st.evaluated_stations_count} / {st.total_stations_count || '–'}
                      </td>
                      <td className="px-5 py-4 text-center font-mono font-black text-sm">
                        {hasEvaluations && st.final_score !== null ? (
                          <span
                            className={
                              isPassed
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {st.final_score.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-normal">–</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            st.status === 'passed'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : st.status === 'failed'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : st.status === 'in_progress'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {st.status === 'passed' && <CheckCircle2 className="size-3 text-emerald-500" />}
                          {st.status === 'failed' && <AlertCircle className="size-3 text-rose-500" />}
                          {st.status === 'in_progress' && <Clock className="size-3 text-amber-500" />}
                          {st.status === 'pending' && <MinusCircle className="size-3 text-slate-400" />}
                          <span>
                            {st.status === 'passed'
                              ? 'PASSED'
                              : st.status === 'failed'
                              ? 'RETAKE'
                              : st.status === 'in_progress'
                              ? 'IN PROGRESS'
                              : 'PENDING'}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasEvaluations && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleQuickExport(st.id, 'pdf', e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Export PDF"
                              >
                                <FileDown className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleQuickExport(st.id, 'excel', e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                title="Export Excel"
                              >
                                <FileSpreadsheet className="size-3.5" />
                              </button>
                            </>
                          )}
                          <span className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1">
                            <span>View</span>
                            <ArrowRight className="size-3.5" />
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfessorStudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <ProfessorStudentsContent />
    </Suspense>
  )
}
