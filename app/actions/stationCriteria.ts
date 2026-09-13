'use server'

import { supabaseAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface CreateStationCriterionInput {
  station_id: string
  title: string
  description?: string | null
  points: number
}

export interface StationCriterionRecord {
  id: string
  station_id: string
  title: string
  description: string | null
  points: number
  created_at?: string
  updated_at?: string
}

export interface CreateStationCriterionResult {
  success: boolean
  error?: string
  criterion?: StationCriterionRecord
}

/**
 * Server Action: Inserts a new deduction / penalty criteria row into public.station_criteria.
 * Enforces negative numeric constraint (points < 0).
 */
export async function createStationCriterionAction(
  input: CreateStationCriterionInput
): Promise<CreateStationCriterionResult> {
  try {
    const { station_id, title, description, points } = input

    if (!station_id || !station_id.trim()) {
      return { success: false, error: 'Station identifier is required.' }
    }

    if (!title || !title.trim()) {
      return { success: false, error: 'Penalty title cannot be empty.' }
    }

    const rawPoints = Number(points)
    if (isNaN(rawPoints) || rawPoints === 0) {
      return { success: false, error: 'Deduction points must be a valid non-zero number.' }
    }

    // Automatically convert positive user inputs to negative before submission
    const negativePoints = rawPoints > 0 ? -rawPoints : rawPoints

    const { data, error } = await supabaseAdmin
      .from('station_criteria')
      .insert([
        {
          station_id: station_id.trim(),
          title: title.trim(),
          description: description?.trim() || null,
          points: negativePoints,
        },
      ])
      .select('*')
      .single()

    if (error) {
      console.error('Error inserting station_criteria:', error)
      return {
        success: false,
        error: error.message || 'Database error creating clinical deduction item.',
      }
    }

    revalidatePath('/examiner/workspace')
    revalidatePath(`/professor/stations/${station_id}`)

    return {
      success: true,
      criterion: {
        id: data.id,
        station_id: data.station_id,
        title: data.title,
        description: data.description,
        points: Number(data.points),
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    }
  } catch (err: any) {
    console.error('createStationCriterionAction exception:', err)
    return {
      success: false,
      error: err?.message || 'Unexpected server error while adding penalty item.',
    }
  }
}
