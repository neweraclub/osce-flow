'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  GraduationCap,
  Hash,
  HelpCircle,
  Layers,
  Loader2,
  Lock,
  LogOut,
  MinusCircle,
  Percent,
  Printer,
  Radio,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Stethoscope,
  X,
  XCircle,
} from 'lucide-react'
import {
  getStudentResultsDashboardDataAction,
  ModuleResultsGroup,
  EvaluatedStationBreakdown,
  StudentResultsDashboardData,
} from '@/app/actions/studentResults'
import { ThemeToggle } from '@/components/theme-toggle'
import { SignOutOverlay } from '@/components/ui/SignOutOverlay'
import { PrintMarksheet } from '@/components/transcript/PrintMarksheet'
import { getModuleVisual } from '@/utils/getModuleIcon'

function StudentResultsDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = searchParams.get('student_id')

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<StudentResultsDashboardData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleStudentSignOut = () => {
    setIsSigningOut(true)
    setTimeout(() => {
      router.push('/student/results')
    }, 450)
  }

  // Hierarchical Drill-Down State:
  // selectedModuleId: null => Level 1 (All Modules Overview); string => Level 2 (Selected Module Stations Breakdown)
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  // expandedStations: Record<string, boolean> => Level 3 (Granular Questions & Scoring Checklist)
  const [expandedStations, setExpandedStations] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!studentId) {
      router.replace('/student/results')
      return
    }

    async function loadDashboard() {
      setLoading(true)
      setErrorMessage(null)

      try {
        const res = await getStudentResultsDashboardDataAction(studentId as string)
        if (!res.success || !res.data) {
          setErrorMessage(res.error || 'Failed to retrieve certified student examination records.')
        } else {
          setData(res.data)
          // If only 1 module exists, auto-select it for maximum ergonomics
          if (res.data.modules.length === 1) {
            setSelectedModuleId(res.data.modules[0].module_id)
          }
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Unexpected network issue while compiling transcript.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [studentId, router])

  const toggleStationExpand = (stationId: string) => {
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

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  // Active module object when in Level 2
  const activeModule = useMemo(() => {
    if (!data || !selectedModuleId) return null
    return data.modules.find((m) => m.module_id === selectedModuleId) || null
  }, [data, selectedModuleId])

  // Overall aggregate cohort / curriculum statistics
  const overallStats = useMemo(() => {
    if (!data || data.modules.length === 0) {
      return { averageGrade: 0, totalStations: 0, passRate: 0 }
    }
    const sum = data.modules.reduce((acc, m) => acc + m.module_final_score, 0)
    const averageGrade = sum / data.modules.length
    const totalStations = data.modules.reduce((acc, m) => acc + m.stations.length, 0)
    const passRate = (data.passed_modules_count / Math.max(1, data.total_modules_count)) * 100
    return { averageGrade, totalStations, passRate }
  }, [data])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F7FB] dark:bg-[#050B14] flex flex-col items-center justify-center gap-5 text-slate-900 dark:text-white relative overflow-hidden font-sans">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(6,182,212,0.20),transparent_70%)]"
        />
        <div className="p-5 rounded-3xl bg-white/90 dark:bg-[#0A1322]/95 border border-cyan-500/30 shadow-2xl backdrop-blur-xl relative">
          <div className="absolute inset-0 rounded-3xl bg-cyan-500/20 blur-lg animate-pulse" />
          <Loader2 className="relative size-10 animate-spin text-cyan-500 dark:text-cyan-400" />
        </div>
        <div className="text-center space-y-1.5 relative z-10">
          <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            Compiling Certified Academic Transcript...
          </p>
          <p className="text-xs text-slate-500 dark:text-cyan-400/80 font-mono">
            Cryptographically validating station marks and scaling weighted contributions
          </p>
        </div>
      </div>
    )
  }

  if (errorMessage || !data) {
    return (
      <div className="min-h-screen bg-[#F0F7FB] dark:bg-[#050B14] flex flex-col items-center justify-center p-6 text-slate-900 dark:text-white relative overflow-hidden font-sans">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(6,182,212,0.20),transparent_70%)]"
        />
        <div className="w-full max-w-md bg-white/95 dark:bg-[#0A1322]/95 border border-slate-200/80 dark:border-cyan-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-xl relative z-10">
          <div className="size-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
            <AlertCircle className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Unable to Retrieve Transcript
            </h2>
            <p className="text-xs text-slate-600 dark:text-rose-200/90 leading-relaxed">
              {errorMessage || 'The requested student academic record could not be processed for the active session.'}
            </p>
          </div>
          <Link
            href="/student/results"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white transition-all shadow-md shadow-cyan-900/30 cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Return to Student Verification</span>
          </Link>
        </div>
      </div>
    )
  }

  const { student, modules } = data
  const printModule = activeModule || modules[0] || null

  // Active or aggregate score dial parameters
  const activeScore = activeModule ? activeModule.module_final_score : overallStats.averageGrade
  const activePassed = activeModule ? activeModule.is_passed : overallStats.averageGrade >= 10
  const scorePercentage = Math.min(100, Math.max(0, (activeScore / 20) * 100))
  // Circumference for r=44 is ~276.46
  const circumference = 276.46
  const strokeDashoffset = circumference - (circumference * scorePercentage) / 100

  return (
    <>
      {/* Clean Marksheet View for Print / PDF Engine */}
      {printModule && (
        <div className="hidden print:block w-full">
          <PrintMarksheet
            student={student}
            activeModule={printModule}
            evaluatingProfessorName={(data as any).evaluating_professor_name || 'Prof. Lead Examiner'}
            facultyName={(data as any).faculty_name || 'Faculty of Medicine'}
            granularity="detailed"
          />
        </div>
      )}

      {/* Screen Interactive Container (Clinical Cyan & Electric Azure System) */}
      <div className="min-h-screen bg-[#F0F7FB] dark:bg-[#050B14] text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-white relative font-sans print:hidden">
        {/* ATMOSPHERIC CANVAS: Radial ambient illumination in cyan */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(6,182,212,0.18),transparent_70%)]"
        />

        {/* ========================================================================= */}
        {/* 1. TOP NAVIGATION & CONTEXT HEADER                                        */}
        {/* ========================================================================= */}
        <header className="relative z-20 w-full border-b border-slate-200/80 dark:border-cyan-500/15 bg-white/80 dark:bg-[#0A1322]/85 backdrop-blur-xl sticky top-0 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            {/* Left: Ghost Pill Return Link & Institutional Branding */}
            <div className="flex items-center gap-3">
              <Link
                href="/student/results"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-cyan-200 border border-slate-200/80 dark:border-cyan-500/20 bg-slate-50/50 dark:bg-[#0F1E34]/60 hover:bg-slate-100 dark:hover:bg-[#0F1E34] transition-all shadow-2xs group"
                title="Verify another student credential"
              >
                <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform text-cyan-500" />
                <span>Verify Another Student</span>
              </Link>

              <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 dark:border-cyan-500/20 pl-3">
                <span className="font-extrabold text-xs tracking-tight text-slate-900 dark:text-white">
                  NEW ERA <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-sky-400">ECOS</span>
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 uppercase font-mono">
                  Official Registry
                </span>
              </div>
            </div>

            {/* Center: Academic Cycle Chip & Study Level Badge with Cyan Icons */}
            <div className="hidden md:flex items-center gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-[#0F1E34] border border-slate-200/80 dark:border-cyan-500/20 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                <Calendar className="size-3 text-cyan-400" />
                <span>{student.academic_year_label || '2026-2027'}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-[#0F1E34] border border-slate-200/80 dark:border-cyan-500/20 text-slate-700 dark:text-slate-300 text-[11px]">
                <GraduationCap className="size-3 text-sky-400" />
                <span>{student.level_name || '6ème Année Médecine'}</span>
              </span>
            </div>

            {/* Right: Print Button in Electric Azure + Theme Toggle + Exit */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-medium rounded-xl text-xs px-3.5 py-1.5 shadow-md shadow-cyan-950/40 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
                title="Print official certified marksheet"
              >
                <Printer className="size-3.5" />
                <span className="hidden sm:inline">Print Marksheet</span>
              </button>

              <ThemeToggle />

              <button
                type="button"
                onClick={handleStudentSignOut}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-cyan-500/20 bg-slate-50 dark:bg-[#0F1E34] hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                title="Exit verification session"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. MAIN COCKPIT & CANDIDATE STANDING HERO BANNER                          */}
        {/* ========================================================================= */}
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Candidate Standing Hero Card (Surface 1) */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#0A1322]/90 border border-slate-200/80 dark:border-cyan-500/20 shadow-xl shadow-cyan-950/20 backdrop-blur-md relative overflow-hidden ring-1 ring-cyan-500/15">
            {/* Ambient inner illumination */}
            <div className="absolute -top-20 -right-20 size-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              {/* Left: Student Identity Card */}
              <div className="flex items-start gap-4 sm:gap-5">
                {/* Candidate Initial Container: Deep navy with electric cyan border */}
                <div className="size-16 rounded-2xl ring-2 ring-cyan-400/40 bg-gradient-to-br from-[#0A1322] to-cyan-950/70 text-cyan-200 font-mono font-black text-2xl flex items-center justify-center shadow-lg shadow-cyan-950/50 shrink-0 border border-cyan-400/30 select-none">
                  {(student.first_name?.trim() || student.full_name?.trim() || student.last_name?.trim() || 'S').charAt(0).toUpperCase()}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {student.full_name}
                    </h1>
                    {/* Dedicated Monospace Matricule Tag */}
                    <span className="font-mono text-xs px-3 py-1 rounded-lg bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 font-bold shadow-2xs">
                      #{student.matricule}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-cyan-200/70 font-medium">
                    <span className="flex items-center gap-1">
                      <GraduationCap className="size-3.5 text-cyan-400" />
                      <span>{student.level_name}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5 text-cyan-400" />
                      <span>{student.academic_year_label}</span>
                    </span>
                    <span>•</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#0F1E34] text-slate-700 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/20 font-semibold font-mono text-[11px]">
                      {student.section_name || 'Section A'} • {student.group_name || 'Group 01'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Score Radial Dial (Electric Azure Gradient) & Official Standing */}
              <div className="flex flex-wrap items-center gap-5 sm:gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-cyan-500/15">
                {/* Score Radial Dial (Vivid Cyan-to-Sky Gradient Arc) */}
                <div className="flex items-center gap-3.5 bg-slate-50/80 dark:bg-[#0F1E34]/80 p-3 pr-5 rounded-2xl border border-slate-200/80 dark:border-cyan-500/20 shadow-inner">
                  <div className="relative size-20 shrink-0">
                    <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="scoreCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#06B6D4" />
                          <stop offset="100%" stopColor="#0EA5E9" />
                        </linearGradient>
                      </defs>
                      {/* Background Track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="44"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-slate-200 dark:text-[#050B14]"
                      />
                      {/* Animated Active Radial Progress in Vivid Cyan Gradient */}
                      <circle
                        cx="50"
                        cy="50"
                        r="44"
                        fill="transparent"
                        stroke={activePassed ? 'url(#scoreCyanGrad)' : '#F43F5E'}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>

                    {/* Inner Dial Readout in Bold Tabular Cyan Figures */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                      <span className="text-base font-black font-mono leading-none text-cyan-600 dark:text-cyan-300">
                        {activeScore.toFixed(2)}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-cyan-400/60 uppercase tracking-tighter mt-0.5">
                        / 20
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-cyan-300/80 block">
                      {activeModule ? 'Module Final Grade' : 'Cumulative GPA'}
                    </span>
                    <div className="font-mono font-black text-xl text-cyan-700 dark:text-cyan-300 leading-none">
                      {activeScore.toFixed(2)}{' '}
                      <span className="text-xs font-normal text-slate-400 font-sans">/ 20.00 pts</span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-cyan-400/60 block font-mono">
                      Standardized OSCE Scale
                    </span>
                  </div>
                </div>

                {/* Official Standing Banner: Crisp Emerald for Pass, Crimson for Retake */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-cyan-300/80">
                    Official Standing
                  </span>
                  {activePassed ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-500/10">
                      <ShieldCheck className="size-5 text-emerald-500 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-xs font-black tracking-wider uppercase leading-tight">
                          PASSED (ADMIS)
                        </span>
                        <span className="text-[10px] font-medium opacity-90 leading-tight">
                          {activeScore >= 16 ? 'Mention Très Bien • Honors' : 'Validated Module'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 ring-2 ring-rose-500/20 shadow-md shadow-rose-500/10">
                      <ShieldAlert className="size-5 text-rose-500 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-xs font-black tracking-wider uppercase leading-tight">
                          AJOURNÉ
                        </span>
                        <span className="text-[10px] font-medium opacity-90 leading-tight">
                          Retake Session Required
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Telemetry Micro-Cards (Clean Bright Slate Values) */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-cyan-500/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/60 dark:bg-[#0F1E34]/80 border border-slate-200/60 dark:border-cyan-500/15">
                <div className="size-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <BookOpen className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-cyan-300/70 uppercase tracking-wider block">
                    Curriculum Modules
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-[#F8FAFC]">
                    {modules.length} Assigned
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/60 dark:bg-[#0F1E34]/80 border border-slate-200/60 dark:border-cyan-500/15">
                <div className="size-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-cyan-300/70 uppercase tracking-wider block">
                    Passed Modules
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-[#F8FAFC]">
                    {data.passed_modules_count} / {data.total_modules_count}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/60 dark:bg-[#0F1E34]/80 border border-slate-200/60 dark:border-cyan-500/15">
                <div className="size-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Percent className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-cyan-300/70 uppercase tracking-wider block">
                    Success Rate
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-[#F8FAFC]">
                    {overallStats.passRate.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/60 dark:bg-[#0F1E34]/80 border border-slate-200/60 dark:border-cyan-500/15">
                <div className="size-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Layers className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-cyan-300/70 uppercase tracking-wider block">
                    Tested Stations
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-[#F8FAFC]">
                    {overallStats.totalStations} Encounters
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* LEVEL 1 VS LEVEL 2/3 CONDITIONAL VIEWS                                    */}
          {/* ========================================================================= */}
          {modules.length === 0 ? (
            /* Empty State */
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0A1322]/90 border border-slate-200/80 dark:border-cyan-500/20 space-y-3 shadow-xl backdrop-blur-md">
              <FileSpreadsheet className="size-12 text-slate-400 dark:text-cyan-500/50 mx-auto stroke-1" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                No Certified Examination Records Found
              </h2>
              <p className="text-xs text-slate-500 dark:text-cyan-400/70 max-w-sm mx-auto">
                Your examination encounter records are either still being finalized by the evaluating board or awaiting official consolidation.
              </p>
            </div>
          ) : selectedModuleId === null ? (
            /* ========================================================================= */
            /* LEVEL 1: CLINICAL MODULES HIERARCHY GRID                                  */
            /* ========================================================================= */
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="size-5 text-cyan-500" />
                    <span>Clinical Modules Curriculum ({modules.length})</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-cyan-300/70">
                    Click any clinical organ specialty card to drill down into station-by-station performance and rubric scores.
                  </p>
                </div>
              </div>

              {/* Module Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {modules.map((mod) => {
                  const isPassed = mod.is_passed
                  const visual = getModuleVisual(mod.module_name)
                  const FallbackIcon = visual.fallbackIcon
                  const sessionLabel =
                    mod.session_type === 'retake' || mod.session_type === 'makeup'
                      ? 'Rattrapage / Retake'
                      : 'Session Normale'

                  const scorePct = Math.min(100, Math.max(0, (mod.module_final_score / 20) * 100))

                  return (
                    <div
                      key={`${mod.module_id}_${mod.session_type}`}
                      onClick={() => setSelectedModuleId(mod.module_id)}
                      className="group rounded-2xl bg-white dark:bg-[#0A1322] border border-slate-200/80 dark:border-cyan-500/20 p-6 space-y-5 shadow-xs hover:shadow-xl hover:border-cyan-500/50 hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden ring-1 ring-cyan-500/10"
                    >
                      {/* Top Accent Gradient Stripe in Azure */}
                      <div
                        className={`absolute top-0 inset-x-0 h-1 transition-all ${
                          isPassed
                            ? 'bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-500'
                            : 'bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500'
                        }`}
                      />

                      <div className="space-y-4">
                        {/* Header Row: Organ Specialty Box + Session Pill */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {/* Specialty Organ Box in Cyan Container */}
                            <div className="size-12 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-600 dark:text-cyan-300 shadow-xs group-hover:scale-105 transition-transform shrink-0">
                              <FallbackIcon className="size-6" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-cyan-300/80 block">
                                {visual.specialty || 'Clinical Discipline'}
                              </span>
                              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                                {mod.module_name}
                              </h3>
                            </div>
                          </div>

                          {/* Session Type Pill */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                              mod.session_type === 'retake' || mod.session_type === 'makeup'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
                                : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25'
                            }`}
                          >
                            {sessionLabel}
                          </span>
                        </div>

                        {/* Stations count & evaluation subtitle */}
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {mod.stations.length} Clinical {mod.stations.length === 1 ? 'Station' : 'Stations'} Evaluated • Standardized OSCE
                        </p>

                        {/* Final Score & Segmented Contribution Progress Bar */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0F1E34] border border-slate-200/70 dark:border-cyan-500/20 space-y-2.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-cyan-300/70">
                              Aggregated Grade
                            </span>
                            <div className="flex items-baseline gap-1 font-mono">
                              <span
                                className={`text-2xl font-black ${
                                  isPassed
                                    ? 'text-cyan-600 dark:text-cyan-300'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {mod.module_final_score.toFixed(2)}
                              </span>
                              <span className="text-xs text-slate-400 font-semibold">/ 20.00 pts</span>
                            </div>
                          </div>

                          {/* Horizontal Segmented Progress Bar */}
                          <div className="relative pt-1">
                            <div className="h-2.5 w-full bg-slate-200 dark:bg-[#050B14] rounded-full overflow-hidden border border-slate-300/40 dark:border-cyan-500/20">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isPassed
                                    ? 'bg-gradient-to-r from-cyan-600 to-sky-400'
                                    : 'bg-gradient-to-r from-rose-600 to-amber-500'
                                }`}
                                style={{ width: `${scorePct}%` }}
                              />
                            </div>

                            {/* 10.00 Pass Line Indicator (50%) */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-cyan-400/50"
                              style={{ left: '50%' }}
                              title="Passing Benchmark: 10.00 pts"
                            />
                            {/* 16.00 Honors Line Indicator (80%) */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-sky-400/80"
                              style={{ left: '80%' }}
                              title="Honors Benchmark: 16.00 pts"
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-cyan-300/60 font-mono">
                            <span>0.00</span>
                            <span className="text-amber-600 dark:text-amber-400">Pass: 10.00</span>
                            <span className="text-sky-600 dark:text-sky-400">Honors: 16.00</span>
                            <span>20.00</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Drill-Down Action Link */}
                      <div className="pt-3 border-t border-slate-100 dark:border-cyan-500/15 flex items-center justify-between text-xs font-bold text-cyan-600 dark:text-cyan-300 group-hover:translate-x-1 transition-transform">
                        <span>Inspect Station Breakdown</span>
                        <ArrowRight className="size-4" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* LEVEL 2 & LEVEL 3: ACTIVE MODULE STATIONS & RUBRIC BREAKDOWN              */
            /* ========================================================================= */
            activeModule && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Global Action Utility / High-Density Toolbar */}
                <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl bg-white/90 dark:bg-[#0A1322]/90 border border-slate-200/80 dark:border-cyan-500/20 text-xs shadow-xs">
                  {/* Breadcrumb Navigation */}
                  <nav className="flex items-center gap-2 flex-wrap font-semibold" aria-label="Breadcrumb">
                    <button
                      onClick={() => setSelectedModuleId(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-cyan-200 bg-slate-100 dark:bg-[#0F1E34] border border-slate-200/80 dark:border-cyan-500/20 transition-all cursor-pointer font-bold"
                    >
                      <ArrowLeft className="size-3.5" />
                      <span>All Modules</span>
                    </button>

                    <ChevronRight className="size-3 text-slate-400 dark:text-cyan-500/40" />

                    {/* Elevated Cyan Badge for Active Module */}
                    <span className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-cyan-800 dark:text-cyan-200 font-bold bg-cyan-500/15 border border-cyan-400/40">
                      <div className="size-5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                        <Layers className="size-3" />
                      </div>
                      <span>{activeModule.module_name}</span>
                      <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-300">
                        ({activeModule.module_final_score.toFixed(2)}/20)
                      </span>
                    </span>
                  </nav>

                  {/* High-density tool buttons */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#0F1E34] border border-slate-200/80 dark:border-cyan-500/20 font-mono text-[11px] font-bold text-slate-600 dark:text-cyan-300">
                      {activeModule.stations.length} Stations Configured
                    </span>

                    <button
                      type="button"
                      onClick={() => expandAllStations(activeModule.stations)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0F1E34] hover:bg-slate-200 dark:hover:bg-[#152a4a] border border-slate-200/80 dark:border-cyan-500/20 font-semibold text-slate-700 dark:text-cyan-300 transition-colors cursor-pointer"
                    >
                      Expand All
                    </button>

                    <button
                      type="button"
                      onClick={collapseAllStations}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0F1E34] hover:bg-slate-200 dark:hover:bg-[#152a4a] border border-slate-200/80 dark:border-cyan-500/20 font-semibold text-slate-700 dark:text-cyan-300 transition-colors cursor-pointer"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                {/* Level 2: Station Cards Breakdown */}
                <div className="grid grid-cols-1 gap-5">
                  {activeModule.stations.map((st) => {
                    const isExpanded = !!expandedStations[st.station_id]
                    const hasPenalties = st.penalties && st.penalties.length > 0
                    const hasBonuses = st.bonuses && st.bonuses.length > 0
                    const bonusPoints = Number(st.bonuses_points || 0)
                    const stationPercentage = typeof st.station_percentage === 'number'
                      ? st.station_percentage
                      : (st.station_max_points > 0 ? Math.min(100, Math.max(0, (st.net_station_raw_score / st.station_max_points) * 100)) : 0)

                    return (
                      <div
                        key={st.station_id}
                        className="rounded-2xl border border-slate-200/80 dark:border-cyan-500/20 bg-white dark:bg-[#0A1322]/90 p-6 space-y-5 shadow-xl shadow-cyan-950/20 backdrop-blur-md ring-1 ring-cyan-500/10"
                      >
                        {/* Station Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-cyan-500/15">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              {/* Station ID Tag (High-contrast tag: bg-sky-950 border border-sky-500/40 text-sky-300 font-mono) */}
                              <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-sky-950 border border-sky-500/40 text-sky-300 font-bold">
                                ST-{String(st.station_number).padStart(2, '0')}
                              </span>
                              <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                {st.station_title}
                              </h4>
                              {bonusPoints > 0 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/80">
                                  <Sparkles className="size-3 text-emerald-500" />
                                  <span>+{bonusPoints.toFixed(1)} pts merit</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-medium text-slate-500 dark:text-cyan-200/70">
                              Weightage: <strong className="text-slate-800 dark:text-white font-mono">{st.weightage_percentage}%</strong>{' '}
                              • Scaled Max: <strong className="text-slate-800 dark:text-white font-mono">{st.station_max_points} pts</strong>{' '}
                              • Efficiency Rate: <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{stationPercentage.toFixed(1)}%</strong>
                            </p>
                          </div>

                          {/* Net Contribution Container: Azure Terminal Box (bg-cyan-950/30 border border-cyan-500/30) */}
                          <div className="text-left sm:text-right bg-cyan-950/30 border border-cyan-500/30 p-3 px-4 rounded-xl shadow-2xs shrink-0 self-start sm:self-auto">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-cyan-400/70 block leading-tight">
                              Net Module Contribution
                            </span>
                            <div className="flex items-baseline gap-1 font-mono">
                              <span className="text-lg sm:text-xl font-black text-cyan-600 dark:text-cyan-300">
                                {st.station_contribution.toFixed(2)}
                              </span>
                              <span className="text-xs font-medium text-slate-400">
                                / {st.station_max_contribution.toFixed(2)} pts
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-cyan-400/60 font-mono block">
                              {st.net_station_raw_score.toFixed(1)} raw → {(st.station_contribution).toFixed(2)} weighted
                            </span>
                          </div>
                        </div>

                        {/* 5 Points Calculation Metric Tiles */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          {/* 1. Raw Earned */}
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F1E34]/80 border border-slate-200/60 dark:border-cyan-500/15 space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-cyan-400/70 block">
                              Raw Checklist
                            </span>
                            <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-[#F8FAFC]">
                              {st.raw_earned_points.toFixed(2)}{' '}
                              <span className="text-[10px] font-normal text-slate-400">
                                / {st.station_max_points}
                              </span>
                            </span>
                          </div>

                          {/* 2. Deductions */}
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F1E34]/80 border border-slate-200/60 dark:border-cyan-500/15 space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-cyan-400/70 block">
                              Safety Deductions
                            </span>
                            <span
                              className={`text-xs sm:text-sm font-black font-mono ${
                                st.deductions_points < 0
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {st.deductions_points < 0
                                ? `${st.deductions_points.toFixed(1)} pts`
                                : '-0.0 pts'}
                            </span>
                          </div>

                          {/* 3. Clinical Bonuses & Merit Points (Emerald Success Theme) */}
                          <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-500/25 space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                              Merit Bonuses
                            </span>
                            <span
                              className={`text-xs sm:text-sm font-black font-mono ${
                                bonusPoints > 0
                                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {bonusPoints > 0
                                ? `+${bonusPoints.toFixed(1)} pts`
                                : '+0.0 pts'}
                            </span>
                          </div>

                          {/* 4. Net Station Raw */}
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0F1E34]/80 border border-slate-200/60 dark:border-cyan-500/15 space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-cyan-400/70 block">
                              Net Raw ({stationPercentage.toFixed(0)}%)
                            </span>
                            <span className="text-xs sm:text-sm font-black font-mono text-cyan-600 dark:text-cyan-300">
                              {st.net_station_raw_score.toFixed(2)}{' '}
                              <span className="text-[10px] font-normal text-slate-400">
                                / {st.station_max_points}
                              </span>
                            </span>
                          </div>

                          {/* 5. Scaled Contribution */}
                          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-0.5 col-span-2 sm:col-span-1">
                            <span className="text-[10px] uppercase font-bold text-cyan-700 dark:text-cyan-300 block">
                              Contribution (/20)
                            </span>
                            <span className="text-xs sm:text-sm font-black font-mono text-cyan-600 dark:text-cyan-300">
                              {st.station_contribution.toFixed(2)} pts
                            </span>
                          </div>
                        </div>

                        {/* Transparent Calculation Strip */}
                        <div className="p-3 px-4 rounded-xl bg-slate-100/80 dark:bg-[#0A1628]/70 border border-slate-200/80 dark:border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono">
                          <div className="flex items-center gap-2 flex-wrap text-slate-700 dark:text-slate-200">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-cyan-400/80 font-sans">
                              Transparent Formula:
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {st.raw_earned_points.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans">(Raw)</span>
                            <span className="text-slate-400 font-sans">−</span>
                            <span className={st.deductions_points < 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-400'}>
                              {Math.abs(st.deductions_points).toFixed(1)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans">(Penalties)</span>
                            <span className="text-slate-400 font-sans">+</span>
                            <span className={bonusPoints > 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}>
                              {bonusPoints.toFixed(1)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans">(Bonuses)</span>
                            <span className="text-slate-400 font-sans">=</span>
                            <span className="text-cyan-600 dark:text-cyan-300 font-bold text-sm">
                              {st.net_station_raw_score.toFixed(1)}
                            </span>
                            <span className="text-slate-400 font-normal">/ {st.station_max_points} pts</span>
                          </div>

                          <span className="text-[10px] text-slate-400 dark:text-cyan-400/60 font-sans">
                            Final Station Score = Raw Checklist Score − Penalties + Bonuses
                          </span>
                        </div>

                        {/* Protocol Infractions & Safety Deductions Ledger (Semantic Crimson) */}
                        {hasPenalties && (
                          <div className="p-4 rounded-xl bg-rose-950/25 border-l-4 border-rose-500 space-y-2.5 shadow-2xs">
                            <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                              <ShieldAlert className="size-4 text-rose-500" />
                              <span>Clinical Protocol Infractions & Safety Deductions Recorded:</span>
                            </div>
                            <div className="space-y-1.5 pl-1">
                              {st.penalties.map((pen) => (
                                <div
                                  key={pen.id}
                                  className="flex items-center justify-between text-xs font-medium text-slate-800 dark:text-rose-200 gap-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
                                    <span>{pen.reason}</span>
                                    {pen.matched_criteria_title && (
                                      <span className="text-[10px] text-rose-600 dark:text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded font-semibold border border-rose-500/20">
                                        {pen.matched_criteria_title}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400 shrink-0">
                                    [ {pen.points < 0 ? pen.points.toFixed(1) : `-${pen.points.toFixed(1)}`} pts ]
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Clinical Bonuses & Merit Points Awarded (Semantic Emerald) */}
                        {hasBonuses && (
                          <div className="p-4 rounded-xl bg-emerald-950/20 dark:bg-emerald-950/30 border-l-4 border-emerald-500 space-y-2.5 shadow-2xs">
                            <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-bold text-emerald-800 dark:text-emerald-300">
                              <div className="flex items-center gap-2">
                                <Sparkles className="size-4 text-emerald-500" />
                                <span>Clinical Bonuses & Merit Points Awarded ({st.bonuses.length}):</span>
                              </div>
                              <span className="font-mono text-emerald-700 dark:text-emerald-400 font-black">
                                +{bonusPoints.toFixed(1)} pts total
                              </span>
                            </div>
                            <div className="space-y-1.5 pl-1">
                              {st.bonuses.map((bon) => (
                                <div
                                  key={bon.id}
                                  className="flex items-center justify-between text-xs font-medium text-slate-800 dark:text-emerald-100 gap-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="font-semibold text-slate-900 dark:text-white">{bon.reason}</span>
                                    {bon.matched_criteria_title && (
                                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded font-semibold border border-emerald-500/20">
                                        {bon.matched_criteria_title}
                                      </span>
                                    )}
                                    {bon.description && (
                                      <span className="text-[10px] text-slate-400 italic">
                                        ({bon.description})
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                    [ +{Math.abs(bon.points).toFixed(1)} pts ]
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Level 3: Station Checklist Accordion Trigger (Interactive Azure Highlight) */}
                        {st.answers && st.answers.length > 0 && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => toggleStationExpand(st.station_id)}
                              className="w-full py-3 px-4 rounded-xl bg-slate-50 dark:bg-[#0F1E34] hover:bg-cyan-500/10 hover:text-cyan-300 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-cyan-500/20 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-2">
                                <Sliders className="size-4 text-cyan-500 group-hover:scale-110 transition-transform" />
                                <span>
                                  {isExpanded
                                    ? 'Hide Granular Rubric Checklist Items'
                                    : `View Granular Rubric Checklist Items (${st.answers.length} Itemized Criteria)`}
                                </span>
                              </div>

                              <ChevronDown
                                className={`size-4 text-slate-400 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180 text-cyan-400' : ''
                                }`}
                              />
                            </button>

                            {/* Level 3: Granular Rubric Checklists Table */}
                            {isExpanded && (
                              <div className="mt-3 space-y-3 pt-2 animate-in fade-in duration-200">
                                {st.answers.map((ans, idx) => {
                                  const isMCQorSCQ =
                                    ans.question_type === 'MCQ' || ans.question_type === 'SCQ'
                                  const optionsList = Array.isArray(ans.options) ? ans.options : []
                                  const studentSelections = Array.isArray(ans.selected_options)
                                    ? ans.selected_options
                                    : []
                                  const isFull = ans.points_awarded >= ans.max_scale_value
                                  const isZero = ans.points_awarded === 0

                                  return (
                                    <div
                                      key={ans.question_id || idx}
                                      className="p-4 rounded-xl bg-slate-50/70 dark:bg-[#0F1E34]/60 border border-slate-200/70 dark:border-cyan-500/15 space-y-3"
                                    >
                                      {/* Question Prompt Header */}
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-slate-200 dark:bg-[#050B14] text-slate-800 dark:text-cyan-200">
                                              #{idx + 1}
                                            </span>

                                            <span
                                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                                ans.question_type === 'MCQ'
                                                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25'
                                                  : ans.question_type === 'SCQ'
                                                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25'
                                                  : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25'
                                              }`}
                                            >
                                              {ans.question_type === 'MCQ'
                                                ? 'Multiple Choice'
                                                : ans.question_type === 'SCQ'
                                                ? 'Single Choice'
                                                : 'Clinical Task'}
                                            </span>
                                          </div>

                                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                                            {ans.question_text}
                                          </p>
                                        </div>

                                        {/* Points Awarded Badge */}
                                        <div className="text-right shrink-0">
                                          <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border shadow-2xs ${
                                              isFull
                                                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                                                : isZero
                                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                            }`}
                                          >
                                            <span>{ans.points_awarded.toFixed(1)}</span>
                                            <span className="opacity-70">/ {ans.max_scale_value} pts</span>
                                          </span>
                                        </div>
                                      </div>

                                      {/* MCQ/SCQ Options Key Breakdown */}
                                      {isMCQorSCQ && optionsList.length > 0 && (
                                        <div className="pt-2 border-t border-slate-200/50 dark:border-cyan-500/15 space-y-2">
                                          <span className="text-[10px] font-bold text-slate-400 dark:text-cyan-300/70 uppercase tracking-wider block">
                                            Official Evaluation Key & Candidate Selections:
                                          </span>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {optionsList.map((opt, oIdx) => {
                                              const isCorrectKey = !!opt.is_correct
                                              const wasSelected = studentSelections.includes(opt.id)

                                              return (
                                                <div
                                                  key={opt.id || oIdx}
                                                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                                    isCorrectKey
                                                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 text-emerald-900 dark:text-emerald-200 font-medium'
                                                      : wasSelected
                                                      ? 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/30 text-rose-900 dark:text-rose-200'
                                                      : 'bg-white dark:bg-[#050B14] border-slate-200/70 dark:border-cyan-500/15 text-slate-700 dark:text-slate-300'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <span className="size-5 rounded-md bg-slate-100 dark:bg-[#0F1E34] text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                                                      {String.fromCharCode(65 + oIdx)}
                                                    </span>
                                                    <span className="truncate">{opt.text}</span>
                                                  </div>

                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    {isCorrectKey && (
                                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                                        <Check className="size-2.5" />
                                                        <span>Key</span>
                                                      </span>
                                                    )}
                                                    {wasSelected && (
                                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300">
                                                        Selected
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* Continuous Clinical Rubric Task Note */}
                                      {ans.question_type === 'Q&A' && (
                                        <div className="pt-2 border-t border-slate-200/50 dark:border-cyan-500/15 flex items-center justify-between text-[11px] text-slate-500 dark:text-cyan-300/80">
                                          <span>Assessed live via standardized clinical criteria rubric</span>
                                          <span className="font-mono font-bold text-cyan-600 dark:text-cyan-300">
                                            Score: {ans.points_awarded.toFixed(1)} / {ans.max_scale_value} pts
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          )}
        </main>

        {/* ========================================================================= */}
        {/* 3. OFFICIAL INSTITUTIONAL FOOTER                                           */}
        {/* ========================================================================= */}
        <footer className="relative z-10 w-full py-6 text-center text-xs text-slate-500 dark:text-cyan-300/60 border-t border-slate-200/80 dark:border-cyan-500/15 bg-white/60 dark:bg-[#0A1322]/60 backdrop-blur-md mt-12">
          <div className="max-w-7xl mx-auto px-4 space-y-1">
            <p className="font-semibold text-slate-600 dark:text-cyan-200/80">
              &copy; {new Date().getFullYear()} OSCE-Flow Platform • Faculty of Medicine Certified Transcript Registry
            </p>
            <p className="text-[10px] text-slate-400 dark:text-cyan-500/50 font-mono">
              Cryptographically consolidated clinical examination records • Official Marks Authentication
            </p>
          </div>
        </footer>

        {/* Global Exit / Sign Out Overlay */}
        <SignOutOverlay
          isOpen={isSigningOut}
          title="Ending verification session..."
          subtitle="Returning to the institutional credential gateway..."
        />
      </div>
    </>
  )
}

export default function StudentResultsDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F0F7FB] dark:bg-[#050B14] flex flex-col items-center justify-center gap-4 text-slate-900 dark:text-white">
          <Loader2 className="size-8 animate-spin text-cyan-500 dark:text-cyan-400" />
          <p className="text-sm font-semibold animate-pulse text-slate-500 dark:text-cyan-400/80 font-mono">
            Loading Certified Academic Records...
          </p>
        </div>
      }
    >
      <StudentResultsDashboardContent />
    </Suspense>
  )
}
