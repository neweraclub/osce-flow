import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'
import { isAcademicYearCurrent, sortAcademicYears } from '@/lib/academicYearUtils'

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
    const stationIdParam = searchParams.get('station_id')
    const searchParam = searchParams.get('search')?.trim().toLowerCase()

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

    const activeYearId = activeYear ? activeYear.id : null

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
    const { data: rawProfModules, error: modErr } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id, responsible_prof_id, created_at')
      .or(`responsible_prof_id.eq.${prof.professorId},responsible_prof_id.eq.${prof.userId}`)
      .order('module_name', { ascending: true })

    if (modErr) throw modErr

    // Filter modules by active academic year levels if specified
    const assignedModules = (rawProfModules || []).filter((m) => {
      if (activeYearId && levelIds.length > 0) {
        return levelIds.includes(m.level_id)
      }
      return true
    })

    const assignedModuleIds = assignedModules.map((m) => m.id)
    const moduleMap = new Map(assignedModules.map((m) => [m.id, m]))

    // If requested module does not belong to professor, forbid access
    if (moduleIdParam && !assignedModuleIds.includes(moduleIdParam)) {
      return NextResponse.json(
        { success: false, error: 'Access denied: You do not have permission for this module.' },
        { status: 403 }
      )
    }

    if (assignedModuleIds.length === 0) {
      return NextResponse.json({
        success: true,
        penalties: [],
        summary: {
          total_penalties: 0,
          total_points_deducted: 0,
          average_deduction: 0,
          impacted_students_count: 0,
          impacted_stations_count: 0,
        },
        filters: {
          modules: [],
          stations: [],
          academicYears,
          activeYearId,
        },
      })
    }

    // Determine target module IDs for querying
    const targetModuleIds = moduleIdParam ? [moduleIdParam] : assignedModuleIds

    // 5. Query Exams for Candidate Modules
    const { data: exams, error: examsErr } = await supabaseAdmin
      .from('exams')
      .select('id, module_id, session_type, exam_date')
      .in('module_id', targetModuleIds)

    if (examsErr) throw examsErr

    const examsList = exams || []
    const examIds = examsList.map((e) => e.id)
    const examMap = new Map(examsList.map((e) => [e.id, e]))

    if (examIds.length === 0) {
      return NextResponse.json({
        success: true,
        penalties: [],
        summary: {
          total_penalties: 0,
          total_points_deducted: 0,
          average_deduction: 0,
          impacted_students_count: 0,
          impacted_stations_count: 0,
        },
        filters: {
          modules: assignedModules.map((m) => ({ id: m.id, name: m.module_name })),
          stations: [],
          academicYears,
          activeYearId,
        },
      })
    }

    // 6. Query Stations for Candidate Exams
    const { data: stations, error: stationsErr } = await supabaseAdmin
      .from('stations')
      .select('id, exam_id, station_number, title, weightage_percentage')
      .in('exam_id', examIds)
      .order('station_number', { ascending: true })

    if (stationsErr) throw stationsErr

    const stationsList = stations || []
    const stationMap = new Map(stationsList.map((s) => [s.id, s]))
    const allStationIds = stationsList.map((s) => s.id)

    // Strict check if stationIdParam was provided
    if (stationIdParam && !allStationIds.includes(stationIdParam)) {
      return NextResponse.json(
        { success: false, error: 'Access denied: You do not have permission for this station.' },
        { status: 403 }
      )
    }

    const targetStationIds = stationIdParam ? [stationIdParam] : allStationIds

    if (targetStationIds.length === 0) {
      return NextResponse.json({
        success: true,
        penalties: [],
        summary: {
          total_penalties: 0,
          total_points_deducted: 0,
          average_deduction: 0,
          impacted_students_count: 0,
          impacted_stations_count: 0,
        },
        filters: {
          modules: assignedModules.map((m) => ({ id: m.id, name: m.module_name })),
          stations: stationsList.map((s) => {
            const ex = examMap.get(s.exam_id)
            return {
              id: s.id,
              number: s.station_number,
              title: s.title,
              moduleId: ex?.module_id,
              moduleName: ex ? moduleMap.get(ex.module_id)?.module_name : '',
            }
          }),
          academicYears,
          activeYearId,
        },
      })
    }

    // 7. Query Exam Attempts for Target Stations
    const { data: attempts, error: attErr } = await supabaseAdmin
      .from('exam_attempts')
      .select('id, station_id, student_id, status, created_at')
      .in('station_id', targetStationIds)

    if (attErr) throw attErr

    const attemptsList = attempts || []
    const attemptIds = attemptsList.map((a) => a.id)
    const attemptMap = new Map(attemptsList.map((a) => [a.id, a]))

    if (attemptIds.length === 0) {
      return NextResponse.json({
        success: true,
        penalties: [],
        summary: {
          total_penalties: 0,
          total_points_deducted: 0,
          average_deduction: 0,
          impacted_students_count: 0,
          impacted_stations_count: 0,
        },
        filters: {
          modules: assignedModules.map((m) => ({ id: m.id, name: m.module_name })),
          stations: stationsList.map((s) => {
            const ex = examMap.get(s.exam_id)
            return {
              id: s.id,
              number: s.station_number,
              title: s.title,
              moduleId: ex?.module_id,
              moduleName: ex ? moduleMap.get(ex.module_id)?.module_name : '',
            }
          }),
          academicYears,
          activeYearId,
        },
      })
    }

    // 8. Query Candidate Penalties for These Exam Attempts
    const { data: rawPenalties, error: penErr } = await supabaseAdmin
      .from('candidate_penalties')
      .select('id, exam_attempt_id, criteria_id, reason, points, created_at')
      .in('exam_attempt_id', attemptIds)
      .order('created_at', { ascending: false })

    if (penErr) throw penErr

    const penaltiesList = rawPenalties || []

    // 9. Query Candidate Students & Groups for Rich Table Presentation
    const studentIds = Array.from(
      new Set(attemptsList.map((a) => a.student_id).filter(Boolean))
    )

    let studentMap = new Map<string, any>()
    let groupMap = new Map<string, string>()

    if (studentIds.length > 0) {
      const { data: students, error: stErr } = await supabaseAdmin
        .from('students')
        .select('id, matricule, first_name, last_name, group_id')
        .in('id', studentIds)

      if (!stErr && students) {
        studentMap = new Map(students.map((s) => [s.id, s]))

        const groupIds = Array.from(new Set(students.map((s) => s.group_id).filter(Boolean)))
        if (groupIds.length > 0) {
          const { data: groups } = await supabaseAdmin
            .from('groups')
            .select('id, group_name')
            .in('id', groupIds)

          if (groups) {
            groupMap = new Map(groups.map((g) => [g.id, g.group_name]))
          }
        }
      }
    }

    // 10. Query Criteria Info if Applicable
    const criteriaIds = Array.from(
      new Set(penaltiesList.map((p) => p.criteria_id).filter(Boolean))
    )

    let criteriaMap = new Map<string, any>()
    if (criteriaIds.length > 0) {
      const { data: criteriaList } = await supabaseAdmin
        .from('station_criteria')
        .select('id, title, description')
        .in('id', criteriaIds)

      if (criteriaList) {
        criteriaMap = new Map(criteriaList.map((c) => [c.id, c]))
      }
    }

    // 11. Format & Combine Records
    let formattedPenalties = penaltiesList.map((pen) => {
      const attempt = attemptMap.get(pen.exam_attempt_id)
      const station = attempt ? stationMap.get(attempt.station_id) : null
      const exam = station ? examMap.get(station.exam_id) : null
      const moduleItem = exam ? moduleMap.get(exam.module_id) : null
      const student = attempt ? studentMap.get(attempt.student_id) : null
      const groupName = student?.group_id ? groupMap.get(student.group_id) || '—' : '—'
      const criteria = pen.criteria_id ? criteriaMap.get(pen.criteria_id) : null

      const rawPoints = Number(pen.points) || 0
      const deductionAmount = Math.abs(rawPoints)

      const studentFullName = student
        ? `${student.first_name} ${student.last_name}`.trim()
        : 'Unknown Student'

      return {
        id: pen.id,
        exam_attempt_id: pen.exam_attempt_id,
        student_id: student?.id || '',
        student_name: studentFullName,
        student_matricule: student?.matricule || '—',
        group_name: groupName,
        station_id: station?.id || '',
        station_number: station?.station_number || 0,
        station_title: station?.title || 'Unknown Station',
        module_id: moduleItem?.id || '',
        module_name: moduleItem?.module_name || '—',
        exam_session_id: exam?.id || '',
        session_type: exam?.session_type || 'regular',
        exam_date: exam?.exam_date || '',
        reason: pen.reason || 'Clinical deduction',
        criteria_title: criteria?.title || null,
        deduction_amount: deductionAmount,
        points: rawPoints,
        created_at: pen.created_at,
      }
    })

    // 12. Apply Search Filter if requested
    if (searchParam) {
      formattedPenalties = formattedPenalties.filter((p) => {
        return (
          p.student_name.toLowerCase().includes(searchParam) ||
          p.student_matricule.toLowerCase().includes(searchParam) ||
          p.reason.toLowerCase().includes(searchParam) ||
          p.station_title.toLowerCase().includes(searchParam) ||
          (p.criteria_title && p.criteria_title.toLowerCase().includes(searchParam))
        )
      })
    }

    // 13. Calculate Summary Metrics
    const totalPenalties = formattedPenalties.length
    const totalPointsDeducted = formattedPenalties.reduce(
      (sum, p) => sum + p.deduction_amount,
      0
    )
    const avgDeduction = totalPenalties > 0 ? totalPointsDeducted / totalPenalties : 0
    const uniqueStudents = new Set(formattedPenalties.map((p) => p.student_id).filter(Boolean))
    const uniqueStations = new Set(formattedPenalties.map((p) => p.station_id).filter(Boolean))

    return NextResponse.json({
      success: true,
      penalties: formattedPenalties,
      summary: {
        total_penalties: totalPenalties,
        total_points_deducted: Math.round(totalPointsDeducted * 100) / 100,
        average_deduction: Math.round(avgDeduction * 100) / 100,
        impacted_students_count: uniqueStudents.size,
        impacted_stations_count: uniqueStations.size,
      },
      filters: {
        modules: assignedModules.map((m) => ({ id: m.id, name: m.module_name })),
        stations: stationsList.map((s) => {
          const ex = examMap.get(s.exam_id)
          return {
            id: s.id,
            number: s.station_number,
            title: s.title,
            moduleId: ex?.module_id,
            moduleName: ex ? moduleMap.get(ex.module_id)?.module_name : '',
          }
        }),
        academicYears,
        activeYearId,
      },
    })
  } catch (err: any) {
    console.error('API /api/professor/penalties error:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error loading penalties.' },
      { status: 500 }
    )
  }
}
