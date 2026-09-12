import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const reqYearId = searchParams.get('academic_year_id')

    // 1. Get academic years for faculty
    const { data: years } = await supabaseAdmin
      .from('academic_years')
      .select('id')
      .eq('faculty_id', dean.facultyId)

    const facultyYearIds = (years || []).map((y) => y.id)
    if (facultyYearIds.length === 0) {
      return NextResponse.json({ success: true, students: [], groups: [], sections: [] })
    }

    const targetYearIds = reqYearId && facultyYearIds.includes(reqYearId) ? [reqYearId] : facultyYearIds

    // 2. Get study levels for target academic years
    const { data: studyLevels } = await supabaseAdmin
      .from('study_levels')
      .select('*')
      .in('academic_year_id', targetYearIds)

    const levelIds = (studyLevels || []).map((l) => l.id)
    if (levelIds.length === 0) {
      return NextResponse.json({ success: true, students: [], groups: [], sections: [] })
    }

    // 3. Get sections for these study levels
    const { data: sections } = await supabaseAdmin
      .from('sections')
      .select('id, section_name, level_id')
      .in('level_id', levelIds)

    const sectionIds = (sections || []).map((s) => s.id)
    if (sectionIds.length === 0) {
      return NextResponse.json({ success: true, students: [], groups: [], sections: [] })
    }

    // 4. Get groups
    const { data: groups } = await supabaseAdmin
      .from('groups')
      .select('id, group_name, section_id')
      .in('section_id', sectionIds)

    const groupIds = (groups || []).map((g) => g.id)

    const levelMap = new Map((studyLevels || []).map((l) => [l.id, l.level_name]))
    const sectionMap = new Map((sections || []).map((s) => [s.id, s]))
    const groupMap = new Map((groups || []).map((g) => [g.id, g]))

    // 5. Get students sorted by import_index ascending by default
    let studentsList: any[] = []
    if (groupIds.length > 0) {
      const { data: stData, error: stErr } = await supabaseAdmin
        .from('students')
        .select('id, matricule, first_name, last_name, group_id, import_index, created_at')
        .in('group_id', groupIds)
        .order('import_index', { ascending: true })

      if (stErr) throw stErr
      studentsList = stData || []
    }

    const formattedStudents = studentsList.map((st) => {
      const grp = groupMap.get(st.group_id)
      const sec = grp ? sectionMap.get(grp.section_id) : null
      const lvlName = sec ? levelMap.get(sec.level_id) : 'Unassigned'

      return {
        id: st.id,
        matricule: st.matricule,
        first_name: st.first_name,
        last_name: st.last_name,
        group_id: st.group_id,
        group_name: grp ? grp.group_name : 'Unassigned',
        section_name: sec ? sec.section_name : 'Unassigned',
        level_name: lvlName || 'Unassigned',
        import_index: typeof st.import_index === 'number' ? st.import_index : 0,
        created_at: st.created_at ? new Date(st.created_at).toLocaleDateString() : 'N/A',
      }
    })

    return NextResponse.json({
      success: true,
      students: formattedStudents,
      groups: groups || [],
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch students.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { matricule, first_name, last_name, group_id, import_index } = body

    if (!matricule || !first_name || !last_name || !group_id) {
      return NextResponse.json(
        { success: false, error: 'Student matricule, first name, last name, and assigned group are required.' },
        { status: 400 }
      )
    }

    const cleanMatricule = matricule.trim()

    // Multi-Year Duplicate Check: Check duplicate (matricule, group_id)
    const { data: existing } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('matricule', cleanMatricule)
      .eq('group_id', group_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A student with this matricule already exists in this rotation group.' },
        { status: 400 }
      )
    }

    // Determine next import_index if not supplied
    let targetIndex = 0
    if (typeof import_index === 'number') {
      targetIndex = import_index
    } else {
      const { count } = await supabaseAdmin
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', group_id)
      targetIndex = count || 0
    }

    const studentId = randomUUID()
    const { data: newStudent, error } = await supabaseAdmin
      .from('students')
      .insert([
        {
          id: studentId,
          matricule: cleanMatricule,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          group_id,
          import_index: targetIndex,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, student: newStudent })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to register student.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { id, original_matricule, matricule, first_name, last_name, group_id } = body

    if ((!id && !original_matricule) || !matricule || !first_name || !last_name || !group_id) {
      return NextResponse.json(
        { success: false, error: 'Student ID, matricule, first name, last name, and rotation group are required.' },
        { status: 400 }
      )
    }

    const cleanNewMat = matricule.trim()
    const cleanFn = first_name.trim()
    const cleanLn = last_name.trim()

    // 1. Locate student by UUID (id) or fallback to original_matricule
    let studentId = id
    if (!studentId && original_matricule) {
      const { data: byMat } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('matricule', original_matricule.trim())
        .maybeSingle()
      studentId = byMat?.id
    }

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 })
    }

    const { data: existingStudent } = await supabaseAdmin
      .from('students')
      .select('id, matricule, group_id, import_index')
      .eq('id', studentId)
      .maybeSingle()

    if (!existingStudent) {
      return NextResponse.json({ success: false, error: 'Student record not found.' }, { status: 404 })
    }

    // 2. Multi-year check: If matricule or group is changing, check for collision strictly within (cleanNewMat, group_id)
    const { data: collision } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('matricule', cleanNewMat)
      .eq('group_id', group_id)
      .neq('id', studentId)
      .maybeSingle()

    if (collision) {
      return NextResponse.json(
        { success: false, error: 'Another student with this matricule already exists in this group.' },
        { status: 400 }
      )
    }

    // 3. Update student record by UUID (id)
    const { data: updatedStudent, error } = await supabaseAdmin
      .from('students')
      .update({
        matricule: cleanNewMat,
        first_name: cleanFn,
        last_name: cleanLn,
        group_id: group_id,
      })
      .eq('id', studentId)
      .select()
      .single()

    if (error) throw error

    // Fetch joined metadata for response
    const { data: grp } = await supabaseAdmin.from('groups').select('id, group_name, section_id').eq('id', group_id).single()
    let sectionName = 'Unassigned'
    let levelName = 'Unassigned'

    if (grp) {
      const { data: sec } = await supabaseAdmin.from('sections').select('id, section_name, level_id').eq('id', grp.section_id).single()
      if (sec) {
        sectionName = sec.section_name
        const { data: lvl } = await supabaseAdmin.from('study_levels').select('level_name').eq('id', sec.level_id).single()
        if (lvl) levelName = lvl.level_name
      }
    }

    const formattedStudent = {
      id: updatedStudent.id,
      matricule: updatedStudent.matricule,
      first_name: updatedStudent.first_name,
      last_name: updatedStudent.last_name,
      group_id: updatedStudent.group_id,
      group_name: grp ? grp.group_name : 'Unassigned',
      section_name: sectionName,
      level_name: levelName,
      import_index: updatedStudent.import_index ?? existingStudent.import_index ?? 0,
      created_at: updatedStudent.created_at ? new Date(updatedStudent.created_at).toLocaleDateString() : 'N/A',
    }

    return NextResponse.json({ success: true, student: formattedStudent })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update student record.' }, { status: 500 })
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
    const idsParam = searchParams.get('ids')
    const matricule = searchParams.get('matricule')

    if (!id && !idsParam && !matricule) {
      return NextResponse.json({ success: false, error: 'Student ID or matricule is required.' }, { status: 400 })
    }

    // Support batch delete via comma-separated ?ids=id1,id2
    if (idsParam) {
      const idList = idsParam.split(',').map((x) => x.trim()).filter(Boolean)
      if (idList.length > 0) {
        const { error } = await supabaseAdmin.from('students').delete().in('id', idList)
        if (error) throw error
        return NextResponse.json({ success: true, message: `Removed ${idList.length} student record(s).` })
      }
    }

    // Single student delete by UUID id (or fallback to matricule)
    let deleteQuery = supabaseAdmin.from('students').delete()
    if (id) {
      deleteQuery = deleteQuery.eq('id', id)
    } else {
      deleteQuery = deleteQuery.eq('matricule', matricule!)
    }

    const { error } = await deleteQuery
    if (error) throw error

    return NextResponse.json({ success: true, message: 'Student record removed.' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to remove student.' }, { status: 500 })
  }
}
