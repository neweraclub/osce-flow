import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      student_id,
      matricule,
      exam_id,
      station_id,
      answers,
      graded_by_prof_id,
      penalty_total,
    } = body

    if ((!student_id && !matricule) || !exam_id || !station_id) {
      return NextResponse.json(
        { success: false, error: 'student_id or matricule, exam_id, and station_id are required' },
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

    const answerList: Array<{
      question_id: string
      selected_option_id?: string | null
      evaluation_score?: number | null
      points_awarded: number
    }> = Array.isArray(answers) ? answers : []

    // 1. Calculate total score with clinical deductions
    const earnedScore = answerList.reduce((sum, a) => {
      const pts = Number(a.points_awarded) || 0
      return sum + (pts >= 0 ? pts : 0)
    }, 0)

    const deductions = Math.abs(Number(penalty_total) || 0)
    const finalScore = Math.max(0, Math.round((earnedScore - deductions) * 100) / 100)

    // 2. Check or create exam_attempts record
    const { data: existingAttempt } = await supabaseAdmin
      .from('exam_attempts')
      .select('id, status')
      .eq('student_id', targetStudentId)
      .eq('exam_id', exam_id)
      .maybeSingle()

    let attemptId = existingAttempt?.id

    if (existingAttempt) {
      const { data: updated, error: updErr } = await supabaseAdmin
        .from('exam_attempts')
        .update({
          final_score: finalScore,
          status: 'passed',
        })
        .eq('id', existingAttempt.id)
        .select('id')
        .single()

      if (updErr) throw updErr
      attemptId = updated.id
    } else {
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from('exam_attempts')
        .insert({
          student_id: targetStudentId,
          exam_id: exam_id,
          final_score: finalScore,
          status: 'passed',
        })
        .select('id')
        .single()

      if (insErr) throw insErr
      attemptId = inserted.id
    }

    // 3. Clear any existing student_answers for this attempt and station to avoid duplicates
    await supabaseAdmin
      .from('student_answers')
      .delete()
      .eq('attempt_id', attemptId)
      .eq('station_id', station_id)

    // 4. Insert student_answers rows
    if (answerList.length > 0) {
      const answerRows = answerList.map((ans: any) => ({
        attempt_id: attemptId,
        station_id: station_id,
        question_id: ans.question_id,
        selected_options: Array.isArray(ans.selected_options)
          ? ans.selected_options
          : (ans.selected_option_id ? [ans.selected_option_id] : []),
        evaluation_score: typeof ans.evaluation_score === 'number' ? ans.evaluation_score : null,
        points_awarded: Math.max(0, Number(ans.points_awarded) || 0),
        graded_by_prof_id: graded_by_prof_id || null,
      }))

      const { error: ansErr } = await supabaseAdmin
        .from('student_answers')
        .insert(answerRows)

      if (ansErr) {
        console.error('Error inserting student_answers:', ansErr)
        // Even if individual answer recording fails, attempt is saved, but let's log and report
        throw ansErr
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Attempt submitted and scored successfully.',
      attempt_id: attemptId,
      final_score: finalScore,
      answers_count: answerList.length,
    })
  } catch (error: any) {
    console.error('submit-attempt error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit exam attempt.' },
      { status: 500 }
    )
  }
}
