import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'
import { isAcademicYearCurrent } from '@/lib/academicYearUtils'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const reqYearId =
      searchParams.get('academic_year_id') ||
      req.cookies.get('selected_academic_year_id')?.value
    const reqLevelId = searchParams.get('level_id')
    const reqSectionId = searchParams.get('section_id')
    const reqGroupId = searchParams.get('group_id')

    // 1. Get academic years for faculty
    const { data: rawYears } = await supabaseAdmin
      .from('academic_years')
      .select('id, year_label')
      .eq('faculty_id', dean.facultyId)

    const years = rawYears || []
    if (years.length === 0) {
      return NextResponse.json({ success: true, students: [], groups: [], sections: [], studyLevels: [] })
    }

    const yearMap = new Map(years.map((y) => [y.id, y.year_label]))
    const facultyYearIds = years.map((y) => y.id)

    // Resolve target year: explicitly requested OR default to current/first year (NEVER all years simultaneously)
    let targetYearId: string | null = null
    if (reqYearId && facultyYearIds.includes(reqYearId)) {
      targetYearId = reqYearId
    } else {
      const currentYear = years.find((y: any) => isAcademicYearCurrent(y.year_label))
      targetYearId = currentYear ? currentYear.id : facultyYearIds[0]
    }

    // 2. Get study levels for the target academic year
    let levelQuery = supabaseAdmin
      .from('study_levels')
      .select('*')
      .eq('academic_year_id', targetYearId)

    if (reqLevelId) {
      levelQuery = levelQuery.eq('id', reqLevelId)
    }

    const { data: studyLevels } = await levelQuery
    const levelList = studyLevels || []
    const levelIds = levelList.map((l) => l.id)
    if (levelIds.length === 0) {
      return NextResponse.json({ success: true, students: [], groups: [], sections: [], studyLevels: [] })
    }

    // 3. Get sections for these study levels
    let sectionQuery = supabaseAdmin
      .from('sections')
      .select('id, section_name, level_id')
      .in('level_id', levelIds)

    if (reqSectionId) {
      sectionQuery = sectionQuery.eq('id', reqSectionId)
    }

    const { data: sections } = await sectionQuery
    const sectionList = sections || []
    const sectionIds = sectionList.map((s) => s.id)
    if (sectionIds.length === 0) {
      return NextResponse.json({ success: true, students: [], groups: [], sections: [], studyLevels: levelList })
    }

    // 4. Get groups for these sections
    let groupQuery = supabaseAdmin
      .from('groups')
      .select('id, group_name, section_id')
      .in('section_id', sectionIds)

    if (reqGroupId) {
      groupQuery = groupQuery.eq('id', reqGroupId)
    }

    const { data: groups } = await groupQuery
    const groupList = groups || []
    const groupIds = groupList.map((g) => g.id)
    if (groupIds.length === 0) {
      return NextResponse.json({ success: true, students: [], groups: [], sections: sectionList, studyLevels: levelList })
    }

    const levelMap = new Map(levelList.map((l) => [l.id, l]))
    const sectionMap = new Map(sectionList.map((s) => [s.id, s]))
    const groupMap = new Map(groupList.map((g) => [g.id, g]))

    // 5. Get students strictly in those scoped groups, ordered by import_index ASC, created_at ASC
    const { data: stData, error: stErr } = await supabaseAdmin
      .from('students')
      .select('id, matricule, first_name, last_name, group_id, import_index, created_at')
      .in('group_id', groupIds)
      .order('import_index', { ascending: true })
      .order('created_at', { ascending: true })

    if (stErr) throw stErr
    const studentsList = stData || []

    const formattedStudents = studentsList.map((st) => {
      const grp = groupMap.get(st.group_id)
      const sec = grp ? sectionMap.get(grp.section_id) : null
      const lvl = sec ? levelMap.get(sec.level_id) : null
      const yearLabel = lvl ? yearMap.get(lvl.academic_year_id) : null

      return {
        id: st.id,
        matricule: st.matricule,
        first_name: st.first_name,
        last_name: st.last_name,
        group_id: st.group_id,
        group_name: grp ? grp.group_name : 'Unassigned',
        section_id: sec?.id || null,
        section_name: sec ? sec.section_name : 'Unassigned',
        level_id: lvl?.id || null,
        level_name: lvl ? lvl.level_name : 'Unassigned',
        academic_year_id: targetYearId,
        academic_year_label: yearLabel || 'N/A',
        import_index: typeof st.import_index === 'number' ? st.import_index : 0,
        created_at: st.created_at ? new Date(st.created_at).toLocaleDateString() : 'N/A',
      }
    })

    return NextResponse.json({
      success: true,
      students: formattedStudents,
      groups: groupList,
      sections: sectionList,
      studyLevels: levelList,
      academic_year_id: targetYearId,
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
