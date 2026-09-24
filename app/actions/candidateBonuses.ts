'use server'

import { supabaseAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface CandidateBonusItem {
  id: string
  exam_attempt_id: string
  criteria_id?: string | null
  reason: string
  points: number // strictly positive
  created_at?: string
}

export interface StationBonusCriteriaItem {
  id: string
  station_id: string
  title: string
  description?: string | null
  points: number
  created_at?: string
}

export interface AddCandidateBonusInput {
  exam_attempt_id?: string | null
  student_id: string
  station_id?: string
  exam_id?: string
  criteria_id?: string | null
  reason: string
  points: number
}

export interface AddCandidateBonusResult {
  success: boolean
  error?: string
  bonus?: CandidateBonusItem
  exam_attempt_id?: string | null
}

export interface GetCandidateBonusesResult {
  success: boolean
  error?: string
  bonuses: CandidateBonusItem[]
}

export interface GetStationBonusesResult {
  success: boolean
  error?: string
  bonuses: StationBonusCriteriaItem[]
}

/**
 * Server Action: Queries candidate_bonuses strictly for a given exam_attempt_id.
 */
export async function getCandidateBonusesAction(
  examAttemptId: string
): Promise<GetCandidateBonusesResult> {
  try {
    if (!examAttemptId || !examAttemptId.trim()) {
      return { success: true, bonuses: [] }
    }

    const { data, error } = await supabaseAdmin
      .from('candidate_bonuses')
      .select('id, exam_attempt_id, criteria_id, reason, points, created_at')
      .eq('exam_attempt_id', examAttemptId.trim())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching candidate_bonuses:', error)
      return { success: false, error: error.message, bonuses: [] }
    }

    const formatted: CandidateBonusItem[] = (data || []).map((row) => ({
      id: row.id,
      exam_attempt_id: row.exam_attempt_id,
      criteria_id: row.criteria_id || null,
      reason: row.reason,
      points: Number(row.points),
      created_at: row.created_at,
    }))

    return { success: true, bonuses: formatted }
  } catch (err: any) {
    console.error('getCandidateBonusesAction exception:', err)
    return {
      success: false,
      error: err?.message || 'Server error fetching candidate merit bonuses.',
      bonuses: [],
    }
  }
}

/**
 * Server Action: Queries station_bonuses template rules for a specific station.
 */
export async function getStationBonusesAction(
  stationId: string
): Promise<GetStationBonusesResult> {
  try {
    if (!stationId || !stationId.trim()) {
      return { success: true, bonuses: [] }
    }

    const { data, error } = await supabaseAdmin
      .from('station_bonuses')
      .select('id, station_id, title, description, points, created_at')
      .eq('station_id', stationId.trim())
      .order('points', { ascending: false })

    if (error) {
      console.error('Error fetching station_bonuses:', error)
      return { success: false, error: error.message, bonuses: [] }
    }

    const formatted: StationBonusCriteriaItem[] = (data || []).map((row) => ({
      id: row.id,
      station_id: row.station_id,
      title: row.title,
      description: row.description,
      points: Number(row.points),
      created_at: row.created_at,
    }))

    return { success: true, bonuses: formatted }
  } catch (err: any) {
    console.error('getStationBonusesAction exception:', err)
    return {
      success: false,
      error: err?.message || 'Server error fetching predefined station merit criteria.',
      bonuses: [],
    }
  }
}

/**
 * Server Action: Inserts a single bonus / merit point for the active candidate into candidate_bonuses.
 * If exam_attempt_id is not yet created, automatically creates or finds the exam_attempts record.
 */
export async function addCandidateBonusAction(
  input: AddCandidateBonusInput
): Promise<AddCandidateBonusResult> {
  try {
    const { student_id, station_id, exam_id, reason, points, criteria_id } = input
    const targetStationId = station_id || exam_id

    if (!reason || !reason.trim()) {
      return { success: false, error: 'Reason for merit bonus is required.' }
    }

    const rawNum = Number(points)
    if (isNaN(rawNum) || rawNum === 0) {
      return { success: false, error: 'Points must be a positive non-zero number.' }
    }

    // Automatically sanitize to strictly positive points
    const positivePoints = Math.abs(rawNum)

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
        // Create an attempt record
        const { data: newAttempt, error: createAttemptErr } = await supabaseAdmin
          .from('exam_attempts')
          .insert({
            student_id,
            station_id: targetStationId,
            status: 'pending',
          })
          .select('id')
          .single()

        if (createAttemptErr || !newAttempt?.id) {
          console.error('Error creating exam_attempt for bonus:', createAttemptErr)
          return {
            success: false,
            error: 'Failed to initialize candidate examination attempt.',
          }
        }
        attemptId = newAttempt.id
      }
    }

    // Insert bonus into candidate_bonuses table
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('candidate_bonuses')
      .insert({
        exam_attempt_id: attemptId,
        criteria_id: criteria_id || null,
        reason: reason.trim(),
        points: positivePoints,
      })
      .select('id, exam_attempt_id, criteria_id, reason, points, created_at')
      .single()

    if (insertErr || !inserted) {
      console.error('Error inserting candidate_bonuses row:', insertErr)
      return {
        success: false,
        error: insertErr?.message || 'Database error recording merit bonus.',
      }
    }

    const createdBonus: CandidateBonusItem = {
      id: inserted.id,
      exam_attempt_id: inserted.exam_attempt_id,
      criteria_id: inserted.criteria_id || null,
      reason: inserted.reason,
      points: Number(inserted.points),
      created_at: inserted.created_at,
    }

    try {
      revalidatePath('/examiner/workspace')
      revalidatePath('/professor/bonuses')
      revalidatePath('/professor/students')
    } catch {
      // Revalidation notice
    }

    return {
      success: true,
      bonus: createdBonus,
      exam_attempt_id: attemptId,
    }
  } catch (err: any) {
    console.error('addCandidateBonusAction exception:', err)
    return {
      success: false,
      error: err?.message || 'Unexpected server error creating merit bonus.',
    }
  }
}

/**
 * Server Action: Deletes a specific merit bonus entry from candidate_bonuses.
 */
export async function deleteCandidateBonusAction(
  bonusId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!bonusId || !bonusId.trim()) {
      return { success: false, error: 'Bonus ID is required for deletion.' }
    }

    const { error } = await supabaseAdmin
      .from('candidate_bonuses')
      .delete()
      .eq('id', bonusId.trim())

    if (error) {
      console.error('Error deleting candidate_bonuses record:', error)
      return { success: false, error: error.message }
    }

    try {
      revalidatePath('/examiner/workspace')
      revalidatePath('/professor/bonuses')
      revalidatePath('/professor/students')
    } catch {
      // Revalidation notice
    }

    return { success: true }
  } catch (err: any) {
    console.error('deleteCandidateBonusAction exception:', err)
    return {
      success: false,
      error: err?.message || 'Unexpected server error deleting merit bonus.',
    }
  }
}
