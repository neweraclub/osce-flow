'use server'

import { supabaseAdmin } from '@/lib/auth'

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

export interface StationQuestionAnswerBreakdown {
  question_id: string
  question_text: string
  question_type: string
  max_scale_value: number
  points_awarded: number
  evaluation_score?: number | null
}

export interface EvaluatedStationBreakdown {
  station_id: string
  station_number: number
  station_title: string
  weightage_percentage: number
  station_max_points: number
  raw_earned_points: number
  deductions_points: number
  net_station_raw_score: number
  station_max_contribution: number // 20 * (weightage / 100)
  station_contribution: number // 20 * (weightage / 100) * (net_score / max_points)
  penalties: StationPenaltyBreakdown[]
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
    const cleanMatricule = input.matricule?.trim() || ''
    const cleanFirstName = input.first_name?.trim() || ''
    const cleanLastName = input.last_name?.trim() || ''

    if (!cleanMatricule || !cleanFirstName || !cleanLastName) {
      return {
        success: false,
        error: 'Student credentials not found. Please verify your Matricule, First Name, and Last Name.',
      }
    }

    const { data: student, error } = await supabaseAdmin
      .from('students')
      .select('id, matricule, first_name, last_name, group_id')
      .ilike('matricule', cleanMatricule)
      .ilike('first_name', cleanFirstName)
      .ilike('last_name', cleanLastName)
      .limit(1)
      .maybeSingle()

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

    // 2. Fetch all exam attempts for this student with exams, stations, and modules
    const { data: attempts, error: attErr } = await supabaseAdmin
      .from('exam_attempts')
      .select(`
        id,
        exam_id,
        final_score,
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
      .order('created_at', { ascending: false })

    if (attErr) {
      console.error('Error fetching student attempts:', attErr)
      return { success: false, error: 'Failed to retrieve examination attempts.' }
    }

    const attemptList = attempts || []
    const attemptIds = attemptList.map((a) => a.id)
    const examIds = attemptList.map((a) => a.exam_id).filter(Boolean)
    const stationIds = attemptList.map((a: any) => a.exams?.stations?.id).filter(Boolean)

    // 3. Fetch questions across these exams to compute Station Max Points
    let allQuestions: any[] = []
    if (examIds.length > 0) {
      const { data: qData, error: qErr } = await supabaseAdmin
        .from('questions')
        .select('id, exam_id, question_text, question_type, max_scale_value')
        .in('exam_id', examIds)

      if (!qErr && qData) {
        allQuestions = qData
      }
    }

    // 4. Fetch student_answers across these attempts
    let allAnswers: any[] = []
    if (attemptIds.length > 0) {
      const { data: ansData, error: ansErr } = await supabaseAdmin
        .from('student_answers')
        .select('id, attempt_id, station_id, question_id, evaluation_score, points_awarded')
        .in('attempt_id', attemptIds)

      if (!ansErr && ansData) {
        allAnswers = ansData
      }
    }

    // 5. Fetch candidate_penalties across these attempts
    let allPenalties: any[] = []
    if (attemptIds.length > 0) {
      const { data: penData, error: penErr } = await supabaseAdmin
        .from('candidate_penalties')
        .select('id, exam_attempt_id, points, reason, created_at')
        .in('exam_attempt_id', attemptIds)

      if (!penErr && penData) {
        allPenalties = penData
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

    // 7. Group and calculate results strictly by Module & Session Type
    // Map key: `${moduleId}_${sessionType}`
    const moduleMap = new Map<string, {
      module_id: string
      module_name: string
      session_type: string
      stations: EvaluatedStationBreakdown[]
    }>()

    attemptList.forEach((att: any) => {
      const exam = att.exams
      const station = exam?.stations
      const mod = station?.modules

      if (!station || !mod) return

      const moduleId = mod.id
      const moduleName = mod.module_name
      const sessionType = exam.session_type || 'regular'
      const groupKey = `${moduleId}_${sessionType}`

      // Questions for this station exam
      const stationQuestions = allQuestions.filter((q) => q.exam_id === att.exam_id)
      const stationMaxPoints = stationQuestions.reduce(
        (sum, q) => sum + (Number(q.max_scale_value) || 10),
        0
      ) || 10 // Fallback to 10 if criteria unset to avoid divide-by-zero

      // Answers for this attempt
      const attemptAnswers = allAnswers.filter((a) => a.attempt_id === att.id)
      const rawEarnedPoints = attemptAnswers.reduce(
        (sum, a) => sum + Math.max(0, Number(a.points_awarded) || 0),
        0
      )

      // Penalties for this attempt (points are strictly negative)
      const attemptPenalties = allPenalties.filter((p) => p.exam_attempt_id === att.id)
      const deductionsPoints = attemptPenalties.reduce(
        (sum, p) => sum + (Number(p.points) || 0),
        0
      )

      // Net Station Raw Score: GREATEST(0, Earned Points + Deductions)
      const netStationRawScore = Math.max(
        0,
        Math.round((rawEarnedPoints + deductionsPoints) * 100) / 100
      )

      // Station Weight Scaling:
      // Station Max Contribution = 20 * (weightage_percentage / 100)
      const weightagePct = Number(station.weightage_percentage) || 0
      const stationMaxContribution = Math.round((20 * (weightagePct / 100)) * 100) / 100

      // Station Contribution (/20) = 20 * (weightage_percentage / 100) * (Net Station Raw Score / Station Max Points)
      const stationContribution = stationMaxPoints > 0
        ? Math.round((stationMaxContribution * (netStationRawScore / stationMaxPoints)) * 100) / 100
        : 0

      // Match itemized penalties to station criteria if title/keyword matches
      const stationCriteria = allCriteria.filter((c) => c.station_id === station.id)
      const formattedPenalties: StationPenaltyBreakdown[] = attemptPenalties.map((p) => {
        const matched = stationCriteria.find((c) =>
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

      // Formatted question answer breakdown
      const formattedAnswers: StationQuestionAnswerBreakdown[] = stationQuestions.map((q) => {
        const foundAns = attemptAnswers.find((a) => a.question_id === q.id)
        return {
          question_id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          max_scale_value: Number(q.max_scale_value) || 10,
          points_awarded: foundAns ? Number(foundAns.points_awarded) || 0 : 0,
          evaluation_score: foundAns?.evaluation_score,
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
        net_station_raw_score: netStationRawScore,
        station_max_contribution: stationMaxContribution,
        station_contribution: stationContribution,
        penalties: formattedPenalties,
        answers: formattedAnswers,
        attempt_status: att.status || 'passed',
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

    // 8. Compile Module Final Score (/20 Scale) = SUM(Station Contributions)
    const moduleGroups: ModuleResultsGroup[] = Array.from(moduleMap.values()).map((mg) => {
      // Sort stations by station_number
      mg.stations.sort((a, b) => a.station_number - b.station_number)

      const rawModuleScore = mg.stations.reduce((sum, s) => sum + s.station_contribution, 0)
      const moduleFinalScore = Math.min(20, Math.round(rawModuleScore * 100) / 100)
      const isPassed = moduleFinalScore >= 10.0

      const formattedScoreStr = moduleFinalScore.toFixed(2)

      const bannerMessage = isPassed
        ? `Congratulations! You have successfully passed the ${mg.module_name} module.`
        : `You did not pass the ${mg.module_name} module (Score: ${formattedScoreStr}/20). You are required to sit for the Makeup Session (Rattrapage).`

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
