import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const academicYearIdParam = searchParams.get('academic_year_id')

    // 1. Fetch academic years for this faculty
    const { data: academicYears } = await supabaseAdmin
      .from('academic_years')
      .select('*')
      .eq('faculty_id', dean.facultyId)
      .order('created_at', { ascending: false })

    const activeYearId = academicYearIdParam || (academicYears && academicYears.length > 0 ? academicYears[0].id : null)

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

    // Fallback: If study_levels has legacy rows without matching academic_year_id, fallback to all study_levels
    if (studyLevels.length === 0) {
      const { data: globalLevels } = await supabaseAdmin
        .from('study_levels')
        .select('*')
        .order('level_name', { ascending: true })
      studyLevels = globalLevels || []
    }

    let sectionsWithGroups: any[] = []

    if (activeYearId) {
      // 3. Fetch sections for this year
      const { data: sections } = await supabaseAdmin
        .from('sections')
        .select(`
          id,
          section_name,
          level_id,
          academic_year_id,
          created_at
        `)
        .eq('academic_year_id', activeYearId)
        .order('section_name', { ascending: true })

      const sectionIds = (sections || []).map((s) => s.id)

      let groups: any[] = []
      if (sectionIds.length > 0) {
        const { data: grpData } = await supabaseAdmin
          .from('groups')
          .select(`
            id,
            group_name,
            section_id,
            created_at
          `)
          .in('section_id', sectionIds)
          .order('group_name', { ascending: true })

        groups = grpData || []
      }

      // Count students per group
      const groupIds = groups.map((g) => g.id)
      const studentCounts = new Map<string, number>()

      if (groupIds.length > 0) {
        const { data: stData } = await supabaseAdmin
          .from('students')
          .select('group_id')
          .in('group_id', groupIds)

        ;(stData || []).forEach((st) => {
          studentCounts.set(st.group_id, (studentCounts.get(st.group_id) || 0) + 1)
        })
      }

      // Group groups under their respective sections
      const groupsBySection = new Map<string, any[]>()
      groups.forEach((g) => {
        const list = groupsBySection.get(g.section_id) || []
        list.push({
          ...g,
          studentsCount: studentCounts.get(g.id) || 0,
        })
        groupsBySection.set(g.section_id, list)
      })

      sectionsWithGroups = (sections || []).map((s) => ({
        ...s,
        groups: groupsBySection.get(s.id) || [],
      }))
    }

    return NextResponse.json({
      success: true,
      studyLevels: studyLevels || [],
      academicYears: academicYears || [],
      activeYearId,
      sections: sectionsWithGroups,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch structure.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { type, section_name, level_id, academic_year_id, group_name, section_id } = body

    if (type === 'section') {
      if (!section_name || !level_id || !academic_year_id) {
        return NextResponse.json(
          { success: false, error: 'Section name, study level, and academic year are required.' },
          { status: 400 }
        )
      }

      // Verify academic year belongs to faculty
      const { data: yearCheck } = await supabaseAdmin
        .from('academic_years')
        .select('id')
        .eq('id', academic_year_id)
        .eq('faculty_id', dean.facultyId)
        .single()

      if (!yearCheck) {
        return NextResponse.json({ success: false, error: 'Invalid academic year or permission denied.' }, { status: 403 })
      }

      const { data: newSection, error } = await supabaseAdmin
        .from('sections')
        .insert([
          {
            section_name: section_name.trim(),
            level_id,
            academic_year_id,
          },
        ])
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({ success: true, section: newSection })
    }

    if (type === 'group') {
      if (!group_name || !section_id) {
        return NextResponse.json({ success: false, error: 'Group name and parent section are required.' }, { status: 400 })
      }

      const { data: newGroup, error } = await supabaseAdmin
        .from('groups')
        .insert([
          {
            group_name: group_name.trim(),
            section_id,
          },
        ])
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({ success: true, group: newGroup })
    }

    return NextResponse.json({ success: false, error: 'Invalid creation type.' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to create structural element.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!id || !type) {
      return NextResponse.json({ success: false, error: 'Type and ID are required.' }, { status: 400 })
    }

    if (type === 'section') {
      // Check for child groups
      const { count: groupCount } = await supabaseAdmin
        .from('groups')
        .select('id', { count: 'exact' })
        .eq('section_id', id)

      if (groupCount && groupCount > 0) {
        return NextResponse.json(
          { success: false, error: 'Cannot remove section while it contains active rotation groups. Delete groups first.' },
          { status: 400 }
        )
      }

      const { error } = await supabaseAdmin.from('sections').delete().eq('id', id)
      if (error) throw error

      return NextResponse.json({ success: true, message: 'Section removed.' })
    }

    if (type === 'group') {
      // Check for enrolled students
      const { count: studentCount } = await supabaseAdmin
        .from('students')
        .select('matricule', { count: 'exact' })
        .eq('group_id', id)

      if (studentCount && studentCount > 0) {
        return NextResponse.json(
          { success: false, error: 'Cannot remove group while students are enrolled in it. Reassign students first.' },
          { status: 400 }
        )
      }

      const { error } = await supabaseAdmin.from('groups').delete().eq('id', id)
      if (error) throw error

      return NextResponse.json({ success: true, message: 'Rotation group removed.' })
    }

    return NextResponse.json({ success: false, error: 'Invalid deletion type.' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to remove element.' }, { status: 500 })
  }
}
