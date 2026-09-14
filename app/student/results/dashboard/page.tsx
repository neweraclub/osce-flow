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
  FileSpreadsheet,
  GraduationCap,
  Hash,
  HelpCircle,
  Layers,
  Loader2,
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
  User,
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

function StudentResultsDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = searchParams.get('student_id')

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<StudentResultsDashboardData | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Hierarchical Drill-Down State
  // selectedModuleId: null => Level 1 (Modules Grid View); string => Level 2 (Selected Module Stations Breakdown)
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
          setErrorMessage(res.error || 'Failed to retrieve student examination results.')
        } else {
          setData(res.data)
          // If only 1 module exists, optionally auto-select or stay in overview
          if (res.data.modules.length === 1) {
            setSelectedModuleId(res.data.modules[0].module_id)
          }
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Unexpected error loading academic results.')
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

  // Print friendly handler
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-900 dark:text-white">
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 shadow-xl">
          <Loader2 className="size-8 animate-spin text-amber-500" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Generating Academic Transcript...
          </p>
          <p className="text-xs text-slate-400">
            Calculating certified module and station grading contributions
          </p>
        </div>
      </div>
    )
  }

  if (errorMessage || !data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-white">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="size-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Unable to Load Transcript
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {errorMessage || 'The requested student academic record could not be processed.'}
            </p>
          </div>
          <Link
            href="/student/results"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-md shadow-amber-500/20"
          >
            <ArrowLeft className="size-4" />
            <span>Return to Student Verification</span>
          </Link>
        </div>
      </div>
    )
  }

  const { student, modules } = data

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-white relative font-sans">
      {/* 1. Academic Navigation Header (Top Navbar) */}
      <header className="w-full z-20 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 print:hidden shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Brand & Context */}
          <div className="flex items-center gap-3.5">
            <Link
              href="/student/results"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Search another student"
            >
              <ArrowLeft className="size-4" />
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
                <Stethoscope className="size-4" />
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  OSCE-Flow
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60 uppercase tracking-wider">
                    Academic Transcript
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Academic Context Pills in Navbar */}
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70">
              <Calendar className="size-3 text-slate-400" />
              <span>{student.academic_year_label}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
              <GraduationCap className="size-3 text-slate-400" />
              <span>{student.level_name}</span>
            </span>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Print official marksheet"
            >
              <Printer className="size-3.5" />
              <span className="hidden sm:inline">Print Marksheet</span>
            </button>
            <ThemeToggle />
            <Link
              href="/student/results"
              className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:text-amber-800 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100/60 transition-colors"
            >
              New Lookup
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Student Academic Identification Banner */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="absolute -top-12 -right-12 size-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
            <div className="flex items-start gap-4">
              <div className="size-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-amber-500/20 shrink-0">
                {student.first_name[0] || 'S'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {student.full_name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
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
                  {data.passed_modules_count} / {data.total_modules_count}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Interactive Breadcrumb Navigation Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs shadow-xs">
          <nav className="flex items-center gap-1.5 flex-wrap font-semibold" aria-label="Breadcrumb">
            <button
              onClick={() => setSelectedModuleId(null)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedModuleId === null
                  ? 'text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="size-3.5 text-amber-500" />
              <span>All Modules Overview</span>
            </button>

            {activeModule && (
              <>
                <ChevronRight className="size-3 text-slate-300 dark:text-slate-600" />
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-800">
                  <Layers className="size-3.5 text-emerald-500" />
                  <span>{activeModule.module_name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({activeModule.module_final_score.toFixed(2)}/20)
                  </span>
                </span>
              </>
            )}
          </nav>

          {/* Quick Back or View Switcher */}
          {selectedModuleId && (
            <button
              onClick={() => setSelectedModuleId(null)}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to All Modules</span>
            </button>
          )}
        </div>

        {/* Empty State when no modules exist */}
        {modules.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <FileSpreadsheet className="size-10 text-slate-400 mx-auto stroke-1" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No Assessment Records Found
            </h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You do not have any evaluated clinical station attempts recorded on file yet. Please check back after station examiners submit your marksheets.
            </p>
          </div>
        ) : selectedModuleId === null ? (
          /* ========================================================================= */
          /* LEVEL 1: MODULES GRID / CARDS VIEW                                        */
          /* ========================================================================= */
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="size-5 text-amber-500" />
                  <span>Academic Modules ({modules.length})</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Select a module below to inspect its individual station scores, weightage, and evaluation items.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {modules.map((mod) => {
                const isPassed = mod.is_passed
                const sessionLabel =
                  mod.session_type === 'retake' || mod.session_type === 'makeup'
                    ? 'Retake Exam'
                    : 'Regular Session'

                const scorePct = Math.min(100, Math.max(0, (mod.module_final_score / 20) * 100))

                return (
                  <div
                    key={`${mod.module_id}_${mod.session_type}`}
                    onClick={() => setSelectedModuleId(mod.module_id)}
                    className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 shadow-xs hover:shadow-md hover:border-amber-400/80 dark:hover:border-amber-500/60 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
                  >
                    {/* Top Accent Stripe */}
                    <div
                      className={`absolute top-0 inset-x-0 h-1 transition-all ${
                        isPassed
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : 'bg-gradient-to-r from-rose-500 to-amber-500'
                      }`}
                    />

                    <div className="space-y-4">
                      {/* Header row: Session pill & Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/40">
                          {sessionLabel}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPassed
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {isPassed ? (
                            <>
                              <CheckCircle2 className="size-3 text-emerald-500" />
                              <span>PASSED</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="size-3 text-rose-500" />
                              <span>RETAKE REQUIRED</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Module Title */}
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {mod.module_name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {mod.stations.length} Clinical {mod.stations.length === 1 ? 'Station' : 'Stations'} Evaluated
                        </p>
                      </div>

                      {/* Score Display & Progress Gauge */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                            Final Score (/20)
                          </span>
                          <div className="flex items-baseline gap-1 font-mono">
                            <span
                              className={`text-2xl font-black ${
                                isPassed
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {mod.module_final_score.toFixed(2)}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">/ 20.00 pts</span>
                          </div>
                        </div>

                        {/* Progress bar with 10.00 pass indicator */}
                        <div className="relative pt-1">
                          <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isPassed
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                                  : 'bg-gradient-to-r from-rose-500 to-amber-500'
                              }`}
                              style={{ width: `${scorePct}%` }}
                            />
                          </div>
                          {/* 50% Threshold marker */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500"
                            style={{ left: '50%' }}
                            title="Passing mark: 10.00 pts"
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>0 pts</span>
                          <span className="text-amber-600 dark:text-amber-400">Pass: 10.00</span>
                          <span>20 pts</span>
                        </div>
                      </div>
                    </div>

                    {/* Drill-down action trigger */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                      <span>View Station Breakdown</span>
                      <ArrowRight className="size-4" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* LEVEL 2 & LEVEL 3: ACTIVE MODULE DRILL-DOWN VIEW                          */
          /* ========================================================================= */
          activeModule && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Active Module Top Banner Card */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        onClick={() => setSelectedModuleId(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Back to all modules"
                      >
                        <ArrowLeft className="size-4" />
                      </button>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                        <BookOpen className="size-3 text-amber-500" />
                        <span>Module Assessment</span>
                      </span>
                      <span className="text-xs text-slate-300 dark:text-slate-700">|</span>
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-200/60 dark:border-purple-900/40">
                        {activeModule.session_type === 'retake' || activeModule.session_type === 'makeup'
                          ? 'Retake Exam'
                          : 'Regular Session'}
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {activeModule.module_name}
                    </h2>
                  </div>

                  {/* Module Final Score */}
                  <div className="flex items-center gap-3 self-start sm:self-auto bg-slate-50 dark:bg-slate-800/80 p-3 px-5 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs">
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block leading-tight">
                        Module Final Score
                      </span>
                      <div className="flex items-baseline gap-1 font-mono">
                        <span
                          className={`text-2xl sm:text-3xl font-black ${
                            activeModule.is_passed
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {activeModule.module_final_score.toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">/ 20.00 pts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status & Banner Message */}
                {activeModule.is_passed ? (
                  <div
                    role="status"
                    className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 flex items-center gap-3 shadow-xs"
                  >
                    <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <p className="text-xs sm:text-sm font-bold leading-relaxed">
                      {activeModule.banner_message}
                    </p>
                  </div>
                ) : (
                  <div
                    role="status"
                    className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 flex items-center gap-3 shadow-xs"
                  >
                    <XCircle className="size-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <p className="text-xs sm:text-sm font-bold leading-relaxed">
                      {activeModule.banner_message}
                    </p>
                  </div>
                )}
              </div>

              {/* Station Breakdown Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Stations Breakdown ({activeModule.stations.length})</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Weighted score contributions and granular evaluation checklist items for each station.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => expandAllStations(activeModule.stations)}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllStations}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                {/* Level 2: Stations Breakdown Cards */}
                <div className="grid grid-cols-1 gap-5">
                  {activeModule.stations.map((st) => {
                    const isExpanded = !!expandedStations[st.station_id]
                    const hasPenalties = st.penalties.length > 0

                    return (
                      <div
                        key={st.station_id}
                        className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                      >
                        {/* Station Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
                                Station {st.station_number}
                              </span>
                              <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                {st.station_title}
                              </h4>
                            </div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              Weightage:{' '}
                              <strong className="text-slate-700 dark:text-slate-300">
                                {st.weightage_percentage}%
                              </strong>{' '}
                              → Max Contribution:{' '}
                              <strong className="text-amber-600 dark:text-amber-400 font-mono">
                                {st.station_max_contribution.toFixed(2)} / 20.00 pts
                              </strong>
                            </p>
                          </div>

                          {/* Station Contribution Pill */}
                          <div className="text-left sm:text-right bg-slate-50 dark:bg-slate-800/80 p-3 px-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs self-start sm:self-auto">
                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block leading-tight">
                              Score Contribution
                            </span>
                            <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">
                              {st.station_contribution.toFixed(2)}{' '}
                              <span className="text-xs font-normal text-slate-400">
                                / {st.station_max_contribution.toFixed(2)} pts
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Points Calculation Matrix Tiles */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {/* Raw Earned Points */}
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Raw Earned
                            </span>
                            <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white">
                              {st.raw_earned_points.toFixed(2)}{' '}
                              <span className="text-[10px] font-normal text-slate-400">
                                / {st.station_max_points}
                              </span>
                            </span>
                          </div>

                          {/* Criteria Deductions */}
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Deductions
                            </span>
                            <span
                              className={`text-xs sm:text-sm font-black font-mono ${
                                st.deductions_points < 0
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : 'text-slate-400'
                              }`}
                            >
                              {st.deductions_points < 0
                                ? `${st.deductions_points.toFixed(1)} pts`
                                : '-0.0 pts'}
                            </span>
                          </div>

                          {/* Net Station Raw Score */}
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Net Raw Score
                            </span>
                            <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                              {st.net_station_raw_score.toFixed(2)}{' '}
                              <span className="text-[10px] font-normal text-slate-400">
                                / {st.station_max_points}
                              </span>
                            </span>
                          </div>

                          {/* Scaled Contribution */}
                          <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                              Contribution (/20)
                            </span>
                            <span className="text-xs sm:text-sm font-black font-mono text-amber-700 dark:text-amber-300">
                              {st.station_contribution.toFixed(2)} pts
                            </span>
                          </div>
                        </div>

                        {/* Deductions Feed */}
                        {hasPenalties && (
                          <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/60 space-y-2.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                              <ShieldAlert className="size-4 text-rose-500" />
                              <span>Recorded Penalties & Safety Deductions:</span>
                            </div>
                            <div className="space-y-1.5 pl-1">
                              {st.penalties.map((pen) => (
                                <div
                                  key={pen.id}
                                  className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200 gap-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
                                    <span>{pen.reason}</span>
                                    {pen.matched_criteria_title && (
                                      <span className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded font-semibold">
                                        {pen.matched_criteria_title}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400 shrink-0">
                                    [ {pen.points < 0 ? pen.points.toFixed(1) : `-${pen.points.toFixed(1)}`} ]
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ========================================================================= */}
                        {/* LEVEL 3: STATION QUESTIONS & SCORING DETAILS                              */}
                        {/* ========================================================================= */}
                        {st.answers.length > 0 && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => toggleStationExpand(st.station_id)}
                              className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Sliders className="size-4 text-emerald-500" />
                                <span>
                                  {isExpanded
                                    ? 'Hide Granular Evaluation Items'
                                    : `View Granular Evaluation Items (${st.answers.length} Questions & Criteria)`}
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="size-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="size-4 text-slate-400" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="mt-3 space-y-3 pt-2 animate-in fade-in duration-200">
                                {st.answers.map((ans, idx) => {
                                  const isMCQorSCQ =
                                    ans.question_type === 'MCQ' || ans.question_type === 'SCQ'
                                  const optionsList = Array.isArray(ans.options) ? ans.options : []
                                  const studentSelections = Array.isArray(ans.selected_options)
                                    ? ans.selected_options
                                    : []

                                  return (
                                    <div
                                      key={ans.question_id}
                                      className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-3"
                                    >
                                      {/* Question Prompt Header */}
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                              Question {idx + 1}
                                            </span>
                                            <span
                                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                                ans.question_type === 'MCQ'
                                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/50'
                                                  : ans.question_type === 'SCQ'
                                                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-900/50'
                                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/50'
                                              }`}
                                            >
                                              {ans.question_type === 'MCQ'
                                                ? 'Multiple Choice'
                                                : ans.question_type === 'SCQ'
                                                ? 'Single Choice'
                                                : 'Clinical Competency Task'}
                                            </span>
                                          </div>
                                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                                            {ans.question_text}
                                          </p>
                                        </div>

                                        {/* Score Awarded Badge */}
                                        <div className="text-right shrink-0">
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-xs">
                                            <span className="text-emerald-600 dark:text-emerald-400">
                                              {ans.points_awarded.toFixed(1)}
                                            </span>
                                            <span className="text-slate-400">/ {ans.max_scale_value} pts</span>
                                          </span>
                                        </div>
                                      </div>

                                      {/* Answer Choices & Answer Key Breakdown if MCQ/SCQ */}
                                      {isMCQorSCQ && optionsList.length > 0 && (
                                        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Answer Choices & Official Answer Key:
                                          </span>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {optionsList.map((opt, oIdx) => {
                                              const isCorrectKey = !!opt.is_correct
                                              const wasSelected = studentSelections.includes(opt.id)

                                              return (
                                                <div
                                                  key={opt.id || oIdx}
                                                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                                                    isCorrectKey
                                                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                                      : wasSelected
                                                      ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                                                      : 'bg-white dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2 min-w-0">
                                                    <span className="size-5 rounded-md bg-slate-100 dark:bg-slate-700 text-[10px] font-black flex items-center justify-center shrink-0">
                                                      {String.fromCharCode(65 + oIdx)}
                                                    </span>
                                                    <span className="truncate">{opt.text}</span>
                                                  </div>

                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                    {isCorrectKey && (
                                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                                                        <Check className="size-2.5" />
                                                        <span>Key</span>
                                                      </span>
                                                    )}
                                                    {wasSelected && (
                                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
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

                                      {/* Q&A Clinical Competency Note if Continuous Scale */}
                                      {ans.question_type === 'Q&A' && (
                                        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                          <span>Clinical performance scored live on incremental rubric</span>
                                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
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
            </div>
          )
        )}
      </main>

      {/* Official Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 print:hidden mt-12">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} OSCE-Flow Platform. Certified Medical Grade Transcript & Clinical Performance Record.
          </p>
          <p className="text-[10px] text-slate-400">
            All marks and scoring contributions are cryptographically validated against evaluator session marksheets.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default function StudentResultsDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-900 dark:text-white">
          <Loader2 className="size-8 animate-spin text-amber-500" />
          <p className="text-sm font-semibold animate-pulse text-slate-400">
            Loading Academic Record...
          </p>
        </div>
      }
    >
      <StudentResultsDashboardContent />
    </Suspense>
  )
}
