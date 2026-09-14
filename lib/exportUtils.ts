import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  StudentResultsDashboardData,
  ModuleResultsGroup,
  EvaluatedStationBreakdown,
} from '@/app/actions/studentResults'

export type StudentTranscriptData = StudentResultsDashboardData
export type { StudentResultsDashboardData, ModuleResultsGroup, EvaluatedStationBreakdown }

export interface ExportReportOptions {
  evaluatingProfessorName?: string | null
  facultyName?: string | null
  exportTimestamp?: string | Date | null
  verificationCode?: string | null
  granularity?: 'general' | 'detailed'
}

export interface BulkExportReportOptions extends ExportReportOptions {
  cohortName?: string | null
  sectionName?: string | null
  groupName?: string | null
  moduleName?: string | null
  totalStudentsCount?: number
  evaluatedStudentsCount?: number
  averageScore?: number
  passRate?: number
}

/**
 * Formats a date into exact hours, minutes, and seconds: DD/MM/YYYY at HH:MM:SS
 */
export function formatPreciseTimestamp(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const validDate = isNaN(d.getTime()) ? new Date() : d
  const pad = (n: number) => n.toString().padStart(2, '0')
  const day = pad(validDate.getDate())
  const month = pad(validDate.getMonth() + 1)
  const year = validDate.getFullYear()
  const hours = pad(validDate.getHours())
  const minutes = pad(validDate.getMinutes())
  const seconds = pad(validDate.getSeconds())
  return `${day}/${month}/${year} at ${hours}:${minutes}:${seconds}`
}

/**
 * Generates and downloads a clean, professional, enterprise-grade PDF academic marksheet
 * Styled precisely to match New Era Ecos platform branding:
 * Deep Slate/Navy (#0F172A), crisp borders (#E2E8F0), card containers (#F8FAFC),
 * and vibrant emerald accent badges (#059669).
 * 
 * Supports both:
 * - 'general': High-level final scores, module status, and stations performance summary.
 * - 'detailed': Full station breakdowns, itemized question rubrics, and clinical protocol infractions.
 */
export function exportStudentTranscriptToPDF(
  studentOrData: StudentResultsDashboardData | StudentResultsDashboardData['student'],
  moduleOrFilename?: ModuleResultsGroup | string,
  maybeFilenameOrOptions?: string | ExportReportOptions,
  maybeOptions?: ExportReportOptions
) {
  let student: StudentResultsDashboardData['student']
  let activeModule: ModuleResultsGroup
  let filename: string | undefined
  let options: ExportReportOptions = {}

  if ('student' in studentOrData && 'modules' in studentOrData) {
    student = studentOrData.student
    activeModule =
      (typeof moduleOrFilename === 'object' ? moduleOrFilename : null) ||
      studentOrData.modules[0]
    if (typeof moduleOrFilename === 'string') {
      filename = moduleOrFilename
    } else if (typeof maybeFilenameOrOptions === 'string') {
      filename = maybeFilenameOrOptions
    }
  } else {
    student = studentOrData as StudentResultsDashboardData['student']
    activeModule = moduleOrFilename as ModuleResultsGroup
    if (typeof maybeFilenameOrOptions === 'string') {
      filename = maybeFilenameOrOptions
    }
  }

  if (typeof maybeFilenameOrOptions === 'object' && maybeFilenameOrOptions !== null) {
    options = maybeFilenameOrOptions
  } else if (typeof maybeOptions === 'object' && maybeOptions !== null) {
    options = maybeOptions
  }

  if (!activeModule) {
    throw new Error('No module examination data available to generate PDF marksheet.')
  }

  const granularity = options.granularity || 'detailed'

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

  const runAutoTable = (tableOptions: any) => {
    if (typeof autoTable === 'function') {
      autoTable(doc, tableOptions)
    } else if (typeof (autoTable as any)?.default === 'function') {
      ;(autoTable as any).default(doc, tableOptions)
    } else if (typeof (doc as any).autoTable === 'function') {
      ;(doc as any).autoTable(tableOptions)
    }
  }

  // Brand Palette Definitions matching web platform
  const deepNavyColor: [number, number, number] = [15, 23, 42] // #0F172A - Primary brand navy
  const emeraldColor: [number, number, number] = [5, 150, 105] // #059669 - Vibrant brand emerald
  const emeraldLightColor: [number, number, number] = [236, 253, 245] // #ECFDF5 - Emerald 50
  const roseColor: [number, number, number] = [225, 29, 72] // #E11D48 - Retake / Deduction Rose
  const roseLightColor: [number, number, number] = [255, 241, 242] // #FFF1F2 - Rose 50
  const borderGreyColor: [number, number, number] = [226, 232, 240] // #E2E8F0 - Crisp container border
  const cardBgColor: [number, number, number] = [248, 250, 252] // #F8FAFC - Container background

  // Dynamic Metadata
  const professorName = (options.evaluatingProfessorName || 'Prof. Evaluating Examiner').trim()
  const facultyName = (options.facultyName || 'Faculty of Medicine').trim()
  const preciseTimestamp = options.exportTimestamp
    ? typeof options.exportTimestamp === 'string'
      ? options.exportTimestamp
      : formatPreciseTimestamp(options.exportTimestamp)
    : formatPreciseTimestamp()

  const pageWidth = 595.28
  const leftMargin = 36
  const contentWidth = pageWidth - leftMargin * 2 // 523.28 pt

  // =========================================================================
  // 1. TOP DEEP NAVY HEADER BANNER (#0F172A) - CLEAN & STREAMLINED BRANDING
  // =========================================================================
  const bannerHeight = 82
  doc.setFillColor(...deepNavyColor)
  doc.rect(0, 0, pageWidth, bannerHeight, 'F')

  // Vibrant Emerald Accent Strip (#059669) along bottom edge of header
  doc.setFillColor(...emeraldColor)
  doc.rect(0, bannerHeight - 2.5, pageWidth, 2.5, 'F')

  // Platform Brand: "NEW ERA" in white + "ECOS" in vibrant emerald
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('NEW ERA', leftMargin, 31)
  doc.setTextColor(16, 185, 129) // Emerald 500
  doc.text('ECOS', leftMargin + 82, 31)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(203, 213, 225) // Slate 300
  doc.text('CLINICAL EXAMINATION ASSESSMENT SUITE', leftMargin, 45)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(255, 255, 255)
  doc.text(
    granularity === 'detailed'
      ? 'OFFICIAL OSCE ACADEMIC TRANSCRIPT • DETAILED BREAKDOWN'
      : 'OFFICIAL OSCE ACADEMIC TRANSCRIPT • GENERAL SUMMARY',
    leftMargin,
    62
  )

  // Header Right Metadata: Evaluating Professor & Precise Timestamp (HH:MM:SS)
  const rightMetaX = 350
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184) // Slate 400
  doc.text('EVALUATING EXAMINER:', rightMetaX, 29)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(16, 185, 129) // Emerald
  doc.text(professorName, rightMetaX + 105, 29)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text('FACULTY WORKSPACE:', rightMetaX, 44)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(facultyName, rightMetaX + 105, 44)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  doc.text('EXACT TIMESTAMP:', rightMetaX, 59)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(preciseTimestamp, rightMetaX + 105, 59)

  // =========================================================================
  // 2. CANDIDATE IDENTIFICATION CORPORATE CARD (#F8FAFC with #E2E8F0 border)
  // =========================================================================
  const cardY = 94
  const cardH = 72

  doc.setDrawColor(...borderGreyColor)
  doc.setFillColor(...cardBgColor)
  doc.roundedRect(leftMargin, cardY, contentWidth, cardH, 5, 5, 'FD')

  // Vibrant Emerald Left Edge Indicator (#059669)
  doc.setFillColor(...emeraldColor)
  doc.roundedRect(leftMargin, cardY, 4, cardH, 2, 2, 'F')

  // Candidate Full Name (Slate 900)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...deepNavyColor)
  const candidateFullName = (student.full_name || `${student.first_name} ${student.last_name}`).toUpperCase()
  doc.text(candidateFullName, leftMargin + 16, cardY + 20)

  // Matricule ID Badge Container
  const matriculeText = `MATRICULE: ${student.matricule}`
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  const matBadgeW = doc.getTextWidth(matriculeText) + 14
  const matBadgeX = leftMargin + contentWidth - matBadgeW - 14

  doc.setFillColor(226, 232, 240)
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(matBadgeX, cardY + 9, matBadgeW, 16, 3, 3, 'FD')
  doc.setTextColor(30, 41, 59)
  doc.text(matriculeText, matBadgeX + 7, cardY + 20)

  // Subtle interior divider line
  doc.setDrawColor(...borderGreyColor)
  doc.line(leftMargin + 16, cardY + 29, leftMargin + contentWidth - 14, cardY + 29)

  // 3-Column Structured Information Grid
  doc.setFontSize(8)

  // Column 1: Academic Level & Cohort
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Academic Level:', leftMargin + 16, cardY + 44)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...deepNavyColor)
  doc.text(student.level_name || 'Medical Curriculum', leftMargin + 86, cardY + 44)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Cohort / Section:', leftMargin + 16, cardY + 59)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...deepNavyColor)
  doc.text(`${student.section_name || 'Section A'} • Group ${student.group_name || '1'}`, leftMargin + 86, cardY + 59)

  // Column 2: Academic Year & Session Type
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Academic Year:', leftMargin + 205, cardY + 44)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...deepNavyColor)
  doc.text(student.academic_year_label || 'Current Session', leftMargin + 275, cardY + 44)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Assessment Type:', leftMargin + 205, cardY + 59)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...deepNavyColor)
  doc.text(`${activeModule.session_type.toUpperCase()} SESSION`, leftMargin + 285, cardY + 59)

  // Column 3: Evaluating Examiner & Report Scope
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Examiner:', leftMargin + 380, cardY + 44)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...deepNavyColor)
  doc.text(professorName, leftMargin + 426, cardY + 44)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Report Mode:', leftMargin + 380, cardY + 59)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...emeraldColor)
  doc.text(granularity === 'detailed' ? 'ITEMIZED BREAKDOWN' : 'EXECUTIVE SUMMARY', leftMargin + 440, cardY + 59)

  // =========================================================================
  // 3. MODULE SCORE & OUTCOME BANNER CARD
  // =========================================================================
  const scoreCardY = 176
  const scoreCardH = 46
  const isPassed = activeModule.is_passed
  const outcomeColor: [number, number, number] = isPassed ? emeraldColor : roseColor
  const outcomeBgColor: [number, number, number] = isPassed ? emeraldLightColor : roseLightColor

  doc.setDrawColor(...outcomeColor)
  doc.setFillColor(...outcomeBgColor)
  doc.roundedRect(leftMargin, scoreCardY, contentWidth, scoreCardH, 5, 5, 'FD')

  // Left Module Title & Meta
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(
    `CLINICAL OSCE MODULE • ${activeModule.session_type.toUpperCase()} EXAMINATION`,
    leftMargin + 16,
    scoreCardY + 16
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...deepNavyColor)
  doc.text(activeModule.module_name, leftMargin + 16, scoreCardY + 33)

  // Right Final Score & Outcome Badge
  const scoreText = `Final Score: ${activeModule.module_final_score.toFixed(2)} / 20.00 pts`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...outcomeColor)
  doc.text(scoreText, leftMargin + 270, scoreCardY + 28)

  // Vibrant Outcome Badge Container (#059669 for passed, #E11D48 for retake)
  const badgeLabel = isPassed ? 'PASSED / VALIDE' : 'RETAKE / AJOURNE'
  doc.setFontSize(8.5)
  const badgeWidth = doc.getTextWidth(badgeLabel) + 16
  const badgeX = leftMargin + contentWidth - badgeWidth - 14

  doc.setFillColor(...outcomeColor)
  doc.roundedRect(badgeX, scoreCardY + 13, badgeWidth, 20, 4, 4, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text(badgeLabel, badgeX + 8, scoreCardY + 26)

  // =========================================================================
  // 4. STATION BREAKDOWN TABLE (#0F172A Head, #E2E8F0 Grid Borders)
  // =========================================================================
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
    startY: scoreCardY + scoreCardH + 14,
    head: [
      [
        'Station',
        'Station Title',
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
      fillColor: deepNavyColor, // #0F172A
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    styles: {
      fontSize: 8,
      cellPadding: 4.5,
      textColor: [51, 65, 85],
      lineColor: borderGreyColor, // #E2E8F0
      lineWidth: 0.5,
    },
    alternateRowStyles: {
      fillColor: cardBgColor, // #F8FAFC
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 165 },
      2: { cellWidth: 45, halign: 'center' },
      3: { cellWidth: 50, halign: 'right' },
      4: { cellWidth: 55, halign: 'right' },
      5: { cellWidth: 65, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 88, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: leftMargin, right: leftMargin },
  })

  let currentY = (doc as any).lastAutoTable.finalY + 16

  // =========================================================================
  // 5. DETAILED SECTIONS: ONLY RENDERED IN DETAILED BREAKDOWN MODE
  // =========================================================================
  if (granularity === 'detailed') {
    // 5A. ITEMIZED QUESTION EVALUATIONS TABLE
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
      if (currentY > 640) {
        doc.addPage()
        currentY = 40
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...deepNavyColor)
      doc.text('Granular Checklist & Itemized Examination Scoring Rubrics:', leftMargin, currentY)
      currentY += 8

      runAutoTable({
        startY: currentY,
        head: [['Station', 'Evaluation Checklist Item / Question', 'Format', 'Points Awarded']],
        body: allQuestionRows,
        theme: 'striped',
        headStyles: {
          fillColor: [51, 65, 85], // Slate 700
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 3.5,
          textColor: [51, 65, 85],
          lineColor: borderGreyColor,
          lineWidth: 0.5,
        },
        alternateRowStyles: {
          fillColor: cardBgColor,
        },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: 'bold' },
          1: { cellWidth: 325 },
          2: { cellWidth: 60, halign: 'center' },
          3: { cellWidth: 83, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: leftMargin, right: leftMargin },
      })

      currentY = (doc as any).lastAutoTable.finalY + 16
    }

    // 5B. CLINICAL DEDUCTIONS & PROTOCOL INFRACTIONS TABLE (IF ANY)
    const allPenaltyRows: any[] = []
    activeModule.stations.forEach((st) => {
      st.penalties.forEach((p) => {
        allPenaltyRows.push([
          `St. #${st.station_number}`,
          p.reason,
          p.matched_criteria_title || 'Clinical Protocol Guideline',
          `-${Number(p.points).toFixed(1)} pts`,
        ])
      })
    })

    if (allPenaltyRows.length > 0) {
      if (currentY > 660) {
        doc.addPage()
        currentY = 40
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...roseColor)
      doc.text('Recorded Clinical Protocol Infractions & Score Deductions:', leftMargin, currentY)
      currentY += 8

      runAutoTable({
        startY: currentY,
        head: [['Station', 'Infraction Reason', 'Clinical Protocol / Criteria', 'Deduction']],
        body: allPenaltyRows,
        theme: 'striped',
        headStyles: {
          fillColor: roseColor, // Rose 600
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 3.5,
          textColor: [51, 65, 85],
          lineColor: borderGreyColor,
          lineWidth: 0.5,
        },
        alternateRowStyles: {
          fillColor: roseLightColor,
        },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: 'bold' },
          1: { cellWidth: 235 },
          2: { cellWidth: 150 },
          3: { cellWidth: 83, halign: 'right', fontStyle: 'bold', textColor: roseColor },
        },
        margin: { left: leftMargin, right: leftMargin },
      })

      currentY = (doc as any).lastAutoTable.finalY + 16
    }
  }

  // =========================================================================
  // 6. PAGE FOOTERS ON EVERY PAGE - CLEAN & STREAMLINED
  // =========================================================================
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)

    // Divider line at y=810
    doc.setDrawColor(...borderGreyColor)
    doc.line(leftMargin, 810, leftMargin + contentWidth, 810)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184) // Slate 400
    doc.text(
      `NEW ERA ECOS Assessment Suite • Official OSCE Marksheet • Exported by: ${professorName} (${preciseTimestamp})`,
      leftMargin,
      823
    )
    doc.text(
      `Page ${p} of ${totalPages}`,
      leftMargin + contentWidth,
      823,
      { align: 'right' }
    )
  }

  // Save PDF
  const defaultFilename = `OSCE_Transcript_${student.matricule}_${student.last_name || 'Student'}_${granularity}.pdf`
  doc.save(filename || defaultFilename)
}

/**
 * Generates and downloads a clean, multi-sheet formatted Excel workbook
 * Upgraded with dynamic professor name and exact timestamp metadata
 */
export function exportStudentTranscriptToExcel(
  studentOrData: StudentResultsDashboardData | StudentResultsDashboardData['student'],
  moduleOrFilename?: ModuleResultsGroup | string,
  maybeFilenameOrOptions?: string | ExportReportOptions,
  maybeOptions?: ExportReportOptions
) {
  let student: StudentResultsDashboardData['student']
  let activeModule: ModuleResultsGroup
  let filename: string | undefined
  let options: ExportReportOptions = {}

  if ('student' in studentOrData && 'modules' in studentOrData) {
    student = studentOrData.student
    activeModule =
      (typeof moduleOrFilename === 'object' ? moduleOrFilename : null) ||
      studentOrData.modules[0]
    if (typeof moduleOrFilename === 'string') {
      filename = moduleOrFilename
    } else if (typeof maybeFilenameOrOptions === 'string') {
      filename = maybeFilenameOrOptions
    }
  } else {
    student = studentOrData as StudentResultsDashboardData['student']
    activeModule = moduleOrFilename as ModuleResultsGroup
    if (typeof maybeFilenameOrOptions === 'string') {
      filename = maybeFilenameOrOptions
    }
  }

  if (typeof maybeFilenameOrOptions === 'object' && maybeFilenameOrOptions !== null) {
    options = maybeFilenameOrOptions
  } else if (typeof maybeOptions === 'object' && maybeOptions !== null) {
    options = maybeOptions
  }

  if (!activeModule) {
    throw new Error('No module examination data available to generate Excel workbook.')
  }

  const professorName = (options.evaluatingProfessorName || 'Prof. Evaluating Examiner').trim()
  const facultyName = (options.facultyName || 'Faculty of Medicine').trim()
  const preciseTimestamp = options.exportTimestamp
    ? typeof options.exportTimestamp === 'string'
      ? options.exportTimestamp
      : formatPreciseTimestamp(options.exportTimestamp)
    : formatPreciseTimestamp()

  const xlsx = (XLSX as any)?.utils ? XLSX : (XLSX as any)?.default || XLSX
  const wb = xlsx.utils.book_new()

  const granularity = options.granularity || 'detailed'

  // Sheet 1: Student & Module Summary
  const summaryData = [
    ['NEW ERA ECOS - OFFICIAL OSCE ACADEMIC TRANSCRIPT', ''],
    ['Report Granularity', granularity === 'detailed' ? 'Detailed Breakdown (Rubrics & Deductions)' : 'General Summary (Scores & Stations)'],
    ['Exported Date & Time (HH:MM:SS)', preciseTimestamp],
    ['Evaluating Professor / Examiner', professorName],
    ['Faculty Designation', facultyName],
    ['Official Assessment Platform', 'NEW ERA ECOS Assessment Suite'],
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
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 48 }]
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

  // Detailed Sheets: Only added if granularity is 'detailed'
  if (granularity === 'detailed') {
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
  }

  // Save Workbook
  const defaultFilename = `OSCE_Transcript_${student.matricule}_${student.last_name || 'Student'}_${granularity}.xlsx`
  xlsx.writeFile(wb, filename || defaultFilename)
}

/**
 * Generates and downloads a bulk PDF marksheet for an entire cohort, section, or selected student group.
 * 
 * Supports:
 * - 'general': Cohort Performance Master Gradebook with KPI cards and student rows table.
 * - 'detailed': Consolidated marksheet book rendering each student's complete marksheet.
 */
export function exportBulkStudentsToPDF(
  students: any[],
  transcripts: StudentTranscriptData[] | null = null,
  options: BulkExportReportOptions = {}
) {
  if (!students || students.length === 0) {
    throw new Error('No candidate records provided for bulk export.')
  }

  const granularity = options.granularity || 'general'
  const professorName = (options.evaluatingProfessorName || 'Prof. Evaluating Examiner').trim()
  const facultyName = (options.facultyName || 'Faculty of Medicine').trim()
  const preciseTimestamp = options.exportTimestamp
    ? typeof options.exportTimestamp === 'string'
      ? options.exportTimestamp
      : formatPreciseTimestamp(options.exportTimestamp)
    : formatPreciseTimestamp()

  const DocConstructor: any =
    typeof jsPDF === 'function'
      ? jsPDF
      : (jsPDF as any)?.jsPDF || (jsPDF as any)?.default || (window as any)?.jspdf?.jsPDF

  const doc = new DocConstructor({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  const runAutoTable = (tableOptions: any) => {
    if (typeof autoTable === 'function') {
      autoTable(doc, tableOptions)
    } else if (typeof (autoTable as any)?.default === 'function') {
      ;(autoTable as any).default(doc, tableOptions)
    } else if (typeof (doc as any).autoTable === 'function') {
      ;(doc as any).autoTable(tableOptions)
    }
  }

  const deepNavyColor: [number, number, number] = [15, 23, 42] // #0F172A
  const emeraldColor: [number, number, number] = [5, 150, 105] // #059669
  const emeraldLightColor: [number, number, number] = [236, 253, 245]
  const roseColor: [number, number, number] = [225, 29, 72] // #E11D48
  const roseLightColor: [number, number, number] = [255, 241, 242]
  const borderGreyColor: [number, number, number] = [226, 232, 240] // #E2E8F0
  const cardBgColor: [number, number, number] = [248, 250, 252] // #F8FAFC

  const pageWidth = 595.28
  const leftMargin = 36
  const contentWidth = pageWidth - leftMargin * 2 // 523.28 pt

  // =========================================================================
  // CASE 1: GENERAL SUMMARY MODE (Cohort Performance Master Gradebook)
  // =========================================================================
  if (granularity === 'general' || !transcripts || transcripts.length === 0) {
    // 1. TOP HEADER BANNER
    const bannerHeight = 82
    doc.setFillColor(...deepNavyColor)
    doc.rect(0, 0, pageWidth, bannerHeight, 'F')

    doc.setFillColor(...emeraldColor)
    doc.rect(0, bannerHeight - 2.5, pageWidth, 2.5, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(255, 255, 255)
    doc.text('NEW ERA', leftMargin, 31)
    doc.setTextColor(16, 185, 129)
    doc.text('ECOS', leftMargin + 82, 31)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(203, 213, 225)
    doc.text('CLINICAL EXAMINATION ASSESSMENT SUITE', leftMargin, 45)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(255, 255, 255)
    doc.text('COHORT PERFORMANCE MASTER GRADEBOOK & GENERAL SUMMARY', leftMargin, 62)

    const rightMetaX = 350
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text('EVALUATING EXAMINER:', rightMetaX, 29)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(16, 185, 129)
    doc.text(professorName, rightMetaX + 105, 29)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text('FACULTY WORKSPACE:', rightMetaX, 44)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(facultyName, rightMetaX + 105, 44)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text('EXACT TIMESTAMP:', rightMetaX, 59)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(preciseTimestamp, rightMetaX + 105, 59)

    // 2. EXECUTIVE COHORT KPI CARD
    const cardY = 94
    const cardH = 58
    doc.setDrawColor(...borderGreyColor)
    doc.setFillColor(...cardBgColor)
    doc.roundedRect(leftMargin, cardY, contentWidth, cardH, 5, 5, 'FD')

    doc.setFillColor(...emeraldColor)
    doc.roundedRect(leftMargin, cardY, 4, cardH, 2, 2, 'F')

    // Cohort Scope Title
    const scopeTitle = [
      options.cohortName || options.moduleName || 'Faculty Candidate Cohort',
      options.sectionName ? `Section: ${options.sectionName}` : null,
      options.groupName ? `Group: ${options.groupName}` : null,
    ]
      .filter(Boolean)
      .join(' • ')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...deepNavyColor)
    doc.text(scopeTitle, leftMargin + 14, cardY + 20)

    // KPI Metrics calculation
    const totalCount = options.totalStudentsCount ?? students.length
    const evaluatedList = students.filter((s) => (s.evaluated_stations_count ?? 0) > 0)
    const evaluatedCount = options.evaluatedStudentsCount ?? evaluatedList.length
    const passCount = evaluatedList.filter((s) => (s.final_score ?? 0) >= 10.0).length
    const avgScore =
      options.averageScore ??
      (evaluatedList.length > 0
        ? evaluatedList.reduce((sum, s) => sum + (s.final_score || 0), 0) / evaluatedList.length
        : 0)
    const passRate =
      options.passRate ??
      (evaluatedList.length > 0 ? Math.round((passCount / evaluatedList.length) * 100) : 0)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Total Candidates:', leftMargin + 14, cardY + 38)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...deepNavyColor)
    doc.text(String(totalCount), leftMargin + 85, cardY + 38)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Evaluated:', leftMargin + 130, cardY + 38)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...deepNavyColor)
    doc.text(String(evaluatedCount), leftMargin + 175, cardY + 38)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Mean Score:', leftMargin + 230, cardY + 38)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...emeraldColor)
    doc.text(`${avgScore.toFixed(2)} / 20 pts`, leftMargin + 285, cardY + 38)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Passing Rate:', leftMargin + 375, cardY + 38)
    doc.setFont('helvetica', 'bold')
    const passRateColor: [number, number, number] = passRate >= 50 ? emeraldColor : roseColor
    doc.setTextColor(...passRateColor)
    doc.text(`${passRate}%`, leftMargin + 435, cardY + 38)

    // 3. MASTER GRADEBOOK TABLE
    const gradebookRows = students.map((st, idx) => {
      const hasScore = st.final_score !== null && st.final_score !== undefined
      const scoreStr = hasScore ? `${Number(st.final_score).toFixed(2)} / 20` : 'Pending'
      const statusStr =
        st.status === 'passed'
          ? 'PASSED'
          : st.status === 'failed'
          ? 'RETAKE'
          : st.status === 'in_progress'
          ? 'IN PROGRESS'
          : 'PENDING'

      const cohortStr = `${st.section_name || ''} ${st.group_name ? '• ' + st.group_name : ''}`.trim() || 'General'
      const stationStr = `${st.evaluated_stations_count ?? 0} / ${st.total_stations_count || '–'}`

      return [
        String(idx + 1),
        st.matricule || '–',
        st.full_name || `${st.first_name || ''} ${st.last_name || ''}`.trim(),
        cohortStr,
        stationStr,
        scoreStr,
        statusStr,
      ]
    })

    runAutoTable({
      startY: cardY + cardH + 14,
      head: [
        ['#', 'Matricule', 'Candidate Full Name', 'Cohort / Group', 'Stations', 'Final Score', 'Standing'],
      ],
      body: gradebookRows,
      theme: 'grid',
      headStyles: {
        fillColor: deepNavyColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 4,
        textColor: [51, 65, 85],
        lineColor: borderGreyColor,
        lineWidth: 0.5,
      },
      alternateRowStyles: {
        fillColor: cardBgColor,
      },
      columnStyles: {
        0: { cellWidth: 26, halign: 'center' },
        1: { cellWidth: 68, fontStyle: 'bold' },
        2: { cellWidth: 155 },
        3: { cellWidth: 95 },
        4: { cellWidth: 50, halign: 'center' },
        5: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 69, halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 6) {
          const val = data.cell.raw
          if (val === 'PASSED') {
            data.cell.styles.textColor = emeraldColor
          } else if (val === 'RETAKE') {
            data.cell.styles.textColor = roseColor
          }
        }
      },
      margin: { left: leftMargin, right: leftMargin },
    })
  } else {
    // =========================================================================
    // CASE 2: DETAILED BREAKDOWN MODE (Consolidated Marksheets Book)
    // =========================================================================
    transcripts.forEach((tData, tIdx) => {
      if (tIdx > 0) {
        doc.addPage()
      }

      const student = tData.student
      const activeModule = tData.modules[0]
      if (!activeModule) return

      // Header Banner
      const bannerHeight = 82
      doc.setFillColor(...deepNavyColor)
      doc.rect(0, 0, pageWidth, bannerHeight, 'F')

      doc.setFillColor(...emeraldColor)
      doc.rect(0, bannerHeight - 2.5, pageWidth, 2.5, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(255, 255, 255)
      doc.text('NEW ERA', leftMargin, 31)
      doc.setTextColor(16, 185, 129)
      doc.text('ECOS', leftMargin + 82, 31)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(203, 213, 225)
      doc.text('CLINICAL EXAMINATION ASSESSMENT SUITE', leftMargin, 45)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(255, 255, 255)
      doc.text(
        `CONSOLIDATED MARKSHEET • CANDIDATE ${tIdx + 1} OF ${transcripts.length}`,
        leftMargin,
        62
      )

      const rightMetaX = 350
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text('EVALUATING EXAMINER:', rightMetaX, 29)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(16, 185, 129)
      doc.text(professorName, rightMetaX + 105, 29)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text('FACULTY WORKSPACE:', rightMetaX, 44)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(facultyName, rightMetaX + 105, 44)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text('EXACT TIMESTAMP:', rightMetaX, 59)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(preciseTimestamp, rightMetaX + 105, 59)

      // Candidate Card
      const cardY = 94
      const cardH = 72
      doc.setDrawColor(...borderGreyColor)
      doc.setFillColor(...cardBgColor)
      doc.roundedRect(leftMargin, cardY, contentWidth, cardH, 5, 5, 'FD')

      doc.setFillColor(...emeraldColor)
      doc.roundedRect(leftMargin, cardY, 4, cardH, 2, 2, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...deepNavyColor)
      const candidateFullName = (student.full_name || `${student.first_name} ${student.last_name}`).toUpperCase()
      doc.text(candidateFullName, leftMargin + 16, cardY + 20)

      const matriculeText = `MATRICULE: ${student.matricule}`
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      const matBadgeW = doc.getTextWidth(matriculeText) + 14
      const matBadgeX = leftMargin + contentWidth - matBadgeW - 14

      doc.setFillColor(226, 232, 240)
      doc.setDrawColor(203, 213, 225)
      doc.roundedRect(matBadgeX, cardY + 9, matBadgeW, 16, 3, 3, 'FD')
      doc.setTextColor(30, 41, 59)
      doc.text(matriculeText, matBadgeX + 7, cardY + 20)

      doc.setDrawColor(...borderGreyColor)
      doc.line(leftMargin + 16, cardY + 29, leftMargin + contentWidth - 14, cardY + 29)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('Academic Level:', leftMargin + 16, cardY + 44)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...deepNavyColor)
      doc.text(student.level_name || 'Medical Curriculum', leftMargin + 86, cardY + 44)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('Cohort / Section:', leftMargin + 16, cardY + 59)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...deepNavyColor)
      doc.text(`${student.section_name || 'Section A'} • Group ${student.group_name || '1'}`, leftMargin + 86, cardY + 59)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('Academic Year:', leftMargin + 205, cardY + 44)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...deepNavyColor)
      doc.text(student.academic_year_label || 'Current Session', leftMargin + 275, cardY + 44)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('Assessment Type:', leftMargin + 205, cardY + 59)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...deepNavyColor)
      doc.text(`${activeModule.session_type.toUpperCase()} SESSION`, leftMargin + 285, cardY + 59)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('Examiner:', leftMargin + 380, cardY + 44)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...deepNavyColor)
      doc.text(professorName, leftMargin + 426, cardY + 44)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text('Report Mode:', leftMargin + 380, cardY + 59)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...emeraldColor)
      doc.text('DETAILED BREAKDOWN', leftMargin + 440, cardY + 59)

      // Module Score Banner
      const scoreCardY = 176
      const scoreCardH = 46
      const isPassed = activeModule.is_passed
      const outcomeColor: [number, number, number] = isPassed ? emeraldColor : roseColor
      const outcomeBgColor: [number, number, number] = isPassed ? emeraldLightColor : roseLightColor

      doc.setDrawColor(...outcomeColor)
      doc.setFillColor(...outcomeBgColor)
      doc.roundedRect(leftMargin, scoreCardY, contentWidth, scoreCardH, 5, 5, 'FD')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(100, 116, 139)
      doc.text(
        `CLINICAL OSCE MODULE • ${activeModule.session_type.toUpperCase()} EXAMINATION`,
        leftMargin + 16,
        scoreCardY + 16
      )

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...deepNavyColor)
      doc.text(activeModule.module_name, leftMargin + 16, scoreCardY + 33)

      const scoreText = `Final Score: ${activeModule.module_final_score.toFixed(2)} / 20.00 pts`
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...outcomeColor)
      doc.text(scoreText, leftMargin + 270, scoreCardY + 28)

      const badgeLabel = isPassed ? 'PASSED / VALIDE' : 'RETAKE / AJOURNE'
      doc.setFontSize(8.5)
      const badgeWidth = doc.getTextWidth(badgeLabel) + 16
      const badgeX = leftMargin + contentWidth - badgeWidth - 14

      doc.setFillColor(...outcomeColor)
      doc.roundedRect(badgeX, scoreCardY + 13, badgeWidth, 20, 4, 4, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.text(badgeLabel, badgeX + 8, scoreCardY + 26)

      // Station Breakdown Table
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
        startY: scoreCardY + scoreCardH + 14,
        head: [
          [
            'Station',
            'Station Title',
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
          fillColor: deepNavyColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
          halign: 'left',
        },
        styles: {
          fontSize: 8,
          cellPadding: 4,
          textColor: [51, 65, 85],
          lineColor: borderGreyColor,
          lineWidth: 0.5,
        },
        alternateRowStyles: {
          fillColor: cardBgColor,
        },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: 'bold' },
          1: { cellWidth: 165 },
          2: { cellWidth: 45, halign: 'center' },
          3: { cellWidth: 50, halign: 'right' },
          4: { cellWidth: 55, halign: 'right' },
          5: { cellWidth: 65, halign: 'right', fontStyle: 'bold' },
          6: { cellWidth: 88, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: leftMargin, right: leftMargin },
      })

      let currentY = (doc as any).lastAutoTable.finalY + 16

      // Itemized Question Checklist
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
        if (currentY > 640) {
          doc.addPage()
          currentY = 40
        }

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...deepNavyColor)
        doc.text('Granular Checklist & Itemized Examination Scoring Rubrics:', leftMargin, currentY)
        currentY += 8

        runAutoTable({
          startY: currentY,
          head: [['Station', 'Evaluation Checklist Item / Question', 'Format', 'Points Awarded']],
          body: allQuestionRows,
          theme: 'striped',
          headStyles: {
            fillColor: [51, 65, 85],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
          },
          styles: {
            fontSize: 7.5,
            cellPadding: 3.5,
            textColor: [51, 65, 85],
            lineColor: borderGreyColor,
            lineWidth: 0.5,
          },
          alternateRowStyles: {
            fillColor: cardBgColor,
          },
          columnStyles: {
            0: { cellWidth: 55, fontStyle: 'bold' },
            1: { cellWidth: 325 },
            2: { cellWidth: 60, halign: 'center' },
            3: { cellWidth: 83, halign: 'right', fontStyle: 'bold' },
          },
          margin: { left: leftMargin, right: leftMargin },
        })

        currentY = (doc as any).lastAutoTable.finalY + 16
      }

      // Clinical Deductions
      const allPenaltyRows: any[] = []
      activeModule.stations.forEach((st) => {
        st.penalties.forEach((p) => {
          allPenaltyRows.push([
            `St. #${st.station_number}`,
            p.reason,
            p.matched_criteria_title || 'Clinical Protocol Guideline',
            `-${Number(p.points).toFixed(1)} pts`,
          ])
        })
      })

      if (allPenaltyRows.length > 0) {
        if (currentY > 660) {
          doc.addPage()
          currentY = 40
        }

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...roseColor)
        doc.text('Recorded Clinical Protocol Infractions & Score Deductions:', leftMargin, currentY)
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
            lineColor: borderGreyColor,
            lineWidth: 0.5,
          },
          alternateRowStyles: {
            fillColor: roseLightColor,
          },
          columnStyles: {
            0: { cellWidth: 55, fontStyle: 'bold' },
            1: { cellWidth: 235 },
            2: { cellWidth: 150 },
            3: { cellWidth: 83, halign: 'right', fontStyle: 'bold', textColor: roseColor },
          },
          margin: { left: leftMargin, right: leftMargin },
        })
      }
    })
  }

  // Running Page Footers on all pages
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setDrawColor(...borderGreyColor)
    doc.line(leftMargin, 810, leftMargin + contentWidth, 810)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `NEW ERA ECOS Assessment Suite • ${
        granularity === 'detailed' ? 'Consolidated Detailed Marksheet Book' : 'Cohort Performance Master Gradebook'
      } • Exported by: ${professorName} (${preciseTimestamp})`,
      leftMargin,
      823
    )
    doc.text(`Page ${p} of ${totalPages}`, leftMargin + contentWidth, 823, { align: 'right' })
  }

  const scopeLabel = (options.sectionName || options.cohortName || 'Cohort').replace(/\s+/g, '_')
  const defaultFilename = `OSCE_Bulk_${scopeLabel}_${granularity}.pdf`
  doc.save(defaultFilename)
}

/**
 * Generates and downloads an enterprise-grade Bulk Excel workbook.
 * Supports:
 * - 'general': Master Gradebook roster with candidate metadata, stations, final scores, and statuses.
 * - 'detailed': 4-sheet workbook (Cohort Summary, Stations Breakdown, Question Rubrics, Clinical Deductions).
 */
export function exportBulkStudentsToExcel(
  students: any[],
  transcripts: StudentTranscriptData[] | null = null,
  options: BulkExportReportOptions = {}
) {
  if (!students || students.length === 0) {
    throw new Error('No candidate records provided for bulk export.')
  }

  const granularity = options.granularity || 'general'
  const professorName = (options.evaluatingProfessorName || 'Prof. Evaluating Examiner').trim()
  const facultyName = (options.facultyName || 'Faculty of Medicine').trim()
  const preciseTimestamp = options.exportTimestamp
    ? typeof options.exportTimestamp === 'string'
      ? options.exportTimestamp
      : formatPreciseTimestamp(options.exportTimestamp)
    : formatPreciseTimestamp()

  const xlsx = (XLSX as any)?.utils ? XLSX : (XLSX as any)?.default || XLSX
  const wb = xlsx.utils.book_new()

  // 1. MASTER COHORT GRADEBOOK SHEET
  const evaluatedList = students.filter((s) => (s.evaluated_stations_count ?? 0) > 0)
  const evaluatedCount = options.evaluatedStudentsCount ?? evaluatedList.length
  const passCount = evaluatedList.filter((s) => (s.final_score ?? 0) >= 10.0).length
  const avgScore =
    options.averageScore ??
    (evaluatedList.length > 0
      ? evaluatedList.reduce((sum, s) => sum + (s.final_score || 0), 0) / evaluatedList.length
      : 0)
  const passRate =
    options.passRate ??
    (evaluatedList.length > 0 ? Math.round((passCount / evaluatedList.length) * 100) : 0)

  const metaData = [
    ['NEW ERA ECOS - COHORT PERFORMANCE MASTER GRADEBOOK', ''],
    ['Export Granularity', granularity === 'detailed' ? 'Detailed Breakdown' : 'General Summary'],
    ['Export Timestamp (HH:MM:SS)', preciseTimestamp],
    ['Evaluating Professor / Examiner', professorName],
    ['Faculty Designation', facultyName],
    ['Academic Scope', options.sectionName ? `Section: ${options.sectionName}` : options.cohortName || 'Entire Cohort'],
    ['Total Candidates', students.length],
    ['Evaluated Candidates', evaluatedCount],
    ['Cohort Mean Score (/20)', Number(avgScore.toFixed(2))],
    ['Cohort Pass Rate (%)', `${passRate}%`],
    ['', ''],
  ]

  const tableHeaders = [
    '#',
    'Matricule',
    'Candidate Full Name',
    'Academic Level',
    'Section',
    'Group',
    'Academic Year',
    'Stations Evaluated',
    'Total Stations',
    'Final Score (/20)',
    'Academic Standing',
  ]

  const tableRows = students.map((st, idx) => [
    idx + 1,
    st.matricule || '–',
    st.full_name || `${st.first_name || ''} ${st.last_name || ''}`.trim(),
    st.level_name || 'Medical Level',
    st.section_name || '–',
    st.group_name || '–',
    st.academic_year_label || 'Current Session',
    st.evaluated_stations_count ?? 0,
    st.total_stations_count || '–',
    st.final_score !== null && st.final_score !== undefined ? Number(Number(st.final_score).toFixed(2)) : 'Pending',
    st.status === 'passed' ? 'PASSED' : st.status === 'failed' ? 'RETAKE' : st.status ? st.status.toUpperCase() : 'PENDING',
  ])

  const wsMaster = xlsx.utils.aoa_to_sheet([...metaData, tableHeaders, ...tableRows])
  wsMaster['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 15 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 15 },
    { wch: 18 },
    { wch: 20 },
  ]
  xlsx.utils.book_append_sheet(wb, wsMaster, 'Cohort Master Gradebook')

  // Detailed Sheets (if transcripts available & granularity is 'detailed')
  if (granularity === 'detailed' && transcripts && transcripts.length > 0) {
    // Sheet 2: Stations Breakdown
    const stationHeaders = [
      'Matricule',
      'Candidate Name',
      'Module Name',
      'Station #',
      'Station Title',
      'Weightage (%)',
      'Max Points',
      'Deductions Points',
      'Net Raw Score',
      'Max Contribution (/20)',
      'Actual Contribution (/20)',
    ]

    const stationRows: any[] = []
    transcripts.forEach((t) => {
      const studentName = t.student.full_name || `${t.student.first_name} ${t.student.last_name}`
      t.modules.forEach((mod) => {
        mod.stations.forEach((st) => {
          stationRows.push([
            t.student.matricule,
            studentName,
            mod.module_name,
            st.station_number,
            st.station_title,
            st.weightage_percentage,
            st.station_max_points,
            st.deductions_points,
            Number(st.net_station_raw_score.toFixed(2)),
            Number(st.station_max_contribution.toFixed(2)),
            Number(st.station_contribution.toFixed(2)),
          ])
        })
      })
    })

    const wsStations = xlsx.utils.aoa_to_sheet([stationHeaders, ...stationRows])
    wsStations['!cols'] = [
      { wch: 16 },
      { wch: 26 },
      { wch: 26 },
      { wch: 12 },
      { wch: 32 },
      { wch: 15 },
      { wch: 12 },
      { wch: 16 },
      { wch: 15 },
      { wch: 22 },
      { wch: 22 },
    ]
    xlsx.utils.book_append_sheet(wb, wsStations, 'Stations Breakdown')

    // Sheet 3: Question Rubrics
    const questionHeaders = [
      'Matricule',
      'Candidate Name',
      'Station #',
      'Station Title',
      'Question #',
      'Question Text',
      'Question Format',
      'Points Awarded',
      'Max Scale',
    ]

    const questionRows: any[] = []
    transcripts.forEach((t) => {
      const studentName = t.student.full_name || `${t.student.first_name} ${t.student.last_name}`
      t.modules.forEach((mod) => {
        mod.stations.forEach((st) => {
          st.answers.forEach((q, qIdx) => {
            questionRows.push([
              t.student.matricule,
              studentName,
              st.station_number,
              st.station_title,
              qIdx + 1,
              q.question_text,
              q.question_type,
              Number(q.points_awarded || 0),
              Number(q.max_scale_value || 10),
            ])
          })
        })
      })
    })

    const wsQuestions = xlsx.utils.aoa_to_sheet([questionHeaders, ...questionRows])
    wsQuestions['!cols'] = [
      { wch: 16 },
      { wch: 26 },
      { wch: 12 },
      { wch: 28 },
      { wch: 12 },
      { wch: 48 },
      { wch: 16 },
      { wch: 15 },
      { wch: 12 },
    ]
    xlsx.utils.book_append_sheet(wb, wsQuestions, 'Question Rubrics')

    // Sheet 4: Clinical Deductions
    const penaltyHeaders = [
      'Matricule',
      'Candidate Name',
      'Station #',
      'Station Title',
      'Infraction Reason',
      'Clinical Protocol / Criteria',
      'Deduction Points',
    ]

    const penaltyRows: any[] = []
    transcripts.forEach((t) => {
      const studentName = t.student.full_name || `${t.student.first_name} ${t.student.last_name}`
      t.modules.forEach((mod) => {
        mod.stations.forEach((st) => {
          st.penalties.forEach((p) => {
            penaltyRows.push([
              t.student.matricule,
              studentName,
              st.station_number,
              st.station_title,
              p.reason,
              p.matched_criteria_title || 'Protocol Guideline',
              Number(p.points),
            ])
          })
        })
      })
    })

    if (penaltyRows.length > 0) {
      const wsPenalties = xlsx.utils.aoa_to_sheet([penaltyHeaders, ...penaltyRows])
      wsPenalties['!cols'] = [
        { wch: 16 },
        { wch: 26 },
        { wch: 12 },
        { wch: 28 },
        { wch: 42 },
        { wch: 30 },
        { wch: 18 },
      ]
      xlsx.utils.book_append_sheet(wb, wsPenalties, 'Clinical Deductions')
    }
  }

  const scopeLabel = (options.sectionName || options.cohortName || 'Cohort').replace(/\s+/g, '_')
  const defaultFilename = `OSCE_Bulk_${scopeLabel}_${granularity}.xlsx`
  xlsx.writeFile(wb, defaultFilename)
}
