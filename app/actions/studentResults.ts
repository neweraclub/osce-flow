'use server'

import { supabaseAdmin } from '@/lib/auth'
import { calculateStationScore, calculateExamGrade } from '@/lib/gradeUtils'

export interface StudentVerificationInput {
  matricule: string
  first_name: string
  last_name: string
}

export interface StudentVerificationResult {
  success: boolean
  student_id?: string
  student?: {
    id: string
    matricule: string
    first_name: string
    last_name: string
    group_id: string
  }
  error?: string
}

export interface StationPenaltyBreakdown {
  id: string
  reason: string
  points: number // strictly negative
  matched_criteria_title?: string | null
}

export interface StationQuestionAnswerOption {
  id: string
  text: string
  is_correct: boolean
}

export interface StationQuestionAnswerBreakdown {
  question_id: string
  question_text: string
  question_type: string
  max_scale_value: number
  points_awarded: number
  evaluation_score?: number | null
  options?: StationQuestionAnswerOption[]
  selected_options?: string[]
}

export interface StationBonusBreakdown {
  id: string
  reason: string
  points: number
  matched_criteria_title?: string | null
}

export interface EvaluatedStationBreakdown {
  station_id: string
  station_number: number
  station_title: string
  weightage_percentage: number
  station_max_points: number
  raw_earned_points: number
  deductions_points: number
  bonuses_points?: number
  net_station_raw_score: number
  station_percentage: number // (points_awarded / max_points) * 100
  weighted_percentage: number // station_percentage * (weightage / 100)
  station_max_contribution: number // 20 * (weightage / 100)
  station_contribution: number // 20 * (weightage / 100) * (net_score / max_points)
  penalties: StationPenaltyBreakdown[]
  bonuses?: StationBonusBreakdown[]
  answers: StationQuestionAnswerBreakdown[]
  attempt_status: string
  attempt_date?: string
}

export interface ModuleResultsGroup {
  module_id: string
  module_name: string
  session_type: string // 'regular' | 'makeup'
  module_final_score: number // /20 scale
  is_passed: boolean
  banner_message: string
  stations: EvaluatedStationBreakdown[]
}

export interface StudentResultsDashboardData {
  student: {
    id: string
    matricule: string
    first_name: string
    last_name: string
    full_name: string
    group_name: string
    section_name: string
    level_name: string
    academic_year_label: string
  }
  modules: ModuleResultsGroup[]
  total_modules_count: number
  passed_modules_count: number
}

/**
 * Step 1: Exact-match verification query against public.students table:
 * SELECT id, matricule, first_name, last_name, group_id 
 * FROM public.students 
 * WHERE LOWER(matricule) = LOWER(:matricule)
 *   AND LOWER(first_name) = LOWER(:first_name)
 *   AND LOWER(last_name) = LOWER(:last_name)
 * LIMIT 1;
 */
export async function verifyStudentCredentialsAction(
  input: StudentVerificationInput
): Promise<StudentVerificationResult> {
  try {
    const cleanMatricule = input.matricule?.trim().replace(/\s+/g, ' ') || ''
    const cleanFirstName = input.first_name?.trim().replace(/\s+/g, ' ') || ''
    const cleanLastName = input.last_name?.trim().replace(/\s+/g, ' ') || ''

    if (!cleanMatricule || !cleanFirstName || !cleanLastName) {
      return {
        success: false,
        error: 'Student credentials not found. Please verify your Matricule, First Name, and Last Name.',
      }
    }

    // 1. Case-insensitive lookup using ILIKE
    let { data: student, error } = await supabaseAdmin
      .from('students')
      .select('id, matricule, first_name, last_name, group_id')
      .ilike('matricule', cleanMatricule)
      .ilike('first_name', cleanFirstName)
      .ilike('last_name', cleanLastName)
      .limit(1)
      .maybeSingle()

    // 2. Fallback: Check if first_name and last_name were entered in reverse order
    if (!student && !error) {
      const { data: swappedStudent } = await supabaseAdmin
        .from('students')
        .select('id, matricule, first_name, last_name, group_id')
        .ilike('matricule', cleanMatricule)
        .ilike('first_name', cleanLastName)
        .ilike('last_name', cleanFirstName)
        .limit(1)
        .maybeSingle()

      if (swappedStudent) {
        student = swappedStudent
      }
    }

    if (error) {
      console.error('Database error verifying student credentials:', error)
      return {
        success: false,
        error: 'Student credentials not found. Please verify your Matricule, First Name, and Last Name.',
      }
    }

    if (!student) {
      return {
        success: false,
        error: 'Student credentials not found. Please verify your Matricule, First Name, and Last Name.',
      }
    }

    return {
      success: true,
      student_id: student.id,
      student: {
        id: student.id,
        matricule: student.matricule,
        first_name: student.first_name,
        last_name: student.last_name,
        group_id: student.group_id,
      },
    }
  } catch (err: any) {
    console.error('verifyStudentCredentialsAction error:', err)
    return {
      success: false,
      error: 'Student credentials not found. Please verify your Matricule, First Name, and Last Name.',
    }
  }
}

/**
 * Step 2: Fetch and calculate weighted grade breakdown on /20 scale for a verified student.
 */
export async function getStudentResultsDashboardDataAction(
  studentId: string
): Promise<{ success: boolean; data?: StudentResultsDashboardData; error?: string }> {
  try {
    if (!studentId || !studentId.trim()) {
      return { success: false, error: 'Valid Student ID is required.' }
    }

    // 1. Fetch student and academic path
    const { data: student, error: studentErr } = await supabaseAdmin
      .from('students')
      .select(`
        id,
        matricule,
        first_name,
        last_name,
        group_id,
        groups (
          id,
          group_name,
          section_id,
          sections (
            id,
            section_name,
            level_id,
            study_levels (
              id,
              level_name,
              academic_year_id,
              academic_years (
                id,
                year_label
              )
            )
          )
        )
      `)
      .eq('id', studentId.trim())
      .maybeSingle()

    if (studentErr || !student) {
      console.error('Error fetching student profile:', studentErr)
      return { success: false, error: 'Student record could not be found.' }
    }

    const groupData: any = student.groups
    const sectionData: any = groupData?.sections
    const studyLevelData: any = sectionData?.study_levels
    const academicYearData: any = studyLevelData?.academic_years

    // 2. Fetch all exam attempts for this student with stations, exams, and modules
    const { data: attempts, error: attErr } = await supabaseAdmin
      .from('exam_attempts')
      .select(`
        id,
        station_id,
        status,
        created_at,
        stations (
          id,
          station_number,
          title,
          weightage_percentage,
          exam_id,
          exams (
            id,
            session_type,
            exam_date,
            module_id,
            modules (
              id,
              module_name,
              level_id
            )
          )
        )
      `)
      .eq('student_id', student.id)
      .in('status', ['completed', 'passed'])
      .order('created_at', { ascending: false })

    if (attErr) {
      console.error('Error fetching student attempts:', attErr)
    }

    let attemptList: any[] = attempts || []

    // Fallback for legacy attempts where exam_id was used
    if (attemptList.length === 0) {
      const { data: legacyAttempts } = await supabaseAdmin
        .from('exam_attempts')
        .select(`
          id,
          exam_id,
          status,
          created_at,
          exams (
            id,
            session_type,
            exam_date,
            station_id,
            stations (
              id,
              station_number,
              title,
              weightage_percentage,
              module_id,
              modules (
                id,
                module_name,
                level_id
              )
            )
          )
        `)
        .eq('student_id', student.id)
        .in('status', ['completed', 'passed'])
        .order('created_at', { ascending: false })

      if (legacyAttempts) {
        attemptList = legacyAttempts
      }
    }

    const attemptIds = attemptList.map((a) => a.id)
    const stationIds = attemptList
      .map((a: any) => a.station_id || a.stations?.id || a.exams?.stations?.id)
      .filter(Boolean)

    // 3. Fetch questions across these stations to compute Station Max Points
    let allQuestions: any[] = []
    if (stationIds.length > 0) {
      const { data: qData, error: qErr } = await supabaseAdmin
        .from('questions')
        .select('id, station_id, question_text, question_type, max_scale_value, options')
        .in('station_id', stationIds)

      if (!qErr && qData && qData.length > 0) {
        allQuestions = qData
      } else if (qErr) {
        console.warn('Notice fetching questions in student results:', qErr.message)
      }
    }

    // 4. Fetch student_answers across these attempts
    let allAnswers: any[] = []
    if (attemptIds.length > 0) {
      const { data: ansData, error: ansErr } = await supabaseAdmin
        .from('student_answers')
        .select('id, attempt_id, question_id, points_awarded, selected_options')
        .in('attempt_id', attemptIds)

      if (!ansErr && ansData) {
        allAnswers = ansData
      } else if (ansErr) {
        console.warn('Notice fetching student_answers in student results:', ansErr.message)
      }
    }

    // 5. Fetch candidate_penalties across these attempts
    let allPenalties: any[] = []
    if (attemptIds.length > 0) {
      const { data: penData, error: penErr } = await supabaseAdmin
        .from('candidate_penalties')
        .select('id, exam_attempt_id, criteria_id, points, reason, created_at')
        .in('exam_attempt_id', attemptIds)

      if (!penErr && penData) {
        allPenalties = penData
      }
    }

    // 5b. Fetch candidate_bonuses across these attempts
    let allBonuses: any[] = []
    if (attemptIds.length > 0) {
      const { data: bonData, error: bonErr } = await supabaseAdmin
        .from('candidate_bonuses')
        .select('id, exam_attempt_id, criteria_id, points, reason, created_at')
        .in('exam_attempt_id', attemptIds)

      if (!bonErr && bonData) {
        allBonuses = bonData
      }
    }

    // 6. Fetch station_criteria to correlate penalty titles
    let allCriteria: any[] = []
    if (stationIds.length > 0) {
      const { data: critData, error: critErr } = await supabaseAdmin
        .from('station_criteria')
        .select('id, station_id, title, description, points')
        .in('station_id', stationIds)

      if (!critErr && critData) {
        allCriteria = critData
      }
    }

    // 6b. Fetch station_bonuses to correlate bonus titles
    let allStationBonuses: any[] = []
    if (stationIds.length > 0) {
      const { data: sbonData, error: sbonErr } = await supabaseAdmin
        .from('station_bonuses')
        .select('id, station_id, title, description, points')
        .in('station_id', stationIds)

      if (!sbonErr && sbonData) {
        allStationBonuses = sbonData
      }
    }

    // 7. Group and calculate results strictly by Module & Session Type
    // Map key: `${moduleId}_${sessionType}`
    const moduleMap = new Map<string, {
      module_id: string
      module_name: string
      session_type: string
      stations: EvaluatedStationBreakdown[]
    }>()

    attemptList.forEach((att: any) => {
      const station = att.stations || att.exams?.stations
      const exam = att.stations?.exams || att.exams
      const mod = exam?.modules || station?.modules

      if (!station || !mod) return

      const moduleId = mod.id
      const moduleName = mod.module_name
      const rawSession = exam?.session_type || 'regular'
      const sessionType = (rawSession === 'retake' || rawSession === 'makeup') ? 'retake' : 'regular'
      const groupKey = `${moduleId}_${sessionType}`

      // Questions for this station: match station_id
      const stationQuestions = allQuestions.filter(
        (q) => q.station_id === station.id
      )
      const computedMaxPoints = stationQuestions.reduce(
        (sum, q) => sum + (Number(q.max_scale_value) || 10),
        0
      )
      const stationMaxPoints = computedMaxPoints > 0 ? computedMaxPoints : (Number(station.max_points) || 10)

      // Answers for this attempt - deduplicate by question_id and clamp per question
      const attemptAnswers = allAnswers.filter((a) => a.attempt_id === att.id)
      const questionScoreMap = new Map<string, number>()
      attemptAnswers.forEach((ans) => {
        const qId = ans.question_id
        const pts = Math.max(0, Number(ans.points_awarded) || 0)
        const qDef = stationQuestions.find((q) => q.id === qId)
        const qMax = qDef ? (Number(qDef.max_scale_value) || 10) : 10
        const clampedPts = Math.min(qMax, pts)

        if (!questionScoreMap.has(qId) || clampedPts > questionScoreMap.get(qId)!) {
          questionScoreMap.set(qId, clampedPts)
        }
      })

      // Sum points and strictly clamp between 0 and stationMaxPoints
      const totalRawEarned = questionScoreMap.size > 0
        ? Array.from(questionScoreMap.values()).reduce((sum, p) => sum + p, 0)
        : attemptAnswers.reduce((sum, a) => sum + Math.max(0, Number(a.points_awarded) || 0), 0)

      const rawEarnedPoints = Math.min(
        stationMaxPoints,
        Math.max(0, Math.round(totalRawEarned * 100) / 100)
      )

      // Penalties for this attempt (points are strictly negative in database, e.g. -0.5)
      const attemptPenalties = allPenalties.filter((p) => p.exam_attempt_id === att.id)
      const deductionsPoints = attemptPenalties.reduce(
        (sum, p) => sum + (Number(p.points) || 0),
        0
      )

      // Bonuses for this attempt (points are strictly positive in database, e.g. +0.5)
      const attemptBonuses = allBonuses.filter((b) => b.exam_attempt_id === att.id)
      const bonusesPoints = attemptBonuses.reduce(
        (sum, b) => sum + (Number(b.points) || 0),
        0
      )

      // Net Station Raw Score: strictly clamped between 0 and stationMaxPoints
      // Final Net Score = Raw Score - Penalties Points + Bonuses Points
      const netStationRawScore = Math.min(
        stationMaxPoints,
        Math.max(0, Math.round((rawEarnedPoints + deductionsPoints + bonusesPoints) * 100) / 100)
      )

      // Centralized station score & weightage calculation (strictly capped)
      const weightagePct = Number(station.weightage_percentage) || 50
      const scoreCalculation = calculateStationScore({
        stationId: station.id,
        stationNumber: station.station_number || 1,
        stationTitle: station.title,
        pointsAwarded: netStationRawScore,
        maxStationPoints: stationMaxPoints,
        weightagePercentage: weightagePct,
      })

      const stationMaxContribution = scoreCalculation.stationMaxContribution
      const stationContribution = scoreCalculation.stationContribution

      // Match itemized penalties to station criteria if title/keyword matches
      const stationCriteria = allCriteria.filter((c) => c.station_id === station.id)
      const formattedPenalties: StationPenaltyBreakdown[] = attemptPenalties.map((p) => {
        const matched = stationCriteria.find((c) =>
          (p.criteria_id && c.id === p.criteria_id) ||
          p.reason.toLowerCase().includes(c.title.toLowerCase()) ||
          c.title.toLowerCase().includes(p.reason.toLowerCase())
        )
        return {
          id: p.id,
          reason: p.reason,
          points: Number(p.points),
          matched_criteria_title: matched?.title || null,
        }
      })

      // Match itemized bonuses to station_bonuses if title/keyword matches
      const stationBonusesPresets = allStationBonuses.filter((sb) => sb.station_id === station.id)
      const formattedBonuses: StationBonusBreakdown[] = attemptBonuses.map((b) => {
        const matched = stationBonusesPresets.find((sb) =>
          (b.criteria_id && sb.id === b.criteria_id) ||
          b.reason.toLowerCase().includes(sb.title.toLowerCase()) ||
          sb.title.toLowerCase().includes(b.reason.toLowerCase())
        )
        return {
          id: b.id,
          reason: b.reason,
          points: Number(b.points),
          matched_criteria_title: matched?.title || null,
        }
      })

      // Formatted question answer breakdown
      const formattedAnswers: StationQuestionAnswerBreakdown[] = stationQuestions.map((q) => {
        const foundAns = attemptAnswers.find((a) => a.question_id === q.id)
        const pts = foundAns ? Number(foundAns.points_awarded) || 0 : 0
        return {
          question_id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          max_scale_value: Number(q.max_scale_value) || 10,
          points_awarded: pts,
          evaluation_score: pts,
          options: Array.isArray(q.options) ? q.options : [],
          selected_options: Array.isArray(foundAns?.selected_options) ? foundAns.selected_options : [],
        }
      })

      const evaluatedStation: EvaluatedStationBreakdown = {
        station_id: station.id,
        station_number: station.station_number || 1,
        station_title: station.title,
        weightage_percentage: weightagePct,
        station_max_points: stationMaxPoints,
        raw_earned_points: Math.round(rawEarnedPoints * 100) / 100,
        deductions_points: Math.round(deductionsPoints * 100) / 100,
        bonuses_points: Math.round(bonusesPoints * 100) / 100,
        net_station_raw_score: netStationRawScore,
        station_percentage: scoreCalculation.stationPercentage,
        weighted_percentage: scoreCalculation.weightedPercentage,
        station_max_contribution: stationMaxContribution,
        station_contribution: stationContribution,
        penalties: formattedPenalties,
        bonuses: formattedBonuses,
        answers: formattedAnswers,
        attempt_status: att.status || 'completed',
        attempt_date: att.created_at,
      }

      if (!moduleMap.has(groupKey)) {
        moduleMap.set(groupKey, {
          module_id: moduleId,
          module_name: moduleName,
          session_type: sessionType,
          stations: [evaluatedStation],
        })
      } else {
        const existing = moduleMap.get(groupKey)!
        // Avoid duplicate station attempts, keeping latest
        const alreadyHasStation = existing.stations.some((s) => s.station_id === station.id)
        if (!alreadyHasStation) {
          existing.stations.push(evaluatedStation)
        }
      }
    })

    // 8. Compile Module Final Score (/20 Scale) using centralized calculateExamGrade
    const moduleGroups: ModuleResultsGroup[] = Array.from(moduleMap.values()).map((mg) => {
      // Sort stations by station_number
      mg.stations.sort((a, b) => a.station_number - b.station_number)

      const examGrade = calculateExamGrade(
        mg.stations.map((s) => ({
          stationId: s.station_id,
          stationNumber: s.station_number,
          stationTitle: s.station_title,
          pointsAwarded: s.net_station_raw_score,
          maxStationPoints: s.station_max_points,
          weightagePercentage: s.weightage_percentage,
        }))
      )

      const moduleFinalScore = examGrade.finalGrade
      const isPassed = examGrade.isPassed

      const formattedScoreStr = moduleFinalScore.toFixed(2)

      const bannerMessage = isPassed
        ? `Congratulations! You have successfully passed the ${mg.module_name} module.`
        : `You did not pass the ${mg.module_name} module (Score: ${formattedScoreStr}/20). You are required to sit for the Retake Exam.`

      return {
        module_id: mg.module_id,
        module_name: mg.module_name,
        session_type: mg.session_type,
        module_final_score: moduleFinalScore,
        is_passed: isPassed,
        banner_message: bannerMessage,
        stations: mg.stations,
      }
    })

    const passedCount = moduleGroups.filter((m) => m.is_passed).length

    return {
      success: true,
      data: {
        student: {
          id: student.id,
          matricule: student.matricule,
          first_name: student.first_name,
          last_name: student.last_name,
          full_name: `${student.first_name} ${student.last_name}`,
          group_name: groupData?.group_name || 'Assigned Group',
          section_name: sectionData?.section_name || 'Assigned Section',
          level_name: studyLevelData?.level_name || 'Medical Degree',
          academic_year_label: academicYearData?.year_label || '2024-2025',
        },
        modules: moduleGroups,
        total_modules_count: moduleGroups.length,
        passed_modules_count: passedCount,
      },
    }
  } catch (err: any) {
    console.error('getStudentResultsDashboardDataAction error:', err)
    return {
      success: false,
      error: err?.message || 'Unexpected server error calculating student results.',
    }
  }
}
