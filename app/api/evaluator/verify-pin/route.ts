import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pin } = body

    if (!pin || typeof pin !== 'string' || pin.trim().length < 4) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid station PIN (minimum 4 digits).' },
        { status: 400 }
      )
    }

    const cleanPin = pin.trim()

    // 1. Look up station by access_pin
    const { data: station, error: stErr } = await supabaseAdmin
      .from('stations')
      .select('*')
      .eq('access_pin', cleanPin)
      .single()

    if (stErr || !station) {
      return NextResponse.json(
        { success: false, error: 'Invalid access PIN. Station not found.' },
        { status: 404 }
      )
    }

    // 2. Look up linked exam & module (normalized schema: station.exam_id -> exams.module_id)
    let linkedExam: any = null
    if (station.exam_id) {
      const { data: ex } = await supabaseAdmin
        .from('exams')
        .select('*')
        .eq('id', station.exam_id)
        .maybeSingle()
      linkedExam = ex
    }

    const moduleId = linkedExam?.module_id || null
    let mod: any = null
    let levelName = 'General Level'
    let levelId = null
    let academicYearId = null

    if (moduleId) {
      const { data: modData } = await supabaseAdmin
        .from('modules')
        .select('id, module_name, level_id')
        .eq('id', moduleId)
        .single()
      mod = modData
      levelId = mod?.level_id || null

      if (levelId) {
        const { data: lvl } = await supabaseAdmin
          .from('study_levels')
          .select('id, level_name, academic_year_id')
          .eq('id', levelId)
          .single()

        if (lvl) {
          levelName = lvl.level_name || 'General Level'
          academicYearId = lvl.academic_year_id
        }
      }
    }

    // 3. Fetch questions for this station
    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select('id')
      .eq('station_id', station.id)

    const questionCount = (questions || []).length

    const formattedExams = linkedExam
      ? [
          {
            id: linkedExam.id,
            session_type: linkedExam.session_type || 'regular',
            exam_date: linkedExam.exam_date,
            question_count: questionCount,
            created_at: linkedExam.created_at,
          },
        ]
      : []

    return NextResponse.json({
      success: true,
      station: {
        id: station.id,
        station_number: station.station_number,
        title: station.title,
        access_pin: station.access_pin,
        weightage_percentage: Number(station.weightage_percentage || 0),
        exam_id: station.exam_id,
        module_id: moduleId,
        module_name: mod ? mod.module_name : 'Medical Module',
        level_id: levelId,
        level_name: levelName,
        academic_year_id: academicYearId,
      },
      exams: formattedExams,
    })
  } catch (error: any) {
    console.error('verify-pin error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to verify station PIN.' },
      { status: 500 }
    )
  }
}
