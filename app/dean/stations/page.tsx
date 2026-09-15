'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
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
  FileText,
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
  Unlink,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectOption } from '@/components/ui/Select'
import { useAcademicYear } from '@/context/AcademicYearContext'
import { useToast } from '@/context/ToastContext'

export interface AcademicYearItem {
  id: string
  year_label: string
  name: string
  is_current: boolean
}

export interface StudyLevelItem {
  id: string
  level_name: string
  academic_year_id: string
}

export interface ModuleItem {
  id: string
  module_name: string
  level_id: string
  level_name: string
  responsible_prof_id?: string | null
  responsible_prof_name?: string
  responsible_professor?: {
    id: string
    first_name: string
    last_name: string
    full_name: string
    email?: string
  } | null
  station_count?: number
}

export interface ExamSessionItem {
  id: string
  module_id: string
  module_name?: string
  level_name?: string
  session_type: 'regular' | 'retake'
  exam_date: string
  display_label?: string
}

export interface StationItem {
  id: string
  exam_id: string
  module_id?: string
  module_name?: string
  station_number: number
  title: string
  access_pin: string
  weightage_percentage: number
  invigilator_prof_id?: string | null
  invigilator_prof_name?: string
  invigilator_professor?: {
    id: string
    first_name: string
    last_name: string
    full_name: string
    email?: string
  } | null
  created_at?: string
  linked_exam?: {
    id: string
    module_name: string
    level_name: string
    session_type: string
    exam_date: string
    display_label: string
  } | null
}

export interface ProfessorOption {
  id: string
  user_id: string
  first_name: string
  last_name: string
  full_name: string
  email?: string
}

function DeanStationsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showSuccess, showError } = useToast()
  const {
    selectedYearId,
    selectedYear,
    academicYears: contextYears,
    setSelectedYearId,
    isLoading: isYearLoading,
  } = useAcademicYear()

  // Navigation Step:
  // 1: Clinical Modules Directory
  // 2: Exam Sessions (Regular / Retake) for Selected Module
  // 3: Stations Management for Selected Exam Session
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Core Data
  const [academicYears, setAcademicYears] = useState<AcademicYearItem[]>([])
  const [studyLevels, setStudyLevels] = useState<StudyLevelItem[]>([])
  const [modules, setModules] = useState<ModuleItem[]>([])
  const [exams, setExams] = useState<ExamSessionItem[]>([])
  const [stations, setStations] = useState<StationItem[]>([])
  const [professors, setProfessors] = useState<ProfessorOption[]>([])

  // Drilldown Pointers
  const [selectedLevelId, setSelectedLevelId] = useState<string>('ALL')
  const [selectedModuleId, setSelectedModuleId] = useState<string>('')
  const [activeExamId, setActiveExamId] = useState<string | null>(null)

  // Search & Filtering
  const [moduleSearch, setModuleSearch] = useState('')
  const [stationSearch, setStationSearch] = useState('')

  // PIN Visibility toggles and copy feedback
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({})
  const [copiedPinId, setCopiedPinId] = useState<string | null>(null)

  // --- Modals ---
  // 1. Create Exam Session Modal
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false)
  const [sessionType, setSessionType] = useState<'regular' | 'retake'>('regular')
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0])
  const [submittingSession, setSubmittingSession] = useState(false)
  const [sessionError, setSessionError] = useState('')

  // 2. Create Station Modal
  const [isCreateStationOpen, setIsCreateStationOpen] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formStationNumber, setFormStationNumber] = useState<number>(1)
  const [formAccessPin, setFormAccessPin] = useState('')
  const [formShowPin, setFormShowPin] = useState(true)
  const [formWeightage, setFormWeightage] = useState<number>(50)
  const [formInvigilatorProfId, setFormInvigilatorProfId] = useState<string>('')
  const [submittingStation, setSubmittingStation] = useState(false)
  const [stationError, setStationError] = useState('')

  // 3. Edit Station Modal
  const [editingStation, setEditingStation] = useState<StationItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStationNumber, setEditStationNumber] = useState<number>(1)
  const [editAccessPin, setEditAccessPin] = useState('')
  const [editShowPin, setEditShowPin] = useState(true)
  const [editWeightage, setEditWeightage] = useState<number>(50)
  const [editInvigilatorProfId, setEditInvigilatorProfId] = useState<string>('')
  const [submittingEdit, setSubmittingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  // 4. Delete Confirmations
  const [deletingStation, setDeletingStation] = useState<StationItem | null>(null)
  const [deletingExam, setDeletingExam] = useState<ExamSessionItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Global ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateSessionOpen(false)
        setIsCreateStationOpen(false)
        setEditingStation(null)
        setDeletingStation(null)
        setDeletingExam(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Read URL query params on initial load
  useEffect(() => {
    const queryModuleId = searchParams.get('module_id')
    const queryExamId = searchParams.get('exam_id')
    const queryStep = searchParams.get('step')

    if (queryModuleId && queryExamId) {
      setSelectedModuleId(queryModuleId)
      setActiveExamId(queryExamId)
      setCurrentStep(3)
    } else if (queryModuleId) {
      setSelectedModuleId(queryModuleId)
      setCurrentStep(2)
    } else if (queryStep === '2') {
      setCurrentStep(2)
    } else if (queryStep === '3') {
      setCurrentStep(3)
    }
  }, [searchParams])

  // Fetch all scoped faculty data (academic years, levels, modules, exams, stations, professors)
  const fetchAllFacultyData = async (yearId?: string | null, isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    const targetYearId = yearId || selectedYearId

    try {
      const yearQuery = targetYearId ? `?academic_year_id=${targetYearId}` : ''
      const [modulesRes, examsRes, stationsRes] = await Promise.all([
        fetch(`/api/dean/modules${yearQuery}`),
        fetch(`/api/dean/exams${yearQuery}`),
        fetch(`/api/dean/stations${yearQuery}`),
      ])

      const [modulesJson, examsJson, stationsJson] = await Promise.all([
        modulesRes.json(),
        examsRes.json(),
        stationsRes.json(),
      ])

      if (modulesRes.ok && modulesJson.success) {
        setModules(modulesJson.modules || [])
        setStudyLevels(modulesJson.studyLevels || [])
        setProfessors(modulesJson.professors || [])
        setAcademicYears(modulesJson.academicYears || [])
      }

      if (examsRes.ok && examsJson.success) {
        setExams(examsJson.exams || [])
      }

      if (stationsRes.ok && stationsJson.success) {
        setStations(stationsJson.stations || [])
      }
    } catch (err: any) {
      showError(err?.message || 'Error loading faculty stations data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (selectedYearId) {
      fetchAllFacultyData(selectedYearId)
    } else if (!isYearLoading) {
      fetchAllFacultyData(null)
    }
  }, [selectedYearId, isYearLoading])

  // Active module object
  const activeModule = useMemo(() => {
    return modules.find((m) => m.id === selectedModuleId) || null
  }, [modules, selectedModuleId])

  // Exams for the active module (max 2: 1 regular, 1 retake)
  const activeModuleExams = useMemo(() => {
    if (!selectedModuleId) return []
    return exams.filter((e) => e.module_id === selectedModuleId)
  }, [exams, selectedModuleId])

  const hasRegularSession = activeModuleExams.some((e) => e.session_type === 'regular')
  const hasRetakeSession = activeModuleExams.some((e) => e.session_type === 'retake')
  const isMaxSessionsReached = hasRegularSession && hasRetakeSession

  const regularExam = useMemo(
    () => activeModuleExams.find((e) => e.session_type === 'regular') || null,
    [activeModuleExams]
  )
  const retakeExam = useMemo(
    () => activeModuleExams.find((e) => e.session_type === 'retake') || null,
    [activeModuleExams]
  )

  const regularStations = useMemo(() => {
    if (!regularExam) return []
    return stations.filter((s) => s.exam_id === regularExam.id)
  }, [stations, regularExam])

  const retakeStations = useMemo(() => {
    if (!retakeExam) return []
    return stations.filter((s) => s.exam_id === retakeExam.id)
  }, [stations, retakeExam])

  const regularWeightage = useMemo(() => {
    return (
      Math.round(
        regularStations.reduce((sum, s) => sum + Number(s.weightage_percentage || 0), 0) * 100
      ) / 100
    )
  }, [regularStations])

  const retakeWeightage = useMemo(() => {
    return (
      Math.round(
        retakeStations.reduce((sum, s) => sum + Number(s.weightage_percentage || 0), 0) * 100
      ) / 100
    )
  }, [retakeStations])

  // Automatically sync activeExamId when active module or its exams change
  useEffect(() => {
    if (activeModuleExams.length === 0) {
      setActiveExamId(null)
      return
    }

    if (!activeExamId || !activeModuleExams.some((e) => e.id === activeExamId)) {
      const reg = activeModuleExams.find((e) => e.session_type === 'regular')
      setActiveExamId(reg ? reg.id : activeModuleExams[0].id)
    }
  }, [activeModuleExams, activeExamId])

  // Active exam session
  const activeExam = useMemo(() => {
    return activeModuleExams.find((e) => e.id === activeExamId) || null
  }, [activeModuleExams, activeExamId])

  // Stations for active exam session
  const activeSessionStations = useMemo(() => {
    if (!activeExam) return []
    return stations.filter((s) => s.exam_id === activeExam.id)
  }, [stations, activeExam])

  // Total session weightage (towards 100.00%)
  const totalSessionWeightage = useMemo(() => {
    return (
      Math.round(
        activeSessionStations.reduce((sum, s) => sum + Number(s.weightage_percentage || 0), 0) * 100
      ) / 100
    )
  }, [activeSessionStations])

  const availableWeightage = Math.max(0, Math.round((100 - totalSessionWeightage) * 100) / 100)
  const isFullyAllocated = totalSessionWeightage >= 100

  // Filtered stations for display in Step 3
  const displayedStations = useMemo(() => {
    if (!stationSearch.trim()) return activeSessionStations
    const q = stationSearch.toLowerCase().trim()
    return activeSessionStations.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        String(s.station_number).includes(q) ||
        s.access_pin.includes(q) ||
        (s.invigilator_prof_name && s.invigilator_prof_name.toLowerCase().includes(q))
    )
  }, [activeSessionStations, stationSearch])

  // Filtered modules for Step 2
  const displayedModules = useMemo(() => {
    return modules.filter((m) => {
      if (selectedLevelId !== 'ALL' && m.level_id !== selectedLevelId) return false
      if (moduleSearch.trim()) {
        const q = moduleSearch.toLowerCase().trim()
        const matchName = m.module_name.toLowerCase().includes(q)
        const matchLevel = m.level_name.toLowerCase().includes(q)
        const matchProf = m.responsible_prof_name?.toLowerCase().includes(q)
        if (!matchName && !matchLevel && !matchProf) return false
      }
      return true
    })
  }, [modules, selectedLevelId, moduleSearch])

  // --- PIN Handlers ---
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
  const handleOpenCreateSession = () => {
    setSessionType(hasRegularSession ? 'retake' : 'regular')
    setExamDate(new Date().toISOString().split('T')[0])
    setSessionError('')
    setIsCreateSessionOpen(true)
  }

  const handleOpenCreateStation = () => {
    if (!activeExam) {
      showError('Please schedule or select an exam session first.')
      return
    }
    const nextNumber =
      activeSessionStations.length > 0
        ? Math.max(...activeSessionStations.map((s) => s.station_number)) + 1
        : 1

    setFormStationNumber(nextNumber)
    setFormTitle(`Station ${nextNumber}: Clinical Case Assessment`)
    setFormAccessPin(Math.floor(100000 + Math.random() * 900000).toString())
    setFormShowPin(true)
    setFormWeightage(availableWeightage > 0 ? availableWeightage : 50)
    setFormInvigilatorProfId('')
    setStationError('')
    setIsCreateStationOpen(true)
  }

  const handleOpenEditStation = (e: React.MouseEvent, station: StationItem) => {
    e.stopPropagation()
    setEditingStation(station)
    setEditTitle(station.title)
    setEditStationNumber(station.station_number)
    setEditAccessPin(station.access_pin)
    setEditShowPin(true)
    setEditWeightage(station.weightage_percentage || 50)
    setEditInvigilatorProfId(station.invigilator_prof_id || '')
    setEditError('')
  }

  // --- Submit Handlers ---
  const handleCreateSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedModuleId) {
      setSessionError('Please select a curriculum module.')
      return
    }

    setSubmittingSession(true)
    setSessionError('')

    try {
      const res = await fetch('/api/dean/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: selectedModuleId,
          session_type: sessionType,
          exam_date: examDate,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess(`${sessionType === 'retake' ? 'Retake' : 'Regular'} exam session created.`)
        setIsCreateSessionOpen(false)
        await fetchAllFacultyData(selectedYearId)
        if (json.exam?.id) {
          setActiveExamId(json.exam.id)
          setCurrentStep(3)
        }
      } else {
        setSessionError(json.error || 'Failed to create exam session.')
      }
    } catch (err: any) {
      setSessionError(err?.message || 'Error connecting to server.')
    } finally {
      setSubmittingSession(false)
    }
  }

  const handleCreateStationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeExam) {
      setStationError('No exam session selected.')
      return
    }
    if (!formTitle.trim()) {
      setStationError('Station title is required.')
      return
    }
    if (!formAccessPin || formAccessPin.trim().length < 4) {
      setStationError('Access PIN must be at least 4 characters.')
      return
    }

    setSubmittingStation(true)
    setStationError('')

    try {
      const res = await fetch('/api/dean/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          station_number: formStationNumber,
          access_pin: formAccessPin.trim(),
          weightage_percentage: formWeightage,
          invigilator_prof_id: formInvigilatorProfId || null,
          exam_id: activeExam.id,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('Clinical station created successfully.')
        setIsCreateStationOpen(false)
        fetchAllFacultyData(selectedYearId)
      } else {
        setStationError(json.error || 'Failed to create station.')
      }
    } catch (err: any) {
      setStationError(err?.message || 'Error connecting to server.')
    } finally {
      setSubmittingStation(false)
    }
  }

  const handleEditStationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStation) return

    if (!editTitle.trim()) {
      setEditError('Station title cannot be empty.')
      return
    }
    if (!editAccessPin || editAccessPin.trim().length < 4) {
      setEditError('Access PIN must be at least 4 characters.')
      return
    }

    setSubmittingEdit(true)
    setEditError('')

    try {
      const res = await fetch(`/api/dean/stations/${editingStation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          station_number: editStationNumber,
          access_pin: editAccessPin.trim(),
          weightage_percentage: editWeightage,
          invigilator_prof_id: editInvigilatorProfId || null,
          exam_id: editingStation.exam_id,
        }),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('Clinical station updated.')
        setEditingStation(null)
        fetchAllFacultyData(selectedYearId)
      } else {
        setEditError(json.error || 'Failed to update station.')
      }
    } catch (err: any) {
      setEditError(err?.message || 'Error connecting to server.')
    } finally {
      setSubmittingEdit(false)
    }
  }

  const handleDeleteStationConfirm = async () => {
    if (!deletingStation) return
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/dean/stations/${deletingStation.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Clinical station removed.')
        setDeletingStation(null)
        fetchAllFacultyData(selectedYearId)
      } else {
        showError(json.error || 'Failed to delete station.')
      }
    } catch (err: any) {
      showError(err?.message || 'Error communicating with server.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteExamConfirm = async () => {
    if (!deletingExam) return
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/dean/exams?id=${deletingExam.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('Exam session removed.')
        setDeletingExam(null)
        await fetchAllFacultyData(selectedYearId)
        if (currentStep === 3) {
          setCurrentStep(2)
        }
      } else {
        showError(json.error || 'Failed to delete exam session.')
      }
    } catch (err: any) {
      showError(err?.message || 'Error communicating with server.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Professor selection dropdown options
  const professorSelectOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = [
      {
        value: '',
        label: 'Unassigned (Assign Later)',
        subLabel: 'Dean or professor can assign later',
        icon: UserCheck,
      },
    ]

    professors.forEach((p) => {
      list.push({
        value: p.id,
        label: p.full_name,
        subLabel: p.email || 'Faculty Evaluator',
        icon: Stethoscope,
      })
    })

    return list
  }, [professors])

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* TOP HEADER & INTERACTIVE BREADCRUMB DRILLDOWN TRAIL                       */}
      {/* ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md space-y-3">
        {/* Breadcrumb Trail */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setCurrentStep(1)
              setSelectedModuleId('')
            }}
            className={`hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer ${
              currentStep === 1 ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : ''
            }`}
          >
            <BookOpen className="size-3.5" />
            <span>1. Clinical Modules</span>
          </button>

          {(currentStep === 2 || currentStep === 3) && activeModule && (
            <>
              <ChevronRight className="size-3.5 text-slate-300 dark:text-slate-600" />
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={`hover:text-blue-600 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentStep === 2 ? 'text-blue-600 dark:text-blue-400 font-extrabold' : ''
                }`}
              >
                <Calendar className="size-3.5" />
                <span>2. {activeModule.module_name} Exam Sessions</span>
              </button>
            </>
          )}

          {currentStep === 3 && activeExam && (
            <>
              <ChevronRight className="size-3.5 text-slate-300 dark:text-slate-600" />
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1.5 capitalize">
                <ClipboardCheck className="size-3.5" />
                <span>3. {activeExam.session_type} Session Stations</span>
              </span>
            </>
          )}
        </div>

        {/* Dynamic Header Titles based on Step */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              {currentStep === 1 && (
                <>
                  <div className="size-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                    <BookOpen className="size-5" />
                  </div>
                  <span>Clinical Modules Directory</span>
                </>
              )}

              {currentStep === 2 && activeModule && (
                <>
                  <div className="size-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <Calendar className="size-5" />
                  </div>
                  <span>{activeModule.module_name} — Exam Sessions</span>
                </>
              )}

              {currentStep === 3 && activeModule && activeExam && (
                <>
                  <div className="size-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <ClipboardCheck className="size-5" />
                  </div>
                  <span className="capitalize">
                    {activeModule.module_name} — {activeExam.session_type} Session Stations
                  </span>
                </>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {currentStep === 1 &&
                'Step 1: Select a curriculum module below to view its exam sessions and stations.'}
              {currentStep === 2 &&
                'Step 2: Explicitly select an active exam session (Regular or Retake) to view and manage its stations.'}
              {currentStep === 3 &&
                'Step 3: Full professor workspace parity. Author clinical stations, configure PINs, and link rubrics.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {currentStep === 2 && (
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1)
                  setSelectedModuleId('')
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Modules</span>
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Exam Sessions</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fetchAllFacultyData(selectedYearId, true)}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: CLINICAL MODULES DIRECTORY                                        */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in">
          {/* Controls Bar: Study Level Filter & Search */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Study Level Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedLevelId('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedLevelId === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Levels ({loading ? '...' : modules.length})
              </button>

              {studyLevels.map((lvl) => {
                const lvlCount = modules.filter((m) => m.level_id === lvl.id).length

                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSelectedLevelId(lvl.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedLevelId === lvl.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lvl.level_name} ({lvlCount})
                  </button>
                )
              })}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={moduleSearch}
                onChange={(e) => setModuleSearch(e.target.value)}
                placeholder="Search module by name or professor..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              {moduleSearch && (
                <button
                  type="button"
                  onClick={() => setModuleSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Module Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`module-skel-${idx}`}
                  className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="size-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                      <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-6 w-3/4 rounded-xl bg-slate-200 dark:bg-slate-800" />
                      <div className="h-3 w-1/2 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                      <div className="space-y-1 flex-1">
                        <div className="h-2.5 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/40" />
                      <div className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/40" />
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="size-4 rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayedModules.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
              <BookOpen className="size-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Clinical Modules Found
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No clinical modules match your current filter. Try selecting another study level or clearing search.
              </p>
              <Link
                href="/dean/modules"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-500/25 hover:bg-indigo-700 transition-all"
              >
                <Plus className="size-4" />
                <span>Configure Modules</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedModules.map((mod) => {
                const modExams = exams.filter((e) => e.module_id === mod.id)
                const regExam = modExams.find((e) => e.session_type === 'regular')
                const retkExam = modExams.find((e) => e.session_type === 'retake')
                const modStations = stations.filter(
                  (s) => s.module_id === mod.id || modExams.some((e) => e.id === s.exam_id)
                )

                return (
                  <div
                    key={mod.id}
                    onClick={() => {
                      setSelectedModuleId(mod.id)
                      setCurrentStep(2)
                    }}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col justify-between space-y-5 group"
                  >
                    <div className="space-y-3.5">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex size-10 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                          <BookOpen className="size-5" />
                        </span>
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {mod.level_name}
                        </span>
                      </div>

                      {/* Module Title */}
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {mod.module_name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Clinical Curriculum Module
                        </p>
                      </div>

                      {/* Responsible Professor */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2.5">
                        <div className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Stethoscope className="size-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Responsible Professor
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {mod.responsible_prof_name || 'Unassigned Professor'}
                          </span>
                        </div>
                      </div>

                      {/* Key Metrics Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Exam Sessions
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {modExams.length}/2
                            </span>
                            <div className="flex items-center gap-1">
                              {regExam && (
                                <span className="size-2 rounded-full bg-emerald-500" title="Regular Session active" />
                              )}
                              {retkExam && (
                                <span className="size-2 rounded-full bg-purple-500" title="Retake Session active" />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Stations
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                            {modStations.length} Configured
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Button */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      <span>Select Module & View Sessions</span>
                      <ArrowRight className="size-4 group-hover:translate-x-1.5 transition-transform" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: EXAM SESSIONS VIEW FOR SELECTED MODULE (Regular / Retake)         */}
      {/* ========================================================================= */}
      {currentStep === 2 && activeModule && (
        <div className="space-y-6 animate-in fade-in">
          {/* Module Summary Banner */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <BookOpen className="size-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {activeModule.module_name}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {activeModule.level_name}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Responsible Professor: <strong className="text-slate-700 dark:text-slate-300">{activeModule.responsible_prof_name || 'Unassigned'}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              {isMaxSessionsReached ? (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="size-4 text-emerald-500" />
                  <span>All Sessions Created (2/2)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenCreateSession}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="size-4" />
                  <span>+ Create Exam Session</span>
                </button>
              )}
            </div>
          </div>

          {/* Step 2 Section Header */}
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Calendar className="size-4 text-blue-500" />
              <span>Step 2: Choose Exam Session to Manage Stations ({activeModuleExams.length}/2 Configured)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Each module supports 1 Regular Session and 1 Retake Session per academic cycle. Select an active session below to author and inspect its clinical stations.
            </p>
          </div>

          {/* Exam Sessions Grid (Regular & Retake Cards) */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div
                  key={`session-skel-${idx}`}
                  className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-5 h-72"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-6 w-36 rounded-xl bg-slate-200 dark:bg-slate-800" />
                      <div className="size-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-3 w-32 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                    </div>
                    <div className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/50" />
                  </div>
                  <div className="h-11 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Regular Session Card */}
            {regularExam ? (
              <div
                onClick={() => {
                  setActiveExamId(regularExam.id)
                  setCurrentStep(3)
                }}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/60 transition-all shadow-sm flex flex-col justify-between space-y-5 cursor-pointer group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold uppercase">
                      <Calendar className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Regular Exam Session</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingExam(regularExam)
                      }}
                      title="Delete Regular Session"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {activeModule.module_name} — Regular Examination
                    </h4>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Scheduled Date: {new Date(regularExam.exam_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Stations & Weightage progress */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600 dark:text-slate-400">
                        {regularStations.length} Clinical Station{regularStations.length !== 1 ? 's' : ''}
                      </span>
                      <span className={`font-mono ${regularWeightage >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {regularWeightage.toFixed(1)}% / 100%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          regularWeightage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, regularWeightage)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Prominent CTA */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveExamId(regularExam.id)
                    setCurrentStep(3)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <ClipboardCheck className="size-4" />
                  <span>Manage Stations ({regularStations.length})</span>
                  <ArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col justify-between items-center text-center space-y-5">
                <div className="space-y-2">
                  <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <Calendar className="size-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Regular Session Not Scheduled
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Schedule the primary OSCE examination session for &quot;{activeModule.module_name}&quot; to configure stations and author rubrics.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSessionType('regular')
                    setExamDate(new Date().toISOString().split('T')[0])
                    setSessionError('')
                    setIsCreateSessionOpen(true)
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="size-4" />
                  <span>+ Create Regular Session</span>
                </button>
              </div>
            )}

            {/* 2. Retake Session Card */}
            {retakeExam ? (
              <div
                onClick={() => {
                  setActiveExamId(retakeExam.id)
                  setCurrentStep(3)
                }}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-500/60 transition-all shadow-sm flex flex-col justify-between space-y-5 cursor-pointer group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-extrabold uppercase">
                      <Calendar className="size-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Retake Session (Rattrapage)</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingExam(retakeExam)
                      }}
                      title="Delete Retake Session"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {activeModule.module_name} — Retake Examination
                    </h4>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Scheduled Date: {new Date(retakeExam.exam_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Stations & Weightage progress */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600 dark:text-slate-400">
                        {retakeStations.length} Clinical Station{retakeStations.length !== 1 ? 's' : ''}
                      </span>
                      <span className={`font-mono ${retakeWeightage >= 100 ? 'text-purple-600 dark:text-purple-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {retakeWeightage.toFixed(1)}% / 100%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          retakeWeightage >= 100 ? 'bg-purple-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, retakeWeightage)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Prominent CTA */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveExamId(retakeExam.id)
                    setCurrentStep(3)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <ClipboardCheck className="size-4" />
                  <span>Manage Stations ({retakeStations.length})</span>
                  <ArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col justify-between items-center text-center space-y-5">
                <div className="space-y-2">
                  <div className="size-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                    <Calendar className="size-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Retake Session Not Scheduled
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Schedule a retake (rattrapage) session for students eligible for OSCE makeup evaluations.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSessionType('retake')
                    setExamDate(new Date().toISOString().split('T')[0])
                    setSessionError('')
                    setIsCreateSessionOpen(true)
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="size-4" />
                  <span>+ Create Retake Session</span>
                </button>
              </div>
            )}
          </div>
          )}

          {/* Informational Hierarchy Note */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
            <span>
              <strong>OSCE Examination Flow:</strong> Clinical Stations belong exclusively to an Exam Session. Click <strong>&quot;Manage Stations&quot;</strong> on an active session card above to view, create, and author stations tied to that session.
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: STATIONS MANAGEMENT VIEW (For the selected active exam)            */}
      {/* ========================================================================= */}
      {currentStep === 3 && activeModule && activeExam && (
        <div className="space-y-6 animate-in fade-in">
          {/* Active Exam Session Context Bar with Quick Session Switcher */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`size-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  activeExam.session_type === 'retake'
                    ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400'
                    : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <Calendar className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black capitalize text-slate-900 dark:text-white">
                    {activeExam.session_type === 'retake' ? 'Retake Examination' : 'Regular Examination'}
                  </h2>
                  <span className="text-xs text-slate-400 font-mono">
                    • {new Date(activeExam.exam_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {activeModule.module_name} • {activeModule.level_name} • {activeSessionStations.length} Clinical Stations
                </p>
              </div>
            </div>

            {/* Quick Session Switcher if both regular & retake exist */}
            {activeModuleExams.length > 1 && (
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 self-start sm:self-auto">
                {activeModuleExams.map((ex) => {
                  const isCurrent = ex.id === activeExam.id
                  const isRetake = ex.session_type === 'retake'
                  const count = stations.filter((s) => s.exam_id === ex.id).length

                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => setActiveExamId(ex.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        isCurrent
                          ? isRetake
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {isRetake ? 'Retake' : 'Regular'} ({count})
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Weightage Allocation Card towards 100% */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0 ring-1 ring-emerald-200/60 dark:ring-emerald-800/60 shadow-sm">
                  <Layers className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Curriculum Stations Weightage Allocation
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total station weightages for this {activeExam.session_type === 'retake' ? 'Retake' : 'Regular'} session must equal 100.00%.
                  </p>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border self-start sm:self-auto transition-colors ${
                  isFullyAllocated
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}
              >
                {isFullyAllocated ? (
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="size-3.5 text-amber-500" />
                )}
                <span>
                  {totalSessionWeightage}% / 100%{' '}
                  {isFullyAllocated ? '— Fully Allocated' : `— ${availableWeightage}% Remaining`}
                </span>
              </span>
            </div>

            {/* Animated Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out relative ${
                    isFullyAllocated
                      ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 shadow-emerald-500/25'
                      : 'bg-gradient-to-r from-amber-500 via-orange-400 to-orange-500 shadow-amber-500/25'
                  } shadow-sm`}
                  style={{ width: `${Math.min(100, totalSessionWeightage)}%` }}
                >
                  <div className="absolute inset-0 bg-white/10 rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>
                  {activeSessionStations.length} Station{activeSessionStations.length !== 1 ? 's' : ''} Configured
                </span>
                <span className="font-mono">{totalSessionWeightage.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Station Actions Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={stationSearch}
                onChange={(e) => setStationSearch(e.target.value)}
                placeholder="Search stations by number, title, or PIN..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-xs"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenCreateStation}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:from-emerald-700 hover:to-teal-700 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="size-4" />
              <span>+ Create Clinical Station</span>
            </button>
          </div>

          {/* Stations Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={`station-skel-${idx}`}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="h-6 w-24 rounded-xl bg-slate-200 dark:bg-slate-800" />
                      <div className="h-6 w-16 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-3 w-28 rounded bg-slate-200/70 dark:bg-slate-800/70" />
                    </div>
                    <div className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/50" />
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="h-8 w-24 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    <div className="flex gap-2">
                      <div className="size-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
                      <div className="size-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayedStations.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
              <ClipboardCheck className="size-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                No Clinical Stations Added Yet
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Click &quot;+ Create Clinical Station&quot; above to add Station #1 to this{' '}
                {activeExam.session_type === 'retake' ? 'Retake' : 'Regular'} exam session.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateStation}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Create Station #1</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedStations.map((st) => {
                const isPinRevealed = !!revealedPins[st.id]
                const isCopied = copiedPinId === st.id

                return (
                  <div
                    key={st.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all group"
                  >
                    <div className="space-y-3">
                      {/* Station Header Pill & Weightage */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-sm shadow-emerald-500/20">
                          <ClipboardCheck className="size-3" />
                          Station #{st.station_number}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 tabular-nums">
                          {st.weightage_percentage}% Weightage
                        </span>
                      </div>

                      {/* Station Title */}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {st.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <p className="text-xs text-slate-400">
                            {activeModule.module_name} • {activeModule.level_name}
                          </p>
                        </div>
                      </div>

                      {/* Evaluator Professor Badge */}
                      <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Stethoscope className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] uppercase font-bold text-slate-400">
                              Evaluator Professor
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {st.invigilator_prof_name && st.invigilator_prof_name !== 'Unassigned'
                                ? st.invigilator_prof_name
                                : 'Unassigned (Assign Below)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Live Tablet Scoring PIN Card */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Key className="size-4 text-amber-500 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                              Tablet Scoring PIN
                            </span>
                            <span className="font-mono text-xs font-black text-slate-900 dark:text-white tracking-widest">
                              {isPinRevealed ? st.access_pin : '••••••'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => togglePinReveal(e, st.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            aria-label="Toggle PIN Visibility"
                          >
                            {isPinRevealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPin(e, st.id, st.access_pin)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
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

                    {/* Card Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-0.5 text-slate-400">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditStation(e, st)}
                          className="p-1.5 rounded-lg hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer"
                          title="Edit Station Details & Evaluator"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(st.access_pin)
                            showSuccess('PIN copied!')
                          }}
                          className="p-1.5 rounded-lg hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all cursor-pointer"
                          title="Quick Copy PIN"
                        >
                          <Key className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingStation(st)
                          }}
                          className="p-1.5 rounded-lg hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                          title="Delete Station"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <Link
                        href={`/professor/stations/${st.id}/exams/${activeExam.id}`}
                        className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 group-hover:translate-x-1 transition-all duration-200"
                      >
                        <span>Open Checklist</span>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Fallback if on Step 3 but activeExam is missing */}
      {currentStep === 3 && (!activeExam || !activeModule) && (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <Calendar className="size-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Active Exam Session Selected
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Please select a valid exam session to manage clinical stations.
          </p>
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 transition-all cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Return to Exam Sessions</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE EXAM SESSION MODAL                                        */}
      {/* ========================================================================= */}
      {isCreateSessionOpen && activeModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                  <Calendar className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Create Exam Session
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Module: {activeModule.module_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateSessionOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {sessionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{sessionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSessionSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Session Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={hasRegularSession}
                    onClick={() => setSessionType('regular')}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-xs font-bold transition-all ${
                      hasRegularSession
                        ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 cursor-not-allowed opacity-60'
                        : sessionType === 'regular'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>Regular Session</span>
                    {hasRegularSession && <span className="text-[9px] text-slate-400">(Created)</span>}
                  </button>

                  <button
                    type="button"
                    disabled={hasRetakeSession}
                    onClick={() => setSessionType('retake')}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border text-xs font-bold transition-all ${
                      hasRetakeSession
                        ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 cursor-not-allowed opacity-60'
                        : sessionType === 'retake'
                        ? 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>Retake Session</span>
                    {hasRetakeSession && <span className="text-[9px] text-slate-400">(Created)</span>}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Exam Date *
                </label>
                <DatePicker value={examDate} onChange={(date) => setExamDate(date)} />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateSessionOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSession}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {submittingSession ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Session</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE CLINICAL STATION MODAL                                    */}
      {/* ========================================================================= */}
      {isCreateStationOpen && activeExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                  <ClipboardCheck className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Create Clinical Station
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Session: {activeExam.session_type === 'retake' ? 'Retake' : 'Regular'} ({activeModule?.module_name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateStationOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {stationError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{stationError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStationSubmit} className="space-y-4">
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

              {/* Access PIN */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tablet Access PIN * (4+ characters)
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPin}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
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
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {formShowPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Weightage Percentage */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Weightage Percentage (%)
                </label>
                <div className="relative">
                  <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={formWeightage}
                    onChange={(e) => setFormWeightage(parseFloat(e.target.value) || 50)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Evaluator Professor */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Evaluator Professor (Optional)
                </label>
                <Select
                  options={professorSelectOptions}
                  value={formInvigilatorProfId}
                  onChange={(val) => setFormInvigilatorProfId(val)}
                  placeholder="Select Evaluator Professor..."
                  searchable={true}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateStationOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStation}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {submittingStation ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Station</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT CLINICAL STATION MODAL                                      */}
      {/* ========================================================================= */}
      {editingStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                  <Edit2 className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit Clinical Station #{editingStation.station_number}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">
                    Modify title, access PIN, weightage, or evaluator assignment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStation(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="size-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditStationSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Station # *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editStationNumber}
                    onChange={(e) => setEditStationNumber(parseInt(e.target.value) || 1)}
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
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. Cardiovascular Examination"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Access PIN */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Tablet Access PIN * (4+ characters)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const code = Math.floor(100000 + Math.random() * 900000).toString()
                      setEditAccessPin(code)
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <Sparkles className="size-3" />
                    <span>Generate New PIN</span>
                  </button>
                </div>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type={editShowPin ? 'text' : 'password'}
                    value={editAccessPin}
                    onChange={(e) => setEditAccessPin(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setEditShowPin(!editShowPin)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {editShowPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Weightage Percentage */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Weightage Percentage (%)
                </label>
                <div className="relative">
                  <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={editWeightage}
                    onChange={(e) => setEditWeightage(parseFloat(e.target.value) || 50)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Evaluator Professor */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Evaluator Professor (Optional)
                </label>
                <Select
                  options={professorSelectOptions}
                  value={editInvigilatorProfId}
                  onChange={(val) => setEditInvigilatorProfId(val)}
                  placeholder="Select Evaluator Professor..."
                  searchable={true}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStation(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/25 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {submittingEdit ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE CONFIRMATION MODALS                                       */}
      {/* ========================================================================= */}
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
                Are you sure you want to remove clinical station{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {deletingStation.title}
                </strong>
                ? All questions and criteria linked to this station will be permanently deleted.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeletingStation(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStationConfirm}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/25 transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Yes, Delete Station</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mx-auto">
              <Trash2 className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete {deletingExam.session_type === 'retake' ? 'Retake' : 'Regular'} Session?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Removing this session will remove all child stations and criteria authored for it. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-3">
              <button
                type="button"
                onClick={() => setDeletingExam(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExamConfirm}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/25 transition-all disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Yes, Delete Session</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DeanStationsDrilldownPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <DeanStationsContent />
    </Suspense>
  )
}
