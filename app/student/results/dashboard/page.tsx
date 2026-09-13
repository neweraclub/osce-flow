'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Loader2,
  Minus,
  Printer,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  User,
  XCircle,
} from 'lucide-react'
import {
  getStudentResultsDashboardDataAction,
  ModuleResultsGroup,
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
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Unexpected error loading results.')
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

  // Print friendly handler
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-900 dark:text-white">
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 shadow-xl">
          <Loader2 className="size-8 animate-spin text-amber-500" />
        </div>
        <p className="text-sm font-semibold animate-pulse text-slate-500 dark:text-slate-400">
          Calculating Certified Grade Breakdown...
        </p>
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
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Unable to Load Transcript</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {errorMessage || 'The requested student record could not be processed.'}
            </p>
          </div>
          <Link
            href="/student/results"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-md shadow-amber-500/20"
          >
            <ArrowLeft className="size-4" />
            <span>Return to Verification</span>
          </Link>
        </div>
      </div>
    )
  }

  const { student, modules } = data

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-white relative font-sans">
      {/* Top Navbar */}
      <header className="w-full px-6 py-4 flex items-center justify-between z-10 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 print:hidden">
        <div className="flex items-center gap-4">
          <Link
            href="/student/results"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Search another student"
          >
            <ArrowLeft className="size-4" />
          </Link>

          <Link href="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Stethoscope className="size-4" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              OSCE-Flow
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800/60 uppercase">
                Transcript
              </span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="size-3.5" />
            <span className="hidden sm:inline">Print Marksheet</span>
          </button>
          <ThemeToggle />
          <Link
            href="/student/results"
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100/60 transition-colors"
          >
            New Lookup
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Student Profile Overview Card */}
        <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
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
                    {student.level_name}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5 text-slate-400" />
                    {student.academic_year_label}
                  </span>
                  <span>·</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                    {student.section_name} · {student.group_name}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Status Tally */}
            <div className="flex items-center gap-3 self-start md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
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

        {/* Modules Section */}
        {modules.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <FileSpreadsheet className="size-10 text-slate-400 mx-auto stroke-1" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">No Assessment Records Found</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You do not have any evaluated clinical station attempts recorded on file yet. Please check back after station examiners submit your marksheets.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {modules.map((modGroup) => {
              const sessionLabel =
                modGroup.session_type === 'retake' || modGroup.session_type === 'makeup'
                  ? 'Retake Exam'
                  : 'Regular Session'

              return (
                <section
                  key={`${modGroup.module_id}_${modGroup.session_type}`}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm space-y-6 p-6 sm:p-7 transition-all"
                >
                  {/* Module Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                          <BookOpen className="size-3 text-amber-500" />
                          <span>Module Assessment</span>
                        </span>
                        <span className="text-xs text-slate-300 dark:text-slate-700">|</span>
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-200/60 dark:border-purple-900/40">
                          {sessionLabel}
                        </span>
                      </div>

                      <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {modGroup.module_name}
                      </h2>
                    </div>

                    {/* Overall Module Final Score (/20 Scale) */}
                    <div className="flex items-center gap-3 self-start sm:self-auto bg-slate-50 dark:bg-slate-800/80 p-3 px-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/60">
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block leading-tight">
                          Module Final Score
                        </span>
                        <div className="flex items-baseline gap-1 font-mono">
                          <span
                            className={`text-2xl font-black ${
                              modGroup.is_passed
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {modGroup.module_final_score.toFixed(2)}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">/ 20.00 pts</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 Requirement: Module Status & Banner System */}
                  {modGroup.is_passed ? (
                    /* Green Banner */
                    <div
                      role="status"
                      className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 flex items-center gap-3 shadow-sm"
                    >
                      <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <p className="text-xs sm:text-sm font-bold leading-relaxed">
                        {modGroup.banner_message}
                      </p>
                    </div>
                  ) : (
                    /* Red Banner */
                    <div
                      role="status"
                      className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200 flex items-center gap-3 shadow-sm"
                    >
                      <XCircle className="size-5 text-rose-600 dark:text-rose-400 shrink-0" />
                      <p className="text-xs sm:text-sm font-bold leading-relaxed">
                        {modGroup.banner_message}
                      </p>
                    </div>
                  )}

                  {/* Step 3: Itemized Station Breakdown Cards */}
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Layers className="size-3.5" />
                        <span>Station Breakdown & Weighted Points</span>
                      </h3>
                      <span className="text-xs text-slate-400 font-medium">
                        {modGroup.stations.length} {modGroup.stations.length === 1 ? 'Station' : 'Stations'} Evaluated
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {modGroup.stations.map((st) => {
                        const isExpanded = !!expandedStations[st.station_id]
                        const hasPenalties = st.penalties.length > 0

                        return (
                          <div
                            key={st.station_id}
                            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-5 space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                          >
                            {/* Station Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
                                    Station {st.station_number}
                                  </span>
                                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                    {st.station_title}
                                  </h4>
                                </div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                  Weightage: <span className="font-bold text-slate-700 dark:text-slate-300">{st.weightage_percentage}%</span> → Max Contribution:{' '}
                                  <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                                    {st.station_max_contribution.toFixed(2)} / 20.00 pts
                                  </span>
                                </p>
                              </div>

                              {/* Station Point Contribution Toward /20 Total */}
                              <div className="text-left sm:text-right bg-white dark:bg-slate-800 p-2.5 px-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs self-start sm:self-auto">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block leading-tight">
                                  Score Contribution
                                </span>
                                <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                                  {st.station_contribution.toFixed(2)}{' '}
                                  <span className="text-xs font-normal text-slate-400">
                                    / {st.station_max_contribution.toFixed(2)} pts
                                  </span>
                                </span>
                              </div>
                            </div>

                            {/* Points Calculation Matrix */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                              {/* Raw Earned Points */}
                              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
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
                              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
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
                                  {st.deductions_points < 0 ? `${st.deductions_points.toFixed(1)} pts` : '-0.0 pts'}
                                </span>
                              </div>

                              {/* Net Station Raw Score */}
                              <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 space-y-0.5">
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
                              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 space-y-0.5">
                                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                                  Contribution (/20)
                                </span>
                                <span className="text-xs sm:text-sm font-black font-mono text-amber-700 dark:text-amber-300">
                                  {st.station_contribution.toFixed(2)} pts
                                </span>
                              </div>
                            </div>

                            {/* Itemized Deductions Feed */}
                            {hasPenalties ? (
                              <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/60 space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                                  <ShieldAlert className="size-4 text-rose-500" />
                                  <span>Recorded Penalties & Deductions:</span>
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
                                          <span className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.2 rounded font-semibold">
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
                            ) : null}

                            {/* Collapsible Questions / Criteria Performance */}
                            {st.answers.length > 0 && (
                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={() => toggleStationExpand(st.station_id)}
                                  className="w-full py-2 px-3 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-between transition-colors cursor-pointer"
                                >
                                  <span>View Checklist Criteria Performance ({st.answers.length} items)</span>
                                  {isExpanded ? (
                                    <ChevronUp className="size-3.5 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="size-3.5 text-slate-400" />
                                  )}
                                </button>

                                {isExpanded && (
                                  <div className="mt-2 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 pt-2 animate-in fade-in">
                                    {st.answers.map((ans, idx) => (
                                      <div
                                        key={ans.question_id}
                                        className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-xs"
                                      >
                                        <div className="space-y-0.5">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-400">
                                              #{idx + 1}
                                            </span>
                                            <span className="text-slate-800 dark:text-slate-200 font-medium">
                                              {ans.question_text}
                                            </span>
                                          </div>
                                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                            {ans.question_type}
                                          </span>
                                        </div>

                                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 shrink-0">
                                          {ans.points_awarded.toFixed(1)} / {ans.max_scale_value} pts
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-5 text-center text-xs text-slate-400 border-t border-slate-200/50 dark:border-slate-800/50 print:hidden">
        &copy; {new Date().getFullYear()} OSCE-Flow Platform. Official Medical Grade Transcript & Clinical Performance Report.
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
