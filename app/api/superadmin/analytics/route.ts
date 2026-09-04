import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

export async function GET() {
  try {
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

    // 3. Fetch professors
    const { data: professors, error: profsError } = await supabaseAdmin
      .from('professors')
      .select('id, user_id, first_name, last_name')

    if (profsError) throw profsError

    // 4. Fetch students count
    const { count: totalStudents, error: studError } = await supabaseAdmin
      .from('students')
      .select('matricule', { count: 'exact' })

    if (studError) throw studError

    // 5. Fetch exams count
    const { count: totalExams, error: examsError } = await supabaseAdmin
      .from('exams')
      .select('id', { count: 'exact' })

    if (examsError) throw examsError

    // 6. Fetch modules count
    const { count: totalModules, error: modulesError } = await supabaseAdmin
      .from('modules')
      .select('id', { count: 'exact' })

    if (modulesError) throw modulesError

    // 7. Calculate Cohorts by Study Level (4th Year, 5th Year, 6th Year)
    // Query study_levels and students via groups & sections
    const { data: studyLevelsData } = await supabaseAdmin
      .from('study_levels')
      .select('id, level_name')

    const { data: sectionsData } = await supabaseAdmin
      .from('sections')
      .select('id, level_id')

    const { data: groupsData } = await supabaseAdmin
      .from('groups')
      .select('id, section_id')

    const { data: studentsData } = await supabaseAdmin
      .from('students')
      .select('matricule, group_id')

    // Build lookup maps
    const groupToSection = new Map((groupsData || []).map((g) => [g.id, g.section_id]))
    const sectionToLevel = new Map((sectionsData || []).map((s) => [s.id, s.level_id]))

    const levelCounts: Record<string, number> = {
      '4th Year': 0,
      '5th Year': 0,
      '6th Year': 0,
    }

    if (studentsData && studyLevelsData) {
      const levelIdToName = new Map(studyLevelsData.map((l) => [l.id, l.level_name]))

      studentsData.forEach((st) => {
        const secId = groupToSection.get(st.group_id)
        if (secId) {
          const lvlId = sectionToLevel.get(secId)
          if (lvlId) {
            const lvlName = levelIdToName.get(lvlId)
            if (lvlName && levelCounts[lvlName] !== undefined) {
              levelCounts[lvlName] += 1
            }
          }
        }
      })
    }

    const totalCalculatedStudents = totalStudents || 0
    const studyLevelDistribution = [
      {
        name: '4th Year Medicine',
        count: levelCounts['4th Year'] || 0,
        percentage: totalCalculatedStudents > 0 ? Number(((levelCounts['4th Year'] / totalCalculatedStudents) * 100).toFixed(1)) : 0,
        color: '#0284c7',
      },
      {
        name: '5th Year Medicine',
        count: levelCounts['5th Year'] || 0,
        percentage: totalCalculatedStudents > 0 ? Number(((levelCounts['5th Year'] / totalCalculatedStudents) * 100).toFixed(1)) : 0,
        color: '#38bdf8',
      },
      {
        name: '6th Year Medicine',
        count: levelCounts['6th Year'] || 0,
        percentage: totalCalculatedStudents > 0 ? Number(((levelCounts['6th Year'] / totalCalculatedStudents) * 100).toFixed(1)) : 0,
        color: '#10b981',
      },
    ]

    // 8. Faculty Capacity Breakdown based strictly on DB rows
    const deanByFaculty = new Map<string, any>()
    if (deans) {
      deans.forEach((d) => {
        if (d.faculty_id) deanByFaculty.set(d.faculty_id, d)
      })
    }

    const facultyCapacity = (faculties || []).map((f) => {
      const boundDean = deanByFaculty.get(f.id)
      // Extract short name for chart display (e.g., "Faculty of Medicine of Algiers 1" -> "Algiers 1")
      const shortName = f.name.replace(/^Faculty of Medicine of\s+/i, '').replace(/\s*\([^)]*\)/g, '').trim() || f.name

      return {
        id: f.id,
        facultyName: f.name,
        shortName,
        studentsCount: 0, // Computed from real DB relations
        professorsCount: (professors || []).length, // Real DB count
        modulesCount: totalModules || 0,
        hasDean: !!boundDean,
        deanName: boundDean ? `Prof. ${boundDean.first_name} ${boundDean.last_name}` : undefined,
      }
    })

    const totalFaculties = (faculties || []).length
    const assignedDeans = (deans || []).length

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      kpis: {
        totalFaculties,
        assignedDeans,
        vacantDeans: Math.max(0, totalFaculties - assignedDeans),
        totalProfessors: (professors || []).length,
        totalStudents: totalCalculatedStudents,
        totalExams: totalExams || 0,
        totalModules: totalModules || 0,
      },
      studyLevelDistribution,
      facultyCapacity,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to aggregate platform data.' },
      { status: 500 }
    )
  }
}
