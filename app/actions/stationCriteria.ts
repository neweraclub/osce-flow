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

/**
 * Server Action: Fetches all preset penalty criteria rows for a station.
 */
export async function getStationCriteriaAction(
  stationId: string
): Promise<{ success: boolean; criteria: StationCriterionRecord[]; error?: string }> {
  try {
    if (!stationId) {
      return { success: false, criteria: [], error: 'Station ID is required.' }
    }

    const { data, error } = await supabaseAdmin
      .from('station_criteria')
      .select('*')
      .eq('station_id', stationId.trim())
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching station_criteria:', error)
      return { success: false, criteria: [], error: error.message }
    }

    return {
      success: true,
      criteria: (data || []).map((d) => ({
        id: d.id,
        station_id: d.station_id,
        title: d.title,
        description: d.description,
        points: Number(d.points),
        created_at: d.created_at,
        updated_at: d.updated_at,
      })),
    }
  } catch (err: any) {
    return { success: false, criteria: [], error: err?.message || 'Failed to fetch station criteria.' }
  }
}

/**
 * Server Action: Updates an existing penalty criterion in public.station_criteria.
 * Enforces negative numeric constraint (points < 0).
 */
export async function updateStationCriterionAction(input: {
  id: string
  title?: string
  description?: string | null
  points?: number
  station_id?: string
}): Promise<{ success: boolean; criterion?: StationCriterionRecord; error?: string }> {
  try {
    const { id, title, description, points, station_id } = input
    if (!id) return { success: false, error: 'Criterion ID is required.' }

    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    if (title !== undefined) {
      if (!title.trim()) return { success: false, error: 'Title cannot be empty.' }
      updates.title = title.trim()
    }

    if (description !== undefined) {
      updates.description = description ? description.trim() : null
    }

    if (points !== undefined) {
      const rawPoints = Number(points)
      if (isNaN(rawPoints) || rawPoints === 0) {
        return { success: false, error: 'Deduction points must be non-zero.' }
      }
      updates.points = rawPoints > 0 ? -rawPoints : rawPoints
    }

    const { data, error } = await supabaseAdmin
      .from('station_criteria')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    if (station_id) {
      revalidatePath(`/professor/stations/${station_id}`)
    }
    revalidatePath('/examiner/workspace')

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
    return { success: false, error: err?.message || 'Failed to update penalty criterion.' }
  }
}

/**
 * Server Action: Seeds standard clinical deduction presets into public.station_criteria for a station.
 */
export async function seedStandardStationCriteriaAction(
  stationId: string
): Promise<{ success: boolean; insertedCount: number; error?: string }> {
  try {
    if (!stationId) return { success: false, insertedCount: 0, error: 'Station ID required.' }

    const standardPresets = [
      {
        station_id: stationId,
        title: 'Minor Aseptic Breach',
        description: 'Compromised sterile field without immediate self-correction.',
        points: -0.5,
      },
      {
        station_id: stationId,
        title: 'Late Arrival / Hesitation',
        description: 'Excessive latency before initiating physical examination sequence.',
        points: -1.0,
      },
      {
        station_id: stationId,
        title: 'Major Protocol Deviation',
        description: 'Omitted mandatory safety check or critical contraindication review.',
        points: -2.0,
      },
      {
        station_id: stationId,
        title: 'Communication Lapse',
        description: 'Failed to introduce self, explain procedure, or verify patient consent.',
        points: -0.5,
      },
      {
        station_id: stationId,
        title: 'Rough Physical Maneuver',
        description: 'Inadequate gentleness or failing to warn simulated patient before palpation.',
        points: -1.0,
      },
    ]

    const { data, error } = await supabaseAdmin
      .from('station_criteria')
      .insert(standardPresets)
      .select('id')

    if (error) {
      return { success: false, insertedCount: 0, error: error.message }
    }

    revalidatePath(`/professor/stations/${stationId}`)
    revalidatePath('/examiner/workspace')

    return { success: true, insertedCount: data?.length || 0 }
  } catch (err: any) {
    return { success: false, insertedCount: 0, error: err?.message || 'Failed to seed criteria.' }
  }
}

/**
 * Server Action: Deletes a preset penalty criterion.
 */
export async function deleteStationCriterionAction(
  criterionId: string,
  stationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!criterionId) {
      return { success: false, error: 'Criterion ID is required.' }
    }

    const { error } = await supabaseAdmin
      .from('station_criteria')
      .delete()
      .eq('id', criterionId)

    if (error) throw error

    if (stationId) {
      revalidatePath(`/professor/stations/${stationId}`)
    }
    revalidatePath('/examiner/workspace')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete criterion.' }
  }
}
