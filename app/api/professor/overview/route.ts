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
    }

    const levelIds = studyLevels.map((l) => l.id)
    const levelMap = new Map(studyLevels.map((l) => [l.id, l.level_name]))

    // 3. Fetch modules where professor is the responsible lead
    let assignedModules: any[] = []
    if (levelIds.length > 0) {
      const { data: rawModules, error: modErr } = await supabaseAdmin
        .from('modules')
        .select('id, module_name, level_id, responsible_prof_id, created_at')
        .eq('responsible_prof_id', prof.professorId)
        .in('level_id', levelIds)
        .order('module_name', { ascending: true })

      if (modErr) throw modErr

      const moduleIds = (rawModules || []).map((m) => m.id)

      // Fetch exams count per module
      const examsCountMap = new Map<string, number>()
      if (moduleIds.length > 0) {
        const { data: moduleExams } = await supabaseAdmin
          .from('exams')
          .select('id, module_id')
          .in('module_id', moduleIds)

        ;(moduleExams || []).forEach((e) => {
          examsCountMap.set(e.module_id, (examsCountMap.get(e.module_id) || 0) + 1)
        })
      }

      assignedModules = (rawModules || []).map((m) => ({
        id: m.id,
        module_name: m.module_name,
        level_id: m.level_id,
        level_name: levelMap.get(m.level_id) || 'Unassigned',
        total_exams: examsCountMap.get(m.id) || 0,
        created_at: m.created_at,
      }))
    }

    // 4. Fetch sections and groups for display context
    let sectionsList: any[] = []
    let groupsList: any[] = []

    if (levelIds.length > 0) {
      const { data: secs } = await supabaseAdmin
        .from('sections')
        .select('id, section_name, level_id')
        .in('level_id', levelIds)

      sectionsList = secs || []
      const sectionIds = sectionsList.map((s) => s.id)
      const sectionMap = new Map(sectionsList.map((s) => [s.id, s]))

      if (sectionIds.length > 0) {
        const { data: grps } = await supabaseAdmin
          .from('groups')
          .select('id, group_name, section_id')
          .in('section_id', sectionIds)

        groupsList = (grps || []).map((g) => {
          const sec = sectionMap.get(g.section_id)
          const lvlName = sec ? levelMap.get(sec.level_id) || '' : ''
          return {
            id: g.id,
            group_name: g.group_name,
            section_name: sec ? sec.section_name : 'Unassigned',
            level_name: lvlName,
          }
        })
      }
    }

    const groupMap = new Map(groupsList.map((g) => [g.id, g]))

    // 5. Fetch all modules for this year to map exam titles
    let allYearModules: any[] = []
    if (levelIds.length > 0) {
      const { data: allMods } = await supabaseAdmin
        .from('modules')
        .select('id, module_name, level_id')
        .in('level_id', levelIds)
      allYearModules = allMods || []
    }
    const allModuleMap = new Map(allYearModules.map((m) => [m.id, m]))

    // 6. Fetch stations assigned to this professor as Invigilator
    const { data: rawStations, error: stationsErr } = await supabaseAdmin
      .from('stations')
      .select('id, exam_id, station_number, title, access_pin, invigilator_prof_id, created_at')
      .eq('invigilator_prof_id', prof.professorId)
      .order('station_number', { ascending: true })

    if (stationsErr) throw stationsErr

    const stationIds = (rawStations || []).map((s) => s.id)
    const stationExamIds = (rawStations || []).map((s) => s.exam_id).filter(Boolean) as string[]

    // Fetch questions count for each station to determine "Ready" vs "Needs Checklist Setup"
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

    // Fetch exams linked to these stations
    let linkedExamsList: any[] = []
    if (stationExamIds.length > 0) {
      const { data: exData } = await supabaseAdmin
        .from('exams')
        .select('id, module_id, group_id, session_type, exam_date')
        .in('id', stationExamIds)

      linkedExamsList = exData || []
    }

    const examMap = new Map<string, any>()
    linkedExamsList.forEach((e) => {
      const mod = allModuleMap.get(e.module_id)
      const grp = groupMap.get(e.group_id)
      examMap.set(e.id, {
        id: e.id,
        module_id: e.module_id,
        module_name: mod ? mod.module_name : 'Clinical Exam',
        level_name: grp ? grp.level_name : (mod ? levelMap.get(mod.level_id) || '' : ''),
        section_name: grp ? grp.section_name : 'Unassigned',
        group_name: grp ? grp.group_name : 'Unassigned',
        session_type: e.session_type || 'regular',
        exam_date: e.exam_date,
      })
    })

    // Format stations list
    const assignedStations = (rawStations || []).map((st) => {
      const linkedExam = st.exam_id ? examMap.get(st.exam_id) : null
      const questionCount = questionsCountMap.get(st.id) || 0
      const isReady = questionCount > 0

      return {
        id: st.id,
        station_number: st.station_number,
        title: st.title,
        access_pin: st.access_pin,
        exam_id: st.exam_id || null,
        created_at: st.created_at,
        question_count: questionCount,
        status: isReady ? 'ready' : 'needs_setup',
        status_label: isReady ? 'Ready' : 'Needs Checklist Setup',
        linked_exam: linkedExam || null,
      }
    })

    // 7. Upcoming OSCE sessions involving this professor
    const upcomingExamsList: any[] = []
    const seenExamIds = new Set<string>()

    linkedExamsList.forEach((e) => {
      if (!seenExamIds.has(e.id)) {
        seenExamIds.add(e.id)
        const formatted = examMap.get(e.id)
        if (formatted) {
          upcomingExamsList.push(formatted)
        }
      }
    })

    upcomingExamsList.sort(
      (a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
    )

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
        upcomingSessionsCount: upcomingExamsList.length,
        readyStationsCount: assignedStations.filter((s) => s.status === 'ready').length,
        pendingStationsCount: assignedStations.filter((s) => s.status === 'needs_setup').length,
      },
      modules: assignedModules,
      stations: assignedStations,
      upcomingExams: upcomingExamsList,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch professor overview.' },
      { status: 500 }
    )
  }
}
