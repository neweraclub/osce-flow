'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Layers,
  Percent,
  Plus,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'

import { useAcademicYear } from '@/context/AcademicYearContext'
import { DeanOverviewSkeleton } from '@/components/dean/DeanOverviewSkeleton'

export interface DeanOverviewData {
  faculty: {
    id?: string
    name: string
    code?: string
  }
  activeAcademicYear: string
  stats: {
    totalAcademicYears: number
    totalSections: number
    totalGroups: number
    totalStudents: number
    totalProfessors: number
    totalModules: number
    totalExams?: number
    totalStations: number
    evaluatedStudents?: number
    averageFacultyScore?: number
    passRate?: number
    passedStudents?: number
    failedStudents?: number
  }
}

export default function DeanOverviewPage() {
  const { selectedYearId, selectedYear } = useAcademicYear()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<DeanOverviewData | null>(null)

  const fetchOverview = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)

    try {
      const url = selectedYearId ? `/api/dean/overview?academic_year_id=${selectedYearId}` : '/api/dean/overview'
      const res = await fetch(url)
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setData(json)
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [selectedYearId])

  const stats = data?.stats || {
    totalAcademicYears: 0,
    totalSections: 0,
    totalGroups: 0,
    totalStudents: 0,
    totalProfessors: 0,
    totalModules: 0,
    totalExams: 0,
    totalStations: 0,
    evaluatedStudents: 0,
    averageFacultyScore: 0,
    passRate: 0,
    passedStudents: 0,
    failedStudents: 0,
  }

  if (loading && !data) {
    return <DeanOverviewSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Refined Glassmorphic Header Hero */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#0F121C]/80 backdrop-blur-md p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle Ambient Accent Background */}
        <div className="absolute -top-24 -right-24 size-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
            </span>
            <span>Academic Session {selectedYear?.name || selectedYear?.year_label || data?.activeAcademicYear || 'Active Session'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {loading ? (
              <span className="inline-block h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            ) : (
              data?.faculty?.name || 'Faculty Overview'
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Executive academic session telemetry, examination readiness, and operational workflows.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            className="p-2.5 rounded-lg bg-white dark:bg-[#161B2A] border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all cursor-pointer"
            title="Refresh Telemetry"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/dean/structure"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-500/25 transition-all"
          >
            <Plus className="size-4" />
            <span>Configure Structure</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics 5-Column Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Academic Structure */}
        <Link
          href="/dean/structure"
          className="p-5 rounded-xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-2xs hover:border-indigo-500/50 hover:ring-1 hover:ring-indigo-500/40 transition-all duration-150 group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Structure
            </span>
            <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
              <Layers className="size-4" />
            </div>
          </div>

          <div>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            ) : (
              <div>
                <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
                  {stats.totalSections}
                  <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">Sections</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                  <span>{stats.totalGroups} Rotation Groups</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span>Hierarchy</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* KPI 2: Clinical Modules */}
        <Link
          href="/dean/modules"
          className="p-5 rounded-xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-2xs hover:border-indigo-500/50 hover:ring-1 hover:ring-indigo-500/40 transition-all duration-150 group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Curriculum
            </span>
            <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
              <BookOpen className="size-4" />
            </div>
          </div>

          <div>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            ) : (
              <div>
                <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
                  {stats.totalModules}
                  <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">Modules</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                  <span>Curriculum Enrolled</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span>Directory</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* KPI 3: Clinical Stations */}
        <Link
          href="/dean/stations"
          className="p-5 rounded-xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-2xs hover:border-indigo-500/50 hover:ring-1 hover:ring-indigo-500/40 transition-all duration-150 group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Stations & PINs
            </span>
            <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
              <ClipboardCheck className="size-4" />
            </div>
          </div>

          <div>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            ) : (
              <div>
                <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
                  {stats.totalStations}
                  <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">Active</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                  <span>OSCE Stations & PINs</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span>Configure</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* KPI 4: Medical Faculty Evaluators */}
        <Link
          href="/dean/professors"
          className="p-5 rounded-xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-2xs hover:border-indigo-500/50 hover:ring-1 hover:ring-indigo-500/40 transition-all duration-150 group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Evaluators
            </span>
            <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
              <UserCheck className="size-4" />
            </div>
          </div>

          <div>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            ) : (
              <div>
                <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
                  {stats.totalProfessors}
                  <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">Faculty</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span>Authorized Examiners</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span>Roster</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* KPI 5: Student Body */}
        <Link
          href="/dean/students"
          className="p-5 rounded-xl bg-white dark:bg-[#0F121C] border border-slate-200/80 dark:border-white/[0.08] shadow-2xs hover:border-indigo-500/50 hover:ring-1 hover:ring-indigo-500/40 transition-all duration-150 group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Students
            </span>
            <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
              <GraduationCap className="size-4" />
            </div>
          </div>

          <div>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            ) : (
              <div>
                <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
                  {stats.totalStudents}
                  <span className="text-xs font-semibold text-slate-400 ml-1.5 font-sans">Enrolled</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                  <span>Candidate Cohort</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span>Cohorts</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Clinical OSCE Weighted Performance & Examination Telemetry */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0F121C] p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Award className="size-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white tracking-tight">
                Faculty Clinical OSCE Performance & Calibration
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Normalized telemetry calculated across clinical stations weighted to 20.00 standard.
              </p>
            </div>
          </div>
          <Link
            href="/professor/students"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#161B2A] hover:bg-slate-200 dark:hover:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            <span>Inspect Grade Sheets</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Telemetry 1: Faculty Weighted Average */}
          <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-[#161B2A]/50 border border-slate-200/60 dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Faculty Average
              </span>
              <Award className="size-4 text-emerald-500" />
            </div>
            <div>
              {loading ? (
                <div className="space-y-1 py-1">
                  <div className="h-7 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
                    {stats.averageFacultyScore ? stats.averageFacultyScore.toFixed(2) : '0.00'}
                    <span className="text-xs font-normal text-slate-400 ml-1">/ 20.00</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Threshold: 10.00 passing mark
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Telemetry 2: Cohort Pass Rate with Segmented Visual Bar */}
          <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-[#161B2A]/50 border border-slate-200/60 dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Cohort Pass Rate
              </span>
              <TrendingUp className="size-4 text-emerald-500" />
            </div>
            <div>
              {loading ? (
                <div className="space-y-1 py-1">
                  <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                      {stats.passRate ? stats.passRate.toFixed(1) : '0.0'}%
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {stats.passedStudents || 0}P / {stats.failedStudents || 0}R
                    </span>
                  </div>

                  {/* Segmented Progress Bar */}
                  <div className="mt-2 h-2 rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden flex">
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, stats.passRate || 0))}%` }}
                      className="bg-emerald-500 transition-all duration-500"
                    />
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, 100 - (stats.passRate || 0)))}%` }}
                      className="bg-amber-500/70 transition-all duration-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Telemetry 3: Evaluated Candidates Completion */}
          <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-[#161B2A]/50 border border-slate-200/60 dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Evaluated Cohort
              </span>
              <CheckCircle2 className="size-4 text-indigo-500" />
            </div>
            <div>
              {loading ? (
                <div className="space-y-1 py-1">
                  <div className="h-7 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
                    {stats.evaluatedStudents || 0}
                    <span className="text-xs font-normal text-slate-400 ml-1">
                      / {stats.totalStudents || 0}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden">
                    <div
                      style={{
                        width: `${stats.totalStudents > 0 ? Math.min(100, Math.round(((stats.evaluatedStudents || 0) / stats.totalStudents) * 100)) : 0}%`,
                      }}
                      className="h-full bg-indigo-500 transition-all duration-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Telemetry 4: Calibration Distribution */}
          <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-[#161B2A]/50 border border-slate-200/60 dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Weighting Calibration
              </span>
              <Percent className="size-4 text-amber-500" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                100% Normalized
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">
                Station weighting percentages locked to standardized institutional scale.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Horizontal Milestone Stepper Roadmap */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0F121C] p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
              Academic Onboarding & Setup Roadmap
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Interactive sequential milestones required to operationalize the clinical OSCE session.
            </p>
          </div>
        </div>

        {/* 4-Step Stepper Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 relative">
          {/* Milestone 1: Academic Year */}
          <Link
            href="/dean/academic-years"
            className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Milestone 01
              </span>
              <span className="size-6 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 flex items-center justify-center">
                <Check className="size-3.5" />
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Active Session
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                {data?.activeAcademicYear || '2026–2027'} Active
              </p>
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-between pt-2 border-t border-emerald-500/20">
              <span>Confirmed</span>
              <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Milestone 2: Structure */}
          {(() => {
            const isCompleted = stats.totalSections > 0
            return (
              <Link
                href="/dean/structure"
                className={`p-4 rounded-xl border transition-all group flex flex-col justify-between space-y-3 ${
                  isCompleted
                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
                    : 'border-indigo-500/40 bg-indigo-500/5 ring-1 ring-indigo-500/40 hover:bg-indigo-500/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    Milestone 02
                  </span>
                  <span
                    className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCompleted
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                        : 'bg-indigo-500/20 text-indigo-500 border border-indigo-500/40 animate-pulse'
                    }`}
                  >
                    {isCompleted ? <Check className="size-3.5" /> : '2'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Sections & Groups
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {stats.totalSections > 0
                      ? `${stats.totalSections} sections, ${stats.totalGroups} groups`
                      : 'Configure rotation hierarchy'}
                  </p>
                </div>
                <div
                  className={`text-[11px] font-semibold flex items-center justify-between pt-2 border-t ${
                    isCompleted
                      ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                  }`}
                >
                  <span>{isCompleted ? 'Configured' : 'In Progress'}</span>
                  <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )
          })()}

          {/* Milestone 3: Modules & Stations */}
          {(() => {
            const isCompleted = stats.totalModules > 0 && stats.totalStations > 0
            const isCurrent = stats.totalSections > 0 && !isCompleted
            return (
              <Link
                href="/dean/stations"
                className={`p-4 rounded-xl border transition-all group flex flex-col justify-between space-y-3 ${
                  isCompleted
                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
                    : isCurrent
                    ? 'border-indigo-500/40 bg-indigo-500/5 ring-1 ring-indigo-500/40 hover:bg-indigo-500/10'
                    : 'border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isCurrent
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400'
                    }`}
                  >
                    Milestone 03
                  </span>
                  <span
                    className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCompleted
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                        : isCurrent
                        ? 'bg-indigo-500/20 text-indigo-500 border border-indigo-500/40 animate-pulse'
                        : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="size-3.5" /> : '3'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Modules & Stations
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {stats.totalModules > 0
                      ? `${stats.totalModules} modules, ${stats.totalStations} stations`
                      : 'Provision clinical exams'}
                  </p>
                </div>
                <div
                  className={`text-[11px] font-semibold flex items-center justify-between pt-2 border-t ${
                    isCompleted
                      ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : isCurrent
                      ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                      : 'text-slate-400 border-slate-100 dark:border-white/[0.06]'
                  }`}
                >
                  <span>{isCompleted ? 'Configured' : isCurrent ? 'Ready to Setup' : 'Pending Step 2'}</span>
                  <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )
          })()}

          {/* Milestone 4: Candidate Enrollment */}
          {(() => {
            const isCompleted = stats.totalStudents > 0
            const isCurrent = stats.totalModules > 0 && !isCompleted
            return (
              <Link
                href="/dean/students"
                className={`p-4 rounded-xl border transition-all group flex flex-col justify-between space-y-3 ${
                  isCompleted
                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
                    : isCurrent
                    ? 'border-indigo-500/40 bg-indigo-500/5 ring-1 ring-indigo-500/40 hover:bg-indigo-500/10'
                    : 'border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.02] opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isCurrent
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-400'
                    }`}
                  >
                    Milestone 04
                  </span>
                  <span
                    className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isCompleted
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                        : isCurrent
                        ? 'bg-indigo-500/20 text-indigo-500 border border-indigo-500/40 animate-pulse'
                        : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="size-3.5" /> : '4'}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Candidate Roster
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {stats.totalStudents > 0
                      ? `${stats.totalStudents} candidates enrolled`
                      : 'Enroll student body'}
                  </p>
                </div>
                <div
                  className={`text-[11px] font-semibold flex items-center justify-between pt-2 border-t ${
                    isCompleted
                      ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : isCurrent
                      ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                      : 'text-slate-400 border-slate-100 dark:border-white/[0.06]'
                  }`}
                >
                  <span>{isCompleted ? 'Enrolled' : isCurrent ? 'Enroll Cohort' : 'Pending Step 3'}</span>
                  <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )
          })()}
        </div>
      </div>

      {/* Examination Readiness & Quick Access */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0F121C] shadow-sm p-6 sm:p-7 space-y-6">
        <div className="border-b border-slate-100 dark:border-white/[0.06] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Examination Readiness & Faculty Shortcuts
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Direct institutional workflows and operational status.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span>Infrastructure Verified</span>
          </div>
        </div>

        {/* Quick Links 4-Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Link
            href="/dean/stations"
            className="p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#161B2A]/50 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-[#161B2A] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <ClipboardCheck className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Clinical Stations
                </span>
                <span className="text-[10px] text-slate-400">OSCE stations & PINs</span>
              </div>
            </div>
            <ChevronRight className="size-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/dean/professors"
            className="p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#161B2A]/50 hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-[#161B2A] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <UserPlus className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Invigilator Roster
                </span>
                <span className="text-[10px] text-slate-400">Manage evaluators</span>
              </div>
            </div>
            <ChevronRight className="size-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/dean/academic-years"
            className="p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#161B2A]/50 hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-[#161B2A] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Calendar className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Academic Sessions
                </span>
                <span className="text-[10px] text-slate-400">Calendar timeline</span>
              </div>
            </div>
            <ChevronRight className="size-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/dean/profile"
            className="p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#161B2A]/50 hover:border-slate-300 dark:hover:border-white/[0.2] hover:bg-slate-50 dark:hover:bg-[#161B2A] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/[0.05] flex items-center justify-center">
                <Building2 className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Faculty Profile
                </span>
                <span className="text-[10px] text-slate-400">Account & security</span>
              </div>
            </div>
            <ChevronRight className="size-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  )
}
