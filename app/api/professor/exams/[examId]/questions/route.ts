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

    // 2. Fetch Station (stations.exam_id)
    const { data: station } = await supabaseAdmin
      .from('stations')
      .select('*')
      .eq('exam_id', examId)
      .maybeSingle()

    // 3. Fetch Module info
    let moduleName = 'General Module'
    let levelName = 'General Level'
    const moduleId = exam.module_id
    if (moduleId) {
      const { data: mod } = await supabaseAdmin
        .from('modules')
        .select('module_name, level_id')
        .eq('id', moduleId)
        .maybeSingle()

      if (mod?.module_name) moduleName = mod.module_name
      if (mod?.level_id) {
        const { data: lvl } = await supabaseAdmin
          .from('study_levels')
          .select('level_name')
          .eq('id', mod.level_id)
          .maybeSingle()
        if (lvl?.level_name) levelName = lvl.level_name
      }
    }

    // 4. Fetch Questions (questions.station_id)
    let questions: any[] = []
    if (station?.id) {
      const { data: qData, error: qErr } = await supabaseAdmin
        .from('questions')
        .select('*')
        .eq('station_id', station.id)
        .order('created_at', { ascending: true })

      if (qErr) throw qErr
      questions = qData || []
    }

    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        module_id: exam.module_id,
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
            module_id: exam.module_id,
            station_number: station.station_number,
            title: station.title,
            access_pin: station.access_pin,
            weightage_percentage: Number(station.weightage_percentage || 0),
            module_name: moduleName,
            level_name: levelName,
          }
        : null,
      questions,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch exam questions.' },
      { status: 500 }
    )
  }
}
