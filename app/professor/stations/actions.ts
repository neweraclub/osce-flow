'use server'

import { getAuthenticatedProfessorFromCookies } from '@/lib/professorAuth'
import { supabaseAdmin } from '@/lib/auth'
import { resolveStationRecord } from '@/lib/stationResolver'
import { getStationSlug } from '@/lib/stationSlug'

export interface UpdateStationInput {
  stationId: string
  title: string
  station_number: number
  weightage_percentage: number
  module_id: string
}

export interface UpdateStationResult {
  success: boolean
  error?: string
  station?: {
    id: string
    slug: string
    module_id: string
    station_number: number
    title: string
    access_pin: string
    weightage_percentage: number
    module_name: string
    level_name: string
    created_at?: string
  }
}

/**
 * Server Action: Updates station details directly with database validation.
 * Ensures the target module belongs to the authenticated professor.
 */
export async function updateStationDetailsAction(
  input: UpdateStationInput
): Promise<UpdateStationResult> {
  try {
    const prof = await getAuthenticatedProfessorFromCookies()
    if (!prof) {
      return { success: false, error: 'Unauthorized. Please log in again.' }
    }

    const { stationId, title, station_number, weightage_percentage, module_id } = input

    if (!stationId) {
      return { success: false, error: 'Station identifier is required.' }
    }

    if (!title || !title.trim()) {
      return { success: false, error: 'Station Name cannot be empty.' }
    }

    const num = Math.floor(Number(station_number))
    if (isNaN(num) || num < 1) {
      return { success: false, error: 'Station Number must be at least 1.' }
    }

    const weightage = Math.max(0, Math.min(100, Number(weightage_percentage) || 0))

    if (!module_id) {
      return { success: false, error: 'Please select an assigned module.' }
    }

    // 1. Resolve existing station and verify current ownership
    const resolved = await resolveStationRecord(stationId, prof)
    if (resolved.unauthorized) {
      return {
        success: false,
        error: 'Unauthorized: You are not assigned to manage this station.',
      }
    }
    if (!resolved.station) {
      return { success: false, error: 'Station not found.' }
    }

    const currentStation = resolved.station

    // 2. Row-level check: Verify target module belongs to this professor
    const { data: targetMod, error: modErr } = await supabaseAdmin
      .from('modules')
      .select('id, module_name, level_id, responsible_prof_id')
      .eq('id', module_id)
      .single()

    if (modErr || !targetMod) {
      return { success: false, error: 'Selected module was not found.' }
    }

    if (
      targetMod.responsible_prof_id !== prof.professorId &&
      targetMod.responsible_prof_id !== prof.userId
    ) {
      return {
        success: false,
        error: 'Unauthorized: The selected module is not assigned to you.',
      }
    }

    // 3. Resolve Study Level Name for target module
    let levelName = 'General Level'
    if (targetMod.level_id) {
      const { data: lvlData } = await supabaseAdmin
        .from('study_levels')
        .select('level_name')
        .eq('id', targetMod.level_id)
        .single()
      if (lvlData?.level_name) {
        levelName = lvlData.level_name
      }
    }

    // 4. Validate cumulative module weightage (cannot exceed 100%)
    const { data: otherStations, error: stationsErr } = await supabaseAdmin
      .from('stations')
      .select('weightage_percentage')
      .eq('module_id', module_id)
      .neq('id', currentStation.id)

    if (stationsErr) {
      throw stationsErr
    }

    const otherTotal = (otherStations || []).reduce(
      (sum, s) => sum + Number(s.weightage_percentage || 0),
      0
    )
    const availableWeightage = Math.max(0, Math.round((100 - otherTotal) * 100) / 100)

    if (otherTotal + weightage > 100) {
      return {
        success: false,
        error: `Total station weightage for this module cannot exceed 100% (Maximum available: ${availableWeightage}%).`,
      }
    }

    // 5. Update station in Supabase database
    const { data: updatedStation, error: updateErr } = await supabaseAdmin
      .from('stations')
      .update({
        title: title.trim(),
        station_number: num,
        weightage_percentage: weightage,
        module_id: module_id,
      })
      .eq('id', currentStation.id)
      .select()
      .single()

    if (updateErr) {
      throw updateErr
    }

    // 5. Generate human-readable station slug with updated module name & number
    const updatedSlug = getStationSlug({
      station_number: updatedStation.station_number,
      module_name: targetMod.module_name,
      id: updatedStation.id,
    })

    return {
      success: true,
      station: {
        id: updatedStation.id,
        slug: updatedSlug,
        module_id: updatedStation.module_id,
        station_number: updatedStation.station_number,
        title: updatedStation.title,
        access_pin: updatedStation.access_pin,
        weightage_percentage: Number(updatedStation.weightage_percentage || 0),
        module_name: targetMod.module_name,
        level_name: levelName,
        created_at: updatedStation.created_at,
      },
    }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to update station details.',
    }
  }
}


