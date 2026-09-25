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
  {
    id: 'preset-pen-5',
    type: 'penalty',
    title: 'Rough Physical Maneuver',
    default_value: -1.0,
    default_note: 'Inadequate gentleness or failing to warn simulated patient before palpation.',
  },
  {
    id: 'preset-pen-6',
    type: 'penalty',
    title: 'Incomplete Patient Handover',
    default_value: -1.5,
    default_note: 'Omitted essential vital signs, allergies, or emergency findings during case briefing.',
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
  {
    id: 'preset-bon-5',
    type: 'bonus',
    title: 'Outstanding Clinical Communication',
    default_value: 1.0,
    default_note: 'Articulated complex pathology in clear, patient-friendly terms with verified comprehension.',
  },
  {
    id: 'preset-bon-6',
    type: 'bonus',
    title: 'Systematic Review Rigor',
    default_value: 0.75,
    default_note: 'Exhaustive and structured review of symptoms uncovering subtle secondary indicators.',
  },
]

const LOCAL_STORAGE_KEY = 'osce_penalty_bonus_templates'

/**
 * Retrieve templates entirely from client state and browser storage.
 * Strictly avoids any database calls or tables.
 */
export function getLocalTemplates(): PenaltyBonusTemplate[] {
  if (typeof window === 'undefined') {
    return DEFAULT_PENALTY_BONUS_TEMPLATES
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_PENALTY_BONUS_TEMPLATES
    }

    const custom: PenaltyBonusTemplate[] = JSON.parse(raw)
    if (!Array.isArray(custom)) {
      return DEFAULT_PENALTY_BONUS_TEMPLATES
    }

    // Merge custom with default presets, deduplicating by title
    const customTitles = new Set(custom.map((c) => c.title.toLowerCase().trim()))
    const remainingPresets = DEFAULT_PENALTY_BONUS_TEMPLATES.filter(
      (p) => !customTitles.has(p.title.toLowerCase().trim())
    )

    return [...custom, ...remainingPresets]
  } catch (err) {
    console.error('Failed to load local templates from storage:', err)
    return DEFAULT_PENALTY_BONUS_TEMPLATES
  }
}

/**
 * Save a new or edited template entirely into browser storage.
 */
export function saveLocalTemplate(input: {
  id?: string
  type: 'bonus' | 'penalty'
  title: string
  default_value: number
  default_note?: string
}): PenaltyBonusTemplate {
  const absValue = Math.abs(Number(input.default_value) || 0)
  const finalValue = input.type === 'penalty' ? -absValue : absValue

  const newTemplate: PenaltyBonusTemplate = {
    id: input.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: input.type,
    title: input.title.trim(),
    default_value: finalValue,
    default_note: input.default_note?.trim() || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
      let customList: PenaltyBonusTemplate[] = raw ? JSON.parse(raw) : []
      if (!Array.isArray(customList)) customList = []

      // If updating an existing custom template
      const existingIndex = customList.findIndex((t) => t.id === newTemplate.id)
      if (existingIndex >= 0) {
        customList[existingIndex] = newTemplate
      } else {
        customList.unshift(newTemplate)
      }

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(customList))
      window.dispatchEvent(new Event('osce-templates-updated'))
    } catch (err) {
      console.error('Failed to save local template:', err)
    }
  }

  return newTemplate
}

/**
 * Delete a custom template from browser storage.
 */
export function deleteLocalTemplate(id: string): boolean {
  if (id.startsWith('preset-')) {
    // Default system presets are read-only
    return false
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!raw) return true

      const customList: PenaltyBonusTemplate[] = JSON.parse(raw)
      if (Array.isArray(customList)) {
        const filtered = customList.filter((t) => t.id !== id)
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered))
        window.dispatchEvent(new Event('osce-templates-updated'))
      }
      return true
    } catch (err) {
      console.error('Failed to delete local template:', err)
      return false
    }
  }

  return true
}

/**
 * Reset templates back to pure hardcoded domain constants.
 */
export function resetLocalTemplates(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    window.dispatchEvent(new Event('osce-templates-updated'))
  }
}
