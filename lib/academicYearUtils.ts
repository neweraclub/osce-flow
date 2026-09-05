/**
 * Utility functions for Academic Year detection and sorting
 */

/**
 * Returns the current calendar academic year label based on system date.
 * E.g., September 2026 -> "2026-2027"
 */
export function getCurrentAcademicYearLabel(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = date.getMonth() // 0 = Jan, 8 = Sep
  const startYear = month >= 8 ? year : year - 1
  const endYear = startYear + 1
  return `${startYear}-${endYear}`
}

/**
 * Checks if a given academic year label matches the ongoing calendar session.
 * Handles both hyphen (-) and en-dash (–).
 */
export function isAcademicYearCurrent(yearLabel?: string | null, date: Date = new Date()): boolean {
  if (!yearLabel) return false
  const clean = yearLabel.trim()
  const match = clean.match(/(\d{4})\s*[\u2013\u2014\-–]\s*(\d{4})/)
  if (!match) return false

  const startYear = parseInt(match[1], 10)
  const endYear = parseInt(match[2], 10)

  const currentYear = date.getFullYear()
  const currentMonth = date.getMonth() // 0-indexed (8 = Sep)
  const expectedStart = currentMonth >= 8 ? currentYear : currentYear - 1
  const expectedEnd = expectedStart + 1

  return startYear === expectedStart && endYear === expectedEnd
}

/**
 * Sorts academic years in descending chronological order (e.g. 2026-2027, 2025-2026, 2019-2020).
 */
export function sortAcademicYears<T extends { year_label?: string; name?: string; created_at?: string }>(
  years: T[]
): T[] {
  return [...years].sort((a, b) => {
    const labelA = a.year_label || a.name || ''
    const labelB = b.year_label || b.name || ''
    const matchA = labelA.match(/(\d{4})/)
    const matchB = labelB.match(/(\d{4})/)
    if (matchA && matchB) {
      return parseInt(matchB[1], 10) - parseInt(matchA[1], 10)
    }
    return (b.created_at || '').localeCompare(a.created_at || '')
  })
}
