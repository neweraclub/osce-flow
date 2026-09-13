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
      penalties = [],
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

    const penaltyList: Array<{ reason: string; points: number }> = Array.isArray(penalties)
      ? penalties
      : []

    const deductionsFromList = penaltyList.reduce((sum, p) => sum + Math.abs(Number(p.points) || 0), 0)
    const deductions = penaltyList.length > 0 ? deductionsFromList : Math.abs(Number(penalty_total) || 0)
    const finalScore = Math.max(0, Math.round((earnedScore - deductions) * 100) / 100)

    // 2. Upsert exam_attempts record with onConflict: 'student_id, exam_id'
    const { data: attemptRecord, error: attErr } = await supabaseAdmin
      .from('exam_attempts')
      .upsert(
        {
          student_id: targetStudentId,
          exam_id: exam_id,
          final_score: finalScore,
          status: 'passed',
        },
        { onConflict: 'student_id, exam_id' }
      )
      .select('id')
      .single()

    if (attErr) {
      console.error('Error upserting exam_attempts:', attErr)
      throw attErr
    }

    const attemptId = attemptRecord.id

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

    // 5. Clear and batch insert candidate_penalties for this attempt
    await supabaseAdmin
      .from('candidate_penalties')
      .delete()
      .eq('exam_attempt_id', attemptId)

    if (penaltyList.length > 0) {
      const penaltyRows = penaltyList
        .filter((p) => p.reason && p.reason.trim())
        .map((p) => {
          const rawPts = Number(p.points) || 0
          const negativePts = rawPts > 0 ? -rawPts : rawPts === 0 ? -0.5 : rawPts
          return {
            exam_attempt_id: attemptId,
            reason: p.reason.trim(),
            points: negativePts,
          }
        })

      if (penaltyRows.length > 0) {
        const { error: penErr } = await supabaseAdmin
          .from('candidate_penalties')
          .insert(penaltyRows)

        if (penErr) {
          console.error('Error batch inserting candidate_penalties:', penErr)
          throw penErr
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Attempt submitted and scored successfully.',
      attempt_id: attemptId,
      final_score: finalScore,
      answers_count: answerList.length,
      penalties_count: penaltyList.length,
    })
  } catch (error: any) {
    console.error('submit-attempt error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit exam attempt.' },
      { status: 500 }
    )
  }
}
