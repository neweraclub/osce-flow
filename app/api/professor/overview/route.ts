import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'
import { isAcademicYearCurrent, sortAcademicYears } from '@/lib/academicYearUtils'
import { getStationSlug } from '@/lib/stationSlug'

export async function GET(req: NextRequest) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Professor access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const academicYearIdParam =
      searchParams.get('academic_year_id') ||
      req.cookies.get('selected_academic_year_id')?.value

    // 1. Fetch academic years for faculty
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

    // 2. Fetch study levels scoped by active year
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
    const levelMap = new Map(studyLevels.map((l) => [l.id, l.level_name]))
    const levelObjectMap = new Map(studyLevels.map((l) => [l.id, l]))
    const yearLabelMap = new Map(academicYears.map((y) => [y.id, y.name || y.year_label]))

    // 3. Query ONLY modules assigned to this professor (by professorId or userId)
    const { data: rawProfModules, error: modErr } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id, responsible_prof_id, created_at')
      .or(`responsible_prof_id.eq.${prof.professorId},responsible_prof_id.eq.${prof.userId}`)
      .order('module_name', { ascending: true })

    if (modErr) throw modErr

    // Scope strictly to active study levels if activeYearId was provided
    let assignedModules = (rawProfModules || []).filter((m) => {
      if (activeYearId) {
        return levelIds.includes(m.level_id)
      }
      return true
    })

    // Fallback: If no modules directly assigned via responsible_prof_id, include modules belonging to the faculty's study levels for the active year
    if (assignedModules.length === 0 && levelIds.length > 0) {
      const { data: facultyModules } = await supabaseAdmin
        .from('modules')
        .select('id, module_name, level_id, responsible_prof_id, created_at')
        .in('level_id', levelIds)
        .order('module_name', { ascending: true })

      assignedModules = facultyModules || []
    }

    const assignedModuleIds = assignedModules.map((m) => m.id)
    const assignedModuleMap = new Map(assignedModules.map((m) => [m.id, m]))

    // 4. Query Exams for assigned modules
    let examsList: any[] = []
    if (assignedModuleIds.length > 0) {
      const { data: rawExams, error: examsErr } = await supabaseAdmin
        .from('exams')
        .select('*')
        .in('module_id', assignedModuleIds)
        .order('exam_date', { ascending: true })

      if (examsErr) throw examsErr
      examsList = rawExams || []
    }

    const examIds = examsList.map((e) => e.id)
    const examMap = new Map(examsList.map((e) => [e.id, e]))

    // 5. Query stations belonging to these exams (normalized: stations.exam_id)
    let stationsList: any[] = []
    if (examIds.length > 0) {
      const { data: rawStations, error: stationsErr } = await supabaseAdmin
        .from('stations')
        .select('*')
        .in('exam_id', examIds)
        .order('station_number', { ascending: true })

      if (stationsErr) throw stationsErr
      stationsList = rawStations || []
    }

    const stationIds = stationsList.map((s) => s.id)

    // 6. Fetch questions for these stations (questions.station_id)
    const questionsCountMap = new Map<string, number>()
    if (stationIds.length > 0) {
      const { data: questions } = await supabaseAdmin
        .from('questions')
        .select('id, station_id')
        .in('station_id', stationIds)

      ;(questions || []).forEach((q) => {
        questionsCountMap.set(q.station_id, (questionsCountMap.get(q.station_id) || 0) + 1)
      })
    }

    // 7. Calculate real-time candidate completion progress per station
    const stationProgressMap = new Map<
      string,
      { completed_count: number; total_candidates: number; progress_percentage: number }
    >()

    if (stationIds.length > 0) {
      const { data: completedAttempts } = await supabaseAdmin
        .from('exam_attempts')
        .select('id, station_id, status')
        .in('station_id', stationIds)
        .in('status', ['submitted', 'completed', 'certified', 'graded', 'passed'])

      // Total students in cohorts
      let totalCohortStudents = 0
      if (levelIds.length > 0) {
        const { count } = await supabaseAdmin
          .from('students')
          .select('id, groups!inner(section_id, sections!inner(level_id))', { count: 'exact', head: true })
          .in('groups.sections.level_id', levelIds)
        totalCohortStudents = count || 0
      }

      const completedMap = new Map<string, number>()
      ;(completedAttempts || []).forEach((att) => {
        completedMap.set(att.station_id, (completedMap.get(att.station_id) || 0) + 1)
      })

      stationIds.forEach((sid) => {
        const completed = completedMap.get(sid) || 0
        const pct = totalCohortStudents > 0 ? Math.round((completed / totalCohortStudents) * 100) : 0
        stationProgressMap.set(sid, {
          completed_count: completed,
          total_candidates: totalCohortStudents,
          progress_percentage: pct,
        })
      })
    }

    // Format stations list
    const assignedStations = stationsList.map((st) => {
      const linkedExam = examMap.get(st.exam_id)
      const mod = linkedExam ? assignedModuleMap.get(linkedExam.module_id) : null
      const lvl = mod ? levelObjectMap.get(mod.level_id) : null
      const totalQuestions = questionsCountMap.get(st.id) || 0
      const isReady = totalQuestions > 0

      const progress = stationProgressMap.get(st.id) || {
        completed_count: 0,
        total_candidates: 0,
        progress_percentage: 0,
      }

      return {
        id: st.id,
        exam_id: st.exam_id,
        module_id: linkedExam?.module_id || null,
        station_number: st.station_number,
        title: st.title,
        access_pin: st.access_pin,
        weightage_percentage: Number(st.weightage_percentage || 50),
        created_at: st.created_at,
        question_count: totalQuestions,
        exam_count: linkedExam ? 1 : 0,
        status: isReady ? 'ready' : 'incomplete',
        status_label: isReady ? 'Checklist Ready' : 'Incomplete Checklist',
        progress,
        slug: getStationSlug({
          station_number: st.station_number,
          module_name: mod?.module_name,
          id: st.id,
        }),
        linked_exam: linkedExam
          ? {
              id: linkedExam.id,
              module_name: mod ? mod.module_name : 'General Module',
              level_name: lvl ? lvl.level_name : 'General Level',
              session_type: linkedExam.session_type || 'regular',
              exam_date: linkedExam.exam_date,
            }
          : null,
        module_name: mod ? mod.module_name : 'General Module',
        level_id: mod?.level_id || null,
        level_name: lvl ? lvl.level_name : 'General Level',
        academic_year_id: lvl?.academic_year_id || activeYearId || '',
        academic_year_label: (lvl && yearLabelMap.get(lvl.academic_year_id)) || activeYear?.name || '',
      }
    })

    // Format upcoming exams list
    const formattedUpcomingExams = examsList.map((e) => {
      const mod = assignedModuleMap.get(e.module_id)
      const lvl = mod ? levelObjectMap.get(mod.level_id) : null
      const examStations = stationsList.filter((s) => s.exam_id === e.id)
      const firstStation = examStations[0] || null

      return {
        id: e.id,
        exam_id: e.id,
        station_id: firstStation ? firstStation.id : null,
        station_title: firstStation ? firstStation.title : 'All Stations',
        station_number: firstStation ? firstStation.station_number : 1,
        module_name: mod ? mod.module_name : 'Clinical Exam',
        level_name: lvl ? lvl.level_name : '',
        session_type: e.session_type || 'regular',
        exam_date: e.exam_date,
        question_count: examStations.reduce((sum, s) => sum + (questionsCountMap.get(s.id) || 0), 0),
      }
    })

    return NextResponse.json({
      success: true,
      professor: {
        id: prof.professorId,
        user_id: prof.userId,
        first_name: prof.firstName,
        last_name: prof.lastName,
        full_name: prof.fullName,
        email: prof.email,
        faculty_name: prof.facultyName,
      },
      academicYears,
      activeYearId,
      selectedYear: activeYear,
      stats: {
        assignedModulesCount: assignedModules.length,
        assignedStationsCount: assignedStations.length,
        upcomingSessionsCount: formattedUpcomingExams.length,
        readyStationsCount: assignedStations.filter((s) => s.status === 'ready').length,
        pendingStationsCount: assignedStations.filter((s) => s.status === 'incomplete' || s.status === 'needs_setup').length,
        completedAssessmentsCount: Array.from(stationProgressMap.values()).reduce((sum, p) => sum + p.completed_count, 0),
      },
      modules: assignedModules,
      stations: assignedStations,
      upcomingExams: formattedUpcomingExams,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch professor overview.' },
      { status: 500 }
    )
  }
}
