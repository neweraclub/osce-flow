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

    // 2. Look up module & level details
    const { data: mod } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id')
      .eq('id', station.module_id)
      .single()

    let levelName = 'General Level'
    let levelId = mod?.level_id || null
    let academicYearId = null

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

    // 3. Fetch exams for this station
    const { data: exams, error: exErr } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('station_id', station.id)
      .order('exam_date', { ascending: false })

    if (exErr) {
      console.error('Error fetching station exams:', exErr)
    }

    // 4. Fetch question count per exam
    const examIds = (exams || []).map((e) => e.id)
    const questionsCountMap: Record<string, number> = {}

    if (examIds.length > 0) {
      const { data: qData } = await supabaseAdmin
        .from('questions')
        .select('id, exam_id')
        .in('exam_id', examIds)

      ;(qData || []).forEach((q) => {
        questionsCountMap[q.exam_id] = (questionsCountMap[q.exam_id] || 0) + 1
      })
    }

    const formattedExams = (exams || []).map((e) => ({
      id: e.id,
      station_id: e.station_id,
      session_type: e.session_type || 'regular',
      exam_date: e.exam_date,
      question_count: questionsCountMap[e.id] || 0,
      created_at: e.created_at,
    }))

    return NextResponse.json({
      success: true,
      station: {
        id: station.id,
        station_number: station.station_number,
        title: station.title,
        access_pin: station.access_pin,
        weightage_percentage: Number(station.weightage_percentage || 0),
        module_id: station.module_id,
        module_name: mod ? mod.module_name : 'Medical Module',
        level_id: levelId,
        level_name: levelName,
        academic_year_id: academicYearId,
        created_at: station.created_at,
      },
      exams: formattedExams,
    })
  } catch (error: any) {
    console.error('verify-pin error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Server error during PIN validation.' },
      { status: 500 }
    )
  }
}
