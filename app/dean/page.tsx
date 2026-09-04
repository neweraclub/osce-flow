'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  Layers,
  Plus,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'

import { useAcademicYear } from '@/context/AcademicYearContext'

export interface DeanOverviewData {
  faculty: {
    id?: string
    name: string
    code: string
  }
  activeAcademicYear: string
  stats: {
    totalAcademicYears: number
    totalSections: number
    totalGroups: number
    totalStudents: number
    totalProfessors: number
    totalModules: number
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
  }

  return (
    <div className="space-y-6">
      {/* Refined Glassmorphic Header Hero */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle Ambient Accent Background */}
        <div className="absolute -top-24 -right-24 size-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/50 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
            </span>
            <span>Academic Session {selectedYear?.name || selectedYear?.year_label || data?.activeAcademicYear || 'Active Session'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {data?.faculty?.name || 'Medical Faculty Management'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Academic session overview and examination readiness.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-all"
            title="Refresh Overview"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/dean/structure"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition-all"
          >
            <Plus className="size-4" />
            <span>Configure Structure</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics 4-Column Uniform Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Academic Structure */}
        <Link
          href="/dean/structure"
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-sky-500/50 hover:shadow-md transition-all group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Academic Structure
            </span>
            <div className="size-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Layers className="size-5" />
            </div>
          </div>

          <div>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ) : (
              <div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {stats.totalSections} <span className="text-xs font-semibold text-slate-500">Sections</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  {stats.totalGroups} Rotation Groups configured
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
            <span>View Details</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* KPI 2: Clinical Modules */}
        <Link
          href="/dean/modules"
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-indigo-500/50 hover:shadow-md transition-all group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Clinical Modules
            </span>
            <div className="size-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <BookOpen className="size-5" />
            </div>
          </div>

          <div>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ) : (
              <div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {stats.totalModules} <span className="text-xs font-semibold text-slate-500">Modules</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Registered clinical stations
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
            <span>View Details</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* KPI 3: Medical Faculty Roster */}
        <Link
          href="/dean/professors"
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-emerald-500/50 hover:shadow-md transition-all group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Faculty Roster
            </span>
            <div className="size-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="size-5" />
            </div>
          </div>

          <div>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ) : (
              <div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {stats.totalProfessors} <span className="text-xs font-semibold text-slate-500">Evaluators</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Authorized invigilators
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span>View Details</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* KPI 4: Student Body */}
        <Link
          href="/dean/students"
          className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-sky-500/50 hover:shadow-md transition-all group flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Student Body
            </span>
            <div className="size-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <GraduationCap className="size-5" />
            </div>
          </div>

          <div>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ) : (
              <div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {stats.totalStudents} <span className="text-xs font-semibold text-slate-500">Students</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Enrolled candidate roster
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400">
            <span>View Details</span>
            <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Balanced Dashboard Body: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Academic Structure & Quick Setup Roadmap */}
        <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Academic Onboarding & Setup Roadmap
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Essential steps to initialize your medical faculty workspace.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Step 1: Active Year */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    1. Active Academic Year Confirmed
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Session {data?.activeAcademicYear || '2026–2027'} is active.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/50">
                Confirmed ✓
              </span>
            </div>

            {/* Step 2: Define Structure */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                  <Layers className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    2. Define Sections & Rotation Groups
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {stats.totalSections > 0
                      ? `${stats.totalSections} Section(s) and ${stats.totalGroups} Group(s) configured.`
                      : 'Configure study levels, sections, and student rotation groups.'}
                  </p>
                </div>
              </div>
              <Link
                href="/dean/structure"
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 shrink-0"
              >
                <span>{stats.totalSections > 0 ? 'Manage' : 'Configure'}</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>

            {/* Step 3: Register Clinical Modules */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    3. Register Clinical Modules & Stations
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {stats.totalModules > 0
                      ? `${stats.totalModules} Clinical Module(s) registered.`
                      : 'Create OSCE stations and scoring criteria.'}
                  </p>
                </div>
              </div>
              <Link
                href="/dean/modules"
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 shrink-0"
              >
                <span>{stats.totalModules > 0 ? 'Manage' : 'Create'}</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>

            {/* Step 4: Import Student Roster */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs shrink-0">
                  <Users className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    4. Enroll Student Candidate Roster
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {stats.totalStudents > 0
                      ? `${stats.totalStudents} Student Candidate(s) enrolled.`
                      : 'Assign candidates to rotation groups.'}
                  </p>
                </div>
              </div>
              <Link
                href="/dean/students"
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 shrink-0"
              >
                <span>{stats.totalStudents > 0 ? 'View Roster' : 'Enroll'}</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Examination Readiness & Quick Links */}
        <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Examination Readiness & Quick Access
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Direct shortcuts for faculty administration.
            </p>
          </div>

          {/* Readiness Status Card */}
          <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-900/50 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-800 dark:text-sky-300">
              <ShieldCheck className="size-4 text-sky-600 dark:text-sky-400" />
              <span>OSCE Examination Readiness</span>
            </div>
            <p className="text-xs text-sky-900/80 dark:text-sky-200/80 leading-relaxed font-medium">
              Faculty infrastructure active. Evaluators, candidates, and rotation groups ready for examination scoring.
            </p>
          </div>

          {/* Quick Links List */}
          <div className="space-y-2.5">
            <Link
              href="/dean/professors"
              className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <UserPlus className="size-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Register Invigilator Account
                </span>
              </div>
              <ChevronRight className="size-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/dean/academic-years"
              className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 hover:border-blue-500/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Calendar className="size-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Manage Academic Calendar
                </span>
              </div>
              <ChevronRight className="size-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/dean/profile"
              className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 hover:border-slate-400 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
                  <Building2 className="size-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Review Faculty Account Details
                </span>
              </div>
              <ChevronRight className="size-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
