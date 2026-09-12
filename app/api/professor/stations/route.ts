import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'
import { isAcademicYearCurrent, sortAcademicYears } from '@/lib/academicYearUtils'

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

    // 2. Query ONLY modules where responsible_prof_id matches current professor
    const { data: profModules, error: modErr } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id, responsible_prof_id')
      .eq('responsible_prof_id', prof.professorId)

    if (modErr) throw modErr

    const moduleIds = (profModules || []).map((m) => m.id)
    if (moduleIds.length === 0) {
      return NextResponse.json({
        success: true,
        stations: [],
        academicYears,
        activeYearId,
      })
    }

    // 3. Fetch study levels for these modules (scoped by active academic year)
    const rawLevelIds = Array.from(new Set((profModules || []).map((m) => m.level_id).filter(Boolean)))
    let levelQuery = supabaseAdmin
      .from('study_levels')
      .select('id, level_name, academic_year_id')
      .in('id', rawLevelIds)

    if (activeYearId) {
      levelQuery = levelQuery.eq('academic_year_id', activeYearId)
    }

    const { data: levels } = await levelQuery
    const validLevelIds = new Set((levels || []).map((l) => l.id))
    const levelMap = new Map((levels || []).map((l) => [l.id, l]))
    const yearLabelMap = new Map(academicYears.map((y) => [y.id, y.name || y.year_label]))

    // Filter modules to only those matching the active study levels (scoped by academic year)
    const activeModules = (profModules || []).filter((m) => validLevelIds.has(m.level_id))
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

    // 5. Fetch count of exams scheduled per station
    const examsCountMap = new Map<string, number>()
    if (stationIds.length > 0) {
      const { data: stationExams } = await supabaseAdmin
        .from('exams')
        .select('id, station_id')
        .in('station_id', stationIds)

      ;(stationExams || []).forEach((e) => {
        examsCountMap.set(e.station_id, (examsCountMap.get(e.station_id) || 0) + 1)
      })
    }

    const formattedStations = (rawStations || []).map((st) => {
      const mod = moduleMap.get(st.module_id)
      const lvl = mod ? levelMap.get(mod.level_id) : null
      const yrLabel = lvl ? yearLabelMap.get(lvl.academic_year_id) : activeYear?.name

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
        created_at: st.created_at,
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

    if (moduleCheck.responsible_prof_id !== prof.professorId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You are not assigned as the lead professor for this module.' },
        { status: 403 }
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

    return NextResponse.json({ success: true, station: newStation })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create station.' },
      { status: 500 }
    )
  }
}
