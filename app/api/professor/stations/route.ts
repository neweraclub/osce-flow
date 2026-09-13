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
    const activeModules = (rawProfModules || []).filter((m) => {
      if (activeYearId && levelIds.length > 0) {
        return levelIds.includes(m.level_id)
      }
      return true
    })

    const activeModuleIds = activeModules.map((m) => m.id)
    if (activeModuleIds.length === 0) {
      return NextResponse.json({
        success: true,
        stations: [],
        academicYears,
        activeYearId,
      })
    }

    const moduleMap = new Map(activeModules.map((m) => [m.id, m]))

    // 4. Query ONLY stations where module_id is in professor's active modules
    const { data: rawStations, error: stationsErr } = await supabaseAdmin
      .from('stations')
      .select('*')
      .in('module_id', activeModuleIds)
      .order('station_number', { ascending: true })

    if (stationsErr) throw stationsErr

    const stationIds = (rawStations || []).map((s) => s.id)

    // 5. Fetch count of exams and questions scheduled per station
    const examsCountMap = new Map<string, number>()
    const examIds: string[] = []
    const examsByStation = new Map<string, any[]>()
    if (stationIds.length > 0) {
      const { data: stationExams } = await supabaseAdmin
        .from('exams')
        .select('*')
        .in('station_id', stationIds)
        .order('exam_date', { ascending: true })

      ;(stationExams || []).forEach((e) => {
        examsCountMap.set(e.station_id, (examsCountMap.get(e.station_id) || 0) + 1)
        examIds.push(e.id)
        const list = examsByStation.get(e.station_id) || []
        list.push(e)
        examsByStation.set(e.station_id, list)
      })
    }

    const questionsCountMap = new Map<string, number>()
    if (examIds.length > 0) {
      const { data: qData } = await supabaseAdmin
        .from('questions')
        .select('id, exam_id')
        .in('exam_id', examIds)

      ;(qData || []).forEach((q) => {
        questionsCountMap.set(q.exam_id, (questionsCountMap.get(q.exam_id) || 0) + 1)
      })
    }

    const formattedStations = (rawStations || []).map((st) => {
      const mod = moduleMap.get(st.module_id)
      const lvl = mod ? levelMap.get(mod.level_id) : null
      const yrLabel = lvl ? yearLabelMap.get(lvl.academic_year_id) : activeYear?.name
      const stExams = examsByStation.get(st.id) || []
      const totalQuestions = stExams.reduce(
        (sum, e) => sum + (questionsCountMap.get(e.id) || 0),
        0
      )
      const isReady = totalQuestions > 0
      const firstExam = stExams[0] || null

      return {
        id: st.id,
        module_id: st.module_id,
        station_number: st.station_number,
        title: st.title,
        access_pin: st.access_pin,
        weightage_percentage: Number(st.weightage_percentage || 0),
        module_name: mod ? mod.module_name : 'General Module',
        level_id: mod?.level_id || null,
        level_name: lvl ? lvl.level_name : 'General Level',
        academic_year_id: lvl?.academic_year_id || activeYearId,
        academic_year_label: yrLabel || '',
        exam_count: examsCountMap.get(st.id) || 0,
        question_count: totalQuestions,
        status: isReady ? 'ready' : 'incomplete',
        status_label: isReady ? 'Checklist Ready' : 'Incomplete Checklist',
        slug: getStationSlug({
          station_number: st.station_number,
          module_name: mod ? mod.module_name : undefined,
          id: st.id,
        }),
        created_at: st.created_at,
        linked_exam: firstExam
          ? {
              id: firstExam.id,
              module_name: mod ? mod.module_name : 'General Module',
              level_name: lvl ? lvl.level_name : 'General Level',
              section_name: firstExam.section_name || 'All Sections',
              group_name: firstExam.group_name || 'All Groups',
              session_type: firstExam.session_type || 'regular',
              exam_date: firstExam.exam_date,
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
    const { module_id, title, station_number, access_pin, weightage_percentage } = body

    if (!module_id) {
      return NextResponse.json({ success: false, error: 'Module selection is required.' }, { status: 400 })
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

    const weightage = Math.max(0, Math.min(100, Number(weightage_percentage) || 0))

    // Row-level authorization: Verify module belongs to this professor
    const { data: moduleCheck, error: modErr } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, responsible_prof_id')
      .eq('id', module_id)
      .single()

    if (modErr || !moduleCheck) {
      return NextResponse.json({ success: false, error: 'Selected module not found.' }, { status: 404 })
    }

    if (
      moduleCheck.responsible_prof_id !== prof.professorId &&
      moduleCheck.responsible_prof_id !== prof.userId
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You are not assigned as the lead professor for this module.' },
        { status: 403 }
      )
    }

    // Check cumulative weightage for target module
    const { data: existingStations } = await supabaseAdmin
      .from('stations')
      .select('weightage_percentage')
      .eq('module_id', module_id)

    const currentModuleTotal = (existingStations || []).reduce(
      (sum, s) => sum + Number(s.weightage_percentage || 0),
      0
    )
    const availableWeightage = Math.max(0, Math.round((100 - currentModuleTotal) * 100) / 100)

    if (currentModuleTotal + weightage > 100) {
      return NextResponse.json(
        {
          success: false,
          error: `Total station weightage for this module cannot exceed 100% (Maximum available: ${availableWeightage}%).`,
        },
        { status: 400 }
      )
    }

    const { data: newStation, error: insertErr } = await supabaseAdmin
      .from('stations')
      .insert([
        {
          module_id,
          title: title.trim(),
          station_number: parsedStationNumber,
          access_pin: pinStr,
          weightage_percentage: weightage,
        },
      ])
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
      module_name: moduleCheck.module_name,
      id: newStation.id,
    })

    return NextResponse.json({
      success: true,
      station: { ...newStation, slug: createdSlug },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create station.' },
      { status: 500 }
    )
  }
}
