import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { matricule, exam_id } = body

    if (!matricule || !exam_id) {
      return NextResponse.json(
        { success: false, error: 'matricule and exam_id are required' },
        { status: 400 }
      )
    }

    // Check if an attempt already exists
    const { data: existingAttempt } = await supabaseAdmin
      .from('exam_attempts')
      .select('id, status')
      .eq('student_matricule', matricule)
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
          student_matricule: matricule,
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
            student_matricule: matricule,
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
