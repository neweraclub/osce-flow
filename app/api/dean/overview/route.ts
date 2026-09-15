import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'
import { isAcademicYearCurrent, sortAcademicYears } from '@/lib/academicYearUtils'
import { getFacultyHierarchyIds } from '@/lib/facultyScope'

export async function GET(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized access.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const reqYearId = searchParams.get('academic_year_id')

    // 1. Fetch Academic Years strictly for this faculty
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

    // 2. Fetch scoped relational hierarchy strictly within the Dean's faculty
    // If a specific year is active/selected, scope to that academic year; otherwise all faculty years
    const hierarchy = await getFacultyHierarchyIds(dean.facultyId, activeYear?.id || null)

    const totalSections = hierarchy.sectionIds.length
    const totalGroups = hierarchy.groupIds.length

    // 3. Count Students strictly in those scoped groups
    // students.group_id -> groups.section_id -> sections.level_id -> study_levels.academic_year_id -> academic_years.faculty_id
    let totalStudents = 0
    if (hierarchy.groupIds.length > 0) {
      const { count } = await supabaseAdmin
        .from('students')
        .select('id', { count: 'exact' })
        .in('group_id', hierarchy.groupIds)

      totalStudents = count || 0
    }

    // 4. Count Professors strictly in this faculty
    // professors.user_id -> users.faculty_id
    let totalProfessors = 0
    if (hierarchy.userIds.length > 0) {
      const { count: profCount } = await supabaseAdmin
        .from('professors')
        .select('id', { count: 'exact' })
        .in('user_id', hierarchy.userIds)

      totalProfessors = profCount || 0
    }

    // 5. Count Clinical Modules strictly belonging to this faculty
    // modules.level_id -> study_levels.academic_year_id -> academic_years.faculty_id
    const totalModules = hierarchy.moduleIds.length

    // 6. Count Exams & Clinical Stations strictly belonging to this faculty
    // stations.exam_id -> exams.module_id -> modules.level_id -> study_levels.academic_year_id -> academic_years.faculty_id
    const totalExams = hierarchy.examIds.length
    let totalStations = 0
    if (hierarchy.examIds.length > 0) {
      const { count: stationCount } = await supabaseAdmin
        .from('stations')
        .select('id', { count: 'exact' })
        .in('exam_id', hierarchy.examIds)

      totalStations = stationCount || 0
    }

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
        totalModules,
        totalExams,
        totalStations,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch overview.' }, { status: 500 })
  }
}
