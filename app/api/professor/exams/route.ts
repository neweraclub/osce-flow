import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const prof = await getAuthenticatedProfessor(req)
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await req.json()
    const { station_id, session_type, exam_date } = body

    if (!station_id) {
      return NextResponse.json(
        { success: false, error: 'Station ID is required.' },
        { status: 400 }
      )
    }

    const normalizedSessionType = session_type === 'makeup' ? 'makeup' : 'regular'
    const examDateVal = exam_date || new Date().toISOString().split('T')[0]

    // Verify station exists
    const { data: stationCheck, error: stCheckErr } = await supabaseAdmin
      .from('stations')
      .select('id, title')
      .eq('id', station_id)
      .single()

    if (stCheckErr || !stationCheck) {
      return NextResponse.json({ success: false, error: 'Target station not found.' }, { status: 404 })
    }

    const { data: newExam, error: insertErr } = await supabaseAdmin
      .from('exams')
      .insert([
        {
          station_id,
          session_type: normalizedSessionType,
          exam_date: examDateVal,
        },
      ])
      .select()
      .single()

    if (insertErr) throw insertErr

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

    // Delete child questions
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
