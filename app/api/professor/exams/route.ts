import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'
import { resolveStationRecord } from '@/lib/stationResolver'

export async function GET(req: NextRequest) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const moduleId = searchParams.get('module_id')
    const stationId = searchParams.get('station_id')
    const academicYearIdParam =
      searchParams.get('academic_year_id') ||
      req.cookies.get('selected_academic_year_id')?.value ||
      null

    // Find professor assigned modules
    let levelIds: string[] = []
    if (academicYearIdParam) {
      const { data: levels } = await supabaseAdmin
        .from('study_levels')
        .select('id')
        .eq('academic_year_id', academicYearIdParam)

      levelIds = (levels || []).map((l) => l.id)
      if (levelIds.length === 0) {
        return NextResponse.json({ success: true, exams: [] })
      }
    }

    let modQuery = supabaseAdmin
      .from('modules')
      .select('id, level_id')
      .or(`responsible_prof_id.eq.${prof.professorId},responsible_prof_id.eq.${prof.userId}`)

    if (levelIds.length > 0) {
      modQuery = modQuery.in('level_id', levelIds)
    }

    let { data: profModules } = await modQuery

    // If professor has no specific assigned modules in these levels, fallback to faculty modules
    if (!profModules || profModules.length === 0) {
      let facModQuery = supabaseAdmin
        .from('modules')
        .select('id, level_id')

      if (levelIds.length > 0) {
        facModQuery = facModQuery.in('level_id', levelIds)
      }
      const { data: facModules } = await facModQuery
      profModules = facModules || []
    }

    const profModuleIds = (profModules || []).map((m) => m.id)

    if (academicYearIdParam && profModuleIds.length === 0 && !stationId) {
      return NextResponse.json({ success: true, exams: [] })
    }

    let query = supabaseAdmin
      .from('exams')
      .select('*')
      .order('exam_date', { ascending: false })

    if (moduleId) {
      if (!profModuleIds.includes(moduleId)) {
        return NextResponse.json({ success: true, exams: [] })
      }
      query = query.eq('module_id', moduleId)
    } else if (profModuleIds.length > 0) {
      query = query.in('module_id', profModuleIds)
    }

    if (stationId) {
      const { data: st } = await supabaseAdmin
        .from('stations')
        .select('exam_id')
        .eq('id', stationId)
        .maybeSingle()

      if (st?.exam_id) {
        query = query.eq('id', st.exam_id)
      } else {
        return NextResponse.json({ success: true, exams: [] })
      }
    }

    const { data: exams, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, exams: exams || [] })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to fetch exams.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { module_id, station_id, session_type, exam_date } = body

    let targetModuleId = module_id
    let trueStationId = station_id

    // If station_id provided but not module_id, resolve module from station
    if (!targetModuleId && station_id) {
      const resolved = await resolveStationRecord(station_id, prof)
      if (resolved.station) {
        targetModuleId = resolved.station.module_id || (resolved.station as any).exams?.module_id
        trueStationId = resolved.station.id
      }
    }

    if (!targetModuleId && !trueStationId) {
      return NextResponse.json(
        { success: false, error: 'Module ID or Station ID is required.' },
        { status: 400 }
      )
    }

    const normalizedSessionType =
      session_type === 'retake' || session_type === 'makeup' ? 'retake' : 'regular'
    const examDateVal = exam_date || new Date().toISOString().split('T')[0]

    // Verify module ownership if targetModuleId provided
    if (targetModuleId) {
      const { data: modCheck } = await supabaseAdmin
        .from('modules')
        .select('id, module_name, responsible_prof_id')
        .eq('id', targetModuleId)
        .maybeSingle()

      if (
        modCheck &&
        modCheck.responsible_prof_id !== prof.professorId &&
        modCheck.responsible_prof_id !== prof.userId
      ) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: You are not assigned to this module.' },
          { status: 403 }
        )
      }
    }

    // Enforce 1 regular + 1 retake exam limit per module (uq_module_session)
    if (targetModuleId) {
      const { data: existingSession } = await supabaseAdmin
        .from('exams')
        .select('id, session_type')
        .eq('module_id', targetModuleId)
        .eq('session_type', normalizedSessionType)
        .maybeSingle()

      if (existingSession) {
        const typeLabel = normalizedSessionType === 'retake' ? 'Retake' : 'Regular'
        return NextResponse.json(
          {
            success: false,
            error: `A ${typeLabel} Session already exists for this module (maximum 1 Regular and 1 Retake session allowed).`,
          },
          { status: 400 }
        )
      }
    }

    // Insert top-level exam session (strictly normalized: NO station_id on exams)
    const insertPayload: any = {
      session_type: normalizedSessionType,
      exam_date: examDateVal,
    }
    if (targetModuleId) insertPayload.module_id = targetModuleId

    const { data: newExam, error: insertErr } = await supabaseAdmin
      .from('exams')
      .insert([insertPayload])
      .select()
      .single()

    if (insertErr) {
      if (insertErr.code === '23505') {
        const typeLabel = normalizedSessionType === 'retake' ? 'Retake' : 'Regular'
        return NextResponse.json(
          {
            success: false,
            error: `A ${typeLabel} Session already exists for this module.`,
          },
          { status: 400 }
        )
      }
      throw insertErr
    }

    // If trueStationId was provided, link station's exam_id to newExam.id
    if (trueStationId && newExam?.id) {
      await supabaseAdmin
        .from('stations')
        .update({ exam_id: newExam.id })
        .eq('id', trueStationId)
    }

    return NextResponse.json({ success: true, exam: newExam })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create exam session.' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'Exam ID is required.' }, { status: 400 })
    }

    // Find child stations
    const { data: childStations } = await supabaseAdmin
      .from('stations')
      .select('id')
      .eq('exam_id', id)

    const stationIds = (childStations || []).map((s) => s.id)

    if (stationIds.length > 0) {
      // Delete child questions
      await supabaseAdmin.from('questions').delete().in('station_id', stationIds)
      // Delete child station criteria
      await supabaseAdmin.from('station_criteria').delete().in('station_id', stationIds)
      // Delete child stations
      await supabaseAdmin.from('stations').delete().eq('exam_id', id)
    }

    // Delete exam
    const { error: delErr } = await supabaseAdmin.from('exams').delete().eq('id', id)
    if (delErr) throw delErr

    return NextResponse.json({ success: true, message: 'Exam session removed.' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete exam session.' },
      { status: 500 }
    )
  }
}
