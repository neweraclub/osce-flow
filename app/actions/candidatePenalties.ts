'use server'

import { supabaseAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface CandidatePenaltyItem {
  id: string
  exam_attempt_id: string
  reason: string
  points: number // Strictly negative, e.g. -0.5, -1.0
  created_at?: string
}

export interface AddCandidatePenaltyInput {
  exam_attempt_id?: string | null
  student_id: string
  exam_id: string
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
    const { student_id, exam_id, reason, points } = input

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
      if (!student_id || !exam_id) {
        return {
          success: false,
          error: 'Either exam_attempt_id or both student_id and exam_id must be provided.',
        }
      }

      // Check if attempt exists for student and exam
      const { data: existingAttempt } = await supabaseAdmin
        .from('exam_attempts')
        .select('id')
        .eq('student_id', student_id)
        .eq('exam_id', exam_id)
        .maybeSingle()

      if (existingAttempt?.id) {
        attemptId = existingAttempt.id
      } else {
        // Create an in-progress attempt for this student
        const { data: newAttempt, error: createAttErr } = await supabaseAdmin
          .from('exam_attempts')
          .insert({
            student_id,
            exam_id,
            status: 'in_progress',
          })
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
        reason: reason.trim(),
        points: negativePoints,
      })
      .select('id, exam_attempt_id, reason, points, created_at')
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
