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
    const academicYearIdParam =
      searchParams.get('academic_year_id') ||
      req.cookies.get('selected_academic_year_id')?.value ||
      null

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
    }

    const levelIds = studyLevels.map((l) => l.id)
    const levelMap = new Map(studyLevels.map((l) => [l.id, l.level_name]))

    if (activeYearId && levelIds.length === 0) {
      return NextResponse.json({
        success: true,
        modules: [],
        activeYearId,
      })
    }

    // 3. Query modules assigned to this professor (by professorId or userId)
    let { data: rawModules, error: modErr } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id, responsible_prof_id, created_at')
      .or(`responsible_prof_id.eq.${prof.professorId},responsible_prof_id.eq.${prof.userId}`)
      .order('module_name', { ascending: true })

    if (modErr) throw modErr

    // If no modules specifically assigned to this professor, fallback to faculty modules for these levels
    if (!rawModules || rawModules.length === 0) {
      let facModQuery = supabaseAdmin
        .from('modules')
        .select('id, module_name, level_id, responsible_prof_id, created_at')
        .order('module_name', { ascending: true })

      if (levelIds.length > 0) {
        facModQuery = facModQuery.in('level_id', levelIds)
      }
      const { data: facModules } = await facModQuery
      rawModules = facModules || []
    }

    // Scope strictly to active levels if activeYearId was provided
    const finalModules = (rawModules || []).filter((m) => {
      if (activeYearId) {
        return levelIds.includes(m.level_id)
      }
      return true
    })

    const formattedModules = finalModules.map((m) => ({
      id: m.id,
      module_name: m.module_name,
      level_id: m.level_id,
      level_name: levelMap.get(m.level_id) || 'General Level',
      responsible_prof_id: m.responsible_prof_id,
      created_at: m.created_at,
    }))

    return NextResponse.json({
      success: true,
      modules: formattedModules,
      activeYearId,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch assigned modules.' },
      { status: 500 }
    )
  }
}
