import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'
import { isAcademicYearCurrent, sortAcademicYears } from '@/lib/academicYearUtils'

export async function GET(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized access.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const reqYearId = searchParams.get('academic_year_id')

    // 1. Fetch Academic Years for this faculty
    const { data: rawYears } = await supabaseAdmin
      .from('academic_years')
      .select('id, year_label, created_at')
      .eq('faculty_id', dean.facultyId)

    const years = sortAcademicYears(rawYears || []).map((y) => ({
      ...y,
      name: y.year_label,
      is_current: typeof (y as any).is_current === 'boolean' ? (y as any).is_current : isAcademicYearCurrent(y.year_label),
    }))

    const activeYear =
      (reqYearId ? years.find((y) => y.id === reqYearId) : null) ||
      years.find((y) => y.is_current) ||
      (years.length > 0 ? years[0] : null)

    // 2. Fetch Sections belonging to active year or faculty years (via study_levels)
    const yearIds = activeYear ? [activeYear.id] : years.map((y) => y.id)
    
    let totalSections = 0
    let totalGroups = 0
    let groupIds: string[] = []

    if (yearIds.length > 0) {
      const { data: levels } = await supabaseAdmin
        .from('study_levels')
        .select('id')
        .in('academic_year_id', yearIds)

      const levelIds = (levels || []).map((l) => l.id)

      if (levelIds.length > 0) {
        const { data: sections } = await supabaseAdmin
          .from('sections')
          .select('id')
          .in('level_id', levelIds)

        totalSections = (sections || []).length
        const sectionIds = (sections || []).map((s) => s.id)

        if (sectionIds.length > 0) {
          const { data: groups } = await supabaseAdmin
            .from('groups')
            .select('id')
            .in('section_id', sectionIds)

          totalGroups = (groups || []).length
          groupIds = (groups || []).map((g) => g.id)
        }
      }
    }

    // 3. Count Students in those groups
    let totalStudents = 0
    if (groupIds.length > 0) {
      const { count } = await supabaseAdmin
        .from('students')
        .select('matricule', { count: 'exact' })
        .in('group_id', groupIds)

      totalStudents = count || 0
    }

    // 4. Count Professors in this faculty
    const { data: profUsers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('faculty_id', dean.facultyId)

    const userIds = (profUsers || []).map((u) => u.id)
    let totalProfessors = 0

    if (userIds.length > 0) {
      const { count: profCount } = await supabaseAdmin
        .from('professors')
        .select('id', { count: 'exact' })
        .in('user_id', userIds)

      totalProfessors = profCount || 0
    }

    // 5. Count Modules
    const { count: totalModules } = await supabaseAdmin
      .from('modules')
      .select('id', { count: 'exact' })

    return NextResponse.json({
      success: true,
      faculty: {
        id: dean.facultyId,
        name: dean.facultyName,
      },
      activeAcademicYear: activeYear ? activeYear.year_label : 'No active academic year',
      stats: {
        totalAcademicYears: (years || []).length,
        totalSections,
        totalGroups,
        totalStudents,
        totalProfessors,
        totalModules: totalModules || 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch overview.' }, { status: 500 })
  }
}
