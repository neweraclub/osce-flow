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

    let query = supabaseAdmin
      .from('exams')
      .select('*')
      .order('exam_date', { ascending: false })

    if (moduleId) {
      query = query.eq('module_id', moduleId)
    }
    if (stationId) {
      query = query.eq('station_id', stationId)
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

    // Insert top-level exam session
    const insertPayload: any = {
      session_type: normalizedSessionType,
      exam_date: examDateVal,
    }
    if (targetModuleId) insertPayload.module_id = targetModuleId
    if (trueStationId) insertPayload.station_id = trueStationId

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
            error: `A ${typeLabel} Session already exists for this station/module.`,
          },
          { status: 400 }
        )
      }
      throw insertErr
    }

    // If trueStationId was provided, update station's exam_id link
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

    // Delete child questions if any
    await supabaseAdmin.from('questions').delete().eq('exam_id', id)

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
