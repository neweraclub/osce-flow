import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const selectedFacultyId = searchParams.get('faculty_id')

    // 1. Fetch faculties from database
    const { data: faculties, error: facError } = await supabaseAdmin
      .from('faculties')
      .select('id, name')
      .order('name', { ascending: true })

    if (facError) throw facError

    // 2. Fetch active deans
    const { data: deans, error: deansError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email, faculty_id, is_active')
      .eq('role', 'dean')
      .eq('is_active', true)

    if (deansError) throw deansError

    // 3. Fetch professors and professor users
    const { data: profUsers, error: profUsersError } = await supabaseAdmin
      .from('users')
      .select('id, faculty_id, first_name, last_name, email, is_active')
      .eq('role', 'professor')
      .eq('is_active', true)

    if (profUsersError) throw profUsersError

    // 4. Fetch full academic hierarchy for accurate student, cohort, and module aggregation
    const { data: academicYears } = await supabaseAdmin
      .from('academic_years')
      .select('id, year_label, faculty_id')

    const { data: studyLevelsData } = await supabaseAdmin
      .from('study_levels')
      .select('id, level_name, academic_year_id')

    const { data: sectionsData } = await supabaseAdmin
      .from('sections')
      .select('id, level_id')

    const { data: groupsData } = await supabaseAdmin
      .from('groups')
      .select('id, section_id')

    const { data: studentsData } = await supabaseAdmin
      .from('students')
      .select('matricule, group_id')

    const { data: modulesData } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id')

    const { data: examsData } = await supabaseAdmin
      .from('exams')
      .select('id, module_id')

    // Build hierarchy lookup maps
    const groupToSection = new Map((groupsData || []).map((g) => [g.id, g.section_id]))
    const sectionToLevel = new Map((sectionsData || []).map((s) => [s.id, s.level_id]))
    const levelToYear = new Map((studyLevelsData || []).map((l) => [l.id, l.academic_year_id]))
    const yearToFaculty = new Map((academicYears || []).map((y) => [y.id, y.faculty_id]))
    const levelIdToName = new Map((studyLevelsData || []).map((l) => [l.id, l.level_name]))
    const moduleToLevel = new Map((modulesData || []).map((m) => [m.id, m.level_id]))

    const getFacultyForGroup = (groupId: string): string | null => {
      const secId = groupToSection.get(groupId)
      if (!secId) return null
      const lvlId = sectionToLevel.get(secId)
      if (!lvlId) return null
      const yrId = levelToYear.get(lvlId)
      if (!yrId) return null
      return yearToFaculty.get(yrId) || null
    }

    const getFacultyForLevel = (levelId: string): string | null => {
      const yrId = levelToYear.get(levelId)
      if (!yrId) return null
      return yearToFaculty.get(yrId) || null
    }

    const getLevelNameForGroup = (groupId: string): string | null => {
      const secId = groupToSection.get(groupId)
      if (!secId) return null
      const lvlId = sectionToLevel.get(secId)
      if (!lvlId) return null
      return levelIdToName.get(lvlId) || null
    }

    // 5. Per-faculty aggregations
    const studentsByFaculty = new Map<string, number>()
    ;(studentsData || []).forEach((st) => {
      const facId = getFacultyForGroup(st.group_id)
      if (facId) {
        studentsByFaculty.set(facId, (studentsByFaculty.get(facId) || 0) + 1)
      }
    })

    const cohortsByFaculty = new Map<string, number>()
    ;(groupsData || []).forEach((g) => {
      const facId = getFacultyForGroup(g.id)
      if (facId) {
        cohortsByFaculty.set(facId, (cohortsByFaculty.get(facId) || 0) + 1)
      }
    })

    // Count active professors strictly assigned to each faculty
    const profsByFaculty = new Map<string, number>()
    ;(profUsers || []).forEach((u) => {
      if (u.faculty_id) {
        profsByFaculty.set(u.faculty_id, (profsByFaculty.get(u.faculty_id) || 0) + 1)
      }
    })

    // Count modules per faculty
    const modulesByFaculty = new Map<string, number>()
    ;(modulesData || []).forEach((m) => {
      const facId = getFacultyForLevel(m.level_id)
      if (facId) {
        modulesByFaculty.set(facId, (modulesByFaculty.get(facId) || 0) + 1)
      }
    })

    // Count exams per faculty
    const examsByFaculty = new Map<string, number>()
    ;(examsData || []).forEach((e) => {
      const lvlId = moduleToLevel.get(e.module_id)
      if (lvlId) {
        const facId = getFacultyForLevel(lvlId)
        if (facId) {
          examsByFaculty.set(facId, (examsByFaculty.get(facId) || 0) + 1)
        }
      }
    })

    const deanByFaculty = new Map<string, any>()
    ;(deans || []).forEach((d) => {
      if (d.faculty_id) {
        deanByFaculty.set(d.faculty_id, d)
      }
    })

    // 6. Faculty Capacity Breakdown based strictly on real DB rows
    const facultyCapacity = (faculties || []).map((f) => {
      const boundDean = deanByFaculty.get(f.id)
      const shortName = f.name
        .replace(/^Faculté de Médecine d'|^Faculty of Medicine of\s+/i, '')
        .replace(/\s*\([^)]*\)/g, '')
        .trim() || f.name

      return {
        id: f.id,
        facultyName: f.name,
        shortName,
        studentsCount: studentsByFaculty.get(f.id) || 0,
        professorsCount: profsByFaculty.get(f.id) || 0,
        modulesCount: modulesByFaculty.get(f.id) || 0,
        cohortsCount: cohortsByFaculty.get(f.id) || 0,
        examsCount: examsByFaculty.get(f.id) || 0,
        hasDean: !!boundDean,
        deanName: boundDean ? `Prof. ${boundDean.first_name} ${boundDean.last_name}` : undefined,
      }
    })

    // 7. Study Level Distribution (Students by Study Level Donut Chart)
    // Filtered by selectedFacultyId if provided, or across all faculties
    const levelCounts: Record<string, number> = {
      '4th Year': 0,
      '5th Year': 0,
      '6th Year': 0,
    }

    let scopedStudentsCount = 0
    ;(studentsData || []).forEach((st) => {
      const facId = getFacultyForGroup(st.group_id)
      if (selectedFacultyId && selectedFacultyId !== 'all' && facId !== selectedFacultyId) {
        return
      }
      scopedStudentsCount++
      const lvlName = getLevelNameForGroup(st.group_id)
      if (lvlName && levelCounts[lvlName] !== undefined) {
        levelCounts[lvlName] += 1
      }
    })

    const studyLevelDistribution = [
      {
        name: '4th Year Medicine',
        count: levelCounts['4th Year'] || 0,
        percentage: scopedStudentsCount > 0 ? Number(((levelCounts['4th Year'] / scopedStudentsCount) * 100).toFixed(1)) : 0,
        color: '#0284c7',
      },
      {
        name: '5th Year Medicine',
        count: levelCounts['5th Year'] || 0,
        percentage: scopedStudentsCount > 0 ? Number(((levelCounts['5th Year'] / scopedStudentsCount) * 100).toFixed(1)) : 0,
        color: '#38bdf8',
      },
      {
        name: '6th Year Medicine',
        count: levelCounts['6th Year'] || 0,
        percentage: scopedStudentsCount > 0 ? Number(((levelCounts['6th Year'] / scopedStudentsCount) * 100).toFixed(1)) : 0,
        color: '#10b981',
      },
    ]

    // 8. Top-level KPIs
    const isSingleFaculty = Boolean(selectedFacultyId && selectedFacultyId !== 'all')
    const targetFaculty = isSingleFaculty ? (faculties || []).find((f) => f.id === selectedFacultyId) : null

    const totalFaculties = (faculties || []).length
    const assignedDeans = (faculties || []).filter((f) => deanByFaculty.has(f.id)).length
    const vacantDeans = Math.max(0, totalFaculties - assignedDeans)

    const kpis = {
      totalFaculties: isSingleFaculty ? (targetFaculty ? 1 : 0) : totalFaculties,
      assignedDeans: isSingleFaculty ? (selectedFacultyId && deanByFaculty.has(selectedFacultyId) ? 1 : 0) : assignedDeans,
      vacantDeans: isSingleFaculty ? (selectedFacultyId && deanByFaculty.has(selectedFacultyId) ? 0 : 1) : vacantDeans,
      totalProfessors: isSingleFaculty
        ? (selectedFacultyId ? profsByFaculty.get(selectedFacultyId) || 0 : 0)
        : (profUsers || []).length,
      totalStudents: isSingleFaculty
        ? (selectedFacultyId ? studentsByFaculty.get(selectedFacultyId) || 0 : 0)
        : (studentsData || []).length,
      totalCohorts: isSingleFaculty
        ? (selectedFacultyId ? cohortsByFaculty.get(selectedFacultyId) || 0 : 0)
        : (groupsData || []).length,
      totalExams: isSingleFaculty
        ? (selectedFacultyId ? examsByFaculty.get(selectedFacultyId) || 0 : 0)
        : (examsData || []).length,
      totalModules: isSingleFaculty
        ? (selectedFacultyId ? modulesByFaculty.get(selectedFacultyId) || 0 : 0)
        : (modulesData || []).length,
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      kpis,
      studyLevelDistribution,
      facultyCapacity,
      facultiesList: (faculties || []).map((f) => ({ id: f.id, name: f.name })),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to aggregate platform data.' },
      { status: 500 }
    )
  }
}
