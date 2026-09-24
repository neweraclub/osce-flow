'use server'

import { supabaseAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import {
  PenaltyBonusTemplate,
  DEFAULT_PENALTY_BONUS_TEMPLATES,
} from '@/lib/penaltyBonusTemplates'

export type { PenaltyBonusTemplate }

/**
 * Fetch all penalty & bonus templates
 */
export async function getPenaltyBonusTemplatesAction(): Promise<{
  success: boolean
  templates: PenaltyBonusTemplate[]
  error?: string
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('penalty_bonus_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('penalty_bonus_templates query notice:', error.message)
      return { success: true, templates: DEFAULT_PENALTY_BONUS_TEMPLATES }
    }

    if (!data || data.length === 0) {
      return { success: true, templates: DEFAULT_PENALTY_BONUS_TEMPLATES }
    }

    const formatted: PenaltyBonusTemplate[] = data.map((t: any) => ({
      id: t.id,
      professor_id: t.professor_id,
      type: t.type,
      title: t.title,
      default_value: Number(t.default_value),
      default_note: t.default_note || '',
      created_at: t.created_at,
      updated_at: t.updated_at,
    }))

    // Merge default presets with database custom templates (deduplicating by title)
    const existingTitles = new Set(formatted.map((t) => t.title.toLowerCase().trim()))
    const remainingPresets = DEFAULT_PENALTY_BONUS_TEMPLATES.filter(
      (p) => !existingTitles.has(p.title.toLowerCase().trim())
    )

    return {
      success: true,
      templates: [...formatted, ...remainingPresets],
    }
  } catch (err: any) {
    console.error('getPenaltyBonusTemplatesAction catch:', err)
    return { success: true, templates: DEFAULT_PENALTY_BONUS_TEMPLATES }
  }
}

/**
 * Create a new template
 */
export async function createPenaltyBonusTemplateAction(input: {
  professor_id?: string | null
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
    if (!input.title?.trim()) {
      return { success: false, error: 'Template title is required.' }
    }

    const absValue = Math.abs(Number(input.default_value) || 0)
    if (absValue <= 0) {
      return { success: false, error: 'Value must be greater than zero.' }
    }

    const finalValue = input.type === 'penalty' ? -absValue : absValue

    const { data, error } = await supabaseAdmin
      .from('penalty_bonus_templates')
      .insert({
        professor_id: input.professor_id || null,
        type: input.type,
        title: input.title.trim(),
        default_value: finalValue,
        default_note: input.default_note?.trim() || null,
      })
      .select('*')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/examiner/workspace')

    return {
      success: true,
      template: {
        id: data.id,
        professor_id: data.professor_id,
        type: data.type,
        title: data.title,
        default_value: Number(data.default_value),
        default_note: data.default_note || '',
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create template.' }
  }
}

/**
 * Update an existing template
 */
export async function updatePenaltyBonusTemplateAction(
  id: string,
  input: Partial<PenaltyBonusTemplate>
): Promise<{
  success: boolean
  template?: PenaltyBonusTemplate
  error?: string
}> {
  try {
    if (!id) return { success: false, error: 'Template ID required.' }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    }

    if (input.title !== undefined) updatePayload.title = input.title.trim()
    if (input.default_note !== undefined) updatePayload.default_note = input.default_note.trim()
    if (input.type !== undefined) updatePayload.type = input.type

    if (input.default_value !== undefined) {
      const absValue = Math.abs(Number(input.default_value) || 0)
      const isPenalty = input.type ? input.type === 'penalty' : Number(input.default_value) < 0
      updatePayload.default_value = isPenalty ? -absValue : absValue
    }

    const { data, error } = await supabaseAdmin
      .from('penalty_bonus_templates')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/examiner/workspace')

    return {
      success: true,
      template: data
        ? {
            id: data.id,
            professor_id: data.professor_id,
            type: data.type,
            title: data.title,
            default_value: Number(data.default_value),
            default_note: data.default_note || '',
            created_at: data.created_at,
            updated_at: data.updated_at,
          }
        : undefined,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update template.' }
  }
}

/**
 * Delete a template
 */
export async function deletePenaltyBonusTemplateAction(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    if (!id) return { success: false, error: 'Template ID required.' }

    if (id.startsWith('preset-')) {
      return { success: true }
    }

    const { error } = await supabaseAdmin
      .from('penalty_bonus_templates')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/examiner/workspace')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete template.' }
  }
}
