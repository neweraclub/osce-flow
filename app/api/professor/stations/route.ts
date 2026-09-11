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

    // 2. Fetch study levels scoped by active year
    let studyLevels: any[] = []
    if (activeYearId) {
      const { data: levels } = await supabaseAdmin
        .from('study_levels')
        .select('id, level_name, academic_year_id')
        .eq('academic_year_id', activeYearId)

      studyLevels = levels || []
    }

    const levelIds = studyLevels.map((l) => l.id)
    const levelMap = new Map(studyLevels.map((l) => [l.id, l.level_name]))

    // 3. Fetch modules for this year (where professor is responsible, or all faculty modules for this year)
    let modulesList: any[] = []
    if (levelIds.length > 0) {
      let modulesQuery = supabaseAdmin
        .from('modules')
        .select('id, module_name, level_id, responsible_prof_id')
        .in('level_id', levelIds)

      const { data: mods } = await modulesQuery
      modulesList = (mods || []).map((m) => ({
        ...m,
        level_name: levelMap.get(m.level_id) || 'General',
      }))
    }

    const moduleIds = modulesList.map((m) => m.id)
    const moduleMap = new Map(modulesList.map((m) => [m.id, m]))

    // 4. Fetch stations for these modules (or all faculty stations)
    let stationsQuery = supabaseAdmin
      .from('stations')
      .select('*')
      .order('station_number', { ascending: true })

    if (moduleIds.length > 0) {
      stationsQuery = stationsQuery.in('module_id', moduleIds)
    }

    const { data: rawStations, error: stationsErr } = await stationsQuery
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
      return {
        id: st.id,
        module_id: st.module_id,
        station_number: st.station_number,
        title: st.title,
        access_pin: st.access_pin,
        weightage_percentage: Number(st.weightage_percentage || 0),
        module_name: mod ? mod.module_name : 'General Module',
        level_name: mod ? mod.level_name : 'Study Level',
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
