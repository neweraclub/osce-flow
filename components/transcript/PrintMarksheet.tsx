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
    <div className="print-marksheet-container bg-white text-slate-900 p-8 max-w-4xl mx-auto font-sans print:p-0 print:max-w-none">
      {/* ========================================================================= */}
      {/* 1. OFFICIAL INSTITUTIONAL HEADER & WATERMARK BANNER                       */}
      {/* ========================================================================= */}
      <div className="border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left: University & Faculty Authority */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900">RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {facultyName || 'Faculté de Médecine • Conseil Pédagogique et Scientifique'}
            </p>
            <div className="pt-1 flex items-center gap-2">
              <span className="text-sm font-black tracking-tight text-slate-900">NEW ERA ECOS</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 text-white tracking-widest">
                CERTIFIED OSCE MARKSHEET
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-600">
              {granularity === 'detailed'
                ? 'OFFICIAL OSCE CLINICAL TRANSCRIPT • ITEM-BY-ITEM PERFORMANCE RECORD'
                : 'OFFICIAL OSCE CLINICAL TRANSCRIPT • EXECUTIVE SUMMARY'}
            </p>
          </div>

          {/* Right: Institutional Watermark & Metadata Stamp */}
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 min-w-[230px] space-y-1.5 shrink-0 text-right">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                Academic Session
              </span>
              <span className="text-xs font-bold text-slate-900">
                {student.academic_year_label || '2026-2027'}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                Evaluating Examiner
              </span>
              <span className="text-xs font-semibold text-slate-900">
                {evaluatingProfessorName || 'Prof. Lead Examiner'}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
                Timestamp Certified
              </span>
              <span className="text-[10px] font-mono text-slate-700">
                {now}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CANDIDATE PROFILE IDENTIFICATION CARD                                  */}
      {/* ========================================================================= */}
      <div className="rounded-lg border border-slate-300 bg-slate-50/70 p-4 mb-6 break-inside-avoid">
        <div className="flex items-center justify-between pb-3 border-b border-slate-300">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-slate-900 text-white font-black text-base flex items-center justify-center shrink-0">
              {(student.first_name?.trim() || student.full_name?.trim() || student.last_name?.trim() || 'S').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 uppercase tracking-tight">
                {student.full_name || `${student.first_name} ${student.last_name}`}
              </h1>
              <p className="text-xs font-mono font-bold text-slate-600">
                Registration / Matricule: {student.matricule}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded text-xs font-mono font-bold bg-white border border-slate-300 text-slate-900">
              ID: {student.matricule}
            </span>
          </div>
        </div>

        {/* Structured 4-Column Metadata Grid */}
        <div className="grid grid-cols-4 gap-3 pt-3 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
              Curriculum Level
            </span>
            <span className="font-bold text-slate-900 mt-0.5 block">
              {student.level_name || '6ème Année Médecine'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
              Cohort / Section
            </span>
            <span className="font-bold text-slate-900 mt-0.5 block">
              {student.section_name || 'Section A'} • {student.group_name || 'Group 1'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
              Academic Cycle
            </span>
            <span className="font-bold text-slate-900 mt-0.5 block">
              {student.academic_year_label || '2026-2027'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
              Session Type
            </span>
            <span className="font-bold text-slate-900 mt-0.5 uppercase block">
              {activeModule.session_type || 'Regular'} Exam
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODULE FINAL SCORE & OUTCOME BANNER                                    */}
      {/* ========================================================================= */}
      <div
        className={`rounded-lg border p-4 mb-6 break-inside-avoid flex items-center justify-between gap-4 ${
          isPassed
            ? 'bg-slate-50 border-slate-900 text-slate-900'
            : 'bg-slate-100 border-slate-900 text-slate-900'
        }`}
      >
        <div className="space-y-0.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
            Clinical Module Evaluation
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {activeModule.module_name}
          </h2>
          <p className="text-xs font-medium text-slate-600">
            {activeModule.stations.length} Station OSCE Encounter • Final Standardized Scale
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Aggregated Mark
            </span>
            <div className="text-2xl font-black font-mono text-slate-900">
              {activeModule.module_final_score.toFixed(2)}
              <span className="text-xs font-semibold text-slate-500"> / 20.00 pts</span>
            </div>
          </div>

          <div
            className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase border text-center ${
              isPassed
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-900 border-slate-900 border-2'
            }`}
          >
            {isPassed ? 'PASSED / VALIDE' : 'AJOURNÉ / RETAKE REQUIRED'}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. STATION BREAKDOWN SUMMARY TABLE                                        */}
      {/* ========================================================================= */}
      <div className="mb-6 break-inside-avoid">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
            Station Performance & Weighted Contribution Matrix
          </h3>
          <span className="text-[10px] font-semibold text-slate-600">
            Institutional Passing Threshold: 10.00 / 20.00 pts (50.0%)
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-300">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="py-2 px-3 w-[10%]">Station</th>
                <th className="py-2 px-3 w-[28%]">Clinical Station Title</th>
                <th className="py-2 px-2 text-center">Weight</th>
                <th className="py-2 px-2 text-right">Max Scale</th>
                <th className="py-2 px-2 text-right">Deductions</th>
                <th className="py-2 px-2 text-right">Bonuses</th>
                <th className="py-2 px-2 text-right">Net Raw</th>
                <th className="py-2 px-3 text-right font-bold">Contrib (/20)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {activeModule.stations.map((st, idx) => (
                <tr key={st.station_id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="py-2 px-3 font-mono font-bold text-slate-900">
                    ST-{String(st.station_number).padStart(2, '0')}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-900">
                    {st.station_title}
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-semibold text-slate-700">
                    {st.weightage_percentage}%
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-700">
                    {st.station_max_points} pts
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-900 font-semibold">
                    {st.deductions_points < 0 ? `${st.deductions_points.toFixed(1)} pts` : '-0.0 pts'}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-emerald-700 font-semibold">
                    {st.bonuses_points > 0 ? `+${st.bonuses_points.toFixed(1)} pts` : '+0.0 pts'}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                    {st.net_station_raw_score.toFixed(2)} pts
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                    {st.station_contribution.toFixed(2)} / {st.station_max_contribution.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-900 font-bold text-slate-900">
                <td colSpan={2} className="py-2 px-3 uppercase tracking-wider text-[10px]">
                  Total Module Aggregation
                </td>
                <td className="py-2 px-2 text-center font-mono">
                  {activeModule.stations.reduce((sum, s) => sum + Number(s.weightage_percentage || 0), 0)}%
                </td>
                <td colSpan={4} className="py-2 px-2 text-right text-[10px] text-slate-600 uppercase">
                  Institutional Final Grade:
                </td>
                <td className="py-2 px-3 text-right font-mono font-black text-sm text-slate-900">
                  {activeModule.module_final_score.toFixed(2)} / 20.00
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. ITEMIZED EVALUATION RUBRIC & SAFETY INFRACTIONS LEDGER                  */}
      {/* ========================================================================= */}
      {granularity === 'detailed' && (
        <div className="space-y-5">
          <div className="border-t-2 border-slate-900 pt-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3">
              Itemized Evaluation Checklist & Scoring Criteria
            </h3>

            {activeModule.stations.map((st) => (
              <div key={st.station_id} className="mb-4 rounded-lg border border-slate-300 overflow-hidden break-inside-avoid">
                {/* Station Subheader */}
                <div className="bg-slate-100 px-3.5 py-1.5 border-b border-slate-300 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">
                    ST-{String(st.station_number).padStart(2, '0')}: {st.station_title}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-slate-700">
                    Raw: {st.net_station_raw_score.toFixed(2)} / {st.station_max_points} pts ({st.weightage_percentage}% Weight)
                  </span>
                </div>

                {st.answers && st.answers.length > 0 ? (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white text-[10px]">
                        <th className="py-1.5 px-3 w-[8%]">Item</th>
                        <th className="py-1.5 px-3 w-[58%]">Criterion / Checklist Question</th>
                        <th className="py-1.5 px-2.5 w-[14%] text-center">Format</th>
                        <th className="py-1.5 px-3 w-[20%] text-right font-bold">Awarded</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {st.answers.map((ans, idx) => {
                        const isFull = ans.points_awarded >= ans.max_scale_value
                        const isZero = ans.points_awarded === 0
                        return (
                          <tr key={ans.question_id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="py-1.5 px-3 font-mono font-bold text-slate-500">
                              #{idx + 1}
                            </td>
                            <td className="py-1.5 px-3">
                              <p className="font-medium text-slate-900 leading-snug">
                                {ans.question_text}
                              </p>
                              {ans.selected_options && ans.selected_options.length > 0 && (
                                <p className="text-[10px] text-slate-600 mt-0.5 font-mono">
                                  Selected: {ans.selected_options.join(', ')}
                                </p>
                              )}
                            </td>
                            <td className="py-1.5 px-2.5 text-center">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-200 text-slate-800">
                                {ans.question_type}
                              </span>
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                              {Number(ans.points_awarded || 0).toFixed(2)} / {Number(ans.max_scale_value || 10).toFixed(2)} pts
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-2.5 text-center text-xs text-slate-500 italic">
                    No individual checklist criteria recorded for this station.
                  </div>
                )}

                {/* Candidate Penalties & Deductions */}
                {st.penalties && st.penalties.length > 0 && (
                  <div className="bg-slate-100 border-t border-slate-300 p-2.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900 block">
                      Safety Infractions & Protocol Deductions:
                    </span>
                    {st.penalties.map((pen, pIdx) => (
                      <div key={pen.id || pIdx} className="flex items-center justify-between text-xs text-slate-900">
                        <span>• {pen.reason}</span>
                        <span className="font-mono font-bold shrink-0">
                          {pen.points < 0 ? pen.points.toFixed(1) : `-${Number(pen.points).toFixed(1)}`} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Candidate Merit Points & Bonuses */}
                {st.bonuses && st.bonuses.length > 0 && (
                  <div className="bg-emerald-50/70 border-t border-emerald-200 p-2.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      Exceptional Clinical Merit & Protocol Bonuses:
                    </span>
                    {st.bonuses.map((bon, bIdx) => (
                      <div key={bon.id || bIdx} className="flex items-center justify-between text-xs text-emerald-900">
                        <span>• {bon.reason}</span>
                        <span className="font-mono font-bold shrink-0 text-emerald-700">
                          +{Math.abs(Number(bon.points)).toFixed(1)} pts
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
      <div className="mt-8 pt-4 border-t-2 border-slate-900 text-xs text-slate-600 break-inside-avoid">
        <div className="grid grid-cols-2 gap-8 pb-6">
          <div className="border border-dashed border-slate-400 rounded-lg p-4 h-24 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Lead Station Examiner Signature
            </span>
            <div className="border-t border-slate-300 pt-1 text-[11px] font-semibold text-slate-900">
              {evaluatingProfessorName || 'Prof. Evaluating Examiner'}
            </div>
          </div>

          <div className="border border-dashed border-slate-400 rounded-lg p-4 h-24 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Dean / Academic Affairs Seal & Stamp
            </span>
            <div className="border-t border-slate-300 pt-1 text-[11px] font-semibold text-slate-900">
              {facultyName || 'Faculté de Médecine'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-300 pt-2">
          <span>
            © {new Date().getFullYear()} OSCE-Flow Platform • New Era Ecos Enterprise Healthcare Education
          </span>
          <span className="font-mono">
            Cryptographically Certified Official Transcript
          </span>
        </div>
      </div>
    </div>
  )
}
