'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  GraduationCap,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Users,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export interface AnalyticsKPIs {
  totalFaculties: number
  assignedDeans: number
  vacantDeans: number
  totalProfessors: number
  totalStudents: number
  totalExams: number
  totalModules: number
}

export interface StudyLevelCohort {
  name: string
  count: number
  percentage: number
  color: string
}

export interface FacultyCapacity {
  id: string
  facultyName: string
  shortName: string
  studentsCount: number
  professorsCount: number
  modulesCount: number
  hasDean: boolean
  deanName?: string
}

export default function SuperadminAnalyticsDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [kpis, setKpis] = useState<AnalyticsKPIs>({
    totalFaculties: 0,
    assignedDeans: 0,
    vacantDeans: 0,
    totalProfessors: 0,
    totalStudents: 0,
    totalExams: 0,
    totalModules: 0,
  })

  const [studyLevels, setStudyLevels] = useState<StudyLevelCohort[]>([
    { name: '4th Year Medicine', count: 0, percentage: 0, color: '#0284c7' },
    { name: '5th Year Medicine', count: 0, percentage: 0, color: '#38bdf8' },
    { name: '6th Year Medicine', count: 0, percentage: 0, color: '#10b981' },
  ])

  const [facultyData, setFacultyData] = useState<FacultyCapacity[]>([])

  const fetchAnalyticsData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/superadmin/analytics')
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setKpis(data.kpis)
          setStudyLevels(data.studyLevelDistribution || [])
          setFacultyData(data.facultyCapacity || [])
        }
      }
    } catch {
      // Retain zero counts if offline
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const filteredFaculties = facultyData.filter((f) =>
    f.facultyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.shortName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* Top Banner & Refresh Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-600/15">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-cyan-200 border border-white/20">
              Platform Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3">
            National ECOS Command Center
          </h1>
          <p className="text-sm text-blue-100/80 mt-1 max-w-xl">
            Live overview of university medical faculties, dean assignments, and active student cohorts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAnalyticsData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Update</span>
          </button>
          <Link
            href="/superadmin/faculties"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-blue-700 font-bold text-xs shadow-lg hover:bg-blue-50 transition-all"
          >
            <Plus className="size-4" />
            Add Faculty
          </Link>
        </div>
      </div>

      {/* Top Row: 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Faculties */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Faculties</span>
            <div className="size-11 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Building2 className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            ) : (
              <>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{kpis.totalFaculties}</span>
                <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                  <ArrowUpRight className="size-3.5" />
                  <span>Registered Institutions</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* KPI 2: Provisioned Deans */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Deans</span>
            <div className="size-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <GraduationCap className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            ) : (
              <>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{kpis.assignedDeans} / {kpis.totalFaculties}</span>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <span>{kpis.vacantDeans} unassigned faculties</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* KPI 3: Active Professors */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Professors</span>
            <div className="size-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Stethoscope className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            ) : (
              <>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{kpis.totalProfessors.toLocaleString()}</span>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <span>Registered Evaluators</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* KPI 4: Enrolled Students */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enrolled Students</span>
            <div className="size-11 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Users className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            ) : (
              <>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{kpis.totalStudents.toLocaleString()}</span>
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <span>Active Cohorts</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle Row: Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Chart: Donut Chart - Students by Study Level */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Students by Study Level
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Distribution across 4th Year, 5th Year & 6th Year
            </p>
          </div>

          <div className="h-64 my-4 relative flex items-center justify-center">
            {loading ? (
              <div className="size-44 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-sky-500 animate-spin" />
            ) : kpis.totalStudents > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={studyLevels}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {studyLevels.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderColor: 'rgba(51, 65, 85, 0.6)',
                      borderRadius: '0.75rem',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${Number(value).toLocaleString()} Students`, 'Cohort']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-400">No student records enrolled yet.</div>
            )}
          </div>

          {/* Legend Summary */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {studyLevels.map((lvl) => (
              <div key={lvl.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-3 rounded-full shrink-0" style={{ backgroundColor: lvl.color }} />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{lvl.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-slate-900 dark:text-white">{lvl.count.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400">({lvl.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Chart: Bar Chart - Faculty Volume */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Faculty Capacity & Volume
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enrolled students & professors per medical institution
            </p>
          </div>

          <div className="h-72 my-4">
            {loading ? (
              <div className="h-full w-full bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
            ) : facultyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facultyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="shortName" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderColor: 'rgba(51, 65, 85, 0.6)',
                      borderRadius: '0.75rem',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="studentsCount" name="Students" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="professorsCount" name="Professors" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No medical faculties configured.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Section: Medical Faculties Overview */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Medical Faculties Overview
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Institutional details and assigned deans
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search faculties..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/40 text-[11px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Faculty Institution</th>
                <th className="px-6 py-4">Assigned Dean</th>
                <th className="px-6 py-4">Modules</th>
                <th className="px-6 py-4">Students</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredFaculties.length > 0 ? (
                filteredFaculties.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-xl bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs">
                          {f.shortName.substring(0, 2).toUpperCase()}
                        </div>
                        <span>{f.facultyName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">
                      {f.hasDean ? f.deanName : <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900 dark:text-white">
                      {f.modulesCount} Modules
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900 dark:text-white">
                      {f.studentsCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {f.hasDean ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200/60 dark:border-emerald-900/50">
                          <CheckCircle2 className="size-3.5" />
                          Operational
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-[11px] border border-amber-200/60 dark:border-amber-900/50">
                          <Clock className="size-3.5" />
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href="/superadmin/faculties"
                        className="font-bold text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No medical faculties found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
