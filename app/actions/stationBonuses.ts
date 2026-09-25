'use server'

import { supabaseAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface StationBonusRecord {
  id: string
  station_id: string
  title: string
  description: string | null
  points: number
  created_at?: string
  updated_at?: string
}

export interface CreateStationBonusInput {
  station_id: string
  title: string
  description?: string | null
  points: number
}

/**
 * Server Action: Fetches predefined bonus/merit criteria from public.station_bonuses.
 */
export async function getStationBonusesAction(
  stationId?: string
): Promise<{ success: boolean; bonuses: StationBonusRecord[]; error?: string }> {
  try {
    let query = supabaseAdmin
      .from('station_bonuses')
      .select('*')
      .order('created_at', { ascending: true })

    if (stationId && stationId.trim()) {
      query = query.eq('station_id', stationId.trim())
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching station_bonuses:', error)
      return { success: false, bonuses: [], error: error.message }
    }

    return {
      success: true,
      bonuses: (data || []).map((row: any) => ({
        id: row.id,
        station_id: row.station_id,
        title: row.title,
        description: row.description,
        points: Number(row.points),
        created_at: row.created_at,
        updated_at: row.updated_at,
      })),
    }
  } catch (err: any) {
    console.error('getStationBonusesAction exception:', err)
    return {
      success: false,
      bonuses: [],
      error: err?.message || 'Failed to fetch station bonus criteria.',
    }
  }
}

/**
 * Server Action: Inserts a new bonus criteria row into public.station_bonuses.
 * Enforces positive numeric check constraint (points > 0).
 */
export async function createStationBonusAction(
  input: CreateStationBonusInput
): Promise<{ success: boolean; bonus?: StationBonusRecord; error?: string }> {
  try {
    const { station_id, title, description, points } = input

    if (!station_id || !station_id.trim()) {
      return { success: false, error: 'Station identifier is required.' }
    }

    if (!title || !title.trim()) {
      return { success: false, error: 'Bonus title cannot be empty.' }
    }

    const rawPoints = Number(points)
    if (isNaN(rawPoints) || rawPoints <= 0) {
      return { success: false, error: 'Merit bonus points must be a strictly positive number (> 0).' }
    }

    const positivePoints = Math.abs(rawPoints)

    const { data, error } = await supabaseAdmin
      .from('station_bonuses')
      .insert([
        {
          station_id: station_id.trim(),
          title: title.trim(),
          description: description?.trim() || null,
          points: positivePoints,
        },
      ])
      .select('*')
      .single()

    if (error) {
      console.error('Error inserting station_bonuses:', error)
      return {
        success: false,
        error: error.message || 'Database error creating station bonus.',
      }
    }

    if (station_id) {
      revalidatePath(`/professor/stations/${station_id}`)
    }
    revalidatePath('/examiner/workspace')
    revalidatePath('/professor/bonuses')

    return {
      success: true,
      bonus: {
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
    return {
      success: false,
      error: err?.message || 'Unexpected server error while adding station bonus.',
    }
  }
}

/**
 * Server Action: Updates an existing bonus criterion in public.station_bonuses.
 * Enforces positive numeric check constraint (points > 0).
 */
export async function updateStationBonusAction(input: {
  id: string
  title?: string
  description?: string | null
  points?: number
  station_id?: string
}): Promise<{ success: boolean; bonus?: StationBonusRecord; error?: string }> {
  try {
    const { id, title, description, points, station_id } = input
    if (!id) return { success: false, error: 'Bonus ID is required.' }

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
      if (isNaN(rawPoints) || rawPoints <= 0) {
        return { success: false, error: 'Merit bonus points must be strictly positive (> 0).' }
      }
      updates.points = Math.abs(rawPoints)
    }

    const { data, error } = await supabaseAdmin
      .from('station_bonuses')
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
    revalidatePath('/professor/bonuses')

    return {
      success: true,
      bonus: {
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
    return { success: false, error: err?.message || 'Failed to update station bonus.' }
  }
}

/**
 * Server Action: Deletes a bonus criterion from public.station_bonuses.
 */
export async function deleteStationBonusAction(
  bonusId: string,
  stationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!bonusId) {
      return { success: false, error: 'Bonus ID is required.' }
    }

    const { error } = await supabaseAdmin
      .from('station_bonuses')
      .delete()
      .eq('id', bonusId)

    if (error) throw error

    if (stationId) {
      revalidatePath(`/professor/stations/${stationId}`)
    }
    revalidatePath('/examiner/workspace')
    revalidatePath('/professor/bonuses')

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete station bonus.' }
  }
}

/**
 * Server Action: Seeds standard merit bonus presets into public.station_bonuses for a station.
 */
export async function seedStandardStationBonusesAction(
  stationId: string
): Promise<{ success: boolean; insertedCount: number; error?: string }> {
  try {
    if (!stationId) return { success: false, insertedCount: 0, error: 'Station ID required.' }

    const standardPresets = [
      {
        station_id: stationId,
        title: 'Exemplary Technique',
        description: 'Flawless instrument handling, positioning, and textbook ergonomic execution.',
        points: 1.0,
      },
      {
        station_id: stationId,
        title: 'Exceptional Patient Empathy',
        description: 'Reassured anxious patient with compassionate bedside manner and active listening.',
        points: 0.5,
      },
      {
        station_id: stationId,
        title: 'Rapid Differential Diagnosis',
        description: 'Synthesized complex clinical findings swiftly with high diagnostic accuracy.',
        points: 1.5,
      },
      {
        station_id: stationId,
        title: 'Sterile Field Vigilance',
        description: 'Proactively maintained sterile barrier and guided simulated team seamlessly.',
        points: 0.5,
      },
      {
        station_id: stationId,
        title: 'Outstanding Clinical Communication',
        description: 'Articulated complex pathology in clear, patient-friendly terms with verified comprehension.',
        points: 1.0,
      },
    ]

    const { data, error } = await supabaseAdmin
      .from('station_bonuses')
      .insert(standardPresets)
      .select('id')

    if (error) {
      return { success: false, insertedCount: 0, error: error.message }
    }

    revalidatePath(`/professor/stations/${stationId}`)
    revalidatePath('/examiner/workspace')
    revalidatePath('/professor/bonuses')

    return { success: true, insertedCount: data?.length || 0 }
  } catch (err: any) {
    return { success: false, insertedCount: 0, error: err?.message || 'Failed to seed station bonuses.' }
  }
}
