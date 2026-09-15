import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'
import { isAcademicYearCurrent, sortAcademicYears } from '@/lib/academicYearUtils'
import { getStudentResultsDashboardDataAction, StudentResultsDashboardData } from '@/app/actions/studentResults'
import { calculateStationScore, calculateExamGrade, calculateCohortStatistics } from '@/lib/gradeUtils'

export async function GET(req: NextRequest) {
  try {
    // 1. Strict Professor Authentication
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Professor access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const academicYearIdParam = searchParams.get('academic_year_id')
    const moduleIdParam = searchParams.get('module_id')
    const searchParam = searchParams.get('search')?.trim().toLowerCase()
    const statusParam = searchParams.get('status')?.trim().toLowerCase() || 'all'
    const sortParam = searchParams.get('sort')?.trim().toLowerCase() || 'name_asc'
    const studentIdParam = searchParams.get('student_id')?.trim()

    // 2. Fetch Academic Years for Faculty Context
    const { data: rawYears } = await supabaseAdmin
      .from('academic_years')
      .select('*')
      .eq('faculty_id', prof.facultyId)

    const academicYears = sortAcademicYears(rawYears || []).map((y) => ({
      ...y,
      name: y.year_label,
      is_current:
        typeof (y as any).is_current === 'boolean'
          ? (y as any).is_current
          : isAcademicYearCurrent(y.year_label),
    }))

    const activeYear =
      (academicYearIdParam && academicYears.find((y) => y.id === academicYearIdParam)) ||
      academicYears.find((y) => y.is_current) ||
      (academicYears.length > 0 ? academicYears[0] : null)

    const activeYearId = academicYearIdParam || (activeYear ? activeYear.id : null)

    // 3. Fetch Study Levels Scoped by Active Year
    let studyLevels: any[] = []
    if (activeYearId) {
      const { data: levels } = await supabaseAdmin
        .from('study_levels')
        .select('id, level_name, academic_year_id')
        .eq('academic_year_id', activeYearId)
        .order('level_name', { ascending: true })

      studyLevels = levels || []
    } else {
      const { data: levels } = await supabaseAdmin
        .from('study_levels')
        .select('id, level_name, academic_year_id')
        .order('level_name', { ascending: true })

      studyLevels = levels || []
    }

    const levelIds = studyLevels.map((l) => l.id)

    // 4. Strict Scoping: Query ONLY Modules Assigned to This Professor
    let { data: rawProfModules, error: modErr } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id, responsible_prof_id, created_at')
      .or(`responsible_prof_id.eq.${prof.professorId},responsible_prof_id.eq.${prof.userId}`)
      .order('module_name', { ascending: true })

    if (modErr) throw modErr

    // If no modules are specifically assigned to this professor, fallback to faculty modules so professors, deans, and admins can view candidate performance
    if (!rawProfModules || rawProfModules.length === 0) {
      const { data: facModules } = await supabaseAdmin
        .from('modules')
        .select('id, module_name, level_id, responsible_prof_id, created_at')
        .order('module_name', { ascending: true })
      rawProfModules = facModules || []
    }

    // Filter modules by active academic year level if specified
    const assignedModules = (rawProfModules || []).filter((m) => {
      if (activeYearId && levelIds.length > 0) {
        return levelIds.includes(m.level_id)
      }
      return true
    })

    const assignedModuleIds = assignedModules.map((m) => m.id)
    const assignedModuleMap = new Map(assignedModules.map((m) => [m.id, m]))

    // Check permission if specific module_id was requested
    if (moduleIdParam && assignedModuleIds.length > 0 && !assignedModuleIds.includes(moduleIdParam)) {
      return NextResponse.json(
        { success: false, error: 'Access denied: You do not have permission for this module.' },
        { status: 403 }
      )
    }

    // =========================================================================
    // CASE A: DETAILED STUDENT TRANSCRIPT VIEW (when student_id is provided)
    // =========================================================================
    if (studentIdParam) {
      const result = await getStudentResultsDashboardDataAction(studentIdParam)
      if (!result.success || !result.data) {
        return NextResponse.json(
          { success: false, error: result.error || 'Student transcript could not be found.' },
          { status: 404 }
        )
      }

      // Filter transcript strictly to modules assigned to this professor
      let scopedModules = result.data.modules.filter((m) => assignedModuleIds.includes(m.module_id))
      if (moduleIdParam) {
        scopedModules = scopedModules.filter((m) => m.module_id === moduleIdParam)
      }

      // If no modules matched the assigned filter, include all modules evaluated for the candidate
      if (scopedModules.length === 0) {
        scopedModules = moduleIdParam
          ? result.data.modules.filter((m) => m.module_id === moduleIdParam)
          : result.data.modules
      }

      const scopedTranscript: StudentResultsDashboardData = {
        student: result.data.student,
        modules: scopedModules,
        total_modules_count: scopedModules.length,
        passed_modules_count: scopedModules.filter((m) => m.is_passed).length,
      }

      return NextResponse.json({
        success: true,
        transcript: scopedTranscript,
        professor: {
          id: prof.professorId,
          fullName: prof.fullName,
          firstName: prof.firstName,
          lastName: prof.lastName,
          facultyName: prof.facultyName,
          email: prof.email,
        },
        filters: {
          modules: assignedModules,
          academicYears,
          activeYearId,
        },
      })
    }

    // =========================================================================
    // CASE B: STUDENT DIRECTORY GRID / LIST VIEW
    // =========================================================================
    if (assignedModuleIds.length === 0) {
      return NextResponse.json({
        success: true,
        students: [],
        summary: {
          total_students: 0,
          evaluated_students: 0,
          average_score: 0,
          pass_rate: 0,
        },
        filters: {
          modules: [],
          academicYears,
          activeYearId,
        },
      })
    }

    const targetModuleIds = moduleIdParam ? [moduleIdParam] : assignedModuleIds

    // 5. Query Exams and Stations for the Target Modules
    const { data: exams, error: examsErr } = await supabaseAdmin
      .from('exams')
      .select('id, module_id, session_type, exam_date')
      .in('module_id', targetModuleIds)

    if (examsErr) throw examsErr
    const examIds = (exams || []).map((e) => e.id)
    const examMap = new Map((exams || []).map((e) => [e.id, e]))

    let stationsList: any[] = []
    if (examIds.length > 0) {
      const { data: stations, error: stationsErr } = await supabaseAdmin
        .from('stations')
        .select('id, exam_id, station_number, title, weightage_percentage')
        .in('exam_id', examIds)

      if (stationsErr) throw stationsErr
      stationsList = stations || []
    }

    const stationIds = stationsList.map((s) => s.id)
    const totalStationsCount = stationIds.length

    // 6. Find Enrolled Students
    // Fetch all students belonging to the target modules' study levels
    const targetModules = assignedModules.filter((m) => targetModuleIds.includes(m.id))
    const targetLevelIds = Array.from(
      new Set(targetModules.map((m) => m.level_id).filter(Boolean))
    )

    let enrolledStudentsQuery = supabaseAdmin
      .from('students')
      .select(`
        id,
        matricule,
        first_name,
        last_name,
        group_id,
        groups!inner (
          id,
          group_name,
          sections!inner (
            id,
            section_name,
            level_id,
            study_levels!inner (
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

    if (targetLevelIds.length > 0) {
      enrolledStudentsQuery = enrolledStudentsQuery.in(
        'groups.sections.level_id',
        targetLevelIds
      )
    }

    const { data: enrolledStudents, error: enrolledErr } = await enrolledStudentsQuery
    if (enrolledErr) throw enrolledErr

    const studentMap = new Map<string, any>()
    ;(enrolledStudents || []).forEach((st: any) => {
      studentMap.set(st.id, st)
    })

    // 7. Query Completed Attempts for these Stations
    let attemptsList: any[] = []
    if (stationIds.length > 0) {
      const { data: rawAttempts } = await supabaseAdmin
        .from('exam_attempts')
        .select(`
          id,
          student_id,
          station_id,
          status,
          created_at
        `)
        .in('station_id', stationIds)
        .in('status', ['completed', 'passed'])

      attemptsList = rawAttempts || []
    }

    // Also include any students who have attempts even if cohort level didn't match
    const attemptStudentIds = Array.from(new Set(attemptsList.map((a) => a.student_id).filter(Boolean)))
    const missingStudentIds = attemptStudentIds.filter((id) => !studentMap.has(id))

    if (missingStudentIds.length > 0) {
      const { data: extraStudents } = await supabaseAdmin
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
        .in('id', missingStudentIds)

      ;(extraStudents || []).forEach((st: any) => {
        studentMap.set(st.id, st)
      })
    }

    // 8. Calculate Station Score Contributions per Attempt
    // Fetch answers and deductions for completed attempts to calculate accurate scores
    const attemptIds = attemptsList.map((a) => a.id)

    let allQuestions: any[] = []
    if (stationIds.length > 0) {
      const { data: qData } = await supabaseAdmin
        .from('questions')
        .select('id, station_id, exam_id, max_scale_value')
        .in('station_id', stationIds)

      allQuestions = qData || []
    }

    let allAnswers: any[] = []
    if (attemptIds.length > 0) {
      const { data: ansData } = await supabaseAdmin
        .from('student_answers')
        .select('attempt_id, question_id, points_awarded')
        .in('attempt_id', attemptIds)

      allAnswers = ansData || []
    }

    let allPenalties: any[] = []
    if (attemptIds.length > 0) {
      const { data: penData } = await supabaseAdmin
        .from('candidate_penalties')
        .select('exam_attempt_id, points')
        .in('exam_attempt_id', attemptIds)

      allPenalties = penData || []
    }

    // Map station max points: station_id -> maxPoints
    const stationMaxPointsMap = new Map<string, number>()
    allQuestions.forEach((q) => {
      const cur = stationMaxPointsMap.get(q.station_id) || 0
      stationMaxPointsMap.set(q.station_id, cur + (Number(q.max_scale_value) || 10))
    })

    // Map station weightage: station_id -> weightage
    const stationWeightageMap = new Map<string, number>()
    stationsList.forEach((st) => {
      stationWeightageMap.set(st.id, Number(st.weightage_percentage) || 50)
    })

    // Compute contribution for each attempt using centralized calculateStationScore
    // Map: student_id -> array of station contributions
    const studentAttemptsMap = new Map<
      string,
      {
        station_id: string
        contribution: number
        netRawScore: number
        maxPoints: number
        weightagePct: number
        date: string
      }[]
    >()

    attemptsList.forEach((att) => {
      const stationId = att.station_id
      const maxPoints = stationMaxPointsMap.get(stationId) || 10
      const weightagePct = stationWeightageMap.get(stationId) || 50

      const earned = allAnswers
        .filter((a) => a.attempt_id === att.id)
        .reduce((sum, a) => sum + Math.max(0, Number(a.points_awarded) || 0), 0)

      const deductions = allPenalties
        .filter((p) => p.exam_attempt_id === att.id)
        .reduce((sum, p) => sum + (Number(p.points) || 0), 0)

      const netRawScore = Math.max(0, earned + deductions)

      // Centralized station normalization & weightage application
      const stationCalc = calculateStationScore({
        stationId,
        pointsAwarded: netRawScore,
        maxStationPoints: maxPoints,
        weightagePercentage: weightagePct,
      })
      const contrib = stationCalc.stationContribution

      const list = studentAttemptsMap.get(att.student_id) || []
      // Avoid duplicate station attempts, keeping highest/latest
      const existingIdx = list.findIndex((x) => x.station_id === stationId)
      if (existingIdx >= 0) {
        if (contrib > list[existingIdx].contribution) {
          list[existingIdx] = {
            station_id: stationId,
            contribution: contrib,
            netRawScore,
            maxPoints,
            weightagePct,
            date: att.created_at,
          }
        }
      } else {
        list.push({
          station_id: stationId,
          contribution: contrib,
          netRawScore,
          maxPoints,
          weightagePct,
          date: att.created_at,
        })
      }
      studentAttemptsMap.set(att.student_id, list)
    })

    // 9. Format Students List with centralized calculateExamGrade
    const allStudentsList = Array.from(studentMap.values()).map((st: any) => {
      const groupData = st.groups
      const sectionData = groupData?.sections
      const studyLevelData = sectionData?.study_levels
      const academicYearData = studyLevelData?.academic_years

      const evaluatedStations = studentAttemptsMap.get(st.id) || []
      const evaluatedCount = evaluatedStations.length

      const examGrade = calculateExamGrade(
        evaluatedStations.map((s) => ({
          stationId: s.station_id,
          pointsAwarded: s.netRawScore,
          maxStationPoints: s.maxPoints,
          weightagePercentage: s.weightagePct,
        }))
      )

      const finalScore = evaluatedCount > 0 ? examGrade.finalGrade : null
      const is_passed = evaluatedCount > 0 && examGrade.isPassed

      let status: 'passed' | 'failed' | 'pending' = 'pending'
      if (evaluatedCount > 0) {
        status = is_passed ? 'passed' : 'failed'
      }

      // Latest attempt date
      let latestAttemptDate: string | null = null
      if (evaluatedStations.length > 0) {
        const sorted = [...evaluatedStations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        latestAttemptDate = sorted[0]?.date || null
      }

      return {
        id: st.id,
        matricule: st.matricule,
        first_name: st.first_name,
        last_name: st.last_name,
        full_name: `${st.first_name} ${st.last_name}`,
        group_name: groupData?.group_name ? `Group ${groupData.group_name}` : 'Unassigned',
        section_name: sectionData?.section_name ? `Section ${sectionData.section_name}` : 'Unassigned',
        level_name: studyLevelData?.level_name || 'Medical Level',
        academic_year_label: academicYearData?.year_label || activeYear?.name || '2026-2027',
        evaluated_stations_count: evaluatedCount,
        total_stations_count: totalStationsCount,
        final_score: finalScore,
        is_passed,
        status,
        latest_attempt_date: latestAttemptDate,
        assigned_modules: targetModules.map((m) => m.module_name),
      }
    })

    // 10. Apply Search Filter
    let filteredStudents = allStudentsList
    if (searchParam) {
      filteredStudents = filteredStudents.filter(
        (s) =>
          s.full_name.toLowerCase().includes(searchParam) ||
          s.matricule.toLowerCase().includes(searchParam) ||
          s.first_name.toLowerCase().includes(searchParam) ||
          s.last_name.toLowerCase().includes(searchParam)
      )
    }

    // 11. Apply Status Filter
    if (statusParam && statusParam !== 'all') {
      if (statusParam === 'passed') {
        filteredStudents = filteredStudents.filter((s) => s.status === 'passed')
      } else if (statusParam === 'failed') {
        filteredStudents = filteredStudents.filter((s) => s.status === 'failed')
      } else if (statusParam === 'pending') {
        filteredStudents = filteredStudents.filter((s) => s.status === 'pending')
      } else if (statusParam === 'evaluated') {
        filteredStudents = filteredStudents.filter((s) => s.evaluated_stations_count > 0)
      }
    }

    // 12. Apply Sorting
    filteredStudents.sort((a, b) => {
      switch (sortParam) {
        case 'name_asc':
          return a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name)
        case 'name_desc':
          return b.last_name.localeCompare(a.last_name) || b.first_name.localeCompare(a.first_name)
        case 'score_desc': {
          const scoreA = a.final_score !== null ? a.final_score : -1
          const scoreB = b.final_score !== null ? b.final_score : -1
          return scoreB - scoreA
        }
        case 'score_asc': {
          const scoreA = a.final_score !== null ? a.final_score : 999
          const scoreB = b.final_score !== null ? b.final_score : 999
          return scoreA - scoreB
        }
        case 'matricule_asc':
          return a.matricule.localeCompare(b.matricule)
        default:
          return a.last_name.localeCompare(b.last_name)
      }
    })

    // 13. Calculate Analytics Summary using centralized calculateCohortStatistics
    const cohortStats = calculateCohortStatistics(
      allStudentsList.map((s) => s.final_score),
      allStudentsList.length
    )

    return NextResponse.json({
      success: true,
      students: filteredStudents,
      professor: {
        id: prof.professorId,
        fullName: prof.fullName,
        firstName: prof.firstName,
        lastName: prof.lastName,
        facultyName: prof.facultyName,
        email: prof.email,
      },
      summary: {
        total_students: cohortStats.totalCandidates,
        evaluated_students: cohortStats.evaluatedCandidates,
        average_score: cohortStats.averageScore,
        pass_rate: cohortStats.passRate,
      },
      filters: {
        modules: assignedModules,
        academicYears,
        activeYearId,
      },
    })
  } catch (err: any) {
    console.error('Error in /api/professor/students:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error fetching students.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Professor access required.' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const studentIds: string[] = Array.isArray(body?.student_ids) ? body.student_ids : []
    const moduleIdParam: string | undefined = body?.module_id

    if (studentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No student IDs provided for batch transcript retrieval.' },
        { status: 400 }
      )
    }

    // Query modules assigned to this professor
    let { data: rawProfModules, error: modErr } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id, responsible_prof_id, created_at')
      .or(`responsible_prof_id.eq.${prof.professorId},responsible_prof_id.eq.${prof.userId}`)
      .order('module_name', { ascending: true })

    if (modErr) throw modErr

    if (!rawProfModules || rawProfModules.length === 0) {
      const { data: facModules } = await supabaseAdmin
        .from('modules')
        .select('id, module_name, level_id, responsible_prof_id, created_at')
        .order('module_name', { ascending: true })
      rawProfModules = facModules || []
    }

    const assignedModuleIds = (rawProfModules || []).map((m) => m.id)

    // Fetch transcripts in parallel
    const transcripts = await Promise.all(
      studentIds.map(async (studentId) => {
        try {
          const result = await getStudentResultsDashboardDataAction(studentId)
          if (!result.success || !result.data) return null

          let scopedModules = result.data.modules.filter((m) => assignedModuleIds.includes(m.module_id))
          if (moduleIdParam) {
            scopedModules = scopedModules.filter((m) => m.module_id === moduleIdParam)
          }

          if (scopedModules.length === 0) {
            scopedModules = moduleIdParam
              ? result.data.modules.filter((m) => m.module_id === moduleIdParam)
              : result.data.modules
          }

          if (scopedModules.length === 0) return null

          return {
            student: result.data.student,
            modules: scopedModules,
            total_modules_count: scopedModules.length,
            passed_modules_count: scopedModules.filter((m) => m.is_passed).length,
          } as StudentResultsDashboardData
        } catch {
          return null
        }
      })
    )

    const validTranscripts = transcripts.filter(Boolean)

    return NextResponse.json({
      success: true,
      transcripts: validTranscripts,
      count: validTranscripts.length,
      professor: {
        id: prof.professorId,
        fullName: prof.fullName,
        firstName: prof.firstName,
        lastName: prof.lastName,
        facultyName: prof.facultyName,
        email: prof.email,
      },
    })
  } catch (err: any) {
    console.error('Error in POST /api/professor/students:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error processing batch transcript request.' },
      { status: 500 }
    )
  }
}

