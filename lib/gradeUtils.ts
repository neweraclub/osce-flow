/**
 * Clinical OSCE Grade & Weighted Score Calculation Engine
 * 
 * Centralized Single Source of Truth for calculating grades across:
 * - Student Portal (/student/results/dashboard)
 * - Professor Grading View (/professor/students)
 * - Dean Dashboard (/dean)
 * - Academic Exports (PDF / Excel)
 * 
 * Mathematical Formulation:
 * 1. Station Score Normalization:
 *    Station Percentage = (Points Awarded / Max Station Points) * 100
 * 
 * 2. Weightage Application:
 *    Weighted Percentage = Station Percentage * (Weightage % / 100)
 *    Station Contribution (/20) = Weighted Percentage * 0.2
 * 
 * 3. Final Grade Conversion (/20 scale):
 *    Final Grade (/20) = (SUM(Station Percentage * (Weightage % / 100))) * 0.2
 * 
 * 4. Passing Criteria:
 *    Passing threshold is 10.00 / 20 (or 50.00%)
 */

export interface StationScoreInput {
  stationId?: string
  stationNumber?: number
  stationTitle?: string
  pointsAwarded: number // Net earned points (e.g. raw points + penalties, bounded >= 0)
  maxStationPoints: number // Total available points for station criteria/questions (> 0)
  weightagePercentage?: number | null // From stations.weightage_percentage (defaults to 50.00)
}

export interface StationScoreResult {
  stationId?: string
  stationNumber?: number
  stationTitle?: string
  pointsAwarded: number
  maxStationPoints: number
  stationPercentage: number // Normalized 0-100%
  weightagePercentage: number // Configured weightage % (e.g. 50.00)
  weightedPercentage: number // Station Percentage * (Weightage % / 100)
  stationContribution: number // Weighted contribution on /20 scale
  stationMaxContribution: number // Maximum contribution possible on /20 scale
}

export interface ExamGradeResult {
  stations: StationScoreResult[]
  totalWeightedPercentage: number // Overall percentage 0-100%
  finalGrade: number // Scaled final grade out of 20.00 (e.g. 14.50)
  isPassed: boolean // finalGrade >= 10.00
  totalConfiguredWeightage: number // Sum of station weightages
  passingThreshold: number // 10.00
}

export interface CohortStatisticsResult {
  totalCandidates: number
  evaluatedCandidates: number
  pendingCandidates: number
  passedCandidates: number
  failedCandidates: number
  passRate: number // Percentage 0 - 100%
  averageScore: number // Average /20 scale
  highestScore: number | null
  lowestScore: number | null
}

/**
 * Standardizes points and bounds to prevent division by zero or NaN.
 */
function sanitizeNumber(val: any, fallback = 0): number {
  const num = typeof val === 'number' ? val : parseFloat(val)
  return isNaN(num) ? fallback : num
}

/**
 * Rule 1 & Rule 2:
 * Calculates normalized station percentage, applies weightage percentage,
 * and computes station contribution on the /20 grading scale.
 */
export function calculateStationScore(input: StationScoreInput): StationScoreResult {
  const pointsAwarded = Math.max(0, Math.round(sanitizeNumber(input.pointsAwarded, 0) * 100) / 100)
  const rawMax = sanitizeNumber(input.maxStationPoints, 10)
  const maxStationPoints = rawMax > 0 ? rawMax : 10

  // stations.weightage_percentage defaults to 50.00 in PostgreSQL schema
  const rawWeightage = sanitizeNumber(input.weightagePercentage, 50)
  const weightagePercentage = rawWeightage >= 0 ? rawWeightage : 50

  // 1. Station Score Normalization:
  // Station Percentage = (Points Awarded / Max Station Points) * 100
  const rawPercentage = (pointsAwarded / maxStationPoints) * 100
  const stationPercentage = Math.min(100, Math.max(0, Math.round(rawPercentage * 100) / 100))

  // 2. Weightage Application:
  // Weighted Percentage = Station Percentage * (Weightage % / 100)
  const weightedPercentage = Math.round(((stationPercentage * weightagePercentage) / 100) * 100) / 100

  // Station Max Contribution (/20) = 20 * (Weightage % / 100)
  const stationMaxContribution = Math.round((20 * (weightagePercentage / 100)) * 100) / 100

  // Station Contribution (/20) = Weighted Percentage * 0.2
  const stationContribution = Math.round((weightedPercentage * 0.2) * 100) / 100

  return {
    stationId: input.stationId,
    stationNumber: input.stationNumber,
    stationTitle: input.stationTitle,
    pointsAwarded,
    maxStationPoints,
    stationPercentage,
    weightagePercentage,
    weightedPercentage,
    stationContribution,
    stationMaxContribution,
  }
}

/**
 * Rule 3:
 * Sums the weighted contributions across all stations in the exam/module,
 * then scales the final result to the target /20 grading scale:
 * Final Grade (/20) = (SUM(Station Percentage * (Weightage % / 100))) * 0.2
 */
export function calculateExamGrade(stationInputs: StationScoreInput[]): ExamGradeResult {
  if (!stationInputs || stationInputs.length === 0) {
    return {
      stations: [],
      totalWeightedPercentage: 0,
      finalGrade: 0,
      isPassed: false,
      totalConfiguredWeightage: 0,
      passingThreshold: 10.0,
    }
  }

  const stations = stationInputs.map((st) => calculateStationScore(st))

  // Sum of weighted contributions across all stations:
  // SUM(Station Percentage * (Weightage % / 100))
  const totalWeightedPercentageRaw = stations.reduce((sum, s) => sum + s.weightedPercentage, 0)
  const totalWeightedPercentage = Math.min(100, Math.max(0, Math.round(totalWeightedPercentageRaw * 100) / 100))

  // Final Grade (/20) = Total Weighted Percentage * 0.2
  // Equivalent to SUM(Station Contributions (/20))
  const finalGradeRaw = totalWeightedPercentage * 0.2
  const finalGrade = Math.min(20, Math.max(0, Math.round(finalGradeRaw * 100) / 100))

  const totalConfiguredWeightage = Math.round(
    stations.reduce((sum, s) => sum + s.weightagePercentage, 0) * 100
  ) / 100

  const isPassed = finalGrade >= 10.0

  return {
    stations,
    totalWeightedPercentage,
    finalGrade,
    isPassed,
    totalConfiguredWeightage,
    passingThreshold: 10.0,
  }
}

/**
 * Computes cohort performance metrics (Dean dashboard & Professor class analytics):
 * - Average score (/20)
 * - Pass rate (%)
 * - Highest / Lowest scores
 */
export function calculateCohortStatistics(
  scores: Array<number | null | undefined>,
  totalCandidateCount?: number
): CohortStatisticsResult {
  const evaluatedList = scores
    .filter((s): s is number => typeof s === 'number' && !isNaN(s) && s !== null)
    .map((s) => Math.min(20, Math.max(0, Math.round(s * 100) / 100)))

  const evaluatedCandidates = evaluatedList.length
  const totalCandidates = Math.max(evaluatedCandidates, totalCandidateCount || evaluatedCandidates)
  const pendingCandidates = Math.max(0, totalCandidates - evaluatedCandidates)

  if (evaluatedCandidates === 0) {
    return {
      totalCandidates,
      evaluatedCandidates: 0,
      pendingCandidates: totalCandidates,
      passedCandidates: 0,
      failedCandidates: 0,
      passRate: 0,
      averageScore: 0,
      highestScore: null,
      lowestScore: null,
    }
  }

  const passedCandidates = evaluatedList.filter((s) => s >= 10.0).length
  const failedCandidates = evaluatedCandidates - passedCandidates
  const passRate = Math.round(((passedCandidates / evaluatedCandidates) * 100) * 10) / 10

  const sumScore = evaluatedList.reduce((sum, s) => sum + s, 0)
  const averageScore = Math.round((sumScore / evaluatedCandidates) * 100) / 100

  const highestScore = Math.max(...evaluatedList)
  const lowestScore = Math.min(...evaluatedList)

  return {
    totalCandidates,
    evaluatedCandidates,
    pendingCandidates,
    passedCandidates,
    failedCandidates,
    passRate,
    averageScore,
    highestScore,
    lowestScore,
  }
}
