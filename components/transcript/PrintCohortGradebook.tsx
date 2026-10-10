'use client'

import React from 'react'

export interface PrintCohortGradebookRecord {
  id: string
  matricule: string
  first_name: string
  last_name: string
  full_name: string
  import_index?: number | null
  group_name: string
  section_name: string
  level_name: string
  academic_year_label: string
  evaluated_stations_count: number
  total_stations_count: number
  final_score: number | null
  is_passed: boolean
  status: 'passed' | 'failed' | 'pending'
  assigned_modules?: string[]
}

interface PrintCohortGradebookProps {
  students: PrintCohortGradebookRecord[]
  evaluatingProfessorName?: string | null
  facultyName?: string | null
  cohortName?: string | null
  moduleName?: string | null
  sectionName?: string | null
  groupName?: string | null
  sortLabel?: string | null
  preciseTimestamp?: string | null
  stats?: {
    total_students: number
    evaluated_students: number
    average_score: number
    pass_rate: number
  }
}

export function PrintCohortGradebook({
  students,
  evaluatingProfessorName = 'Prof. Evaluating Examiner',
  facultyName = 'Faculty of Medicine',
  cohortName = 'Academic Session 2026-2027',
  moduleName = 'Clinical OSCE Module',
  sectionName,
  groupName,
  sortLabel = 'Default (Excel)',
  preciseTimestamp,
  stats,
}: PrintCohortGradebookProps) {
  const now = preciseTimestamp || new Date().toLocaleString()

  const evaluatedCount =
    stats?.evaluated_students ??
    students.filter((s) => s.evaluated_stations_count > 0).length
  const totalCount = stats?.total_students ?? students.length
  const passCount = students.filter((s) => (s.final_score ?? 0) >= 10.0).length
  const passRate =
    stats?.pass_rate ??
    (evaluatedCount > 0 ? Math.round((passCount / evaluatedCount) * 100) : 0)
  const averageScore =
    stats?.average_score ??
    (evaluatedCount > 0
      ? students
          .filter((s) => s.final_score !== null)
          .reduce((sum, s) => sum + (s.final_score || 0), 0) / evaluatedCount
      : 0)

  return (
    <div className="print-cohort-gradebook bg-white text-slate-900 p-8 max-w-5xl mx-auto font-sans print:p-0 print:max-w-none text-xs leading-normal">
      {/* ========================================================================= */}
      {/* 1. INSTITUTIONAL HEADER & WATERMARK                                       */}
      {/* ========================================================================= */}
      <div className="border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-base font-black tracking-tight text-slate-900 uppercase block">
              RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE
            </span>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              {facultyName || 'Faculté de Médecine • Conseil Pédagogique et Scientifique'}
            </p>
            <div className="pt-0.5 flex items-center gap-2">
              <span className="text-xs font-black tracking-tight text-slate-900">NEW ERA ECOS</span>
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 text-white tracking-widest">
                OFFICIAL OSCE MASTER GRADEBOOK
              </span>
            </div>
            <p className="text-[10px] font-semibold text-slate-600">
              Module: <span className="font-bold text-slate-900">{moduleName}</span>
              {sectionName && sectionName !== 'all' ? ` • Section: ${sectionName}` : ''}
              {groupName && groupName !== 'all' ? ` • Group: ${groupName}` : ''}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-300 rounded-lg p-2.5 min-w-[210px] space-y-1 shrink-0 text-right">
            <div>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block">
                Academic Session
              </span>
              <span className="text-[11px] font-bold text-slate-900">
                {cohortName || '2026-2027'}
              </span>
            </div>
            <div>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block">
                Evaluating Examiner
              </span>
              <span className="text-[11px] font-semibold text-slate-900">
                {evaluatingProfessorName || 'Prof. Lead Examiner'}
              </span>
            </div>
            <div>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block">
                Ordering Sequence
              </span>
              <span className="text-[10px] font-semibold text-emerald-800">
                {sortLabel}
              </span>
            </div>
            <div>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block">
                Certified Timestamp
              </span>
              <span className="text-[9px] font-mono text-slate-700">
                {now}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMMARY KPI STATS CARDS                                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-4 gap-3 mb-5 break-inside-avoid">
        <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50">
          <div className="text-[9px] font-bold uppercase text-slate-500">Total Enrolled</div>
          <div className="text-base font-black text-slate-900 mt-0.5">{totalCount} Candidates</div>
        </div>
        <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50">
          <div className="text-[9px] font-bold uppercase text-slate-500">Evaluated</div>
          <div className="text-base font-black text-slate-900 mt-0.5">
            {evaluatedCount} / {totalCount}
          </div>
        </div>
        <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50">
          <div className="text-[9px] font-bold uppercase text-slate-500">Mean Score</div>
          <div className="text-base font-black text-slate-900 mt-0.5">
            {averageScore.toFixed(2)} <span className="text-xs font-semibold text-slate-500">/ 20</span>
          </div>
        </div>
        <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50">
          <div className="text-[9px] font-bold uppercase text-slate-500">Passing Rate</div>
          <div className={`text-base font-black mt-0.5 ${passRate >= 50 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {passRate}%
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. OFFICIAL CANDIDATES TABLE                                              */}
      {/* ========================================================================= */}
      <table className="w-full border-collapse border border-slate-300 text-[10px] mb-6">
        <thead>
          <tr className="bg-slate-900 text-white font-bold uppercase text-[9px] tracking-wider text-left">
            <th className="border border-slate-800 p-2 text-center w-8">#</th>
            <th className="border border-slate-800 p-2 text-center w-24">Matricule</th>
            <th className="border border-slate-800 p-2">Candidate Full Name</th>
            <th className="border border-slate-800 p-2 text-center w-24">Section / Group</th>
            <th className="border border-slate-800 p-2 text-center w-20">Stations</th>
            <th className="border border-slate-800 p-2 text-right w-20">Score / 20</th>
            <th className="border border-slate-800 p-2 text-center w-20">Decision</th>
            <th className="border border-slate-800 p-2 text-center w-28">Signature / Visa</th>
          </tr>
        </thead>
        <tbody>
          {students.map((st, index) => {
            const hasScore = st.final_score !== null && st.final_score !== undefined
            const scoreDisplay = hasScore ? Number(st.final_score).toFixed(2) : '–'
            const isPassing = hasScore && Number(st.final_score) >= 10.0

            return (
              <tr
                key={st.id || index}
                className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
              >
                <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-500">
                  {index + 1}
                </td>
                <td className="border border-slate-300 p-1.5 text-center font-mono font-semibold">
                  {st.matricule || '–'}
                </td>
                <td className="border border-slate-300 p-1.5 font-bold uppercase text-slate-900">
                  {st.full_name || `${st.first_name} ${st.last_name}`}
                </td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-700">
                  {st.section_name} • {st.group_name}
                </td>
                <td className="border border-slate-300 p-1.5 text-center font-mono">
                  {st.evaluated_stations_count} / {st.total_stations_count || '–'}
                </td>
                <td
                  className={`border border-slate-300 p-1.5 text-right font-mono font-black ${
                    !hasScore
                      ? 'text-slate-400'
                      : isPassing
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}
                >
                  {scoreDisplay}
                </td>
                <td className="border border-slate-300 p-1.5 text-center font-bold uppercase text-[9px]">
                  {st.status === 'passed' ? (
                    <span className="text-emerald-700">ADMIS (Passed)</span>
                  ) : st.status === 'failed' ? (
                    <span className="text-rose-700">AJOURNÉ (Retake)</span>
                  ) : (
                    <span className="text-amber-700">EN ATTENTE</span>
                  )}
                </td>
                <td className="border border-slate-300 p-1.5 text-center text-slate-300">
                  ________________
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* ========================================================================= */}
      {/* 4. OFFICIAL JURY SIGNATURES & CERTIFICATION                               */}
      {/* ========================================================================= */}
      <div className="break-inside-avoid pt-4 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-[10px]">
        <div>
          <span className="font-bold uppercase text-slate-500 block mb-1">
            Evaluating Examiner:
          </span>
          <p className="font-bold text-slate-900">{evaluatingProfessorName}</p>
          <div className="h-16 border-b border-dashed border-slate-400 mt-2 flex items-end pb-1 text-[9px] text-slate-400">
            Signature & Date
          </div>
        </div>

        <div>
          <span className="font-bold uppercase text-slate-500 block mb-1">
            OSCE Board President:
          </span>
          <p className="font-bold text-slate-900">Président du Jury ECOS</p>
          <div className="h-16 border-b border-dashed border-slate-400 mt-2 flex items-end pb-1 text-[9px] text-slate-400">
            Signature & Sceau
          </div>
        </div>

        <div>
          <span className="font-bold uppercase text-slate-500 block mb-1">
            Dean / Faculty Seal:
          </span>
          <p className="font-bold text-slate-900">{facultyName}</p>
          <div className="h-16 border-b border-dashed border-slate-400 mt-2 flex items-end pb-1 text-[9px] text-slate-400">
            Cachet Officiel
          </div>
        </div>
      </div>
    </div>
  )
}
