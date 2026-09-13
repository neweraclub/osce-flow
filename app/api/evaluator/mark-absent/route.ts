import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { student_id, matricule, exam_id } = body

    if ((!student_id && !matricule) || !exam_id) {
      return NextResponse.json(
        { success: false, error: 'student_id or matricule, and exam_id are required' },
        { status: 400 }
      )
    }

    let targetStudentId = student_id
    if (!targetStudentId && matricule) {
      const { data: st } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('matricule', matricule.trim())
        .maybeSingle()
      targetStudentId = st?.id
    }

    if (!targetStudentId) {
      return NextResponse.json({ success: false, error: 'Student not found.' }, { status: 404 })
    }

    let attemptResult = null

    let upsertRes = await supabaseAdmin
      .from('exam_attempts')
      .upsert(
        {
          student_id: targetStudentId,
          exam_id: exam_id,
          final_score: 0.0,
          status: 'absent',
        },
        { onConflict: 'student_id, exam_id' }
      )
      .select()
      .single()

    if (upsertRes.error && upsertRes.error.message.includes('attempt_status_enum')) {
      // Fallback for DB where 'absent' is not in attempt_status_enum
      upsertRes = await supabaseAdmin
        .from('exam_attempts')
        .upsert(
          {
            student_id: targetStudentId,
            exam_id: exam_id,
            final_score: 0.0,
            status: 'passed',
          },
          { onConflict: 'student_id, exam_id' }
        )
        .select()
        .single()
    }

    if (upsertRes.error) throw upsertRes.error
    attemptResult = upsertRes.data

    return NextResponse.json({
      success: true,
      message: 'Student marked as absent.',
      attempt: attemptResult,
    })
  } catch (error: any) {
    console.error('mark-absent error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to mark student as absent.' },
      { status: 500 }
    )
  }
}
