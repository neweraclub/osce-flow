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

    // Check if an attempt already exists
    const { data: existingAttempt } = await supabaseAdmin
      .from('exam_attempts')
      .select('id, status')
      .eq('student_id', targetStudentId)
      .eq('exam_id', exam_id)
      .maybeSingle()

    let attemptResult = null

    if (existingAttempt) {
      // Try updating with status: 'absent'
      let updateRes = await supabaseAdmin
        .from('exam_attempts')
        .update({
          final_score: 0.0,
          status: 'absent',
        })
        .eq('id', existingAttempt.id)
        .select()
        .single()

      if (updateRes.error && updateRes.error.message.includes('attempt_status_enum')) {
        // Fallback for DB where 'absent' is not in attempt_status_enum
        updateRes = await supabaseAdmin
          .from('exam_attempts')
          .update({
            final_score: 0.0,
            status: 'passed',
          })
          .eq('id', existingAttempt.id)
          .select()
          .single()
      }

      if (updateRes.error) throw updateRes.error
      attemptResult = updateRes.data
    } else {
      // Try inserting with status: 'absent'
      let insertRes = await supabaseAdmin
        .from('exam_attempts')
        .insert({
          student_id: targetStudentId,
          exam_id: exam_id,
          final_score: 0.0,
          status: 'absent',
        })
        .select()
        .single()

      if (insertRes.error && insertRes.error.message.includes('attempt_status_enum')) {
        // Fallback for DB where 'absent' is not in attempt_status_enum
        insertRes = await supabaseAdmin
          .from('exam_attempts')
          .insert({
            student_id: targetStudentId,
            exam_id: exam_id,
            final_score: 0.0,
            status: 'passed',
          })
          .select()
          .single()
      }

      if (insertRes.error) throw insertRes.error
      attemptResult = insertRes.data
    }

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
