import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'
import { isAcademicYearCurrent, sortAcademicYears } from '@/lib/academicYearUtils'
import { getStationSlug } from '@/lib/stationSlug'

export async function GET(req: NextRequest) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const academicYearIdParam = searchParams.get('academic_year_id')
    const examIdParam = searchParams.get('exam_id')
    const moduleIdParam = searchParams.get('module_id')

    // 1. Fetch academic years
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
    const yearLabelMap = new Map(academicYears.map((y) => [y.id, y.name || y.year_label]))

    // 3. Query ONLY modules assigned to this professor
    const { data: rawProfModules, error: modErr } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id, responsible_prof_id, created_at')
      .or(`responsible_prof_id.eq.${prof.professorId},responsible_prof_id.eq.${prof.userId}`)
      .order('module_name', { ascending: true })

    if (modErr) throw modErr

    // Scope to active study levels if activeYearId was provided and levels exist
    const activeModules = (rawProfModules || []).filter((m) => {
      if (activeYearId && levelIds.length > 0) {
        return levelIds.includes(m.level_id)
      }
      return true
    })

    const activeModuleIds = activeModules.map((m) => m.id)
    const moduleMap = new Map(activeModules.map((m) => [m.id, m]))

    if (activeModuleIds.length === 0 && !examIdParam && !moduleIdParam) {
      return NextResponse.json({
        success: true,
        stations: [],
        academicYears,
        activeYearId,
      })
    }

    // 4. Resolve Exams for candidate modules to query stations by exam_id (normalized schema)
    let examsQuery = supabaseAdmin
      .from('exams')
      .select('id, module_id, session_type, exam_date')

    if (examIdParam) {
      examsQuery = examsQuery.eq('id', examIdParam)
    } else if (moduleIdParam) {
      examsQuery = examsQuery.eq('module_id', moduleIdParam)
    } else if (activeModuleIds.length > 0) {
      examsQuery = examsQuery.in('module_id', activeModuleIds)
    }

    const { data: relatedExams, error: examsErr } = await examsQuery
    if (examsErr) throw examsErr

    const examsList = relatedExams || []
    const examMap = new Map(examsList.map((e) => [e.id, e]))
    const targetExamIds = examsList.map((e) => e.id)

    if (targetExamIds.length === 0 && !examIdParam) {
      return NextResponse.json({
        success: true,
        stations: [],
        academicYears,
        activeYearId,
      })
    }

    // 5. Query stations strictly by exam_id
    let stationQuery = supabaseAdmin
      .from('stations')
      .select('*')
      .order('station_number', { ascending: true })

    if (examIdParam) {
      stationQuery = stationQuery.eq('exam_id', examIdParam)
    } else {
      stationQuery = stationQuery.in('exam_id', targetExamIds)
    }

    const { data: rawStations, error: stationsErr } = await stationQuery
    if (stationsErr) throw stationsErr

    const stationIds = (rawStations || []).map((s) => s.id)

    // 6. Fetch Question counts strictly by station_id (questions.station_id)
    const questionsCountMap = new Map<string, number>()
    if (stationIds.length > 0) {
      const { data: qData } = await supabaseAdmin
        .from('questions')
        .select('id, station_id')
        .in('station_id', stationIds)

      ;(qData || []).forEach((q) => {
        questionsCountMap.set(q.station_id, (questionsCountMap.get(q.station_id) || 0) + 1)
      })
    }

    const formattedStations = (rawStations || []).map((st) => {
      const linkedExam = examMap.get(st.exam_id)
      const targetModuleId = linkedExam?.module_id
      const mod = targetModuleId ? moduleMap.get(targetModuleId) : null
      const lvl = mod ? levelMap.get(mod.level_id) : null
      const yrLabel = mod ? yearLabelMap.get(mod.level_id) : activeYear?.name
      const questionsCount = questionsCountMap.get(st.id) || 0
      const isReady = questionsCount > 0

      return {
        id: st.id,
        exam_id: st.exam_id,
        module_id: targetModuleId || null,
        station_number: st.station_number,
        title: st.title,
        access_pin: st.access_pin,
        weightage_percentage: Number(st.weightage_percentage || 0),
        module_name: mod ? mod.module_name : 'General Module',
        level_id: mod?.level_id || null,
        level_name: lvl || 'General Level',
        academic_year_id: activeYearId,
        academic_year_label: yrLabel || '',
        exam_count: linkedExam ? 1 : 0,
        question_count: questionsCount,
        status: isReady ? 'ready' : 'incomplete',
        status_label: isReady ? 'Checklist Ready' : 'Incomplete Checklist',
        slug: getStationSlug({
          station_number: st.station_number,
          module_name: mod ? mod.module_name : undefined,
          id: st.id,
        }),
        created_at: st.created_at,
        linked_exam: linkedExam
          ? {
              id: linkedExam.id,
              module_name: mod ? mod.module_name : 'General Module',
              level_name: lvl || 'General Level',
              session_type: linkedExam.session_type || 'regular',
              exam_date: linkedExam.exam_date,
            }
          : null,
      }
    })

    return NextResponse.json({
      success: true,
      stations: formattedStations,
      academicYears,
      activeYearId,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch stations.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    let { exam_id, module_id, title, station_number, access_pin, weightage_percentage } = body

    if (!exam_id && !module_id) {
      return NextResponse.json({ success: false, error: 'Exam ID or Module ID is required.' }, { status: 400 })
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Station title is required.' }, { status: 400 })
    }

    const parsedStationNumber = Number(station_number) || 1
    if (parsedStationNumber < 1) {
      return NextResponse.json({ success: false, error: 'Station number must be at least 1.' }, { status: 400 })
    }

    const pinStr = String(access_pin || '').trim()
    if (pinStr.length < 4) {
      return NextResponse.json({ success: false, error: 'Access PIN must be at least 4 characters.' }, { status: 400 })
    }

    const weightage = Math.max(0, Math.min(100, typeof weightage_percentage !== 'undefined' && weightage_percentage !== null ? Number(weightage_percentage) : 50))

    // Resolve target exam session
    let targetExam: any = null
    if (exam_id) {
      const { data: ex } = await supabaseAdmin
        .from('exams')
        .select('id, module_id, session_type')
        .eq('id', exam_id)
        .maybeSingle()
      if (ex) {
        targetExam = ex
        module_id = ex.module_id
      }
    } else if (module_id) {
      // Find regular exam session for this module
      const { data: ex } = await supabaseAdmin
        .from('exams')
        .select('id, module_id, session_type')
        .eq('module_id', module_id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (ex) {
        targetExam = ex
        exam_id = ex.id
      }
    }

    if (!exam_id || !targetExam) {
      return NextResponse.json({ success: false, error: 'Exam session could not be resolved.' }, { status: 400 })
    }

    // Row-level authorization: Verify module belongs to this professor
    const { data: modData, error: modErr } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, responsible_prof_id')
      .eq('id', module_id)
      .single()

    if (modErr || !modData) {
      return NextResponse.json({ success: false, error: 'Selected module not found.' }, { status: 404 })
    }

    if (
      modData.responsible_prof_id !== prof.professorId &&
      modData.responsible_prof_id !== prof.userId
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You are not assigned as the lead professor for this module.' },
        { status: 403 }
      )
    }

    // Check cumulative weightage for target exam session
    const { data: sessionStations } = await supabaseAdmin
      .from('stations')
      .select('weightage_percentage')
      .eq('exam_id', exam_id)

    const currentTotal = (sessionStations || []).reduce(
      (sum, s) => sum + Number(s.weightage_percentage || 0),
      0
    )

    const availableWeightage = Math.max(0, Math.round((100 - currentTotal) * 100) / 100)

    if (currentTotal + weightage > 100) {
      return NextResponse.json(
        {
          success: false,
          error: `Total station weightage for this session cannot exceed 100% (Maximum available: ${availableWeightage}%).`,
        },
        { status: 400 }
      )
    }

    // Insert payload strictly conforming to normalized schema (exam_id, station_number, title, access_pin, weightage_percentage)
    const insertPayload = {
      exam_id: exam_id,
      station_number: parsedStationNumber,
      title: title.trim(),
      access_pin: pinStr,
      weightage_percentage: weightage,
    }

    const { data: newStation, error: insertErr } = await supabaseAdmin
      .from('stations')
      .insert([insertPayload])
      .select()
      .single()

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'This Access PIN is already in use by another station. Please choose another PIN.' },
          { status: 400 }
        )
      }
      throw insertErr
    }

    const createdSlug = getStationSlug({
      station_number: newStation.station_number,
      module_name: modData.module_name,
      id: newStation.id,
    })

    return NextResponse.json({
      success: true,
      station: {
        ...newStation,
        module_id: targetExam.module_id,
        module_name: modData.module_name,
        slug: createdSlug,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create station.' },
      { status: 500 }
    )
  }
}
