import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'

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
      return NextResponse.json({ success: false, error: 'Station ID is required.' }, { status: 400 })
    }

    // 1. Fetch Station
    const { data: station, error: stErr } = await supabaseAdmin
      .from('stations')
      .select('*')
      .eq('id', stationId)
      .single()

    if (stErr || !station) {
      return NextResponse.json({ success: false, error: 'Station not found.' }, { status: 404 })
    }

    // 2. Fetch Module Details & verify ownership
    const { data: mod } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id, responsible_prof_id')
      .eq('id', station.module_id)
      .single()

    if (
      mod &&
      mod.responsible_prof_id !== prof.professorId &&
      mod.responsible_prof_id !== prof.userId
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to view this station.' },
        { status: 403 }
      )
    }

    let levelName = 'General Level'
    if (mod?.level_id) {
      const { data: lvl } = await supabaseAdmin
        .from('study_levels')
        .select('level_name')
        .eq('id', mod.level_id)
        .single()
      if (lvl?.level_name) levelName = lvl.level_name
    }

    // 3. Fetch Exams for this Station
    const { data: exams, error: exErr } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('station_id', stationId)
      .order('exam_date', { ascending: false })

    if (exErr) throw exErr

    const examIds = (exams || []).map((e) => e.id)

    // 4. Fetch Question counts for each exam
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
        module_id: station.module_id,
        station_number: station.station_number,
        title: station.title,
        access_pin: station.access_pin,
        weightage_percentage: Number(station.weightage_percentage || 0),
        module_name: mod ? mod.module_name : 'General Module',
        level_name: levelName,
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
      return NextResponse.json({ success: false, error: 'Station ID is required.' }, { status: 400 })
    }

    const body = await req.json()
    const { module_id, title, station_number, access_pin, weightage_percentage } = body

    // 1. Fetch current station
    const { data: currentStation, error: fetchErr } = await supabaseAdmin
      .from('stations')
      .select('id, module_id')
      .eq('id', stationId)
      .single()

    if (fetchErr || !currentStation) {
      return NextResponse.json({ success: false, error: 'Station not found.' }, { status: 404 })
    }

    // 2. Verify current station's module belongs to this professor
    const { data: currentModule } = await supabaseAdmin
      .from('modules')
      .select('id, responsible_prof_id')
      .eq('id', currentStation.module_id)
      .single()

    if (
      currentModule &&
      currentModule.responsible_prof_id !== prof.professorId &&
      currentModule.responsible_prof_id !== prof.userId
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You are not assigned to manage this station.' },
        { status: 403 }
      )
    }

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
      .eq('id', stationId)
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

    return NextResponse.json({ success: true, station: updatedStation })
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
      return NextResponse.json({ success: false, error: 'Station ID is required.' }, { status: 400 })
    }

    // 1. Fetch current station and module
    const { data: currentStation, error: fetchErr } = await supabaseAdmin
      .from('stations')
      .select('id, module_id')
      .eq('id', stationId)
      .single()

    if (fetchErr || !currentStation) {
      return NextResponse.json({ success: false, error: 'Station not found.' }, { status: 404 })
    }

    // 2. Verify ownership
    const { data: currentModule } = await supabaseAdmin
      .from('modules')
      .select('id, responsible_prof_id')
      .eq('id', currentStation.module_id)
      .single()

    if (
      currentModule &&
      currentModule.responsible_prof_id !== prof.professorId &&
      currentModule.responsible_prof_id !== prof.userId
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You are not assigned to delete this station.' },
        { status: 403 }
      )
    }

    // 3. Find child exams to delete child questions if needed
    const { data: childExams } = await supabaseAdmin
      .from('exams')
      .select('id')
      .eq('station_id', stationId)

    const examIds = (childExams || []).map((e) => e.id)
    if (examIds.length > 0) {
      await supabaseAdmin.from('questions').delete().in('exam_id', examIds)
      await supabaseAdmin.from('exams').delete().eq('station_id', stationId)
    }

    // 4. Delete station
    const { error: delErr } = await supabaseAdmin
      .from('stations')
      .delete()
      .eq('id', stationId)

    if (delErr) throw delErr

    return NextResponse.json({ success: true, message: 'Station deleted successfully.' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete station.' },
      { status: 500 }
    )
  }
}
