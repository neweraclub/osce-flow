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
      is_current:
        typeof (y as any).is_current === 'boolean'
          ? (y as any).is_current
          : isAcademicYearCurrent(y.year_label),
    }))

    const activeYearId =
      academicYearIdParam ||
      academicYears.find((y) => y.is_current)?.id ||
      (academicYears.length > 0 ? academicYears[0].id : null)

    // 2. Fetch professors in faculty
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

    const profMap = new Map(professorsList.map((p) => [p.id, p]))

    // 3. Fetch study levels scoped by active year
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

    // 4. Fetch modules for these study levels
    let modulesList: any[] = []
    if (levelIds.length > 0) {
      const { data: mods } = await supabaseAdmin
        .from('modules')
        .select('*')
        .in('level_id', levelIds)
        .order('module_name', { ascending: true })

      modulesList = (mods || []).map((m) => ({
        ...m,
        level_name: levelMap.get(m.level_id) || 'Unassigned',
      }))
    }

    const moduleIds = modulesList.map((m) => m.id)
    const moduleMap = new Map(modulesList.map((m) => [m.id, m]))

    // 5. Fetch sections & groups
    let sectionsList: any[] = []
    let groupsList: any[] = []

    if (levelIds.length > 0) {
      const { data: secs } = await supabaseAdmin
        .from('sections')
        .select('id, section_name, level_id')
        .in('level_id', levelIds)
        .order('section_name', { ascending: true })

      sectionsList = secs || []
      const sectionIds = sectionsList.map((s) => s.id)
      const sectionMap = new Map(sectionsList.map((s) => [s.id, s]))

      if (sectionIds.length > 0) {
        const { data: grps } = await supabaseAdmin
          .from('groups')
          .select('id, group_name, section_id')
          .in('section_id', sectionIds)
          .order('group_name', { ascending: true })

        groupsList = (grps || []).map((g) => {
          const sec = sectionMap.get(g.section_id)
          const lvlName = sec ? levelMap.get(sec.level_id) || '' : ''
          return {
            id: g.id,
            group_name: g.group_name,
            section_id: g.section_id,
            section_name: sec ? sec.section_name : 'Unassigned',
            level_name: lvlName,
            display_label: sec ? `${sec.section_name} — ${g.group_name} (${lvlName})` : g.group_name,
          }
        })
      }
    }

    const groupMap = new Map(groupsList.map((g) => [g.id, g]))
    const groupIds = groupsList.map((g) => g.id)

    // 6. Fetch scheduled exams for this year
    let examsList: any[] = []
    if (moduleIds.length > 0 || groupIds.length > 0) {
      let examsQuery = supabaseAdmin
        .from('exams')
        .select('*')
        .order('exam_date', { ascending: false })

      if (moduleIds.length > 0 && groupIds.length > 0) {
        examsQuery = examsQuery.in('module_id', moduleIds).in('group_id', groupIds)
      } else if (moduleIds.length > 0) {
        examsQuery = examsQuery.in('module_id', moduleIds)
      } else if (groupIds.length > 0) {
        examsQuery = examsQuery.in('group_id', groupIds)
      }

      const { data: rawExams } = await examsQuery
      examsList = (rawExams || []).map((e) => {
        const mod = moduleMap.get(e.module_id)
        const grp = groupMap.get(e.group_id)
        return {
          id: e.id,
          module_id: e.module_id,
          module_name: mod ? mod.module_name : 'Unassigned Module',
          level_name: mod ? mod.level_name : (grp ? grp.level_name : 'Unassigned'),
          group_id: e.group_id,
          group_name: grp ? grp.group_name : 'Unassigned Group',
          section_name: grp ? grp.section_name : 'Unassigned Section',
          session_type: e.session_type || 'regular',
          exam_date: e.exam_date,
          display_label: `${mod ? mod.module_name : 'Exam'} — ${grp ? `${grp.section_name} (${grp.group_name})` : 'Group'} (${e.session_type})`,
        }
      })
    }

    const examIds = examsList.map((e) => e.id)
    const examMap = new Map(examsList.map((e) => [e.id, e]))

    // 7. Fetch stations:
    // Either stations attached to this year's exams OR unassigned stations (exam_id is null)
    let stationsQuery = supabaseAdmin
      .from('stations')
      .select('*')
      .order('station_number', { ascending: true })

    if (examIds.length > 0) {
      // Fetch stations whose exam_id is in examIds OR exam_id is null
      stationsQuery = stationsQuery.or(`exam_id.in.(${examIds.join(',')}),exam_id.is.null`)
    } else {
      // If no exams in this year, fetch unassigned stations
      stationsQuery = stationsQuery.is('exam_id', null)
    }

    const { data: rawStations, error: stationsErr } = await stationsQuery
    if (stationsErr) throw stationsErr

    const formattedStations = (rawStations || []).map((st) => {
      const prof = profMap.get(st.invigilator_prof_id)
      const linkedExam = st.exam_id ? examMap.get(st.exam_id) : null

      return {
        id: st.id,
        exam_id: st.exam_id || null,
        station_number: st.station_number,
        title: st.title,
        access_pin: st.access_pin,
        invigilator_prof_id: st.invigilator_prof_id || null,
        invigilator_prof_name: prof ? prof.full_name : 'Unassigned',
        invigilator_professor: prof || null,
        created_at: st.created_at,
        linked_exam: linkedExam
          ? {
              id: linkedExam.id,
              module_name: linkedExam.module_name,
              level_name: linkedExam.level_name,
              section_name: linkedExam.section_name,
              group_name: linkedExam.group_name,
              session_type: linkedExam.session_type,
              exam_date: linkedExam.exam_date,
              display_label: linkedExam.display_label,
            }
          : null,
      }
    })

    return NextResponse.json({
      success: true,
      stations: formattedStations,
      exams: examsList,
      professors: professorsList,
      academicYears,
      activeYearId,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch stations.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { title, station_number, access_pin, invigilator_prof_id, exam_id } = body

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Station Title is required.' },
        { status: 400 }
      )
    }

    const parsedStationNumber = Number(station_number) || 1
    if (parsedStationNumber < 1) {
      return NextResponse.json(
        { success: false, error: 'Station number must be at least 1.' },
        { status: 400 }
      )
    }

    const pinStr = String(access_pin || '').trim()
    if (pinStr.length < 4) {
      return NextResponse.json(
        { success: false, error: 'Access PIN must be at least 4 characters long.' },
        { status: 400 }
      )
    }

    // Optional exam_id handling
    let normalizedExamId: string | null = null
    if (exam_id && exam_id !== 'unassigned' && exam_id !== 'null') {
      normalizedExamId = exam_id
    }

    // Optional invigilator_prof_id handling
    let normalizedProfId: string | null = null
    if (invigilator_prof_id && invigilator_prof_id !== 'unassigned' && invigilator_prof_id !== 'null') {
      normalizedProfId = invigilator_prof_id
    }

    const insertPayload: any = {
      title: title.trim(),
      station_number: parsedStationNumber,
      access_pin: pinStr,
      invigilator_prof_id: normalizedProfId,
      exam_id: normalizedExamId,
    }

    const { data: newStation, error: insertErr } = await supabaseAdmin
      .from('stations')
      .insert([insertPayload])
      .select()
      .single()

    if (insertErr) throw insertErr

    return NextResponse.json({ success: true, station: newStation })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create station blueprint.' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { id, title, station_number, access_pin, invigilator_prof_id, exam_id } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Station ID is required.' }, { status: 400 })
    }

    const updatePayload: any = {}

    if (station_number !== undefined) {
      const num = Number(station_number)
      if (num < 1) {
        return NextResponse.json({ success: false, error: 'Station number must be >= 1.' }, { status: 400 })
      }
      updatePayload.station_number = num
    }

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json({ success: false, error: 'Station title cannot be empty.' }, { status: 400 })
      }
      updatePayload.title = title.trim()
    }

    if (access_pin !== undefined) {
      const pinStr = String(access_pin).trim()
      if (pinStr.length < 4) {
        return NextResponse.json({ success: false, error: 'PIN must be at least 4 characters.' }, { status: 400 })
      }
      updatePayload.access_pin = pinStr
    }

    if (invigilator_prof_id !== undefined) {
      updatePayload.invigilator_prof_id =
        invigilator_prof_id && invigilator_prof_id !== 'unassigned' && invigilator_prof_id !== 'null'
          ? invigilator_prof_id
          : null
    }

    if (exam_id !== undefined) {
      updatePayload.exam_id =
        exam_id && exam_id !== 'unassigned' && exam_id !== 'null' ? exam_id : null
    }

    const { data: updatedStation, error: updateErr } = await supabaseAdmin
      .from('stations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true, station: updatedStation })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update station.' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  return PUT(req)
}

export async function DELETE(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    let id = searchParams.get('id')

    if (!id) {
      try {
        const body = await req.json()
        id = body.id
      } catch {
        // query param was empty and body wasn't JSON
      }
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Station ID is required.' }, { status: 400 })
    }

    const { error: delErr } = await supabaseAdmin
      .from('stations')
      .delete()
      .eq('id', id)

    if (delErr) throw delErr

    return NextResponse.json({ success: true, message: 'Station deleted successfully.' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete station.' },
      { status: 500 }
    )
  }
}
