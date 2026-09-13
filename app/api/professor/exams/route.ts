import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedProfessor } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'
import { resolveStationRecord } from '@/lib/stationResolver'

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

    // Verify station exists (supports slug or UUID)
    const resolved = await resolveStationRecord(station_id, prof)
    if (resolved.unauthorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to add exams to this station.' },
        { status: 403 }
      )
    }
    if (!resolved.station) {
      return NextResponse.json({ success: false, error: 'Target station not found.' }, { status: 404 })
    }

    const trueStationId = resolved.station.id

    // 1. Fetch existing exams for this station
    const { data: existingExams, error: exFetchErr } = await supabaseAdmin
      .from('exams')
      .select('id, session_type')
      .eq('station_id', trueStationId)

    if (exFetchErr) throw exFetchErr

    // 2. Max 2 sessions constraint (1 Regular + 1 Makeup)
    if (existingExams && existingExams.length >= 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum exam sessions reached (2/2). Each station allows at most one Regular Session and one Makeup Session.',
        },
        { status: 400 }
      )
    }

    // 3. Unique session type constraint
    const duplicateSession = (existingExams || []).find(
      (e) => e.session_type === normalizedSessionType
    )
    if (duplicateSession) {
      const typeLabel = normalizedSessionType === 'makeup' ? 'Makeup' : 'Regular'
      return NextResponse.json(
        {
          success: false,
          error: `A ${typeLabel} Session already exists for this station. Each station allows only one ${typeLabel} Session.`,
        },
        { status: 400 }
      )
    }

    const { data: newExam, error: insertErr } = await supabaseAdmin
      .from('exams')
      .insert([
        {
          station_id: trueStationId,
          session_type: normalizedSessionType,
          exam_date: examDateVal,
        },
      ])
      .select()
      .single()

    if (insertErr) {
      if (insertErr.code === '23505') {
        const typeLabel = normalizedSessionType === 'makeup' ? 'Makeup' : 'Regular'
        return NextResponse.json(
          {
            success: false,
            error: `A ${typeLabel} Session already exists for this station.`,
          },
          { status: 400 }
        )
      }
      throw insertErr
    }

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
