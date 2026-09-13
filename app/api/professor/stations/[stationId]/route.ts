import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'
import { resolveStationRecord } from '@/lib/stationResolver'
import { getStationSlug } from '@/lib/stationSlug'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { stationId } = await params
    if (!stationId) {
      return NextResponse.json({ success: false, error: 'Station identifier is required.' }, { status: 400 })
    }

    // Resolve station by human-readable slug or raw UUID
    const resolved = await resolveStationRecord(stationId, prof)
    if (resolved.unauthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to view this station.' },
        { status: 403 }
      )
    }
    if (!resolved.station) {
      return NextResponse.json({ success: false, error: 'Station not found.' }, { status: 404 })
    }

    const { station, module: mod, levelName, slug } = resolved

    // Fetch Exams for this Station (always using internal UUID)
    const { data: exams, error: exErr } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('station_id', station.id)
      .order('exam_date', { ascending: false })

    if (exErr) throw exErr

    const examIds = (exams || []).map((e) => e.id)

    // Fetch Question counts for each exam
    const questionsCountMap = new Map<string, number>()
    if (examIds.length > 0) {
      const { data: qData } = await supabaseAdmin
        .from('questions')
        .select('id, exam_id')
        .in('exam_id', examIds)

      ;(qData || []).forEach((q) => {
        questionsCountMap.set(q.exam_id, (questionsCountMap.get(q.exam_id) || 0) + 1)
      })
    }

    const formattedExams = (exams || []).map((e) => ({
      id: e.id,
      station_id: e.station_id,
      session_type: e.session_type || 'regular',
      exam_date: e.exam_date,
      question_count: questionsCountMap.get(e.id) || 0,
      created_at: e.created_at,
    }))

    return NextResponse.json({
      success: true,
      station: {
        id: station.id,
        slug,
        module_id: station.module_id,
        station_number: station.station_number,
        title: station.title,
        access_pin: station.access_pin,
        weightage_percentage: Number(station.weightage_percentage || 0),
        module_name: mod ? mod.module_name : 'General Module',
        level_name: levelName || 'General Level',
        created_at: station.created_at,
      },
      exams: formattedExams,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch station details.' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { stationId } = await params
    if (!stationId) {
      return NextResponse.json({ success: false, error: 'Station identifier is required.' }, { status: 400 })
    }

    const resolved = await resolveStationRecord(stationId, prof)
    if (resolved.unauthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You are not assigned to manage this station.' },
        { status: 403 }
      )
    }
    if (!resolved.station) {
      return NextResponse.json({ success: false, error: 'Station not found.' }, { status: 404 })
    }

    const currentStation = resolved.station
    const body = await req.json()
    const { module_id, title, station_number, access_pin, weightage_percentage } = body

    const updatePayload: any = {}

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json({ success: false, error: 'Station title cannot be empty.' }, { status: 400 })
      }
      updatePayload.title = title.trim()
    }

    if (station_number !== undefined) {
      const num = Number(station_number)
      if (num < 1) {
        return NextResponse.json({ success: false, error: 'Station number must be at least 1.' }, { status: 400 })
      }
      updatePayload.station_number = num
    }

    if (access_pin !== undefined) {
      const pinStr = String(access_pin).trim()
      if (pinStr.length < 4) {
        return NextResponse.json({ success: false, error: 'Access PIN must be at least 4 characters.' }, { status: 400 })
      }
      updatePayload.access_pin = pinStr
    }

    if (weightage_percentage !== undefined) {
      updatePayload.weightage_percentage = Math.max(0, Math.min(100, Number(weightage_percentage) || 0))
    }

    if (module_id !== undefined && module_id !== currentStation.module_id) {
      // Verify new module also belongs to this professor
      const { data: targetMod } = await supabaseAdmin
        .from('modules')
        .select('id, responsible_prof_id')
        .eq('id', module_id)
        .single()

      if (
        !targetMod ||
        (targetMod.responsible_prof_id !== prof.professorId &&
          targetMod.responsible_prof_id !== prof.userId)
      ) {
        return NextResponse.json(
          { success: false, error: 'Target module is not assigned to you.' },
          { status: 403 }
        )
      }
      updatePayload.module_id = module_id
    }

    const { data: updatedStation, error: updateErr } = await supabaseAdmin
      .from('stations')
      .update(updatePayload)
      .eq('id', currentStation.id)
      .select()
      .single()

    if (updateErr) {
      if (updateErr.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'This Access PIN is already in use by another station. Please choose another PIN.' },
          { status: 400 }
        )
      }
      throw updateErr
    }

    const updatedSlug = getStationSlug({
      station_number: updatedStation.station_number,
      module_name: resolved.module?.module_name,
      id: updatedStation.id,
    })

    return NextResponse.json({
      success: true,
      station: { ...updatedStation, slug: updatedSlug },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update station.' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { stationId } = await params
    if (!stationId) {
      return NextResponse.json({ success: false, error: 'Station identifier is required.' }, { status: 400 })
    }

    const resolved = await resolveStationRecord(stationId, prof)
    if (resolved.unauthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You are not assigned to delete this station.' },
        { status: 403 }
      )
    }
    if (!resolved.station) {
      return NextResponse.json({ success: false, error: 'Station not found.' }, { status: 404 })
    }

    const currentStation = resolved.station

    // 1. Find child exams to delete child questions if needed
    const { data: childExams } = await supabaseAdmin
      .from('exams')
      .select('id')
      .eq('station_id', currentStation.id)

    const examIds = (childExams || []).map((e) => e.id)
    if (examIds.length > 0) {
      await supabaseAdmin.from('questions').delete().in('exam_id', examIds)
      await supabaseAdmin.from('exams').delete().eq('station_id', currentStation.id)
    }

    // 2. Delete station
    const { error: delErr } = await supabaseAdmin
      .from('stations')
      .delete()
      .eq('id', currentStation.id)

    if (delErr) throw delErr

    return NextResponse.json({ success: true, message: 'Station deleted successfully.' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete station.' },
      { status: 500 }
    )
  }
}
