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

    // 2. Fetch Module Details & Level
    const { data: mod } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id')
      .eq('id', station.module_id)
      .single()

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
