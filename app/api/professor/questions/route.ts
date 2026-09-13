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
    const examId = searchParams.get('exam_id')

    let query = supabaseAdmin.from('questions').select('*').order('created_at', { ascending: true })
    if (stationId) query = query.eq('station_id', stationId)
    else if (examId) query = query.eq('exam_id', examId)

    const { data: questions, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, questions: questions || [] })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed to fetch questions.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { station_id, exam_id, question_text, question_type, max_scale_value, options } = body

    if ((!station_id && !exam_id) || !question_text?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Station ID or Exam ID and Question text are required.' },
        { status: 400 }
      )
    }

    const scaleVal = Math.max(1, Number(max_scale_value) || 10)
    const qType = ['MCQ', 'SCQ', 'Q&A'].includes(question_type) ? question_type : 'Q&A'

    // Format options jsonb array
    let sanitizedOptions: any[] = []
    if (Array.isArray(options) && (qType === 'MCQ' || qType === 'SCQ')) {
      sanitizedOptions = options.map((opt: any, idx: number) => ({
        id: opt.id || `opt_${idx + 1}`,
        text: typeof opt === 'string' ? opt : (opt.text || opt.option_text || ''),
        is_correct: typeof opt === 'object' ? !!opt.is_correct : false,
      }))
    }

    const insertPayload: any = {
      question_text: question_text.trim(),
      question_type: qType,
      max_scale_value: scaleVal,
      options: sanitizedOptions,
    }
    if (station_id) insertPayload.station_id = station_id
    if (exam_id) insertPayload.exam_id = exam_id

    const { data: newQuestion, error: qErr } = await supabaseAdmin
      .from('questions')
      .insert([insertPayload])
      .select()
      .single()

    if (qErr) throw qErr

    return NextResponse.json({ success: true, question: newQuestion })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to save question.' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { id, question_text, question_type, max_scale_value, options } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Question ID is required.' }, { status: 400 })
    }

    const updatePayload: any = {}
    if (question_text !== undefined) updatePayload.question_text = question_text.trim()
    if (question_type !== undefined) {
      updatePayload.question_type = ['MCQ', 'SCQ', 'Q&A'].includes(question_type) ? question_type : 'Q&A'
    }
    if (max_scale_value !== undefined) {
      updatePayload.max_scale_value = Math.max(1, Number(max_scale_value) || 10)
    }
    if (options !== undefined) {
      if (Array.isArray(options)) {
        updatePayload.options = options.map((opt: any, idx: number) => ({
          id: opt.id || `opt_${idx + 1}`,
          text: typeof opt === 'string' ? opt : (opt.text || opt.option_text || ''),
          is_correct: typeof opt === 'object' ? !!opt.is_correct : false,
        }))
      } else {
        updatePayload.options = []
      }
    }

    const { data: updatedQ, error: uErr } = await supabaseAdmin
      .from('questions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (uErr) throw uErr

    return NextResponse.json({ success: true, question: updatedQ })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update question.' },
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

    const { error: delErr } = await supabaseAdmin
      .from('questions')
      .delete()
      .eq('id', id)

    if (delErr) throw delErr

    return NextResponse.json({ success: true, message: 'Question removed.' })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete question.' },
      { status: 500 }
    )
  }
}
