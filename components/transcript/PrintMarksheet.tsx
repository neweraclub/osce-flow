'use client'

import React from 'react'
import {
  StudentResultsDashboardData,
  ModuleResultsGroup,
  EvaluatedStationBreakdown,
} from '@/app/actions/studentResults'

interface PrintMarksheetProps {
  student: StudentResultsDashboardData['student']
  activeModule: ModuleResultsGroup
  evaluatingProfessorName?: string | null
  facultyName?: string | null
  preciseTimestamp?: string | null
  granularity?: 'general' | 'detailed'
}

export function PrintMarksheet({
  student,
  activeModule,
  evaluatingProfessorName = 'Prof. Evaluating Examiner',
  facultyName = 'Faculty of Medicine',
  preciseTimestamp,
  granularity = 'detailed',
}: PrintMarksheetProps) {
  const isPassed = activeModule.is_passed
  const now = preciseTimestamp || new Date().toLocaleString()

  return (
    <div className="print-marksheet-container bg-white text-slate-900 p-6 max-w-4xl mx-auto font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP OFFICIAL HEADER & PLATFORM BRANDING                                */}
      {/* ========================================================================= */}
      <div className="border-b-2 border-slate-900 pb-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Left Brand & Title */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900">NEW ERA</span>
              <span className="text-xl font-black tracking-tight text-emerald-600">ECOS</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 text-white tracking-widest ml-1">
                Official Transcript
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Clinical Examination Assessment Suite • Certified Medical Marksheet
            </p>
            <p className="text-xs font-semibold text-slate-700">
              {granularity === 'detailed'
                ? 'OFFICIAL OSCE ACADEMIC TRANSCRIPT • ITEMIZED PERFORMANCE BREAKDOWN'
                : 'OFFICIAL OSCE ACADEMIC TRANSCRIPT • EXECUTIVE SUMMARY'}
            </p>
          </div>

          {/* Right Header Metadata - Stacked Flex Columns (Never Overlaps) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 min-w-[240px] space-y-2 shrink-0">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Evaluating Examiner
              </span>
              <span className="text-xs font-bold text-emerald-700">
                {evaluatingProfessorName || 'Prof. Evaluating Examiner'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Faculty Workspace
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {facultyName || 'Faculty of Medicine'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Certified Timestamp
              </span>
              <span className="text-[11px] font-mono font-medium text-slate-600">
                {now}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CANDIDATE PROFILE IDENTIFICATION CARD                                  */}
      {/* ========================================================================= */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 mb-5 break-inside-avoid">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-slate-900 text-white font-black text-base flex items-center justify-center shrink-0">
              {(student.first_name?.trim() || student.full_name?.trim() || student.last_name?.trim() || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">
                {student.full_name || `${student.first_name} ${student.last_name}`}
              </h1>
              <p className="text-xs font-mono font-bold text-slate-500">
                Matricule: {student.matricule}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-lg text-xs font-mono font-bold bg-white border border-slate-200 text-slate-800 shadow-2xs">
              ID: {student.matricule}
            </span>
          </div>
        </div>

        {/* Structured 4-Column Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Academic Level
            </span>
            <span className="font-bold text-slate-800 mt-0.5">
              {student.level_name || 'Medical Curriculum'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Cohort / Section
            </span>
            <span className="font-bold text-slate-800 mt-0.5">
              {student.section_name || 'Section A'} • {student.group_name || 'Group 1'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Academic Year
            </span>
            <span className="font-bold text-slate-800 mt-0.5">
              {student.academic_year_label || '2026-2027'}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Assessment Session
            </span>
            <span className="font-bold text-slate-800 mt-0.5 uppercase">
              {activeModule.session_type || 'Regular'} Exam
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODULE FINAL SCORE & OUTCOME BANNER                                    */}
      {/* ========================================================================= */}
      <div
        className={`rounded-xl border p-4 mb-5 break-inside-avoid flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isPassed
            ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950'
            : 'bg-rose-50/60 border-rose-300 text-rose-950'
        }`}
      >
        <div className="space-y-0.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
            Clinical Module Evaluation
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {activeModule.module_name}
          </h2>
          <p className="text-xs font-medium text-slate-600">
            {activeModule.stations.length} Station OSCE Encounter • Final Scaled Mark
          </p>
        </div>

        <div className="flex items-center gap-4 self-start sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Module Final Score
            </span>
            <div className="text-2xl font-black font-mono">
              <span className={isPassed ? 'text-emerald-700' : 'text-rose-700'}>
                {activeModule.module_final_score.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-slate-500"> / 20.00 pts</span>
            </div>
          </div>

          <div
            className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wider uppercase border text-center shadow-2xs shrink-0 ${
              isPassed
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-rose-600 text-white border-rose-700'
            }`}
          >
            {isPassed ? 'PASSED / VALIDE' : 'RETAKE REQUIRED'}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. STATION BREAKDOWN SUMMARY TABLE                                        */}
      {/* ========================================================================= */}
      <div className="mb-6 break-inside-avoid">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Station Performance & Weighted Contribution Summary
          </h3>
          <span className="text-[10px] font-semibold text-slate-500">
            Passing Benchmark: 10.00 / 20.00 pts (50.0%)
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="py-2.5 px-3 w-[12%]">Station</th>
                <th className="py-2.5 px-3 w-[30%]">Station Title</th>
                <th className="py-2.5 px-2.5 w-[10%] text-center">Weight</th>
                <th className="py-2.5 px-2.5 w-[12%] text-right">Max Scale</th>
                <th className="py-2.5 px-2.5 w-[12%] text-right">Deductions</th>
                <th className="py-2.5 px-2.5 w-[12%] text-right">Net Raw</th>
                <th className="py-2.5 px-3 w-[12%] text-right font-bold">Contrib (/20)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {activeModule.stations.map((st, idx) => {
                const isEven = idx % 2 === 0
                return (
                  <tr key={st.station_id || idx} className={isEven ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      Station #{st.station_number}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {st.station_title}
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-mono font-semibold text-slate-600">
                      {st.weightage_percentage}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-slate-600">
                      {st.station_max_points} pts
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono text-rose-600 font-semibold">
                      {st.deductions_points < 0 ? `${st.deductions_points.toFixed(1)} pts` : '-0.0 pts'}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-900">
                      {st.net_station_raw_score.toFixed(2)} pts
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-amber-700">
                      {st.station_contribution.toFixed(2)} / {st.station_max_contribution.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                <td colSpan={2} className="py-2.5 px-3 uppercase tracking-wider text-[11px]">
                  Total Module Aggregation
                </td>
                <td className="py-2.5 px-2.5 text-center font-mono">
                  {activeModule.stations.reduce((sum, s) => sum + Number(s.weightage_percentage || 0), 0)}%
                </td>
                <td colSpan={3} className="py-2.5 px-2.5 text-right text-[11px] text-slate-500 uppercase">
                  Institutional Final (/20):
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-emerald-700">
                  {activeModule.module_final_score.toFixed(2)} / 20.00
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. GRANULAR CHECKLIST & ITEMIZED EVALUATION RUBRICS                        */}
      {/* ========================================================================= */}
      {granularity === 'detailed' && (
        <div className="space-y-6">
          <div className="border-t-2 border-slate-200 pt-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-3">
              Itemized Evaluation Checklist & Grading Criteria Rubrics
            </h3>

            {activeModule.stations.map((st) => (
              <div key={st.station_id} className="mb-5 rounded-xl border border-slate-200 overflow-hidden break-inside-avoid">
                {/* Station Subheader */}
                <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">
                    Station #{st.station_number}: {st.station_title}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-slate-600">
                    Score: {st.net_station_raw_score.toFixed(2)} / {st.station_max_points} pts ({st.weightage_percentage}% Weight)
                  </span>
                </div>

                {st.answers && st.answers.length > 0 ? (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white text-[11px]">
                        <th className="py-2 px-3 w-[10%]">Item #</th>
                        <th className="py-2 px-3 w-[55%]">Evaluation Checklist Item / Question</th>
                        <th className="py-2 px-2.5 w-[15%] text-center">Format</th>
                        <th className="py-2 px-3 w-[20%] text-right font-bold">Points Awarded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {st.answers.map((ans, idx) => {
                        const isFull = ans.points_awarded >= ans.max_scale_value
                        const isZero = ans.points_awarded === 0
                        return (
                          <tr key={ans.question_id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="py-2 px-3 font-mono font-bold text-slate-500">
                              #{idx + 1}
                            </td>
                            <td className="py-2 px-3">
                              <p className="font-medium text-slate-900 leading-snug break-words">
                                {ans.question_text}
                              </p>
                              {ans.selected_options && ans.selected_options.length > 0 && (
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  Selected: {ans.selected_options.join(', ')}
                                </p>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-center">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                                {ans.question_type}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold">
                              <span
                                className={
                                  isFull
                                    ? 'text-emerald-700'
                                    : isZero
                                    ? 'text-rose-600'
                                    : 'text-amber-700'
                                }
                              >
                                {Number(ans.points_awarded || 0).toFixed(2)}
                              </span>
                              <span className="text-slate-400 font-normal">
                                {' '}/ {Number(ans.max_scale_value || 10).toFixed(2)} pts
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-3 text-center text-xs text-slate-400 italic">
                    No individual checklist criteria recorded for this station.
                  </div>
                )}

                {/* Candidate Penalties & Deductions */}
                {st.penalties && st.penalties.length > 0 && (
                  <div className="bg-rose-50/60 border-t border-rose-200 p-3 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                      Clinical Protocol Infractions & Deductions Recorded:
                    </span>
                    {st.penalties.map((pen, pIdx) => (
                      <div key={pen.id || pIdx} className="flex items-center justify-between text-xs text-rose-900">
                        <span>• {pen.reason}</span>
                        <span className="font-mono font-bold text-rose-700 shrink-0">
                          {pen.points < 0 ? pen.points.toFixed(1) : `-${Number(pen.points).toFixed(1)}`} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CERTIFIED INSTITUTIONAL FOOTER & SIGNATURE SPACES                     */}
      {/* ========================================================================= */}
      <div className="mt-8 pt-4 border-t-2 border-slate-900 text-xs text-slate-500 break-inside-avoid">
        <div className="grid grid-cols-2 gap-8 pb-6">
          <div className="border border-dashed border-slate-300 rounded-xl p-4 h-24 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Station Examiner Signature
            </span>
            <div className="border-t border-slate-300 pt-1 text-[11px] font-semibold text-slate-700">
              {evaluatingProfessorName || 'Prof. Evaluating Examiner'}
            </div>
          </div>

          <div className="border border-dashed border-slate-300 rounded-xl p-4 h-24 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Dean / Academic Affairs Seal
            </span>
            <div className="border-t border-slate-300 pt-1 text-[11px] font-semibold text-slate-700">
              {facultyName || 'Faculty of Medicine'}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400 border-t border-slate-200 pt-2">
          <span>
            © 2026 OSCE-Flow Platform • New Era Ecos Enterprise Healthcare Education
          </span>
          <span className="font-mono">
            Cryptographically Validated Academic Marksheet Record
          </span>
        </div>
      </div>
    </div>
  )
}
