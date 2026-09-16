import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'
import { isAcademicYearCurrent, sortAcademicYears } from '@/lib/academicYearUtils'
import {
  verifyModuleBelongsToFaculty,
  verifyExamBelongsToFaculty,
} from '@/lib/facultyScope'

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
      is_current: typeof (y as any).is_current === 'boolean' ? (y as any).is_current : isAcademicYearCurrent(y.year_label),
    }))

    const activeYearId =
      academicYearIdParam ||
      academicYears.find((y) => y.is_current)?.id ||
      (academicYears.length > 0 ? academicYears[0].id : null)

    // 2. Fetch study levels scoped by active year
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

    const profMap = new Map(professorsList.map((p) => [p.id, p]))

    // 4. Fetch modules for this year's study levels
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
        responsible_prof: profMap.get(m.responsible_prof_id) || null,
      }))
    }

    const moduleIds = modulesList.map((m) => m.id)
    const moduleMap = new Map(modulesList.map((m) => [m.id, m]))

    const moduleIdParam = searchParams.get('module_id')
    const sessionTypeParam = searchParams.get('session_type')?.trim().toLowerCase()

    // 5. Fetch sections & groups for this year's study levels
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

    // 6. Fetch exams belonging to these modules (verified via foreign key exams.module_id -> modules.id)
    let examsList: any[] = []
    if (moduleIdParam) {
      const isAllowed = await verifyModuleBelongsToFaculty(moduleIdParam, dean.facultyId)
      if (isAllowed) {
        let examsQuery = supabaseAdmin
          .from('exams')
          .select('*')
          .eq('module_id', moduleIdParam)
          .order('exam_date', { ascending: false })

        const { data: rawExams, error: examsErr } = await examsQuery
        if (examsErr) throw examsErr
        examsList = rawExams || []
      }
    } else if (moduleIds.length > 0) {
      let examsQuery = supabaseAdmin
        .from('exams')
        .select('*')
        .in('module_id', moduleIds)
        .order('exam_date', { ascending: false })

      const { data: rawExams, error: examsErr } = await examsQuery
      if (examsErr) throw examsErr
      examsList = rawExams || []
    }

    // Filter by session_type flexibly (case-insensitive) if requested
    if (sessionTypeParam && examsList.length > 0) {
      const targetNormalized = sessionTypeParam === 'retake' || sessionTypeParam === 'makeup' ? 'retake' : 'regular'
      examsList = examsList.filter((e) => {
        const rawType = (e.session_type || 'regular').trim().toLowerCase()
        const norm = rawType === 'retake' || rawType === 'makeup' ? 'retake' : 'regular'
        return norm === targetNormalized
      })
    }

    const examIds = examsList.map((e) => e.id)

    // 7. Fetch stations for these exams
    let stationsList: any[] = []
    if (examIds.length > 0) {
      const { data: rawStations, error: stationsErr } = await supabaseAdmin
        .from('stations')
        .select('*')
        .in('exam_id', examIds)
        .order('station_number', { ascending: true })

      if (stationsErr) throw stationsErr
      stationsList = rawStations || []
    }

    // Group stations by exam_id
    const stationsByExam = new Map<string, any[]>()
    stationsList.forEach((st) => {
      const prof = profMap.get(st.invigilator_prof_id)
      const formatted = {
        ...st,
        invigilator_prof_name: prof ? prof.full_name : 'Unassigned',
        invigilator_professor: prof || null,
      }
      const list = stationsByExam.get(st.exam_id) || []
      list.push(formatted)
      stationsByExam.set(st.exam_id, list)
    })

    // 8. Assemble formatted exams
    const formattedExams = examsList.map((e) => {
      const mod = moduleMap.get(e.module_id)
      const grp = groupMap.get(e.group_id)
      const stations = stationsByExam.get(e.id) || []
      const rawSessionType = (e.session_type || 'regular').trim().toLowerCase()
      const normalizedType: 'regular' | 'retake' =
        rawSessionType === 'retake' || rawSessionType === 'makeup' ? 'retake' : 'regular'

      return {
        id: e.id,
        module_id: e.module_id,
        module_name: mod ? mod.module_name : 'Unassigned Module',
        level_name: mod ? mod.level_name : (grp ? grp.level_name : 'Unassigned'),
        group_id: e.group_id,
        group_name: grp ? grp.group_name : 'Unassigned Group',
        section_name: grp ? grp.section_name : 'Unassigned Section',
        session_type: normalizedType,
        raw_session_type: e.session_type,
        exam_date: e.exam_date,
        created_at: e.created_at,
        station_count: stations.length,
        stations: stations,
      }
    })

    return NextResponse.json({
      success: true,
      exams: formattedExams,
      modules: modulesList,
      groups: groupsList,
      professors: professorsList,
      academicYears,
      activeYearId,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to fetch exams.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { module_id, group_id, session_type, exam_date } = body

    if (!module_id) {
      return NextResponse.json(
        { success: false, error: 'Module is required.' },
        { status: 400 }
      )
    }

    const rawInputType = (session_type || 'regular').trim().toLowerCase()
    const sessionTypeEnum: 'regular' | 'retake' =
      rawInputType === 'retake' || rawInputType === 'makeup' ? 'retake' : 'regular'
    const examDateVal = exam_date || new Date().toISOString().split('T')[0]

    // Verify module belongs strictly to this Dean's faculty
    const isModuleAllowed = await verifyModuleBelongsToFaculty(module_id, dean.facultyId)
    if (!isModuleAllowed) {
      return NextResponse.json({ success: false, error: 'Forbidden: Selected module does not belong to your faculty.' }, { status: 403 })
    }

    // Enforce 1 regular + 1 retake exam limit per module (case-insensitively checked across exams)
    const { data: existingSessions } = await supabaseAdmin
      .from('exams')
      .select('id, session_type')
      .eq('module_id', module_id)

    const existingSession = (existingSessions || []).find((s) => {
      const t = (s.session_type || 'regular').trim().toLowerCase()
      const norm = t === 'retake' || t === 'makeup' ? 'retake' : 'regular'
      return norm === sessionTypeEnum
    })

    if (existingSession) {
      const typeLabel = sessionTypeEnum === 'retake' ? 'Retake' : 'Regular'
      return NextResponse.json(
        {
          success: false,
          error: `A ${typeLabel} Session already exists for this module (maximum 1 Regular and 1 Retake session allowed).`,
        },
        { status: 400 }
      )
    }

    // Optional group verification if provided
    if (group_id) {
      const { data: groupCheck } = await supabaseAdmin
        .from('groups')
        .select('id, group_name')
        .eq('id', group_id)
        .single()

      if (!groupCheck) {
        return NextResponse.json({ success: false, error: 'Invalid rotation group selected.' }, { status: 400 })
      }
    }

    const insertPayload: any = {
      module_id,
      session_type: sessionTypeEnum,
      exam_date: examDateVal,
    }
    if (group_id) insertPayload.group_id = group_id

    const { data: newExam, error } = await supabaseAdmin
      .from('exams')
      .insert([insertPayload])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, exam: newExam })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to schedule exam.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { id, module_id, group_id, session_type, exam_date } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Exam ID is required.' }, { status: 400 })
    }

    // Verify exam belongs to dean's faculty
    const isExamAllowed = await verifyExamBelongsToFaculty(id, dean.facultyId)
    if (!isExamAllowed) {
      return NextResponse.json({ success: false, error: 'Forbidden: Exam does not belong to your faculty.' }, { status: 403 })
    }

    const updatePayload: any = {}
    if (module_id) {
      const isModAllowed = await verifyModuleBelongsToFaculty(module_id, dean.facultyId)
      if (!isModAllowed) {
        return NextResponse.json({ success: false, error: 'Forbidden: Target module does not belong to your faculty.' }, { status: 403 })
      }
      updatePayload.module_id = module_id
    }
    if (group_id) updatePayload.group_id = group_id
    if (session_type) {
      const rawInput = String(session_type).trim().toLowerCase()
      updatePayload.session_type = rawInput === 'retake' || rawInput === 'makeup' ? 'retake' : 'regular'
    }
    if (exam_date) updatePayload.exam_date = exam_date

    const { data: updatedExam, error } = await supabaseAdmin
      .from('exams')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, exam: updatedExam })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update exam.' }, { status: 500 })
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
      return NextResponse.json({ success: false, error: 'Exam ID is required.' }, { status: 400 })
    }

    // Verify exam belongs to dean's faculty
    const isExamAllowed = await verifyExamBelongsToFaculty(id, dean.facultyId)
    if (!isExamAllowed) {
      return NextResponse.json({ success: false, error: 'Forbidden: Exam does not belong to your faculty.' }, { status: 403 })
    }

    // Delete child stations
    await supabaseAdmin.from('stations').delete().eq('exam_id', id)

    // Delete exam
    const { error } = await supabaseAdmin.from('exams').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true, message: 'Exam session removed.' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed to remove exam.' }, { status: 500 })
  }
}
