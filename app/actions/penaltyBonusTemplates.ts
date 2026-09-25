'use server'

import {
  PenaltyBonusTemplate,
  DEFAULT_PENALTY_BONUS_TEMPLATES,
} from '@/lib/penaltyBonusTemplates'

export type { PenaltyBonusTemplate }

/**
 * Fetch all penalty & bonus templates without touching database tables.
 * Returns default hardcoded presets.
 */
export async function getPenaltyBonusTemplatesAction(): Promise<{
  success: boolean
  templates: PenaltyBonusTemplate[]
  error?: string
}> {
  return {
    success: true,
    templates: DEFAULT_PENALTY_BONUS_TEMPLATES,
  }
}

/**
 * In-memory fallback action (Frontend handles storage via localStorage)
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
  const absValue = Math.abs(Number(input.default_value) || 0)
  const finalValue = input.type === 'penalty' ? -absValue : absValue

  return {
    success: true,
    template: {
      id: `custom-${Date.now()}`,
      professor_id: input.professor_id || null,
      type: input.type,
      title: input.title.trim(),
      default_value: finalValue,
      default_note: input.default_note?.trim() || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }
}

/**
 * In-memory fallback action for updating templates
 */
export async function updatePenaltyBonusTemplateAction(
  id: string,
  input: Partial<PenaltyBonusTemplate>
): Promise<{
  success: boolean
  template?: PenaltyBonusTemplate
  error?: string
}> {
  return {
    success: true,
    template: {
      id,
      title: input.title || 'Updated Template',
      type: input.type || 'penalty',
      default_value: Number(input.default_value) || 0,
      default_note: input.default_note || '',
      updated_at: new Date().toISOString(),
    },
  }
}

/**
 * In-memory fallback action for deleting templates
 */
export async function deletePenaltyBonusTemplateAction(id: string): Promise<{
  success: boolean
  error?: string
}> {
  return { success: true }
}
