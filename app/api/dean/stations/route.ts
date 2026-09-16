import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDean } from '@/lib/deanAuth'
import { supabaseAdmin } from '@/lib/auth'
import { isAcademicYearCurrent, sortAcademicYears } from '@/lib/academicYearUtils'
import {
  getFacultyHierarchyIds,
  verifyExamBelongsToFaculty,
  verifyStationBelongsToFaculty,
  verifyProfessorBelongsToFaculty,
} from '@/lib/facultyScope'

export async function GET(req: NextRequest) {
  try {
    const dean = await getAuthenticatedDean(req)
    if (!dean) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const academicYearIdParam = searchParams.get('academic_year_id')

    // 1. Fetch academic years strictly for this faculty
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

    // 2. Resolve relational hierarchy strictly for this faculty & active year
    const hierarchy = await getFacultyHierarchyIds(dean.facultyId, activeYearId)

    // 3. Fetch professors in faculty
    let professorsList: any[] = []
    if (hierarchy.userIds.length > 0) {
      const { data: profUsers } = await supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name')
        .in('id', hierarchy.userIds)

      const userMap = new Map((profUsers || []).map((u) => [u.id, u]))

      const { data: profs } = await supabaseAdmin
        .from('professors')
        .select('*')
        .in('user_id', hierarchy.userIds)

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

    // 4. Fetch study levels
    let studyLevels: any[] = []
    if (hierarchy.levelIds.length > 0) {
      const { data: levels } = await supabaseAdmin
        .from('study_levels')
        .select('id, level_name, academic_year_id')
        .in('id', hierarchy.levelIds)
        .order('level_name', { ascending: true })

      studyLevels = levels || []
    }

    const levelMap = new Map(studyLevels.map((l) => [l.id, l.level_name]))

    // 5. Fetch modules for these study levels
    let modulesList: any[] = []
    if (hierarchy.moduleIds.length > 0) {
      const { data: mods } = await supabaseAdmin
        .from('modules')
        .select('*')
        .in('id', hierarchy.moduleIds)
        .order('module_name', { ascending: true })

      modulesList = (mods || []).map((m) => ({
        ...m,
        level_name: levelMap.get(m.level_id) || 'Unassigned',
      }))
    }

    const moduleMap = new Map(modulesList.map((m) => [m.id, m]))

    // 6. Fetch scheduled exams strictly for faculty modules
    let examsList: any[] = []
    if (hierarchy.examIds.length > 0) {
      const { data: rawExams } = await supabaseAdmin
        .from('exams')
        .select('*')
        .in('id', hierarchy.examIds)
        .order('exam_date', { ascending: false })

      examsList = (rawExams || []).map((e) => {
        const mod = moduleMap.get(e.module_id)
        const rawType = String(e.session_type || 'regular').trim().toLowerCase()
        const normType: 'regular' | 'retake' = rawType === 'retake' || rawType === 'makeup' ? 'retake' : 'regular'
        return {
          id: e.id,
          module_id: e.module_id,
          module_name: mod ? mod.module_name : 'Unassigned Module',
          level_name: mod ? mod.level_name : 'Unassigned Level',
          session_type: normType,
          raw_session_type: e.session_type,
          exam_date: e.exam_date,
          display_label: `${mod ? mod.module_name : 'Exam'} (${normType === 'retake' ? 'Retake' : 'Regular'}) • ${e.exam_date || ''}`,
        }
      })
    }

    const examMap = new Map(examsList.map((e) => [e.id, e]))

    // 7. Fetch stations strictly scoped to faculty exams
    let formattedStations: any[] = []
    if (hierarchy.examIds.length > 0) {
      const { data: rawStations, error: stationsErr } = await supabaseAdmin
        .from('stations')
        .select('*')
        .in('exam_id', hierarchy.examIds)
        .order('station_number', { ascending: true })

      if (stationsErr) throw stationsErr

      formattedStations = (rawStations || []).map((st) => {
        const prof = profMap.get(st.invigilator_prof_id)
        const linkedExam = st.exam_id ? examMap.get(st.exam_id) : null

        return {
          id: st.id,
          exam_id: st.exam_id,
          module_id: linkedExam?.module_id || '',
          module_name: linkedExam?.module_name || '',
          station_number: st.station_number,
          title: st.title,
          access_pin: st.access_pin,
          weightage_percentage: st.weightage_percentage || 50,
          invigilator_prof_id: st.invigilator_prof_id || null,
          invigilator_prof_name: prof ? prof.full_name : 'Unassigned',
          invigilator_professor: prof || null,
          created_at: st.created_at,
          linked_exam: linkedExam
            ? {
                id: linkedExam.id,
                module_name: linkedExam.module_name,
                level_name: linkedExam.level_name,
                session_type: linkedExam.session_type,
                exam_date: linkedExam.exam_date,
                display_label: linkedExam.display_label,
              }
            : null,
        }
      })
    }

    return NextResponse.json({
      success: true,
      stations: formattedStations,
      exams: examsList,
      modules: modulesList,
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
    const { title, station_number, access_pin, invigilator_prof_id, exam_id, weightage_percentage } = body

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

    // Exam session validation (stations.exam_id is NOT NULL in schema)
    if (!exam_id || exam_id === 'unassigned' || exam_id === 'null') {
      return NextResponse.json(
        { success: false, error: 'An exam session is required to register a clinical station.' },
        { status: 400 }
      )
    }

    // Strict multi-tenancy verification: Exam must belong to the Dean's faculty
    const isExamAllowed = await verifyExamBelongsToFaculty(exam_id, dean.facultyId)
    if (!isExamAllowed) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Exam session does not belong to your faculty.' },
        { status: 403 }
      )
    }

    // Optional invigilator_prof_id verification
    let normalizedProfId: string | null = null
    if (invigilator_prof_id && invigilator_prof_id !== 'unassigned' && invigilator_prof_id !== 'null') {
      const isProfAllowed = await verifyProfessorBelongsToFaculty(invigilator_prof_id, dean.facultyId)
      if (!isProfAllowed) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Invigilator professor does not belong to your faculty.' },
          { status: 403 }
        )
      }
      normalizedProfId = invigilator_prof_id
    }

    const weightage = Number(weightage_percentage)
    const validWeightage = !isNaN(weightage) && weightage >= 0 && weightage <= 100 ? weightage : 50.0

    const insertPayload: any = {
      title: title.trim(),
      station_number: parsedStationNumber,
      access_pin: pinStr,
      invigilator_prof_id: normalizedProfId,
      exam_id,
      weightage_percentage: validWeightage,
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
      { success: false, error: error?.message || 'Failed to create clinical station.' },
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
    const { id, title, station_number, access_pin, invigilator_prof_id, exam_id, weightage_percentage } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Station ID is required.' }, { status: 400 })
    }

    // Multi-tenancy isolation: verify station belongs to dean's faculty
    const isStationAllowed = await verifyStationBelongsToFaculty(id, dean.facultyId)
    if (!isStationAllowed) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Station does not belong to your faculty.' },
        { status: 403 }
      )
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
      if (invigilator_prof_id && invigilator_prof_id !== 'unassigned' && invigilator_prof_id !== 'null') {
        const isProfAllowed = await verifyProfessorBelongsToFaculty(invigilator_prof_id, dean.facultyId)
        if (!isProfAllowed) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: Invigilator professor does not belong to your faculty.' },
            { status: 403 }
          )
        }
        updatePayload.invigilator_prof_id = invigilator_prof_id
      } else {
        updatePayload.invigilator_prof_id = null
      }
    }

    if (exam_id !== undefined) {
      if (!exam_id || exam_id === 'unassigned' || exam_id === 'null') {
        return NextResponse.json(
          { success: false, error: 'Exam ID cannot be empty. Stations must be linked to a faculty exam.' },
          { status: 400 }
        )
      }
      const isExamAllowed = await verifyExamBelongsToFaculty(exam_id, dean.facultyId)
      if (!isExamAllowed) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: Target exam does not belong to your faculty.' },
          { status: 403 }
        )
      }
      updatePayload.exam_id = exam_id
    }

    if (weightage_percentage !== undefined) {
      const weightage = Number(weightage_percentage)
      if (isNaN(weightage) || weightage < 0 || weightage > 100) {
        return NextResponse.json(
          { success: false, error: 'Weightage percentage must be between 0 and 100.' },
          { status: 400 }
        )
      }
      updatePayload.weightage_percentage = weightage
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

    // Multi-tenancy isolation: verify station belongs to dean's faculty
    const isStationAllowed = await verifyStationBelongsToFaculty(id, dean.facultyId)
    if (!isStationAllowed) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Station does not belong to your faculty.' },
        { status: 403 }
      )
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

