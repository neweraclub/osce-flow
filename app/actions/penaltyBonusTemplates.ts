'use server'

import { supabaseAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import {
  PenaltyBonusTemplate,
  mapStationCriterionToTemplate,
  mapStationBonusToTemplate,
} from '@/lib/penaltyBonusTemplates'

export type { PenaltyBonusTemplate }

/**
 * Fetch all station criteria (penalties) and bonuses directly from existing database tables:
 * - public.station_criteria (points < 0)
 * - public.station_bonuses (points > 0)
 */
export async function getStationTemplatesAction(stationId: string): Promise<{
  success: boolean
  templates: PenaltyBonusTemplate[]
  error?: string
}> {
  try {
    if (!stationId || !stationId.trim()) {
      return { success: true, templates: [] }
    }

    const [criteriaRes, bonusesRes] = await Promise.all([
      supabaseAdmin
        .from('station_criteria')
        .select('*')
        .eq('station_id', stationId.trim())
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('station_bonuses')
        .select('*')
        .eq('station_id', stationId.trim())
        .order('created_at', { ascending: true }),
    ])

    const penalties: PenaltyBonusTemplate[] = (criteriaRes.data || []).map(mapStationCriterionToTemplate)
    const bonuses: PenaltyBonusTemplate[] = (bonusesRes.data || []).map(mapStationBonusToTemplate)

    return {
      success: true,
      templates: [...penalties, ...bonuses],
    }
  } catch (err: any) {
    console.error('getStationTemplatesAction error:', err)
    return { success: false, templates: [], error: err?.message }
  }
}

/**
 * Backwards compatible alias for getStationTemplatesAction
 */
export async function getPenaltyBonusTemplatesAction(stationId?: string): Promise<{
  success: boolean
  templates: PenaltyBonusTemplate[]
  error?: string
}> {
  if (stationId) {
    return getStationTemplatesAction(stationId)
  }
  return { success: true, templates: [] }
}

/**
 * Create a template item directly into either station_criteria or station_bonuses.
 */
export async function createStationTemplateItemAction(input: {
  station_id: string
  type: 'bonus' | 'penalty'
  title: string
  default_value: number
  default_note?: string
}): Promise<{
  success: boolean
  template?: PenaltyBonusTemplate
  error?: string
}> {
  try {
    const { station_id, type, title, default_value, default_note } = input

    if (!station_id?.trim()) {
      return { success: false, error: 'Station ID is required.' }
    }
    if (!title?.trim()) {
      return { success: false, error: 'Title is required.' }
    }

    const absVal = Math.abs(Number(default_value) || 0)
    if (absVal === 0) {
      return { success: false, error: 'Points must be non-zero.' }
    }

    if (type === 'penalty') {
      // Negative points for station_criteria (CHECK points < 0::numeric)
      const { data, error } = await supabaseAdmin
        .from('station_criteria')
        .insert({
          station_id: station_id.trim(),
          title: title.trim(),
          description: default_note?.trim() || null,
          points: -absVal,
        })
        .select('*')
        .single()

      if (error) throw error

      revalidatePath('/examiner/workspace')
      return { success: true, template: mapStationCriterionToTemplate(data) }
    } else {
      // Positive points for station_bonuses (CHECK points > 0::numeric)
      const { data, error } = await supabaseAdmin
        .from('station_bonuses')
        .insert({
          station_id: station_id.trim(),
          title: title.trim(),
          description: default_note?.trim() || null,
          points: absVal,
        })
        .select('*')
        .single()

      if (error) throw error

      revalidatePath('/examiner/workspace')
      return { success: true, template: mapStationBonusToTemplate(data) }
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create template item.' }
  }
}

/**
 * Update an existing template in station_criteria or station_bonuses
 */
export async function updateStationTemplateItemAction(
  id: string,
  input: {
    type: 'bonus' | 'penalty'
    title?: string
    default_value?: number
    default_note?: string
    station_id?: string
  }
): Promise<{
  success: boolean
  template?: PenaltyBonusTemplate
  error?: string
}> {
  try {
    if (!id) return { success: false, error: 'ID required.' }

    const table = input.type === 'penalty' ? 'station_criteria' : 'station_bonuses'
    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    if (input.title !== undefined) updates.title = input.title.trim()
    if (input.default_note !== undefined) updates.description = input.default_note.trim()
    if (input.default_value !== undefined) {
      const absVal = Math.abs(Number(input.default_value) || 0)
      updates.points = input.type === 'penalty' ? -absVal : absVal
    }

    const { data, error } = await supabaseAdmin
      .from(table)
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    revalidatePath('/examiner/workspace')
    return {
      success: true,
      template:
        input.type === 'penalty'
          ? mapStationCriterionToTemplate(data)
          : mapStationBonusToTemplate(data),
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update template item.' }
  }
}

/**
 * Delete a template from station_criteria or station_bonuses
 */
export async function deleteStationTemplateItemAction(
  id: string,
  type: 'bonus' | 'penalty'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!id) return { success: false, error: 'ID required.' }

    const table = type === 'penalty' ? 'station_criteria' : 'station_bonuses'
    const { error } = await supabaseAdmin.from(table).delete().eq('id', id)

    if (error) throw error

    revalidatePath('/examiner/workspace')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete template item.' }
  }
}
