import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const stationId = searchParams.get('station_id')

    if (!stationId) {
      return NextResponse.json({ success: false, error: 'Station ID is required.' }, { status: 400 })
    }

    // Verify station exists and belongs to this professor (or dean)
    const { data: station, error: stationErr } = await supabaseAdmin
      .from('stations')
      .select('*')
      .eq('id', stationId)
      .single()

    if (stationErr || !station) {
      return NextResponse.json({ success: false, error: 'Station not found.' }, { status: 404 })
    }

    // Fetch questions for this station
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('station_id', stationId)
      .order('created_at', { ascending: true })

    if (qErr) throw qErr

    const questionIds = (questions || []).map((q) => q.id)
    let optionsList: any[] = []

    if (questionIds.length > 0) {
      const { data: rawOptions } = await supabaseAdmin
        .from('question_options')
        .select('*')
        .in('question_id', questionIds)

      optionsList = rawOptions || []
    }

    const optionsByQuestion = new Map<string, any[]>()
    optionsList.forEach((opt) => {
      const list = optionsByQuestion.get(opt.question_id) || []
      list.push(opt)
      optionsByQuestion.set(opt.question_id, list)
    })

    const formattedQuestions = (questions || []).map((q) => ({
      ...q,
      options: optionsByQuestion.get(q.id) || [],
    }))

    return NextResponse.json({
      success: true,
      station,
      questions: formattedQuestions,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch station questions.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { station_id, question_text, question_type, max_points, options } = body

    if (!station_id || !question_text?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Station ID and Question/Checklist criteria text are required.' },
        { status: 400 }
      )
    }

    const pointsNum = Math.max(1, Number(max_points) || 1)
    const qType = question_type || 'clinical_task'

    const { data: newQuestion, error: qErr } = await supabaseAdmin
      .from('questions')
      .insert([
        {
          station_id,
          question_text: question_text.trim(),
          question_type: qType,
          max_points: pointsNum,
        },
      ])
      .select()
      .single()

    if (qErr) throw qErr

    // Insert options if provided
    if (Array.isArray(options) && options.length > 0) {
      const optionsToInsert = options.map((opt: any) => ({
        question_id: newQuestion.id,
        option_text: typeof opt === 'string' ? opt : opt.option_text,
        is_correct: typeof opt === 'object' ? !!opt.is_correct : false,
      }))

      await supabaseAdmin.from('question_options').insert(optionsToInsert)
    }

    return NextResponse.json({ success: true, question: newQuestion })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to save question criteria.' },
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
      return NextResponse.json({ success: false, error: 'Question ID is required.' }, { status: 400 })
    }

    // Delete options first
    await supabaseAdmin.from('question_options').delete().eq('question_id', id)

    // Delete question
    const { error: delErr } = await supabaseAdmin.from('questions').delete().eq('id', id)
    if (delErr) throw delErr

    return NextResponse.json({ success: true, message: 'Question criteria removed.' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete question.' },
      { status: 500 }
    )
  }
}
