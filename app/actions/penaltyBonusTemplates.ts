'use server'

import { supabaseAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface PenaltyBonusTemplate {
  id: string
  professor_id?: string | null
  type: 'bonus' | 'penalty'
  title: string
  default_value: number
  default_note: string
  created_at?: string
  updated_at?: string
}

export const DEFAULT_PENALTY_BONUS_TEMPLATES: PenaltyBonusTemplate[] = [
  // Penalties (negative values)
  {
    id: 'preset-pen-1',
    type: 'penalty',
    title: 'Minor Aseptic Breach',
    default_value: -0.5,
    default_note: 'Compromised sterile field without immediate self-correction.',
  },
  {
    id: 'preset-pen-2',
    type: 'penalty',
    title: 'Late Arrival / Hesitation',
    default_value: -1.0,
    default_note: 'Excessive latency before initiating physical examination sequence.',
  },
  {
    id: 'preset-pen-3',
    type: 'penalty',
    title: 'Major Protocol Deviation',
    default_value: -2.0,
    default_note: 'Omitted mandatory safety check or critical contraindication review.',
  },
  {
    id: 'preset-pen-4',
    type: 'penalty',
    title: 'Communication Lapse',
    default_value: -0.5,
    default_note: 'Failed to introduce self, explain procedure, or verify patient consent.',
  },
  // Bonuses (positive values)
  {
    id: 'preset-bon-1',
    type: 'bonus',
    title: 'Exemplary Technique',
    default_value: 1.0,
    default_note: 'Flawless instrument handling, positioning, and textbook ergonomic execution.',
  },
  {
    id: 'preset-bon-2',
    type: 'bonus',
    title: 'Exceptional Patient Empathy',
    default_value: 0.5,
    default_note: 'Reassured anxious patient with compassionate bedside manner and active listening.',
  },
  {
    id: 'preset-bon-3',
    type: 'bonus',
    title: 'Rapid Differential Diagnosis',
    default_value: 1.5,
    default_note: 'Synthesized complex clinical findings swiftly with high diagnostic accuracy.',
  },
  {
    id: 'preset-bon-4',
    type: 'bonus',
    title: 'Sterile Field Vigilance',
    default_value: 0.5,
    default_note: 'Proactively maintained sterile barrier and guided simulated team seamlessly.',
  },
]

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
      // If table doesn't exist yet or other query error, gracefully provide default clinical presets
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

    // If it's a hardcoded preset ID, treat it as dismissed
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
