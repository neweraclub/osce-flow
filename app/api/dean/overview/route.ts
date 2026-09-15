import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'
import { isAcademicYearCurrent, sortAcademicYears } from '@/lib/academicYearUtils'
import { getFacultyHierarchyIds } from '@/lib/facultyScope'
import { calculateStationScore, calculateExamGrade, calculateCohortStatistics } from '@/lib/gradeUtils'

export async function GET(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized access.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const reqYearId = searchParams.get('academic_year_id')

    // 1. Fetch Academic Years strictly for this faculty
    const { data: rawYears } = await supabaseAdmin
      .from('academic_years')
      .select('id, year_label, created_at')
      .eq('faculty_id', dean.facultyId)

    const years = sortAcademicYears(rawYears || []).map((y) => ({
      ...y,
      name: y.year_label,
      is_current: typeof (y as any).is_current === 'boolean' ? (y as any).is_current : isAcademicYearCurrent(y.year_label),
    }))

    const activeYear =
      (reqYearId ? years.find((y) => y.id === reqYearId) : null) ||
      years.find((y) => y.is_current) ||
      (years.length > 0 ? years[0] : null)

    // 2. Fetch scoped relational hierarchy strictly within the Dean's faculty
    // If a specific year is active/selected, scope to that academic year; otherwise all faculty years
    const hierarchy = await getFacultyHierarchyIds(dean.facultyId, activeYear?.id || null)

    const totalSections = hierarchy.sectionIds.length
    const totalGroups = hierarchy.groupIds.length

    // 3. Count Students strictly in those scoped groups
    // students.group_id -> groups.section_id -> sections.level_id -> study_levels.academic_year_id -> academic_years.faculty_id
    let totalStudents = 0
    if (hierarchy.groupIds.length > 0) {
      const { count } = await supabaseAdmin
        .from('students')
        .select('id', { count: 'exact' })
        .in('group_id', hierarchy.groupIds)

      totalStudents = count || 0
    }

    // 4. Count Professors strictly in this faculty
    // professors.user_id -> users.faculty_id
    let totalProfessors = 0
    if (hierarchy.userIds.length > 0) {
      const { count: profCount } = await supabaseAdmin
        .from('professors')
        .select('id', { count: 'exact' })
        .in('user_id', hierarchy.userIds)

      totalProfessors = profCount || 0
    }

    // 5. Count Clinical Modules strictly belonging to this faculty
    // modules.level_id -> study_levels.academic_year_id -> academic_years.faculty_id
    const totalModules = hierarchy.moduleIds.length

    // 6. Count Exams & Clinical Stations strictly belonging to this faculty
    // stations.exam_id -> exams.module_id -> modules.level_id -> study_levels.academic_year_id -> academic_years.faculty_id
    const totalExams = hierarchy.examIds.length
    let totalStations = 0
    if (hierarchy.examIds.length > 0) {
      const { count: stationCount } = await supabaseAdmin
        .from('stations')
        .select('id', { count: 'exact' })
        .in('exam_id', hierarchy.examIds)

      totalStations = stationCount || 0
    }

    // 7. Clinical OSCE Grading & Weighted Performance Analytics
    let evaluatedStudents = 0
    let averageFacultyScore = 0
    let passRate = 0
    let passedStudents = 0
    let failedStudents = 0

    if (hierarchy.examIds.length > 0) {
      const { data: stations } = await supabaseAdmin
        .from('stations')
        .select('id, exam_id, weightage_percentage')
        .in('exam_id', hierarchy.examIds)

      const stationList = stations || []
      const stationIds = stationList.map((s) => s.id)

      if (stationIds.length > 0) {
        // Fetch questions to get max points per station
        const { data: questions } = await supabaseAdmin
          .from('questions')
          .select('id, station_id, max_scale_value')
          .in('station_id', stationIds)

        const stationMaxPointsMap = new Map<string, number>()
        ;(questions || []).forEach((q) => {
          const cur = stationMaxPointsMap.get(q.station_id) || 0
          stationMaxPointsMap.set(q.station_id, cur + (Number(q.max_scale_value) || 10))
        })

        const stationWeightMap = new Map<string, number>()
        stationList.forEach((st) => {
          stationWeightMap.set(st.id, Number(st.weightage_percentage) || 50)
        })

        // Fetch completed attempts
        const { data: attempts } = await supabaseAdmin
          .from('exam_attempts')
          .select('id, student_id, station_id, created_at')
          .in('station_id', stationIds)
          .eq('status', 'completed')

        const attemptList = attempts || []
        const attemptIds = attemptList.map((a) => a.id)

        if (attemptIds.length > 0) {
          const { data: answers } = await supabaseAdmin
            .from('student_answers')
            .select('attempt_id, points_awarded')
            .in('attempt_id', attemptIds)

          const { data: penalties } = await supabaseAdmin
            .from('candidate_penalties')
            .select('exam_attempt_id, points')
            .in('exam_attempt_id', attemptIds)

          const answerList = answers || []
          const penaltyList = penalties || []

          // Group by student_id
          const studentStationsMap = new Map<
            string,
            { station_id: string; netRawScore: number; maxPoints: number; weightagePct: number }[]
          >()

          attemptList.forEach((att) => {
            const stationId = att.station_id
            const maxPoints = stationMaxPointsMap.get(stationId) || 10
            const weightagePct = stationWeightMap.get(stationId) || 50

            const earned = answerList
              .filter((a) => a.attempt_id === att.id)
              .reduce((sum, a) => sum + Math.max(0, Number(a.points_awarded) || 0), 0)

            const deductions = penaltyList
              .filter((p) => p.exam_attempt_id === att.id)
              .reduce((sum, p) => sum + (Number(p.points) || 0), 0)

            const netRawScore = Math.max(0, earned + deductions)

            const list = studentStationsMap.get(att.student_id) || []
            const existingIdx = list.findIndex((x) => x.station_id === stationId)
            if (existingIdx >= 0) {
              if (netRawScore > list[existingIdx].netRawScore) {
                list[existingIdx] = { station_id: stationId, netRawScore, maxPoints, weightagePct }
              }
            } else {
              list.push({ station_id: stationId, netRawScore, maxPoints, weightagePct })
            }
            studentStationsMap.set(att.student_id, list)
          })

          // Calculate weighted final grade for each student using calculateExamGrade
          const studentFinalScores = Array.from(studentStationsMap.values()).map((stations) => {
            const examGrade = calculateExamGrade(
              stations.map((s) => ({
                stationId: s.station_id,
                pointsAwarded: s.netRawScore,
                maxStationPoints: s.maxPoints,
                weightagePercentage: s.weightagePct,
              }))
            )
            return examGrade.finalGrade
          })

          const cohortStats = calculateCohortStatistics(studentFinalScores, totalStudents)
          evaluatedStudents = cohortStats.evaluatedCandidates
          averageFacultyScore = cohortStats.averageScore
          passRate = cohortStats.passRate
          passedStudents = cohortStats.passedCandidates
          failedStudents = cohortStats.failedCandidates
        }
      }
    }

    return NextResponse.json({
      success: true,
      faculty: {
        id: dean.facultyId,
        name: dean.facultyName,
      },
      activeAcademicYear: activeYear ? activeYear.year_label : 'No active academic year',
      stats: {
        totalAcademicYears: (years || []).length,
        totalSections,
        totalGroups,
        totalStudents,
        totalProfessors,
        totalModules,
        totalExams,
        totalStations,
        evaluatedStudents,
        averageFacultyScore,
        passRate,
        passedStudents,
        failedStudents,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch overview.' }, { status: 500 })
  }
}
