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
