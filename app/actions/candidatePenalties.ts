'use server'

import { supabaseAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface CandidatePenaltyItem {
  id: string
  exam_attempt_id: string
  criteria_id?: string | null
  reason: string
  points: number // strictly negative
  created_at?: string
}

export interface AssessmentAnswerPayload {
  question_id: string
  selected_options?: string[]
  evaluation_score?: number | null
  points_awarded: number
  comment?: string
}

export interface CandidatePenaltyPayload {
  id?: string
  criteria_id?: string | null
  reason: string
  points: number
}

export interface SubmitAssessmentPayload {
  student_id?: string
  matricule?: string
  exam_id?: string
  station_id: string
  answers: AssessmentAnswerPayload[]
  penalties: CandidatePenaltyPayload[]
  graded_by_prof_id?: string | null
}

export interface SubmitAssessmentResult {
  success: boolean
  error?: string
  attempt_id?: string
  final_score?: number
  earned_score?: number
  total_deductions?: number
  answers_count?: number
  penalties_count?: number
}

export interface AddCandidatePenaltyInput {
  exam_attempt_id?: string | null
  student_id: string
  station_id?: string
  exam_id?: string
  criteria_id?: string | null
  reason: string
  points: number
}

export interface AddCandidatePenaltyResult {
  success: boolean
  error?: string
  penalty?: CandidatePenaltyItem
  exam_attempt_id?: string | null
}

export interface GetCandidatePenaltiesResult {
  success: boolean
  error?: string
  penalties: CandidatePenaltyItem[]
}

/**
 * Server Action: Queries candidate_penalties strictly for a given exam_attempt_id.
 */
export async function getCandidatePenaltiesAction(
  examAttemptId: string
): Promise<GetCandidatePenaltiesResult> {
  try {
    if (!examAttemptId || !examAttemptId.trim()) {
      return { success: true, penalties: [] }
    }

    const { data, error } = await supabaseAdmin
      .from('candidate_penalties')
      .select('id, exam_attempt_id, reason, points, created_at')
      .eq('exam_attempt_id', examAttemptId.trim())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching candidate_penalties:', error)
      return { success: false, error: error.message, penalties: [] }
    }

    const formatted: CandidatePenaltyItem[] = (data || []).map((row) => ({
      id: row.id,
      exam_attempt_id: row.exam_attempt_id,
      reason: row.reason,
      points: Number(row.points),
      created_at: row.created_at,
    }))

    return { success: true, penalties: formatted }
  } catch (err: any) {
    console.error('getCandidatePenaltiesAction exception:', err)
    return {
      success: false,
      error: err?.message || 'Server error fetching candidate deductions.',
      penalties: [],
    }
  }
}

/**
 * Server Action: Inserts a single ad-hoc deduction for the active candidate into candidate_penalties.
 * If exam_attempt_id is not yet created, automatically creates the exam_attempts record.
 */
export async function addCandidatePenaltyAction(
  input: AddCandidatePenaltyInput
): Promise<AddCandidatePenaltyResult> {
  try {
    const { student_id, station_id, exam_id, reason, points, criteria_id } = input
    const targetStationId = station_id || exam_id

    if (!reason || !reason.trim()) {
      return { success: false, error: 'Reason for deduction is required.' }
    }

    const rawNum = Number(points)
    if (isNaN(rawNum) || rawNum === 0) {
      return { success: false, error: 'Points must be a non-zero number.' }
    }

    // Automatically sanitize positive user inputs to negative
    const negativePoints = rawNum > 0 ? -rawNum : rawNum

    let attemptId = input.exam_attempt_id?.trim() || null

    // If attemptId is not provided, ensure/fetch an exam_attempts record for this candidate
    if (!attemptId) {
      if (!student_id || !targetStationId) {
        return {
          success: false,
          error: 'Either exam_attempt_id or both student_id and station_id must be provided.',
        }
      }

      // Check if attempt exists for student and station
      const { data: existingAttempt } = await supabaseAdmin
        .from('exam_attempts')
        .select('id')
        .eq('student_id', student_id)
        .eq('station_id', targetStationId)
        .maybeSingle()

      if (existingAttempt?.id) {
        attemptId = existingAttempt.id
      } else {
        // Create/ensure an in-progress attempt for this student
        const { data: newAttempt, error: createAttErr } = await supabaseAdmin
          .from('exam_attempts')
          .upsert(
            {
              student_id,
              station_id: targetStationId,
              status: 'pending',
            },
            { onConflict: 'student_id, station_id' }
          )
          .select('id')
          .single()

        if (createAttErr || !newAttempt?.id) {
          console.error('Failed to create candidate exam_attempt:', createAttErr)
          return {
            success: false,
            error: createAttErr?.message || 'Failed to initialize candidate assessment session.',
          }
        }
        attemptId = newAttempt.id
      }
    }

    // Insert penalty into candidate_penalties table
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('candidate_penalties')
      .insert({
        exam_attempt_id: attemptId,
        criteria_id: criteria_id || null,
        reason: reason.trim(),
        points: negativePoints,
      })
      .select('id, exam_attempt_id, criteria_id, reason, points, created_at')
      .single()

    if (insertErr || !inserted) {
      console.error('Error inserting candidate_penalties row:', insertErr)
      return {
        success: false,
        error: insertErr?.message || 'Failed to record candidate penalty.',
      }
    }

    revalidatePath('/examiner/workspace')

    return {
      success: true,
      exam_attempt_id: attemptId,
      penalty: {
        id: inserted.id,
        exam_attempt_id: inserted.exam_attempt_id,
        reason: inserted.reason,
        points: Number(inserted.points),
        created_at: inserted.created_at,
      },
    }
  } catch (err: any) {
    console.error('addCandidatePenaltyAction exception:', err)
    return {
      success: false,
      error: err?.message || 'Unexpected server error recording penalty.',
    }
  }
}

/**
 * Server Action: Deletes a specific deduction entry from candidate_penalties.
 */
export async function deleteCandidatePenaltyAction(
  penaltyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!penaltyId) {
      return { success: false, error: 'Penalty identifier is required.' }
    }

    const { error } = await supabaseAdmin
      .from('candidate_penalties')
      .delete()
      .eq('id', penaltyId)

    if (error) {
      console.error('Error deleting candidate penalty:', error)
      return { success: false, error: error.message || 'Failed to delete penalty.' }
    }

    revalidatePath('/examiner/workspace')

    return { success: true }
  } catch (err: any) {
    console.error('deleteCandidatePenaltyAction exception:', err)
    return {
      success: false,
      error: err?.message || 'Unexpected error deleting candidate penalty.',
    }
  }
}

/**
 * Unified Server Action: Commits both student checklist answers and local candidate penalties
 * in a single atomic payload to Supabase on "Submit & Next Candidate".
 */
export async function submitAssessmentAction(
  payload: SubmitAssessmentPayload
): Promise<SubmitAssessmentResult> {
  try {
    const {
      student_id,
      matricule,
      exam_id,
      station_id,
      answers = [],
      penalties = [],
      graded_by_prof_id,
    } = payload

    if ((!student_id && !matricule) || !station_id) {
      return {
        success: false,
        error: 'student_id or matricule and station_id are required.',
      }
    }

    // 1. Resolve student ID
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
      return { success: false, error: 'Student record could not be found.' }
    }

    // 2. Calculate scores dynamically
    const earnedScore = answers.reduce((sum, a) => {
      const pts = Number(a.points_awarded) || 0
      return sum + (pts >= 0 ? pts : 0)
    }, 0)

    const totalDeductions = penalties.reduce((sum, p) => {
      return sum + Math.abs(Number(p.points) || 0)
    }, 0)

    const finalScore = Math.max(0, Math.round((earnedScore - totalDeductions) * 100) / 100)

    // 3. Upsert exam_attempts record with onConflict: 'student_id, station_id'
    // Status is standardized to 'completed'
    const { data: attemptRecord, error: attErr } = await supabaseAdmin
      .from('exam_attempts')
      .upsert(
        {
          student_id: targetStudentId,
          station_id: station_id,
          status: 'completed',
        },
        { onConflict: 'student_id, station_id' }
      )
      .select('id')
      .single()

    if (attErr) {
      console.error('Error upserting exam_attempts record:', attErr)
      throw attErr
    }

    const attemptId = attemptRecord.id

    // 4. Clear and batch insert student_answers for this attempt
    await supabaseAdmin
      .from('student_answers')
      .delete()
      .eq('attempt_id', attemptId)

    if (answers.length > 0) {
      const answerRows = answers.map((ans) => ({
        attempt_id: attemptId,
        station_id: station_id,
        question_id: ans.question_id,
        selected_options: Array.isArray(ans.selected_options) ? ans.selected_options : [],
        evaluation_score: typeof ans.evaluation_score === 'number' ? ans.evaluation_score : null,
        points_awarded: Math.max(0, Number(ans.points_awarded) || 0),
        graded_by_prof_id: graded_by_prof_id || null,
      }))

      const { error: ansErr } = await supabaseAdmin
        .from('student_answers')
        .insert(answerRows)

      if (ansErr) {
        console.error('Error inserting student_answers:', ansErr)
        throw ansErr
      }
    }

    // 5. Clear and batch insert candidate_penalties for this attempt
    await supabaseAdmin
      .from('candidate_penalties')
      .delete()
      .eq('exam_attempt_id', attemptId)

    if (penalties.length > 0) {
      const penaltyRows = penalties
        .filter((p) => p.reason && p.reason.trim())
        .map((p) => {
          const rawPts = Number(p.points) || 0
          const negativePts = rawPts > 0 ? -rawPts : rawPts === 0 ? -0.5 : rawPts
          return {
            exam_attempt_id: attemptId,
            criteria_id: p.criteria_id || null,
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

    revalidatePath('/examiner/workspace')

    return {
      success: true,
      attempt_id: attemptId,
      final_score: finalScore,
      earned_score: earnedScore,
      total_deductions: totalDeductions,
      answers_count: answers.length,
      penalties_count: penalties.length,
    }
  } catch (err: any) {
    console.error('submitAssessmentAction exception:', err)
    return {
      success: false,
      error: err?.message || 'Server error submitting assessment attempt.',
    }
  }
}

