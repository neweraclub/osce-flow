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

    // 3. Query ONLY modules where responsible_prof_id matches current professor
    let modulesQuery = supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id, responsible_prof_id, created_at')
      .eq('responsible_prof_id', prof.professorId)
      .order('module_name', { ascending: true })

    if (levelIds.length > 0) {
      modulesQuery = modulesQuery.in('level_id', levelIds)
    }

    const { data: rawModules, error: modErr } = await modulesQuery
    if (modErr) throw modErr

    // If level-scoped returned empty, also check if professor has assigned modules in any level
    let finalModules = rawModules || []
    if (finalModules.length === 0 && levelIds.length > 0) {
      const { data: anyModules } = await supabaseAdmin
        .from('modules')
        .select('id, module_name, level_id, responsible_prof_id, created_at')
        .eq('responsible_prof_id', prof.professorId)
        .order('module_name', { ascending: true })

      if (anyModules && anyModules.length > 0) {
        // Fetch level names for these modules
        const extraLevelIds = anyModules.map((m) => m.level_id)
        const { data: extraLevels } = await supabaseAdmin
          .from('study_levels')
          .select('id, level_name')
          .in('id', extraLevelIds)

        ;(extraLevels || []).forEach((el) => levelMap.set(el.id, el.level_name))
        finalModules = anyModules
      }
    }

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
