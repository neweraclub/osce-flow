import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'
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

// ============================================================================
// EXCELJS ENTERPRISE DESIGN SYSTEM & BRANDING HELPERS
// ============================================================================
const EXCEL_PALETTE = {
  fontFamily: 'Segoe UI',
  colors: {
    navyDark: 'FF0F172A',      // #0F172A - Solid dark navy table headers & brand banner
    navyAccent: 'FF1E293B',    // #1E293B - Secondary navy
    emerald: 'FF059669',       // #059669 - Vibrant emerald accent
    emeraldLight: 'FFF0FDF4',  // #F0FDF4 - Subtle emerald fill for pass badges/callouts
    emeraldBorder: 'FF86EFAC', // #86EFAC - Emerald border
    emeraldText: 'FF15803D',   // #15803D - Emerald bold text
    rose: 'FFE11D48',          // #E11D48 - Retake / Deduction Rose
    roseLight: 'FFFFF1F2',     // #FFF1F2 - Subtle rose fill for retake badges
    roseBorder: 'FFFECDD3',    // #FECDD3 - Rose border
    roseText: 'FFBE123C',      // #BE123C - Rose bold text
    border: 'FFE2E8F0',        // #E2E8F0 - Thin, light gray cell border
    cardBg: 'FFF8FAFC',        // #F8FAFC - Styled metadata card tint & alternating rows
    white: 'FFFFFFFF',         // #FFFFFF - White
    textDark: 'FF0F172A',      // #0F172A - Dark slate text
    textBody: 'FF334155',      // #334155 - Standard body cell text
    textMuted: 'FF64748B',     // #64748B - Label text
  },
}

const thinCellBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: EXCEL_PALETTE.colors.border } },
  left: { style: 'thin', color: { argb: EXCEL_PALETTE.colors.border } },
  bottom: { style: 'thin', color: { argb: EXCEL_PALETTE.colors.border } },
  right: { style: 'thin', color: { argb: EXCEL_PALETTE.colors.border } },
}

function getColumnLetter(colIndex: number): string {
  let temp = ''
  let letter = ''
  while (colIndex > 0) {
    temp = String.fromCharCode(((colIndex - 1) % 26) + 65)
    letter = temp + letter
    colIndex = Math.floor((colIndex - 1) / 26)
  }
  return letter
}

async function saveExcelWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
  }
}

function autoFitWorksheetColumns(
  ws: ExcelJS.Worksheet,
  explicitWidths?: Record<number, number>,
  minWidth = 14,
  maxWidth = 75
) {
  ws.columns.forEach((column, colIndex) => {
    const colNum = colIndex + 1
    if (explicitWidths && explicitWidths[colNum]) {
      column.width = explicitWidths[colNum]
      return
    }
    let maxLen = 0
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const rowNum = Number(cell.row)
      if (rowNum <= 3) return
      if (rowNum < 10 && String(cell.value || '').length > 35) return
      const cellVal = cell.value != null ? String(cell.value) : ''
      if (cellVal.length > maxLen) {
        maxLen = cellVal.length
      }
    })
    column.width = Math.min(Math.max(maxLen + 4, minWidth), maxWidth)
  })
}

function applyHeaderRowStyles(
  ws: ExcelJS.Worksheet,
  rowNum: number,
  headers: { label: string; alignment?: 'left' | 'center' | 'right' }[]
) {
  const row = ws.getRow(rowNum)
  row.height = 28
  headers.forEach((h, idx) => {
    const colLetter = getColumnLetter(idx + 1)
    const cell = ws.getCell(`${colLetter}${rowNum}`)
    cell.value = h.label
    cell.font = {
      name: EXCEL_PALETTE.fontFamily,
      size: 10,
      bold: true,
      color: { argb: EXCEL_PALETTE.colors.white },
    }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_PALETTE.colors.navyDark },
    }
    cell.border = thinCellBorder
    cell.alignment = {
      vertical: 'middle',
      horizontal: h.alignment || 'left',
      wrapText: true,
    }
  })
}

function applyStatusBadgeCell(cell: ExcelJS.Cell, statusText: string) {
  const upper = (statusText || '').toUpperCase()
  cell.alignment = { vertical: 'middle', horizontal: 'center' }
  if (upper.includes('PASS') || upper.includes('VALIDE')) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_PALETTE.colors.emeraldLight },
    }
    cell.font = {
      name: EXCEL_PALETTE.fontFamily,
      size: 9.5,
      bold: true,
      color: { argb: EXCEL_PALETTE.colors.emeraldText },
    }
    cell.border = {
      top: { style: 'thin', color: { argb: EXCEL_PALETTE.colors.emeraldBorder } },
      left: { style: 'thin', color: { argb: EXCEL_PALETTE.colors.emeraldBorder } },
      bottom: { style: 'thin', color: { argb: EXCEL_PALETTE.colors.emeraldBorder } },
      right: { style: 'thin', color: { argb: EXCEL_PALETTE.colors.emeraldBorder } },
    }
  } else if (upper.includes('RETAKE') || upper.includes('FAIL') || upper.includes('AJOURNE')) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_PALETTE.colors.roseLight },
    }
    cell.font = {
      name: EXCEL_PALETTE.fontFamily,
      size: 9.5,
      bold: true,
      color: { argb: EXCEL_PALETTE.colors.roseText },
    }
    cell.border = {
      top: { style: 'thin', color: { argb: EXCEL_PALETTE.colors.roseBorder } },
      left: { style: 'thin', color: { argb: EXCEL_PALETTE.colors.roseBorder } },
      bottom: { style: 'thin', color: { argb: EXCEL_PALETTE.colors.roseBorder } },
      right: { style: 'thin', color: { argb: EXCEL_PALETTE.colors.roseBorder } },
    }
  } else {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_PALETTE.colors.cardBg },
    }
    cell.font = {
      name: EXCEL_PALETTE.fontFamily,
      size: 9.5,
      bold: true,
      color: { argb: EXCEL_PALETTE.colors.textMuted },
    }
    cell.border = thinCellBorder
  }
}

/**
 * Generates and downloads an enterprise-styled multi-sheet Excel workbook matching the New Era Ecos aesthetic.
 * Upgraded with solid navy headers, subtle emerald accents, light gray borders (#E2E8F0), Segoe UI typography,
 * and auto-fitted columns.
 */
export async function exportStudentTranscriptToExcel(
  studentOrData: StudentResultsDashboardData | StudentResultsDashboardData['student'],
  moduleOrFilename?: ModuleResultsGroup | string,
  maybeFilenameOrOptions?: string | ExportReportOptions,
  maybeOptions?: ExportReportOptions
): Promise<void> {
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

  const granularity = options.granularity || 'detailed'

  const wb = new ExcelJS.Workbook()
  wb.creator = 'NEW ERA ECOS Assessment Suite'
  wb.lastModifiedBy = professorName
  wb.created = new Date()
  wb.modified = new Date()

  // =========================================================================
  // SHEET 1: TRANSCRIPT SUMMARY
  // =========================================================================
  const wsSummary = wb.addWorksheet('Transcript Summary', { views: [{ showGridLines: true }] })

  // Row 1: Brand Header Banner
  wsSummary.mergeCells('A1:H1')
  const banner1 = wsSummary.getCell('A1')
  banner1.value = '  NEW ERA ECOS • OFFICIAL CLINICAL OSCE ACADEMIC TRANSCRIPT'
  banner1.font = { name: EXCEL_PALETTE.fontFamily, size: 13, bold: true, color: { argb: EXCEL_PALETTE.colors.white } }
  banner1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.navyDark } }
  banner1.alignment = { vertical: 'middle', horizontal: 'left' }
  wsSummary.getRow(1).height = 34

  // Row 2: Emerald Accent Line
  wsSummary.mergeCells('A2:H2')
  wsSummary.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.emerald } }
  wsSummary.getRow(2).height = 4.5
  wsSummary.getRow(3).height = 8

  // Rows 4-7: Structured Metadata Card Block
  const metaPairs = [
    { l1: 'Export Timestamp (HH:MM:SS)', v1: preciseTimestamp, l2: 'Candidate Full Name', v2: student.full_name || `${student.first_name} ${student.last_name}` },
    { l1: 'Evaluating Professor', v1: professorName, l2: 'Matricule Identification', v2: student.matricule },
    { l1: 'Faculty / Institution', v1: facultyName, l2: 'Academic Year & Level', v2: `${student.academic_year_label || 'Current Session'} • ${student.level_name || 'Medical Level'}` },
    { l1: 'Report Granularity', v1: granularity === 'detailed' ? 'Detailed Breakdown (Rubrics & Deductions)' : 'General Summary (Scores & Stations)', l2: 'Section & Tutorial Group', v2: `${student.section_name || 'Section A'} • Group ${student.group_name || '1'}` },
  ]

  metaPairs.forEach((item, idx) => {
    const rowNum = 4 + idx
    const row = wsSummary.getRow(rowNum)
    row.height = 22

    // Col A: Label 1
    const cellA = wsSummary.getCell(`A${rowNum}`)
    cellA.value = item.l1
    cellA.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textMuted } }
    cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.cardBg } }
    cellA.border = thinCellBorder
    cellA.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

    // Col B: Value 1
    wsSummary.mergeCells(`B${rowNum}:C${rowNum}`)
    const cellB = wsSummary.getCell(`B${rowNum}`)
    cellB.value = item.v1
    cellB.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textDark } }
    cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.white } }
    cellB.border = thinCellBorder
    cellB.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    wsSummary.getCell(`C${rowNum}`).border = thinCellBorder

    // Col D: Label 2
    wsSummary.mergeCells(`D${rowNum}:E${rowNum}`)
    const cellD = wsSummary.getCell(`D${rowNum}`)
    cellD.value = item.l2
    cellD.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textMuted } }
    cellD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.cardBg } }
    cellD.border = thinCellBorder
    cellD.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    wsSummary.getCell(`E${rowNum}`).border = thinCellBorder

    // Col F: Value 2
    wsSummary.mergeCells(`F${rowNum}:H${rowNum}`)
    const cellF = wsSummary.getCell(`F${rowNum}`)
    cellF.value = item.v2
    cellF.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textDark } }
    cellF.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.white } }
    cellF.border = thinCellBorder
    cellF.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    wsSummary.getCell(`G${rowNum}`).border = thinCellBorder
    wsSummary.getCell(`H${rowNum}`).border = thinCellBorder
  })

  // Row 8: Spacer
  wsSummary.getRow(8).height = 8

  // Row 9: Module KPI Callout Bar
  const kpiRow = wsSummary.getRow(9)
  kpiRow.height = 28

  wsSummary.mergeCells('A9:C9')
  const kpiMod = wsSummary.getCell('A9')
  kpiMod.value = `Module: ${activeModule.module_name} (${activeModule.session_type.toUpperCase()})`
  kpiMod.font = { name: EXCEL_PALETTE.fontFamily, size: 10, bold: true, color: { argb: EXCEL_PALETTE.colors.navyDark } }
  kpiMod.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.cardBg } }
  kpiMod.border = thinCellBorder
  kpiMod.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  wsSummary.getCell('B9').border = thinCellBorder
  wsSummary.getCell('C9').border = thinCellBorder

  wsSummary.mergeCells('D9:E9')
  const kpiStat = wsSummary.getCell('D9')
  kpiStat.value = `Stations Evaluated: ${activeModule.stations.length}`
  kpiStat.font = { name: EXCEL_PALETTE.fontFamily, size: 10, bold: true, color: { argb: EXCEL_PALETTE.colors.navyDark } }
  kpiStat.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.cardBg } }
  kpiStat.border = thinCellBorder
  kpiStat.alignment = { vertical: 'middle', horizontal: 'center' }
  wsSummary.getCell('E9').border = thinCellBorder

  wsSummary.mergeCells('F9:G9')
  const kpiScore = wsSummary.getCell('F9')
  kpiScore.value = `Final Score: ${activeModule.module_final_score.toFixed(2)} / 20.00 pts`
  kpiScore.font = {
    name: EXCEL_PALETTE.fontFamily,
    size: 10,
    bold: true,
    color: { argb: activeModule.is_passed ? EXCEL_PALETTE.colors.emeraldText : EXCEL_PALETTE.colors.roseText },
  }
  kpiScore.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: activeModule.is_passed ? EXCEL_PALETTE.colors.emeraldLight : EXCEL_PALETTE.colors.roseLight },
  }
  kpiScore.border = thinCellBorder
  kpiScore.alignment = { vertical: 'middle', horizontal: 'center' }
  wsSummary.getCell('G9').border = thinCellBorder

  const kpiBadge = wsSummary.getCell('H9')
  kpiBadge.value = activeModule.is_passed ? 'PASSED / VALIDE' : 'RETAKE / AJOURNE'
  applyStatusBadgeCell(kpiBadge, activeModule.is_passed ? 'PASSED' : 'RETAKE')

  // Row 10: Spacer
  wsSummary.getRow(10).height = 10

  // Row 11: Table Headers
  const summaryTableHeaders = [
    { label: 'Station #', alignment: 'center' as const },
    { label: 'Station Title', alignment: 'left' as const },
    { label: 'Weightage (%)', alignment: 'right' as const },
    { label: 'Max Points', alignment: 'right' as const },
    { label: 'Deductions Points', alignment: 'right' as const },
    { label: 'Net Raw Score', alignment: 'right' as const },
    { label: 'Max Contribution (/20)', alignment: 'right' as const },
    { label: 'Actual Contribution (/20)', alignment: 'right' as const },
  ]
  applyHeaderRowStyles(wsSummary, 11, summaryTableHeaders)

  // Data Rows (Starting at 12)
  let currentSummaryRow = 12
  activeModule.stations.forEach((st, idx) => {
    const row = wsSummary.getRow(currentSummaryRow)
    row.height = 22
    const isEven = idx % 2 === 0
    const rowFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: isEven ? EXCEL_PALETTE.colors.white : EXCEL_PALETTE.colors.cardBg } }

    const cellVals = [
      { col: 'A', val: st.station_number, align: 'center' as const },
      { col: 'B', val: st.station_title, align: 'left' as const },
      { col: 'C', val: `${st.weightage_percentage}%`, align: 'right' as const },
      { col: 'D', val: st.station_max_points, align: 'right' as const },
      { col: 'E', val: st.deductions_points, align: 'right' as const },
      { col: 'F', val: Number(st.net_station_raw_score.toFixed(2)), align: 'right' as const },
      { col: 'G', val: Number(st.station_max_contribution.toFixed(2)), align: 'right' as const },
      { col: 'H', val: Number(st.station_contribution.toFixed(2)), align: 'right' as const },
    ]

    cellVals.forEach(({ col, val, align }) => {
      const cell = wsSummary.getCell(`${col}${currentSummaryRow}`)
      cell.value = val
      cell.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, color: { argb: EXCEL_PALETTE.colors.textBody } }
      cell.fill = rowFill
      cell.border = thinCellBorder
      cell.alignment = { vertical: 'middle', horizontal: align }
    })

    currentSummaryRow++
  })

  // Total Summary Footer Row
  const totalRow = wsSummary.getRow(currentSummaryRow)
  totalRow.height = 26
  wsSummary.mergeCells(`A${currentSummaryRow}:F${currentSummaryRow}`)
  const totalLabelCell = wsSummary.getCell(`A${currentSummaryRow}`)
  totalLabelCell.value = 'Total Module Contribution:'
  totalLabelCell.font = { name: EXCEL_PALETTE.fontFamily, size: 10, bold: true, color: { argb: EXCEL_PALETTE.colors.navyDark } }
  totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.cardBg } }
  totalLabelCell.border = thinCellBorder
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 }

  ;['B', 'C', 'D', 'E', 'F'].forEach((col) => {
    wsSummary.getCell(`${col}${currentSummaryRow}`).border = thinCellBorder
  })

  const totalMaxCell = wsSummary.getCell(`G${currentSummaryRow}`)
  totalMaxCell.value = 20.0
  totalMaxCell.font = { name: EXCEL_PALETTE.fontFamily, size: 10, bold: true, color: { argb: EXCEL_PALETTE.colors.navyDark } }
  totalMaxCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.cardBg } }
  totalMaxCell.border = thinCellBorder
  totalMaxCell.alignment = { vertical: 'middle', horizontal: 'right' }

  const totalActualCell = wsSummary.getCell(`H${currentSummaryRow}`)
  totalActualCell.value = Number(activeModule.module_final_score.toFixed(2))
  totalActualCell.font = {
    name: EXCEL_PALETTE.fontFamily,
    size: 10.5,
    bold: true,
    color: { argb: activeModule.is_passed ? EXCEL_PALETTE.colors.emeraldText : EXCEL_PALETTE.colors.roseText },
  }
  totalActualCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: activeModule.is_passed ? EXCEL_PALETTE.colors.emeraldLight : EXCEL_PALETTE.colors.roseLight },
  }
  totalActualCell.border = thinCellBorder
  totalActualCell.alignment = { vertical: 'middle', horizontal: 'right' }

  autoFitWorksheetColumns(wsSummary, { 1: 14, 2: 38, 3: 16, 4: 14, 5: 18, 6: 16, 7: 24, 8: 24 })

  // =========================================================================
  // SHEET 2: STATIONS BREAKDOWN
  // =========================================================================
  const wsStations = wb.addWorksheet('Stations Breakdown', { views: [{ showGridLines: true }] })

  wsStations.mergeCells('A1:H1')
  const banner2 = wsStations.getCell('A1')
  banner2.value = '  NEW ERA ECOS • CLINICAL STATIONS PERFORMANCE BREAKDOWN'
  banner2.font = { name: EXCEL_PALETTE.fontFamily, size: 13, bold: true, color: { argb: EXCEL_PALETTE.colors.white } }
  banner2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.navyDark } }
  banner2.alignment = { vertical: 'middle', horizontal: 'left' }
  wsStations.getRow(1).height = 34

  wsStations.mergeCells('A2:H2')
  wsStations.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.emerald } }
  wsStations.getRow(2).height = 4.5
  wsStations.getRow(3).height = 8

  // Small Candidate Info Header on Sheet 2
  const metaMini = [
    { l1: 'Candidate Name', v1: student.full_name || `${student.first_name} ${student.last_name}`, l2: 'Matricule', v2: student.matricule },
    { l1: 'Clinical Module', v1: activeModule.module_name, l2: 'Export Timestamp', v2: preciseTimestamp },
  ]
  metaMini.forEach((m, idx) => {
    const rNum = 4 + idx
    wsStations.getRow(rNum).height = 22

    const cA = wsStations.getCell(`A${rNum}`)
    cA.value = m.l1
    cA.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textMuted } }
    cA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.cardBg } }
    cA.border = thinCellBorder
    cA.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

    wsStations.mergeCells(`B${rNum}:C${rNum}`)
    const cB = wsStations.getCell(`B${rNum}`)
    cB.value = m.v1
    cB.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textDark } }
    cB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.white } }
    cB.border = thinCellBorder
    cB.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    wsStations.getCell(`C${rNum}`).border = thinCellBorder

    const cD = wsStations.getCell(`D${rNum}`)
    cD.value = m.l2
    cD.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textMuted } }
    cD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.cardBg } }
    cD.border = thinCellBorder
    cD.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

    wsStations.mergeCells(`E${rNum}:H${rNum}`)
    const cE = wsStations.getCell(`E${rNum}`)
    cE.value = m.v2
    cE.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textDark } }
    cE.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.white } }
    cE.border = thinCellBorder
    cE.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ;['F', 'G', 'H'].forEach((col) => wsStations.getCell(`${col}${rNum}`).border = thinCellBorder)
  })

  wsStations.getRow(6).height = 10
  applyHeaderRowStyles(wsStations, 7, summaryTableHeaders)

  let stRow = 8
  activeModule.stations.forEach((st, idx) => {
    const row = wsStations.getRow(stRow)
    row.height = 22
    const isEven = idx % 2 === 0
    const rowFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: isEven ? EXCEL_PALETTE.colors.white : EXCEL_PALETTE.colors.cardBg } }

    const cellVals = [
      { col: 'A', val: st.station_number, align: 'center' as const },
      { col: 'B', val: st.station_title, align: 'left' as const },
      { col: 'C', val: `${st.weightage_percentage}%`, align: 'right' as const },
      { col: 'D', val: st.station_max_points, align: 'right' as const },
      { col: 'E', val: st.deductions_points, align: 'right' as const },
      { col: 'F', val: Number(st.net_station_raw_score.toFixed(2)), align: 'right' as const },
      { col: 'G', val: Number(st.station_max_contribution.toFixed(2)), align: 'right' as const },
      { col: 'H', val: Number(st.station_contribution.toFixed(2)), align: 'right' as const },
    ]

    cellVals.forEach(({ col, val, align }) => {
      const cell = wsStations.getCell(`${col}${stRow}`)
      cell.value = val
      cell.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, color: { argb: EXCEL_PALETTE.colors.textBody } }
      cell.fill = rowFill
      cell.border = thinCellBorder
      cell.alignment = { vertical: 'middle', horizontal: align }
    })
    stRow++
  })

  autoFitWorksheetColumns(wsStations, { 1: 14, 2: 38, 3: 16, 4: 14, 5: 18, 6: 16, 7: 24, 8: 24 })

  // =========================================================================
  // DETAILED SHEETS: QUESTION SCORING & CLINICAL DEDUCTIONS
  // =========================================================================
  if (granularity === 'detailed') {
    // Sheet 3: Granular Question Scoring
    const wsQuestions = wb.addWorksheet('Question Scoring', { views: [{ showGridLines: true }] })

    wsQuestions.mergeCells('A1:G1')
    const banner3 = wsQuestions.getCell('A1')
    banner3.value = '  NEW ERA ECOS • GRANULAR QUESTION SCORING & RUBRICS'
    banner3.font = { name: EXCEL_PALETTE.fontFamily, size: 13, bold: true, color: { argb: EXCEL_PALETTE.colors.white } }
    banner3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.navyDark } }
    banner3.alignment = { vertical: 'middle', horizontal: 'left' }
    wsQuestions.getRow(1).height = 34

    wsQuestions.mergeCells('A2:G2')
    wsQuestions.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.emerald } }
    wsQuestions.getRow(2).height = 4.5
    wsQuestions.getRow(3).height = 8

    // Mini metadata block
    metaMini.forEach((m, idx) => {
      const rNum = 4 + idx
      wsQuestions.getRow(rNum).height = 22

      const cA = wsQuestions.getCell(`A${rNum}`)
      cA.value = m.l1
      cA.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textMuted } }
      cA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.cardBg } }
      cA.border = thinCellBorder
      cA.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

      wsQuestions.mergeCells(`B${rNum}:C${rNum}`)
      const cB = wsQuestions.getCell(`B${rNum}`)
      cB.value = m.v1
      cB.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textDark } }
      cB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.white } }
      cB.border = thinCellBorder
      cB.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      wsQuestions.getCell(`C${rNum}`).border = thinCellBorder

      const cD = wsQuestions.getCell(`D${rNum}`)
      cD.value = m.l2
      cD.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textMuted } }
      cD.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.cardBg } }
      cD.border = thinCellBorder
      cD.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

      wsQuestions.mergeCells(`E${rNum}:G${rNum}`)
      const cE = wsQuestions.getCell(`E${rNum}`)
      cE.value = m.v2
      cE.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textDark } }
      cE.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.white } }
      cE.border = thinCellBorder
      cE.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      ;['F', 'G'].forEach((col) => wsQuestions.getCell(`${col}${rNum}`).border = thinCellBorder)
    })

    wsQuestions.getRow(6).height = 10

    const questionHeaders = [
      { label: 'Station #', alignment: 'center' as const },
      { label: 'Station Title', alignment: 'left' as const },
      { label: 'Question #', alignment: 'center' as const },
      { label: 'Question Item Description', alignment: 'left' as const },
      { label: 'Format', alignment: 'center' as const },
      { label: 'Points Awarded', alignment: 'right' as const },
      { label: 'Max Scale', alignment: 'right' as const },
    ]
    applyHeaderRowStyles(wsQuestions, 7, questionHeaders)

    let qRowIdx = 8
    let questionCounter = 0
    activeModule.stations.forEach((st) => {
      st.answers.forEach((q, idx) => {
        const row = wsQuestions.getRow(qRowIdx)
        row.height = 24
        const isEven = questionCounter % 2 === 0
        const rowFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: isEven ? EXCEL_PALETTE.colors.white : EXCEL_PALETTE.colors.cardBg } }

        const qCells = [
          { col: 'A', val: st.station_number, align: 'center' as const },
          { col: 'B', val: st.station_title, align: 'left' as const },
          { col: 'C', val: idx + 1, align: 'center' as const },
          { col: 'D', val: q.question_text, align: 'left' as const },
          { col: 'E', val: q.question_type, align: 'center' as const },
          { col: 'F', val: Number(q.points_awarded || 0), align: 'right' as const },
          { col: 'G', val: Number(q.max_scale_value || 10), align: 'right' as const },
        ]

        qCells.forEach(({ col, val, align }) => {
          const cell = wsQuestions.getCell(`${col}${qRowIdx}`)
          cell.value = val
          cell.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, color: { argb: EXCEL_PALETTE.colors.textBody } }
          cell.fill = rowFill
          cell.border = thinCellBorder
          cell.alignment = { vertical: 'middle', horizontal: align, wrapText: col === 'D' }
        })

        questionCounter++
        qRowIdx++
      })
    })

    autoFitWorksheetColumns(wsQuestions, { 1: 14, 2: 32, 3: 14, 4: 55, 5: 16, 6: 18, 7: 15 })

    // Sheet 4: Clinical Deductions Log (if any penalties exist)
    const totalPenalties = activeModule.stations.reduce((sum, st) => sum + st.penalties.length, 0)
    if (totalPenalties > 0) {
      const wsPenalties = wb.addWorksheet('Clinical Deductions', { views: [{ showGridLines: true }] })

      wsPenalties.mergeCells('A1:E1')
      const banner4 = wsPenalties.getCell('A1')
      banner4.value = '  NEW ERA ECOS • CLINICAL PROTOCOL INFRACTIONS & DEDUCTIONS'
      banner4.font = { name: EXCEL_PALETTE.fontFamily, size: 13, bold: true, color: { argb: EXCEL_PALETTE.colors.white } }
      banner4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.navyDark } }
      banner4.alignment = { vertical: 'middle', horizontal: 'left' }
      wsPenalties.getRow(1).height = 34

      wsPenalties.mergeCells('A2:E2')
      wsPenalties.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.rose } }
      wsPenalties.getRow(2).height = 4.5
      wsPenalties.getRow(3).height = 8

      const penaltyHeaders = [
        { label: 'Station #', alignment: 'center' as const },
        { label: 'Station Title', alignment: 'left' as const },
        { label: 'Infraction Reason', alignment: 'left' as const },
        { label: 'Clinical Protocol / Criteria', alignment: 'left' as const },
        { label: 'Deduction Points', alignment: 'right' as const },
      ]
      applyHeaderRowStyles(wsPenalties, 4, penaltyHeaders)

      let pRowIdx = 5
      let pCounter = 0
      activeModule.stations.forEach((st) => {
        st.penalties.forEach((p) => {
          const row = wsPenalties.getRow(pRowIdx)
          row.height = 24
          const isEven = pCounter % 2 === 0
          const rowFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: isEven ? EXCEL_PALETTE.colors.white : EXCEL_PALETTE.colors.cardBg } }

          const pCells = [
            { col: 'A', val: st.station_number, align: 'center' as const, isRose: false },
            { col: 'B', val: st.station_title, align: 'left' as const, isRose: false },
            { col: 'C', val: p.reason, align: 'left' as const, isRose: false },
            { col: 'D', val: p.matched_criteria_title || 'Protocol Guideline', align: 'left' as const, isRose: false },
            { col: 'E', val: Number(p.points), align: 'right' as const, isRose: true },
          ]

          pCells.forEach(({ col, val, align, isRose }) => {
            const cell = wsPenalties.getCell(`${col}${pRowIdx}`)
            cell.value = val
            cell.font = {
              name: EXCEL_PALETTE.fontFamily,
              size: 9.5,
              bold: isRose,
              color: { argb: isRose ? EXCEL_PALETTE.colors.roseText : EXCEL_PALETTE.colors.textBody },
            }
            cell.fill = isRose
              ? { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.roseLight } }
              : rowFill
            cell.border = thinCellBorder
            cell.alignment = { vertical: 'middle', horizontal: align }
          })

          pCounter++
          pRowIdx++
        })
      })

      autoFitWorksheetColumns(wsPenalties, { 1: 14, 2: 32, 3: 42, 4: 32, 5: 20 })
    }
  }

  // Save Workbook
  const defaultFilename = `OSCE_Transcript_${student.matricule}_${student.last_name || 'Student'}_${granularity}.xlsx`
  await saveExcelWorkbook(wb, filename || defaultFilename)
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
export async function exportBulkStudentsToExcel(
  students: any[],
  transcripts: StudentTranscriptData[] | null = null,
  options: BulkExportReportOptions = {}
): Promise<void> {
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

  const wb = new ExcelJS.Workbook()
  wb.creator = 'NEW ERA ECOS Assessment Suite'
  wb.lastModifiedBy = professorName
  wb.created = new Date()
  wb.modified = new Date()

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

  const wsMaster = wb.addWorksheet('Cohort Master Gradebook', { views: [{ showGridLines: true }] })

  // Row 1: Brand Banner
  wsMaster.mergeCells('A1:K1')
  const banner1 = wsMaster.getCell('A1')
  banner1.value = '  NEW ERA ECOS • COHORT PERFORMANCE MASTER GRADEBOOK'
  banner1.font = { name: EXCEL_PALETTE.fontFamily, size: 13, bold: true, color: { argb: EXCEL_PALETTE.colors.white } }
  banner1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.navyDark } }
  banner1.alignment = { vertical: 'middle', horizontal: 'left' }
  wsMaster.getRow(1).height = 34

  // Row 2: Emerald Accent Line
  wsMaster.mergeCells('A2:K2')
  wsMaster.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.emerald } }
  wsMaster.getRow(2).height = 4.5
  wsMaster.getRow(3).height = 8

  // Rows 4-6: Structured Metadata Block
  const scopeText = options.sectionName
    ? `Section: ${options.sectionName}`
    : options.cohortName || 'Entire Cohort'

  const bulkMeta = [
    { l1: 'Export Timestamp (HH:MM:SS)', v1: preciseTimestamp, l2: 'Evaluating Professor', v2: professorName },
    { l1: 'Faculty / Institution', v1: facultyName, l2: 'Academic Scope', v2: scopeText },
    { l1: 'Report Granularity', v1: granularity === 'detailed' ? 'Detailed Breakdown (Rubrics & Deductions)' : 'General Summary (Master Gradebook)', l2: 'Enrolled Candidates', v2: `${students.length} Candidates` },
  ]

  bulkMeta.forEach((item, idx) => {
    const rowNum = 4 + idx
    const row = wsMaster.getRow(rowNum)
    row.height = 22

    // Col A & B: Label 1
    wsMaster.mergeCells(`A${rowNum}:B${rowNum}`)
    const cA = wsMaster.getCell(`A${rowNum}`)
    cA.value = item.l1
    cA.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textMuted } }
    cA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.cardBg } }
    cA.border = thinCellBorder
    cA.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    wsMaster.getCell(`B${rowNum}`).border = thinCellBorder

    // Col C to E: Value 1
    wsMaster.mergeCells(`C${rowNum}:E${rowNum}`)
    const cC = wsMaster.getCell(`C${rowNum}`)
    cC.value = item.v1
    cC.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textDark } }
    cC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.white } }
    cC.border = thinCellBorder
    cC.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ;['D', 'E'].forEach((col) => wsMaster.getCell(`${col}${rowNum}`).border = thinCellBorder)

    // Col F & G: Label 2
    wsMaster.mergeCells(`F${rowNum}:G${rowNum}`)
    const cF = wsMaster.getCell(`F${rowNum}`)
    cF.value = item.l2
    cF.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textMuted } }
    cF.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.cardBg } }
    cF.border = thinCellBorder
    cF.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    wsMaster.getCell(`G${rowNum}`).border = thinCellBorder

    // Col H to K: Value 2
    wsMaster.mergeCells(`H${rowNum}:K${rowNum}`)
    const cH = wsMaster.getCell(`H${rowNum}`)
    cH.value = item.v2
    cH.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.textDark } }
    cH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.white } }
    cH.border = thinCellBorder
    cH.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ;['I', 'J', 'K'].forEach((col) => wsMaster.getCell(`${col}${rowNum}`).border = thinCellBorder)
  })

  // Row 7: Spacer
  wsMaster.getRow(7).height = 6

  // Row 8: Executive KPI Callout Row
  const kpiRow = wsMaster.getRow(8)
  kpiRow.height = 28

  wsMaster.mergeCells('A8:B8')
  const kpiTotal = wsMaster.getCell('A8')
  kpiTotal.value = `Total: ${students.length} Candidates`
  kpiTotal.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.navyDark } }
  kpiTotal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.cardBg } }
  kpiTotal.border = thinCellBorder
  kpiTotal.alignment = { vertical: 'middle', horizontal: 'center' }
  wsMaster.getCell('B8').border = thinCellBorder

  wsMaster.mergeCells('C8:E8')
  const kpiEval = wsMaster.getCell('C8')
  kpiEval.value = `Evaluated: ${evaluatedCount} / ${students.length}`
  kpiEval.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.navyDark } }
  kpiEval.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.cardBg } }
  kpiEval.border = thinCellBorder
  kpiEval.alignment = { vertical: 'middle', horizontal: 'center' }
  ;['D', 'E'].forEach((col) => wsMaster.getCell(`${col}8`).border = thinCellBorder)

  wsMaster.mergeCells('F8:H8')
  const kpiMean = wsMaster.getCell('F8')
  kpiMean.value = `Cohort Mean Score: ${avgScore.toFixed(2)} / 20.00 pts`
  kpiMean.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: EXCEL_PALETTE.colors.navyDark } }
  kpiMean.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.cardBg } }
  kpiMean.border = thinCellBorder
  kpiMean.alignment = { vertical: 'middle', horizontal: 'center' }
  ;['G', 'H'].forEach((col) => wsMaster.getCell(`${col}8`).border = thinCellBorder)

  wsMaster.mergeCells('I8:K8')
  const kpiPass = wsMaster.getCell('I8')
  kpiPass.value = `Passing Rate: ${passRate}%`
  const isPassGood = passRate >= 50
  kpiPass.font = {
    name: EXCEL_PALETTE.fontFamily,
    size: 10,
    bold: true,
    color: { argb: isPassGood ? EXCEL_PALETTE.colors.emeraldText : EXCEL_PALETTE.colors.roseText },
  }
  kpiPass.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: isPassGood ? EXCEL_PALETTE.colors.emeraldLight : EXCEL_PALETTE.colors.roseLight },
  }
  kpiPass.border = thinCellBorder
  kpiPass.alignment = { vertical: 'middle', horizontal: 'center' }
  ;['J', 'K'].forEach((col) => wsMaster.getCell(`${col}8`).border = thinCellBorder)

  // Row 9: Spacer
  wsMaster.getRow(9).height = 10

  // Row 10: Table Column Headers
  const tableHeaders = [
    { label: '#', alignment: 'center' as const },
    { label: 'Matricule', alignment: 'center' as const },
    { label: 'Candidate Full Name', alignment: 'left' as const },
    { label: 'Academic Level', alignment: 'left' as const },
    { label: 'Section', alignment: 'center' as const },
    { label: 'Group', alignment: 'center' as const },
    { label: 'Academic Year', alignment: 'center' as const },
    { label: 'Stations Evaluated', alignment: 'right' as const },
    { label: 'Total Stations', alignment: 'right' as const },
    { label: 'Final Score (/20)', alignment: 'right' as const },
    { label: 'Academic Standing', alignment: 'center' as const },
  ]
  applyHeaderRowStyles(wsMaster, 10, tableHeaders)

  // Data Rows (Starting at Row 11)
  let mRowIdx = 11
  students.forEach((st, idx) => {
    const row = wsMaster.getRow(mRowIdx)
    row.height = 22
    const isEven = idx % 2 === 0
    const rowFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: isEven ? EXCEL_PALETTE.colors.white : EXCEL_PALETTE.colors.cardBg } }

    const hasScore = st.final_score !== null && st.final_score !== undefined
    const finalScoreVal = hasScore ? Number(Number(st.final_score).toFixed(2)) : 'Pending'
    const statusText =
      st.status === 'passed'
        ? 'PASSED'
        : st.status === 'failed'
        ? 'RETAKE'
        : st.status
        ? st.status.toUpperCase()
        : 'PENDING'

    const rowCells = [
      { col: 'A', val: idx + 1, align: 'center' as const },
      { col: 'B', val: st.matricule || '–', align: 'center' as const },
      { col: 'C', val: st.full_name || `${st.first_name || ''} ${st.last_name || ''}`.trim(), align: 'left' as const },
      { col: 'D', val: st.level_name || 'Medical Level', align: 'left' as const },
      { col: 'E', val: st.section_name || '–', align: 'center' as const },
      { col: 'F', val: st.group_name || '–', align: 'center' as const },
      { col: 'G', val: st.academic_year_label || 'Current Session', align: 'center' as const },
      { col: 'H', val: st.evaluated_stations_count ?? 0, align: 'right' as const },
      { col: 'I', val: st.total_stations_count || '–', align: 'right' as const },
      { col: 'J', val: finalScoreVal, align: 'right' as const },
      { col: 'K', val: statusText, align: 'center' as const },
    ]

    rowCells.forEach(({ col, val, align }) => {
      const cell = wsMaster.getCell(`${col}${mRowIdx}`)
      cell.value = val
      cell.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, color: { argb: EXCEL_PALETTE.colors.textBody } }
      cell.fill = rowFill
      cell.border = thinCellBorder
      cell.alignment = { vertical: 'middle', horizontal: align }

      if (col === 'K') {
        applyStatusBadgeCell(cell, statusText)
      } else if (col === 'J' && typeof val === 'number') {
        cell.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, bold: true, color: { argb: val >= 10 ? EXCEL_PALETTE.colors.navyDark : EXCEL_PALETTE.colors.roseText } }
      }
    })

    mRowIdx++
  })

  autoFitWorksheetColumns(wsMaster, {
    1: 8,
    2: 18,
    3: 30,
    4: 18,
    5: 16,
    6: 14,
    7: 18,
    8: 20,
    9: 16,
    10: 20,
    11: 22,
  })

  // Detailed Sheets (if transcripts available & granularity is 'detailed')
  if (granularity === 'detailed' && transcripts && transcripts.length > 0) {
    // Sheet 2: Stations Breakdown
    const wsBulkStations = wb.addWorksheet('Stations Breakdown', { views: [{ showGridLines: true }] })

    wsBulkStations.mergeCells('A1:K1')
    const b2 = wsBulkStations.getCell('A1')
    b2.value = '  NEW ERA ECOS • COHORT STATIONS PERFORMANCE BREAKDOWN'
    b2.font = { name: EXCEL_PALETTE.fontFamily, size: 13, bold: true, color: { argb: EXCEL_PALETTE.colors.white } }
    b2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.navyDark } }
    b2.alignment = { vertical: 'middle', horizontal: 'left' }
    wsBulkStations.getRow(1).height = 34

    wsBulkStations.mergeCells('A2:K2')
    wsBulkStations.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.emerald } }
    wsBulkStations.getRow(2).height = 4.5
    wsBulkStations.getRow(3).height = 8

    const bulkStationHeaders = [
      { label: 'Matricule', alignment: 'center' as const },
      { label: 'Candidate Name', alignment: 'left' as const },
      { label: 'Module Name', alignment: 'left' as const },
      { label: 'Station #', alignment: 'center' as const },
      { label: 'Station Title', alignment: 'left' as const },
      { label: 'Weightage (%)', alignment: 'right' as const },
      { label: 'Max Points', alignment: 'right' as const },
      { label: 'Deductions Points', alignment: 'right' as const },
      { label: 'Net Raw Score', alignment: 'right' as const },
      { label: 'Max Contribution (/20)', alignment: 'right' as const },
      { label: 'Actual Contribution (/20)', alignment: 'right' as const },
    ]
    applyHeaderRowStyles(wsBulkStations, 4, bulkStationHeaders)

    let bstRow = 5
    let bstIdx = 0
    transcripts.forEach((t) => {
      const studentName = t.student.full_name || `${t.student.first_name} ${t.student.last_name}`
      t.modules.forEach((mod) => {
        mod.stations.forEach((st) => {
          const row = wsBulkStations.getRow(bstRow)
          row.height = 22
          const isEven = bstIdx % 2 === 0
          const rowFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: isEven ? EXCEL_PALETTE.colors.white : EXCEL_PALETTE.colors.cardBg } }

          const bstCells = [
            { col: 'A', val: t.student.matricule, align: 'center' as const },
            { col: 'B', val: studentName, align: 'left' as const },
            { col: 'C', val: mod.module_name, align: 'left' as const },
            { col: 'D', val: st.station_number, align: 'center' as const },
            { col: 'E', val: st.station_title, align: 'left' as const },
            { col: 'F', val: `${st.weightage_percentage}%`, align: 'right' as const },
            { col: 'G', val: st.station_max_points, align: 'right' as const },
            { col: 'H', val: st.deductions_points, align: 'right' as const },
            { col: 'I', val: Number(st.net_station_raw_score.toFixed(2)), align: 'right' as const },
            { col: 'J', val: Number(st.station_max_contribution.toFixed(2)), align: 'right' as const },
            { col: 'K', val: Number(st.station_contribution.toFixed(2)), align: 'right' as const },
          ]

          bstCells.forEach(({ col, val, align }) => {
            const cell = wsBulkStations.getCell(`${col}${bstRow}`)
            cell.value = val
            cell.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, color: { argb: EXCEL_PALETTE.colors.textBody } }
            cell.fill = rowFill
            cell.border = thinCellBorder
            cell.alignment = { vertical: 'middle', horizontal: align }
          })

          bstIdx++
          bstRow++
        })
      })
    })

    autoFitWorksheetColumns(wsBulkStations, { 1: 18, 2: 28, 3: 28, 4: 12, 5: 32, 6: 16, 7: 14, 8: 18, 9: 16, 10: 24, 11: 24 })

    // Sheet 3: Question Rubrics
    const wsBulkQuestions = wb.addWorksheet('Question Rubrics', { views: [{ showGridLines: true }] })

    wsBulkQuestions.mergeCells('A1:I1')
    const b3 = wsBulkQuestions.getCell('A1')
    b3.value = '  NEW ERA ECOS • COHORT QUESTION RUBRICS & ITEMIZATION'
    b3.font = { name: EXCEL_PALETTE.fontFamily, size: 13, bold: true, color: { argb: EXCEL_PALETTE.colors.white } }
    b3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.navyDark } }
    b3.alignment = { vertical: 'middle', horizontal: 'left' }
    wsBulkQuestions.getRow(1).height = 34

    wsBulkQuestions.mergeCells('A2:I2')
    wsBulkQuestions.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.emerald } }
    wsBulkQuestions.getRow(2).height = 4.5
    wsBulkQuestions.getRow(3).height = 8

    const bulkQuestionHeaders = [
      { label: 'Matricule', alignment: 'center' as const },
      { label: 'Candidate Name', alignment: 'left' as const },
      { label: 'Station #', alignment: 'center' as const },
      { label: 'Station Title', alignment: 'left' as const },
      { label: 'Question #', alignment: 'center' as const },
      { label: 'Question Item Description', alignment: 'left' as const },
      { label: 'Format', alignment: 'center' as const },
      { label: 'Points Awarded', alignment: 'right' as const },
      { label: 'Max Scale', alignment: 'right' as const },
    ]
    applyHeaderRowStyles(wsBulkQuestions, 4, bulkQuestionHeaders)

    let bqRow = 5
    let bqIdx = 0
    transcripts.forEach((t) => {
      const studentName = t.student.full_name || `${t.student.first_name} ${t.student.last_name}`
      t.modules.forEach((mod) => {
        mod.stations.forEach((st) => {
          st.answers.forEach((q, qIdx) => {
            const row = wsBulkQuestions.getRow(bqRow)
            row.height = 24
            const isEven = bqIdx % 2 === 0
            const rowFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: isEven ? EXCEL_PALETTE.colors.white : EXCEL_PALETTE.colors.cardBg } }

            const bqCells = [
              { col: 'A', val: t.student.matricule, align: 'center' as const },
              { col: 'B', val: studentName, align: 'left' as const },
              { col: 'C', val: st.station_number, align: 'center' as const },
              { col: 'D', val: st.station_title, align: 'left' as const },
              { col: 'E', val: qIdx + 1, align: 'center' as const },
              { col: 'F', val: q.question_text, align: 'left' as const },
              { col: 'G', val: q.question_type, align: 'center' as const },
              { col: 'H', val: Number(q.points_awarded || 0), align: 'right' as const },
              { col: 'I', val: Number(q.max_scale_value || 10), align: 'right' as const },
            ]

            bqCells.forEach(({ col, val, align }) => {
              const cell = wsBulkQuestions.getCell(`${col}${bqRow}`)
              cell.value = val
              cell.font = { name: EXCEL_PALETTE.fontFamily, size: 9.5, color: { argb: EXCEL_PALETTE.colors.textBody } }
              cell.fill = rowFill
              cell.border = thinCellBorder
              cell.alignment = { vertical: 'middle', horizontal: align, wrapText: col === 'F' }
            })

            bqIdx++
            bqRow++
          })
        })
      })
    })

    autoFitWorksheetColumns(wsBulkQuestions, { 1: 18, 2: 28, 3: 12, 4: 30, 5: 14, 6: 50, 7: 16, 8: 18, 9: 14 })

    // Sheet 4: Clinical Deductions
    let totalBulkPenalties = 0
    transcripts.forEach((t) => {
      t.modules.forEach((mod) => {
        mod.stations.forEach((st) => {
          totalBulkPenalties += st.penalties.length
        })
      })
    })

    if (totalBulkPenalties > 0) {
      const wsBulkPenalties = wb.addWorksheet('Clinical Deductions', { views: [{ showGridLines: true }] })

      wsBulkPenalties.mergeCells('A1:G1')
      const b4 = wsBulkPenalties.getCell('A1')
      b4.value = '  NEW ERA ECOS • COHORT CLINICAL INFRACTIONS & DEDUCTIONS'
      b4.font = { name: EXCEL_PALETTE.fontFamily, size: 13, bold: true, color: { argb: EXCEL_PALETTE.colors.white } }
      b4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.navyDark } }
      b4.alignment = { vertical: 'middle', horizontal: 'left' }
      wsBulkPenalties.getRow(1).height = 34

      wsBulkPenalties.mergeCells('A2:G2')
      wsBulkPenalties.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.rose } }
      wsBulkPenalties.getRow(2).height = 4.5
      wsBulkPenalties.getRow(3).height = 8

      const bulkPenaltyHeaders = [
        { label: 'Matricule', alignment: 'center' as const },
        { label: 'Candidate Name', alignment: 'left' as const },
        { label: 'Station #', alignment: 'center' as const },
        { label: 'Station Title', alignment: 'left' as const },
        { label: 'Infraction Reason', alignment: 'left' as const },
        { label: 'Clinical Protocol / Criteria', alignment: 'left' as const },
        { label: 'Deduction Points', alignment: 'right' as const },
      ]
      applyHeaderRowStyles(wsBulkPenalties, 4, bulkPenaltyHeaders)

      let bpRow = 5
      let bpIdx = 0
      transcripts.forEach((t) => {
        const studentName = t.student.full_name || `${t.student.first_name} ${t.student.last_name}`
        t.modules.forEach((mod) => {
          mod.stations.forEach((st) => {
            st.penalties.forEach((p) => {
              const row = wsBulkPenalties.getRow(bpRow)
              row.height = 24
              const isEven = bpIdx % 2 === 0
              const rowFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: isEven ? EXCEL_PALETTE.colors.white : EXCEL_PALETTE.colors.cardBg } }

              const bpCells = [
                { col: 'A', val: t.student.matricule, align: 'center' as const, isRose: false },
                { col: 'B', val: studentName, align: 'left' as const, isRose: false },
                { col: 'C', val: st.station_number, align: 'center' as const, isRose: false },
                { col: 'D', val: st.station_title, align: 'left' as const, isRose: false },
                { col: 'E', val: p.reason, align: 'left' as const, isRose: false },
                { col: 'F', val: p.matched_criteria_title || 'Protocol Guideline', align: 'left' as const, isRose: false },
                { col: 'G', val: Number(p.points), align: 'right' as const, isRose: true },
              ]

              bpCells.forEach(({ col, val, align, isRose }) => {
                const cell = wsBulkPenalties.getCell(`${col}${bpRow}`)
                cell.value = val
                cell.font = {
                  name: EXCEL_PALETTE.fontFamily,
                  size: 9.5,
                  bold: isRose,
                  color: { argb: isRose ? EXCEL_PALETTE.colors.roseText : EXCEL_PALETTE.colors.textBody },
                }
                cell.fill = isRose
                  ? { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_PALETTE.colors.roseLight } }
                  : rowFill
                cell.border = thinCellBorder
                cell.alignment = { vertical: 'middle', horizontal: align }
              })

              bpIdx++
              bpRow++
            })
          })
        })
      })

      autoFitWorksheetColumns(wsBulkPenalties, { 1: 18, 2: 28, 3: 12, 4: 30, 5: 42, 6: 30, 7: 20 })
    }
  }

  const scopeLabel = (options.sectionName || options.cohortName || 'Cohort').replace(/\s+/g, '_')
  const defaultFilename = `OSCE_Bulk_${scopeLabel}_${granularity}.xlsx`
  await saveExcelWorkbook(wb, defaultFilename)
}
