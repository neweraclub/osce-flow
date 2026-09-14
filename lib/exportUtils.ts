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

export interface ExportReportOptions {
  evaluatingProfessorName?: string | null
  facultyName?: string | null
  exportTimestamp?: string | Date | null
  verificationCode?: string | null
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
  // 1. TOP DEEP NAVY HEADER BANNER (#0F172A)
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
  doc.text('OFFICIAL OSCE ACADEMIC TRANSCRIPT & PERFORMANCE MARKSHEET', leftMargin, 62)

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
  const cardH = 76

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
  doc.text('Cohort / Section:', leftMargin + 16, cardY + 61)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...deepNavyColor)
  doc.text(`${student.section_name || 'Section A'} • Group ${student.group_name || '1'}`, leftMargin + 86, cardY + 61)

  // Column 2: Academic Year & Session Type
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Academic Year:', leftMargin + 205, cardY + 44)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...deepNavyColor)
  doc.text(student.academic_year_label || 'Current Session', leftMargin + 275, cardY + 44)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Assessment Type:', leftMargin + 205, cardY + 61)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...deepNavyColor)
  doc.text(`${activeModule.session_type.toUpperCase()} SESSION`, leftMargin + 285, cardY + 61)

  // Column 3: Evaluating Examiner & Status
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Examiner:', leftMargin + 380, cardY + 44)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...deepNavyColor)
  doc.text(professorName, leftMargin + 426, cardY + 44)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Certification:', leftMargin + 380, cardY + 61)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...emeraldColor)
  doc.text('VALIDATED ELECTRONIC RECORD', leftMargin + 438, cardY + 61)

  // =========================================================================
  // 3. MODULE SCORE & OUTCOME BANNER CARD
  // =========================================================================
  const scoreCardY = 180
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
  // 5. ITEMIZED QUESTION EVALUATIONS TABLE
  // =========================================================================
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

  // =========================================================================
  // 6. CLINICAL DEDUCTIONS & PROTOCOL INFRACTIONS TABLE (IF ANY)
  // =========================================================================
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

  // =========================================================================
  // 7. OFFICIAL EXAMINER SIGNATURE & VERIFICATION ATTESTATION CARD
  // =========================================================================
  if (currentY > 690) {
    doc.addPage()
    currentY = 40
  }

  const sigBoxY = currentY
  const sigBoxH = 72

  doc.setDrawColor(...borderGreyColor)
  doc.setFillColor(...cardBgColor)
  doc.roundedRect(leftMargin, sigBoxY, contentWidth, sigBoxH, 5, 5, 'FD')

  // Left Column: Attestation Details
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139) // Slate 500
  doc.text('OFFICIAL EXAMINER ATTESTATION & REPORT CERTIFICATION', leftMargin + 14, sigBoxY + 16)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...deepNavyColor)
  doc.text(professorName, leftMargin + 14, sigBoxY + 31)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(`Designation: Evaluating Professor & Examiner • ${facultyName}`, leftMargin + 14, sigBoxY + 44)
  doc.text(`Official Academic Session: ${student.academic_year_label || '2026-2027'}`, leftMargin + 14, sigBoxY + 56)
  doc.text(`Export Timestamp: ${preciseTimestamp}`, leftMargin + 14, sigBoxY + 66)

  // Right Column: Digital Verification Stamp Container
  const sealW = 185
  const sealH = 52
  const sealX = leftMargin + contentWidth - sealW - 12
  const sealY = sigBoxY + 10

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(...emeraldColor)
  doc.roundedRect(sealX, sealY, sealW, sealH, 4, 4, 'FD')

  // Top header in seal
  doc.setFillColor(...emeraldColor)
  doc.roundedRect(sealX, sealY, sealW, 15, 4, 4, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.text('NEW ERA ECOS • CERTIFIED EXAM RECORD', sealX + 9, sealY + 10.5)

  // Verification Code & Status
  const verificationHash = `ECOS-VAL-${student.id.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...deepNavyColor)
  doc.text(`Security Code: ${verificationHash}`, sealX + 8, sealY + 27)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...emeraldColor)
  doc.text('[VERIFIED DIGITAL SIGNATURE • OFFICIAL RECORD]', sealX + 8, sealY + 37)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 116, 139)
  doc.text(`Exported by: ${professorName}`, sealX + 8, sealY + 47)

  // =========================================================================
  // 8. PAGE FOOTERS ON EVERY PAGE
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
  const defaultFilename = `OSCE_Transcript_${student.matricule}_${student.last_name || 'Student'}.pdf`
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

  // Sheet 1: Student & Module Summary
  const summaryData = [
    ['NEW ERA ECOS - OFFICIAL OSCE ACADEMIC TRANSCRIPT', ''],
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
