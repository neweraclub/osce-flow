import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  StudentResultsDashboardData,
  ModuleResultsGroup,
  EvaluatedStationBreakdown,
} from '@/app/actions/studentResults'

export type StudentTranscriptData = StudentResultsDashboardData
export type { ModuleResultsGroup, EvaluatedStationBreakdown }

/**
 * Generates and downloads a clean, professional, enterprise-grade PDF academic marksheet
 */
export function exportStudentTranscriptToPDF(
  studentOrData: StudentResultsDashboardData | StudentResultsDashboardData['student'],
  moduleOrFilename?: ModuleResultsGroup | string,
  maybeFilename?: string
) {
  let student: StudentResultsDashboardData['student']
  let activeModule: ModuleResultsGroup
  let filename: string | undefined

  if ('student' in studentOrData && 'modules' in studentOrData) {
    student = studentOrData.student
    activeModule =
      (typeof moduleOrFilename === 'object' ? moduleOrFilename : null) ||
      studentOrData.modules[0]
    filename = typeof moduleOrFilename === 'string' ? moduleOrFilename : maybeFilename
  } else {
    student = studentOrData as StudentResultsDashboardData['student']
    activeModule = moduleOrFilename as ModuleResultsGroup
    filename = maybeFilename
  }

  if (!activeModule) {
    throw new Error('No module examination data available to generate PDF marksheet.')
  }

  // Safe constructor resolution for jsPDF across bundler module formats
  const DocConstructor: any =
    typeof jsPDF === 'function'
      ? jsPDF
      : (jsPDF as any)?.jsPDF || (jsPDF as any)?.default || (window as any)?.jspdf?.jsPDF

  const doc = new DocConstructor({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  const runAutoTable = (options: any) => {
    if (typeof autoTable === 'function') {
      autoTable(doc, options)
    } else if (typeof (autoTable as any)?.default === 'function') {
      ;(autoTable as any).default(doc, options)
    } else if (typeof (doc as any).autoTable === 'function') {
      ;(doc as any).autoTable(options)
    }
  }

  const primaryColor: [number, number, number] = [15, 23, 42] // Slate 900
  const emeraldColor: [number, number, number] = [16, 185, 129] // Emerald 500
  const roseColor: [number, number, number] = [225, 29, 72] // Rose 600
  const blueColor: [number, number, number] = [2, 132, 199] // Sky 600

  // 1. Header Banner
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 595.28, 70, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('NEW ERA ECOS - CLINICAL EXAMINATION PLATFORM', 40, 32)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(203, 213, 225) // Slate 300
  doc.text('OFFICIAL OSCE ACADEMIC TRANSCRIPT & PERFORMANCE MARKSHEET', 40, 48)
  doc.text(`DATE ISSUED: ${new Date().toLocaleDateString('en-GB')}`, 400, 48)

  // 2. Student Identification Card
  doc.setDrawColor(226, 232, 240) // Slate 200
  doc.setFillColor(248, 250, 252) // Slate 50
  doc.roundedRect(40, 85, 515.28, 75, 6, 6, 'FD')

  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(student.full_name || `${student.first_name} ${student.last_name}`, 55, 105)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139) // Slate 500

  doc.text(`Matricule ID: `, 55, 122)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(student.matricule, 120, 122)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(`Academic Level: `, 55, 138)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(student.level_name || 'Medical Curriculum', 135, 138)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(`Academic Year: `, 320, 105)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(student.academic_year_label || 'Current Session', 395, 105)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(`Section / Cohort: `, 320, 122)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(`${student.section_name || 'Section A'} • Group ${student.group_name || '1'}`, 400, 122)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(`Assessment Type: `, 320, 138)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(`${activeModule.session_type.toUpperCase()} SESSION`, 405, 138)

  // 3. Module Score Highlight Box
  const isPassed = activeModule.is_passed
  const outcomeColor = isPassed ? emeraldColor : roseColor
  doc.setFillColor(isPassed ? 240 : 255, isPassed ? 253 : 241, isPassed ? 244 : 242)
  doc.setDrawColor(...outcomeColor)
  doc.roundedRect(40, 170, 515.28, 42, 6, 6, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text(`Module: ${activeModule.module_name}`, 55, 192)

  doc.setFontSize(13)
  doc.setTextColor(...outcomeColor)
  doc.text(
    `Final Score: ${activeModule.module_final_score.toFixed(2)} / 20.00  [${isPassed ? 'PASSED / VALIDE' : 'RETAKE / AJOURNE'}]`,
    310,
    192
  )

  // 4. Station Breakdown Table
  const stationRows = activeModule.stations.map((st) => [
    `Station #${st.station_number}`,
    st.station_title,
    `${st.weightage_percentage}%`,
    `${st.station_max_points} pts`,
    `${st.deductions_points < 0 ? st.deductions_points.toFixed(1) : '0.0'} pts`,
    `${st.net_station_raw_score.toFixed(2)} pts`,
    `${st.station_contribution.toFixed(2)} / ${st.station_max_contribution.toFixed(2)}`,
  ])

  runAutoTable({
    startY: 222,
    head: [
      [
        'Station',
        'Title',
        'Weight',
        'Max Scale',
        'Deductions',
        'Net Raw Score',
        'Contribution (/20)',
      ],
    ],
    body: stationRows,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 160 },
      2: { cellWidth: 45, halign: 'center' },
      3: { cellWidth: 50, halign: 'right' },
      4: { cellWidth: 55, halign: 'right' },
      5: { cellWidth: 65, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 85, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 40, right: 40 },
  })

  let currentY = (doc as any).lastAutoTable.finalY + 18

  // 5. Itemized Question Evaluations
  const allQuestionRows: any[] = []
  activeModule.stations.forEach((st) => {
    st.answers.forEach((q, idx) => {
      allQuestionRows.push([
        `St. #${st.station_number}`,
        `Q${idx + 1}: ${q.question_text}`,
        q.question_type,
        `${Number(q.points_awarded || 0).toFixed(1)} / ${Number(q.max_scale_value || 10).toFixed(1)} pts`,
      ])
    })
  })

  if (allQuestionRows.length > 0) {
    if (currentY > 660) {
      doc.addPage()
      currentY = 45
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...primaryColor)
    doc.text('Granular Checklist & Question Item Performance:', 40, currentY)
    currentY += 8

    runAutoTable({
      startY: currentY,
      head: [['Station', 'Question Item / Criterion', 'Format', 'Points Awarded']],
      body: allQuestionRows,
      theme: 'striped',
      headStyles: {
        fillColor: [71, 85, 105], // Slate 600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 3.5,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 320 },
        2: { cellWidth: 60, halign: 'center' },
        3: { cellWidth: 80, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 40, right: 40 },
    })

    currentY = (doc as any).lastAutoTable.finalY + 18
  }

  // 6. Clinical Deductions & Penalties Log (if any)
  const allPenaltyRows: any[] = []
  activeModule.stations.forEach((st) => {
    st.penalties.forEach((p) => {
      allPenaltyRows.push([
        `St. #${st.station_number}`,
        p.reason,
        p.matched_criteria_title || 'Protocol Guideline',
        `${Number(p.points).toFixed(1)} pts`,
      ])
    })
  })

  if (allPenaltyRows.length > 0) {
    if (currentY > 680) {
      doc.addPage()
      currentY = 45
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...roseColor)
    doc.text('Recorded Clinical Protocol Infractions & Deductions:', 40, currentY)
    currentY += 8

    runAutoTable({
      startY: currentY,
      head: [['Station', 'Infraction Reason', 'Clinical Protocol / Criteria', 'Deduction']],
      body: allPenaltyRows,
      theme: 'striped',
      headStyles: {
        fillColor: roseColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 3.5,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 230 },
        2: { cellWidth: 150 },
        3: { cellWidth: 80, halign: 'right', fontStyle: 'bold', textColor: roseColor },
      },
      margin: { left: 40, right: 40 },
    })

    currentY = (doc as any).lastAutoTable.finalY + 18
  }

  // 7. Verification Stamp & Footer
  if (currentY > 740) {
    doc.addPage()
    currentY = 50
  }

  doc.setDrawColor(226, 232, 240)
  doc.line(40, 790, 555.28, 790)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184) // Slate 400
  doc.text(
    'This electronic academic document was generated via NEW ERA ECOS Assessment Suite. Certified examination record.',
    40,
    805
  )
  doc.text(
    `Verification Hash: ${student.id.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
    400,
    805
  )

  // Save PDF
  const defaultFilename = `OSCE_Transcript_${student.matricule}_${student.last_name || 'Student'}.pdf`
  doc.save(filename || defaultFilename)
}

/**
 * Generates and downloads a clean, multi-sheet formatted Excel workbook
 */
export function exportStudentTranscriptToExcel(
  studentOrData: StudentResultsDashboardData | StudentResultsDashboardData['student'],
  moduleOrFilename?: ModuleResultsGroup | string,
  maybeFilename?: string
) {
  let student: StudentResultsDashboardData['student']
  let activeModule: ModuleResultsGroup
  let filename: string | undefined

  if ('student' in studentOrData && 'modules' in studentOrData) {
    student = studentOrData.student
    activeModule =
      (typeof moduleOrFilename === 'object' ? moduleOrFilename : null) ||
      studentOrData.modules[0]
    filename = typeof moduleOrFilename === 'string' ? moduleOrFilename : maybeFilename
  } else {
    student = studentOrData as StudentResultsDashboardData['student']
    activeModule = moduleOrFilename as ModuleResultsGroup
    filename = maybeFilename
  }

  if (!activeModule) {
    throw new Error('No module examination data available to generate Excel workbook.')
  }

  const xlsx = (XLSX as any)?.utils ? XLSX : (XLSX as any)?.default || XLSX
  const wb = xlsx.utils.book_new()

  // Sheet 1: Student & Module Summary
  const summaryData = [
    ['NEW ERA ECOS - OFFICIAL OSCE ACADEMIC TRANSCRIPT', ''],
    ['Generated Date', new Date().toLocaleString()],
    ['', ''],
    ['Candidate Information', ''],
    ['Matricule', student.matricule],
    ['Full Name', student.full_name || `${student.first_name} ${student.last_name}`],
    ['Academic Year', student.academic_year_label || 'Current Session'],
    ['Study Level', student.level_name || 'Medical Curriculum'],
    ['Section / Cohort', `${student.section_name || 'Section A'} • Group ${student.group_name || '1'}`],
    ['', ''],
    ['Module Evaluation Summary', ''],
    ['Module Name', activeModule.module_name],
    ['Session Type', activeModule.session_type.toUpperCase()],
    ['Final Score (/20)', Number(activeModule.module_final_score.toFixed(2))],
    ['Academic Outcome', activeModule.is_passed ? 'PASSED / VALIDE' : 'RETAKE / AJOURNE'],
    ['Stations Evaluated', activeModule.stations.length],
  ]

  const wsSummary = xlsx.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 45 }]
  xlsx.utils.book_append_sheet(wb, wsSummary, 'Transcript Summary')

  // Sheet 2: Station Breakdown
  const stationHeaders = [
    'Station Number',
    'Station Title',
    'Weightage (%)',
    'Max Points',
    'Deductions Points',
    'Net Raw Score',
    'Max Contribution (/20)',
    'Actual Contribution (/20)',
  ]

  const stationRows = activeModule.stations.map((st) => [
    st.station_number,
    st.station_title,
    st.weightage_percentage,
    st.station_max_points,
    st.deductions_points,
    Number(st.net_station_raw_score.toFixed(2)),
    Number(st.station_max_contribution.toFixed(2)),
    Number(st.station_contribution.toFixed(2)),
  ])

  const wsStations = xlsx.utils.aoa_to_sheet([stationHeaders, ...stationRows])
  wsStations['!cols'] = [
    { wch: 15 },
    { wch: 40 },
    { wch: 15 },
    { wch: 12 },
    { wch: 18 },
    { wch: 15 },
    { wch: 22 },
    { wch: 22 },
  ]
  xlsx.utils.book_append_sheet(wb, wsStations, 'Stations Breakdown')

  // Sheet 3: Granular Question Scoring Checklist
  const questionHeaders = [
    'Station Number',
    'Station Title',
    'Question Number',
    'Question Text',
    'Question Format',
    'Points Awarded',
    'Max Scale',
  ]

  const questionRows: any[] = []
  activeModule.stations.forEach((st) => {
    st.answers.forEach((q, idx) => {
      questionRows.push([
        st.station_number,
        st.station_title,
        idx + 1,
        q.question_text,
        q.question_type,
        Number(q.points_awarded || 0),
        Number(q.max_scale_value || 10),
      ])
    })
  })

  const wsQuestions = xlsx.utils.aoa_to_sheet([questionHeaders, ...questionRows])
  wsQuestions['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 15 },
    { wch: 55 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
  ]
  xlsx.utils.book_append_sheet(wb, wsQuestions, 'Question Scoring')

  // Sheet 4: Clinical Deductions Log
  const penaltyHeaders = [
    'Station Number',
    'Station Title',
    'Infraction Reason',
    'Clinical Protocol / Criteria',
    'Deduction Points',
  ]

  const penaltyRows: any[] = []
  activeModule.stations.forEach((st) => {
    st.penalties.forEach((p) => {
      penaltyRows.push([
        st.station_number,
        st.station_title,
        p.reason,
        p.matched_criteria_title || 'Protocol Guideline',
        Number(p.points),
      ])
    })
  })

  if (penaltyRows.length > 0) {
    const wsPenalties = xlsx.utils.aoa_to_sheet([penaltyHeaders, ...penaltyRows])
    wsPenalties['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 45 },
      { wch: 30 },
      { wch: 18 },
    ]
    xlsx.utils.book_append_sheet(wb, wsPenalties, 'Clinical Deductions')
  }

  // Save Workbook
  const defaultFilename = `OSCE_Transcript_${student.matricule}_${student.last_name || 'Student'}.xlsx`
  xlsx.writeFile(wb, filename || defaultFilename)
}
