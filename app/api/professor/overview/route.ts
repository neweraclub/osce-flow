import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'
import { isAcademicYearCurrent, sortAcademicYears } from '@/lib/academicYearUtils'

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
    const academicYearIdParam = searchParams.get('academic_year_id')

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

    const activeYearId = activeYear ? activeYear.id : null

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

    // Scope strictly to active study levels if activeYearId was provided and levels exist
    const assignedModules = (rawProfModules || []).filter((m) => {
      if (activeYearId && levelIds.length > 0) {
        return levelIds.includes(m.level_id)
      }
      return true
    })

    const assignedModuleIds = assignedModules.map((m) => m.id)
    const assignedModuleMap = new Map(assignedModules.map((m) => [m.id, m]))

    // 4. Query ONLY stations belonging to these assigned modules
    let stationsList: any[] = []
    if (assignedModuleIds.length > 0) {
      const { data: rawStations, error: stationsErr } = await supabaseAdmin
        .from('stations')
        .select('*')
        .in('module_id', assignedModuleIds)
        .order('station_number', { ascending: true })

      if (stationsErr) throw stationsErr
      stationsList = rawStations || []
    }

    const stationIds = stationsList.map((s) => s.id)

    // 5. Fetch exams linked to these stations
    let linkedExamsList: any[] = []
    if (stationIds.length > 0) {
      const { data: exData } = await supabaseAdmin
        .from('exams')
        .select('*')
        .in('station_id', stationIds)
        .order('exam_date', { ascending: true })

      linkedExamsList = exData || []
    }

    const examIds = linkedExamsList.map((e) => e.id)
    const examsByStation = new Map<string, any[]>()
    linkedExamsList.forEach((e) => {
      const list = examsByStation.get(e.station_id) || []
      list.push(e)
      examsByStation.set(e.station_id, list)
    })

    // 6. Fetch questions for these exams
    const questionsCountMap = new Map<string, number>()
    if (examIds.length > 0) {
      const { data: questions } = await supabaseAdmin
        .from('questions')
        .select('id, exam_id')
        .in('exam_id', examIds)

      ;(questions || []).forEach((q) => {
        questionsCountMap.set(q.exam_id, (questionsCountMap.get(q.exam_id) || 0) + 1)
      })
    }

    const formattedModules = assignedModules.map((m) => ({
      id: m.id,
      module_name: m.module_name,
      level_id: m.level_id,
      level_name: levelMap.get(m.level_id) || 'General Level',
      total_exams: 0,
      created_at: m.created_at,
    }))

    // Format stations list
    const assignedStations = stationsList.map((st) => {
      const mod = assignedModuleMap.get(st.module_id)
      const lvl = mod ? levelObjectMap.get(mod.level_id) : null
      const stExams = examsByStation.get(st.id) || []
      const totalQuestions = stExams.reduce(
        (sum, e) => sum + (questionsCountMap.get(e.id) || 0),
        0
      )
      const isReady = totalQuestions > 0
      const firstExam = stExams[0]
      const linked_exam = firstExam
        ? {
            id: firstExam.id,
            module_name: mod ? mod.module_name : 'General Module',
            level_name: lvl ? lvl.level_name : 'General Level',
            section_name: firstExam.section_name || 'All Sections',
            group_name: firstExam.group_name || 'All Groups',
            session_type: firstExam.session_type || 'regular',
            exam_date: firstExam.exam_date,
          }
        : null

      return {
        id: st.id,
        module_id: st.module_id,
        station_number: st.station_number,
        title: st.title,
        access_pin: st.access_pin,
        weightage_percentage: Number(st.weightage_percentage || 0),
        created_at: st.created_at,
        question_count: totalQuestions,
        exam_count: stExams.length,
        status: isReady ? 'ready' : 'incomplete',
        status_label: isReady ? 'Rubric Ready' : 'Incomplete Rubric',
        linked_exam,
        module_name: mod ? mod.module_name : 'General Module',
        level_id: mod?.level_id || null,
        level_name: lvl ? lvl.level_name : 'General Level',
        academic_year_id: lvl?.academic_year_id || activeYearId || '',
        academic_year_label: (lvl && yearLabelMap.get(lvl.academic_year_id)) || activeYear?.name || '',
      }
    })

    // Format upcoming exams list
    const formattedUpcomingExams = linkedExamsList.map((e) => {
      const st = stationsList.find((s) => s.id === e.station_id)
      const mod = st ? assignedModuleMap.get(st.module_id) : null
      const lvl = mod ? levelObjectMap.get(mod.level_id) : null

      return {
        id: e.id,
        station_id: e.station_id,
        station_title: st ? st.title : 'Station',
        station_number: st ? st.station_number : 1,
        module_name: mod ? mod.module_name : 'Clinical Exam',
        level_name: lvl ? lvl.level_name : '',
        session_type: e.session_type || 'regular',
        exam_date: e.exam_date,
        question_count: questionsCountMap.get(e.id) || 0,
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
