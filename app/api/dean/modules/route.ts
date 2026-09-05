import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'
import { isAcademicYearCurrent, sortAcademicYears } from '@/lib/academicYearUtils'

export async function GET(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const academicYearIdParam = searchParams.get('academic_year_id')

    // 1. Fetch academic years for faculty
    const { data: rawYears } = await supabaseAdmin
      .from('academic_years')
      .select('*')
      .eq('faculty_id', dean.facultyId)

    const academicYears = sortAcademicYears(rawYears || []).map((y) => ({
      ...y,
      name: y.year_label,
      is_current: typeof y.is_current === 'boolean' ? y.is_current : isAcademicYearCurrent(y.year_label),
    }))

    const activeYearId =
      academicYearIdParam ||
      academicYears.find((y) => y.is_current)?.id ||
      (academicYears.length > 0 ? academicYears[0].id : null)

    // 2. Fetch study levels scoped by academic_year_id
    let studyLevels: any[] = []
    if (activeYearId) {
      const { data: levelsForYear } = await supabaseAdmin
        .from('study_levels')
        .select('*')
        .eq('academic_year_id', activeYearId)
        .order('level_name', { ascending: true })

      studyLevels = levelsForYear || []
    }

    const levelIds = studyLevels.map((l) => l.id)

    // 3. Fetch professors in faculty
    const { data: profUsers } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('faculty_id', dean.facultyId)

    const userMap = new Map((profUsers || []).map((u) => [u.id, u]))
    const userIds = (profUsers || []).map((u) => u.id)
    let professorsList: any[] = []

    if (userIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from('professors')
        .select('*')
        .in('user_id', userIds)

      professorsList = (profs || []).map((p) => {
        const user = userMap.get(p.user_id)
        return {
          id: p.id,
          user_id: p.user_id,
          first_name: p.first_name,
          last_name: p.last_name,
          full_name: `Prof. ${p.first_name} ${p.last_name}`,
          email: user?.email || '',
        }
      })
    }

    // 4. Fetch modules strictly scoped for these study levels
    let modules: any[] = []
    if (levelIds.length > 0) {
      const { data: fetchedModules, error } = await supabaseAdmin
        .from('modules')
        .select('*')
        .in('level_id', levelIds)
        .order('module_name', { ascending: true })

      if (error) throw error
      modules = fetchedModules || []
    }

    // Fetch station counts per module
    const moduleIds = (modules || []).map((m) => m.id)
    const stationCounts = new Map<string, number>()

    if (moduleIds.length > 0) {
      const { data: exams } = await supabaseAdmin
        .from('exams')
        .select('id, module_id')
        .in('module_id', moduleIds)

      const examIds = (exams || []).map((e) => e.id)
      const examToModule = new Map((exams || []).map((e) => [e.id, e.module_id]))

      if (examIds.length > 0) {
        const { data: stations } = await supabaseAdmin
          .from('stations')
          .select('exam_id')
          .in('exam_id', examIds)

        ;(stations || []).forEach((st) => {
          const modId = examToModule.get(st.exam_id)
          if (modId) {
            stationCounts.set(modId, (stationCounts.get(modId) || 0) + 1)
          }
        })
      }
    }

    const levelMap = new Map(studyLevels.map((l) => [l.id, l.level_name]))
    const profMap = new Map(professorsList.map((p) => [p.id, p]))

    const formattedModules = (modules || []).map((m) => {
      const prof = profMap.get(m.responsible_prof_id)
      return {
        ...m,
        level_name: levelMap.get(m.level_id) || 'Unassigned',
        responsible_prof_name: prof ? prof.full_name : 'Unassigned',
        responsible_professor: prof || null,
        station_count: stationCounts.get(m.id) || 0,
      }
    })

    return NextResponse.json({
      success: true,
      modules: formattedModules,
      studyLevels: studyLevels || [],
      professors: professorsList,
      academicYears: academicYears || [],
      activeYearId,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch modules.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { module_name, level_id, responsible_prof_id } = body

    if (!module_name || !level_id) {
      return NextResponse.json({ success: false, error: 'Module name and target study level are required.' }, { status: 400 })
    }

    const { data: newModule, error } = await supabaseAdmin
      .from('modules')
      .insert([
        {
          module_name: module_name.trim(),
          level_id,
          responsible_prof_id: responsible_prof_id || null,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, module: newModule })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to create clinical module.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { id, module_name, level_id, responsible_prof_id } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Module ID is required.' }, { status: 400 })
    }

    const updatePayload: any = {}
    if (module_name !== undefined) updatePayload.module_name = module_name.trim()
    if (level_id !== undefined) updatePayload.level_id = level_id
    if (responsible_prof_id !== undefined) updatePayload.responsible_prof_id = responsible_prof_id || null

    const { data: updatedModule, error } = await supabaseAdmin
      .from('modules')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Join updated prof details
    let responsibleProf = null
    if (updatedModule.responsible_prof_id) {
      const { data: prof } = await supabaseAdmin.from('professors').select('*').eq('id', updatedModule.responsible_prof_id).single()
      if (prof) {
        responsibleProf = {
          id: prof.id,
          first_name: prof.first_name,
          last_name: prof.last_name,
          full_name: `Prof. ${prof.first_name} ${prof.last_name}`,
        }
      }
    }

    let levelName = 'Unassigned'
    if (updatedModule.level_id) {
      const { data: lvl } = await supabaseAdmin.from('study_levels').select('level_name').eq('id', updatedModule.level_id).single()
      if (lvl) levelName = lvl.level_name
    }

    return NextResponse.json({
      success: true,
      module: {
        ...updatedModule,
        level_name: levelName,
        responsible_prof_name: responsibleProf ? responsibleProf.full_name : 'Unassigned',
        responsible_professor: responsibleProf,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update clinical module.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Module ID is required.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('modules').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true, message: 'Clinical module removed.' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to remove module.' }, { status: 500 })
  }
}
