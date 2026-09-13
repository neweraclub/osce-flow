import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'
import { getStationSlug } from '@/lib/stationSlug'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { examId } = await params
    if (!examId) {
      return NextResponse.json({ success: false, error: 'Exam ID is required.' }, { status: 400 })
    }

    // 1. Fetch Exam
    const { data: exam, error: exErr } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (exErr || !exam) {
      return NextResponse.json({ success: false, error: 'Exam session not found.' }, { status: 404 })
    }

    // 2. Fetch Station
    const { data: station } = await supabaseAdmin
      .from('stations')
      .select('*')
      .eq('id', exam.station_id)
      .single()

    // 3. Fetch Module info
    let moduleName = 'General Module'
    let levelName = 'General Level'
    if (station?.module_id) {
      const { data: mod } = await supabaseAdmin
        .from('modules')
        .select('module_name, level_id')
        .eq('id', station.module_id)
        .single()

      if (mod?.module_name) moduleName = mod.module_name
      if (mod?.level_id) {
        const { data: lvl } = await supabaseAdmin
          .from('study_levels')
          .select('level_name')
          .eq('id', mod.level_id)
          .single()
        if (lvl?.level_name) levelName = lvl.level_name
      }
    }

    // 4. Fetch Questions
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true })

    if (qErr) throw qErr

    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        station_id: exam.station_id,
        session_type: exam.session_type || 'regular',
        exam_date: exam.exam_date,
        created_at: exam.created_at,
      },
      station: station
        ? {
            id: station.id,
            slug: getStationSlug({
              station_number: station.station_number,
              module_name: moduleName,
              id: station.id,
            }),
            module_id: station.module_id,
            station_number: station.station_number,
            title: station.title,
            access_pin: station.access_pin,
            weightage_percentage: Number(station.weightage_percentage || 0),
            module_name: moduleName,
            level_name: levelName,
          }
        : null,
      questions: questions || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch exam questions.' },
      { status: 500 }
    )
  }
}
