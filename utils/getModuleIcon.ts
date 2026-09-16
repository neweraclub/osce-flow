import React from 'react'
import {
  Activity,
  HeartPulse,
  Wind,
  Brain,
  Cpu,
  UtensilsCrossed,
  Droplet,
  Microscope,
  Biohazard,
  Bug,
  Droplets,
  Dna,
  Flame,
  Baby,
  HeartHandshake,
  Smile,
  Bone,
  Fingerprint,
  Sparkles,
  Eye,
  Ear,
  Headphones,
  Siren,
  Zap,
  Clock,
  Hourglass,
  ShieldAlert,
  Scale,
  FileBadge,
  LineChart,
  Globe,
  Building2,
  Trees,
  Stethoscope,
} from 'lucide-react'

export interface ModuleVisual {
  iconPath: string // Static SVG or Animated GIF/WebP from Flaticon
  bgColor: string // Tailwind background tint
  borderColor: string // Tailwind border tint
  gradientBg: string // Gradient matching organ category
  textColor: string // Text accent color
  specialty: string // Clinical specialty area
  fallbackIcon: React.ComponentType<{ className?: string }>
}

export const MODULE_ICON_MAP: Record<string, ModuleVisual> = {
  'Cardiologie': {
    iconPath: '/icons/organs/heartbeat.gif',
    bgColor: 'bg-rose-500/10 dark:bg-rose-500/15',
    borderColor: 'border-rose-500/25 dark:border-rose-500/30',
    gradientBg: 'bg-gradient-to-br from-rose-500/15 to-red-500/10',
    textColor: 'text-rose-600 dark:text-rose-400',
    specialty: 'Cardiovascular',
    fallbackIcon: HeartPulse,
  },
  'Pneumologie': {
    iconPath: '/icons/organs/lungs.gif',
    bgColor: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    borderColor: 'border-cyan-500/25 dark:border-cyan-500/30',
    gradientBg: 'bg-gradient-to-br from-cyan-500/15 to-sky-500/10',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    specialty: 'Respiratory',
    fallbackIcon: Wind,
  },
  'Neurologie': {
    iconPath: '/icons/organs/brain.gif',
    bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    borderColor: 'border-indigo-500/25 dark:border-indigo-500/30',
    gradientBg: 'bg-gradient-to-br from-indigo-500/15 to-purple-500/10',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    specialty: 'Nervous System',
    fallbackIcon: Brain,
  },
  'Hépato-gastro-entérologie et Chirurgie viscérale': {
    iconPath: '/icons/organs/digestive-system.gif',
    bgColor: 'bg-orange-500/10 dark:bg-orange-500/15',
    borderColor: 'border-orange-500/25 dark:border-orange-500/30',
    gradientBg: 'bg-gradient-to-br from-orange-500/15 to-amber-500/10',
    textColor: 'text-orange-600 dark:text-orange-400',
    specialty: 'Digestive & Liver',
    fallbackIcon: UtensilsCrossed,
  },
  'Hématologie et Oncologie': {
    iconPath: '/icons/organs/blood-cells.gif',
    bgColor: 'bg-red-500/10 dark:bg-red-500/15',
    borderColor: 'border-red-500/25 dark:border-red-500/30',
    gradientBg: 'bg-gradient-to-br from-red-500/15 to-rose-600/10',
    textColor: 'text-red-600 dark:text-red-400',
    specialty: 'Blood & Cell Biology',
    fallbackIcon: Droplet,
  },
  'Infectiologie': {
    iconPath: '/icons/organs/virus.gif',
    bgColor: 'bg-lime-500/10 dark:bg-lime-500/15',
    borderColor: 'border-lime-500/25 dark:border-lime-500/30',
    gradientBg: 'bg-gradient-to-br from-lime-500/15 to-emerald-500/10',
    textColor: 'text-lime-600 dark:text-lime-400',
    specialty: 'Pathogens & Virology',
    fallbackIcon: Biohazard,
  },
  'Urologie – Néphrologie': {
    iconPath: '/icons/organs/kidneys.gif',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/15',
    borderColor: 'border-amber-500/25 dark:border-amber-500/30',
    gradientBg: 'bg-gradient-to-br from-amber-500/15 to-yellow-500/10',
    textColor: 'text-amber-600 dark:text-amber-400',
    specialty: 'Renal & Urinary',
    fallbackIcon: Droplets,
  },
  'Endocrinologie': {
    iconPath: '/icons/organs/endocrine.gif',
    bgColor: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/15',
    borderColor: 'border-fuchsia-500/25 dark:border-fuchsia-500/30',
    gradientBg: 'bg-gradient-to-br from-fuchsia-500/15 to-pink-500/10',
    textColor: 'text-fuchsia-600 dark:text-fuchsia-400',
    specialty: 'Hormonal & Glands',
    fallbackIcon: Dna,
  },
  'Pédiatrie': {
    iconPath: '/icons/organs/baby.gif',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/15',
    borderColor: 'border-blue-500/25 dark:border-blue-500/30',
    gradientBg: 'bg-gradient-to-br from-blue-500/15 to-sky-400/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    specialty: 'Child Health',
    fallbackIcon: Baby,
  },
  'Obstétrique et Gynécologie': {
    iconPath: '/icons/organs/pregnancy.gif',
    bgColor: 'bg-pink-500/10 dark:bg-pink-500/15',
    borderColor: 'border-pink-500/25 dark:border-pink-500/30',
    gradientBg: 'bg-gradient-to-br from-pink-500/15 to-rose-400/10',
    textColor: 'text-pink-600 dark:text-pink-400',
    specialty: "Women's Health & Delivery",
    fallbackIcon: HeartHandshake,
  },
  'Santé mentale': {
    iconPath: '/icons/organs/mental-health.gif',
    bgColor: 'bg-teal-500/10 dark:bg-teal-500/15',
    borderColor: 'border-teal-500/25 dark:border-teal-500/30',
    gradientBg: 'bg-gradient-to-br from-teal-500/15 to-emerald-400/10',
    textColor: 'text-teal-600 dark:text-teal-400',
    specialty: 'Psychiatry / Psychology',
    fallbackIcon: Smile,
  },
  'Système Musculosquelettique': {
    iconPath: '/icons/organs/skeleton.gif',
    bgColor: 'bg-slate-500/10 dark:bg-slate-500/15',
    borderColor: 'border-slate-500/25 dark:border-slate-500/30',
    gradientBg: 'bg-gradient-to-br from-slate-500/15 to-zinc-400/10',
    textColor: 'text-slate-600 dark:text-slate-300',
    specialty: 'Bones & Joints',
    fallbackIcon: Bone,
  },
  'Dermatologie': {
    iconPath: '/icons/organs/skin.gif',
    bgColor: 'bg-orange-500/10 dark:bg-orange-500/15',
    borderColor: 'border-orange-500/25 dark:border-orange-500/30',
    gradientBg: 'bg-gradient-to-br from-orange-500/15 to-amber-400/10',
    textColor: 'text-orange-600 dark:text-orange-400',
    specialty: 'Integumentary System',
    fallbackIcon: Fingerprint,
  },
  'Ophtalmologie': {
    iconPath: '/icons/organs/eye.gif',
    bgColor: 'bg-blue-600/10 dark:bg-blue-600/15',
    borderColor: 'border-blue-600/25 dark:border-blue-600/30',
    gradientBg: 'bg-gradient-to-br from-blue-600/15 to-indigo-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    specialty: 'Visual System',
    fallbackIcon: Eye,
  },
  'O.R.L (Oto-Rhino-Laryngologie)': {
    iconPath: '/icons/organs/ent.gif',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    borderColor: 'border-emerald-500/25 dark:border-emerald-500/30',
    gradientBg: 'bg-gradient-to-br from-emerald-500/15 to-teal-400/10',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    specialty: 'Ear, Nose, Throat',
    fallbackIcon: Ear,
  },
  'Médecine d\'urgence': {
    iconPath: '/icons/organs/emergency.gif',
    bgColor: 'bg-rose-600/10 dark:bg-rose-600/15',
    borderColor: 'border-rose-600/25 dark:border-rose-600/30',
    gradientBg: 'bg-gradient-to-br from-rose-600/15 to-red-600/10',
    textColor: 'text-rose-600 dark:text-rose-400',
    specialty: 'Acute Care / Trauma',
    fallbackIcon: Siren,
  },
  'Gériatrie': {
    iconPath: '/icons/organs/geriatrics.gif',
    bgColor: 'bg-amber-600/10 dark:bg-amber-600/15',
    borderColor: 'border-amber-600/25 dark:border-amber-600/30',
    gradientBg: 'bg-gradient-to-br from-amber-600/15 to-stone-500/10',
    textColor: 'text-amber-600 dark:text-amber-400',
    specialty: 'Aging & Senior Care',
    fallbackIcon: Clock,
  },
  'Maladies systémiques': {
    iconPath: '/icons/organs/systemic.gif',
    bgColor: 'bg-violet-500/10 dark:bg-violet-500/15',
    borderColor: 'border-violet-500/25 dark:border-violet-500/30',
    gradientBg: 'bg-gradient-to-br from-violet-500/15 to-purple-500/10',
    textColor: 'text-violet-600 dark:text-violet-400',
    specialty: 'Multi-organ / Autoimmune',
    fallbackIcon: ShieldAlert,
  },
  'Médecine légale et droit médical': {
    iconPath: '/icons/organs/forensic.gif',
    bgColor: 'bg-slate-600/10 dark:bg-slate-600/15',
    borderColor: 'border-slate-600/25 dark:border-slate-600/30',
    gradientBg: 'bg-gradient-to-br from-slate-600/15 to-indigo-900/10',
    textColor: 'text-slate-600 dark:text-slate-300',
    specialty: 'Forensic & Medical Law',
    fallbackIcon: Scale,
  },
  'Épidémiologie – Méthodologie – Économie': {
    iconPath: '/icons/organs/epidemiology.gif',
    bgColor: 'bg-cyan-600/10 dark:bg-cyan-600/15',
    borderColor: 'border-cyan-600/25 dark:border-cyan-600/30',
    gradientBg: 'bg-gradient-to-br from-cyan-600/15 to-blue-600/10',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    specialty: 'Public Health / Analytics',
    fallbackIcon: LineChart,
  },
  'Santé au travail et environnement': {
    iconPath: '/icons/organs/occupational.gif',
    bgColor: 'bg-green-600/10 dark:bg-green-600/15',
    borderColor: 'border-green-600/25 dark:border-green-600/30',
    gradientBg: 'bg-gradient-to-br from-green-600/15 to-emerald-700/10',
    textColor: 'text-green-600 dark:text-green-400',
    specialty: 'Occupational Health',
    fallbackIcon: Building2,
  },
}

// Fallback Default Visual
export const DEFAULT_MODULE_VISUAL: ModuleVisual = {
  iconPath: '/icons/organs/caduceus.svg',
  bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/15',
  borderColor: 'border-indigo-500/20 dark:border-indigo-500/25',
  gradientBg: 'bg-gradient-to-br from-indigo-500/15 to-purple-500/10',
  textColor: 'text-indigo-600 dark:text-indigo-400',
  specialty: 'Clinical Medicine',
  fallbackIcon: Stethoscope,
}

// Resilient string normalizer for accent, punctuation, and case insensitivity
const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Precomputed normalized mapping cache
const NORMALIZED_MAP = Object.entries(MODULE_ICON_MAP).map(([key, value]) => ({
  rawKey: key,
  normKey: normalizeText(key),
  value,
}))

/**
 * Resolves the visual token configuration for any clinical module name.
 * Uses exact matching first, then normalized matching, then substring token search.
 */
export const getModuleVisual = (moduleName: string): ModuleVisual => {
  if (!moduleName) return DEFAULT_MODULE_VISUAL

  // 1. Direct key hit
  if (MODULE_ICON_MAP[moduleName]) {
    return MODULE_ICON_MAP[moduleName]
  }

  const cleanName = normalizeText(moduleName)

  // 2. Normalized full match
  const directNorm = NORMALIZED_MAP.find((entry) => entry.normKey === cleanName)
  if (directNorm) return directNorm.value

  // 3. Substring keyword resolution
  // E.g. "Module Cardio" -> matches "Cardiologie", "ORL" -> matches "O.R.L", "Nephro" -> "Urologie - Nephrologie"
  if (cleanName.includes('cardio') || cleanName.includes('coeur')) {
    return MODULE_ICON_MAP['Cardiologie']
  }
  if (cleanName.includes('pneumo') || cleanName.includes('poumon') || cleanName.includes('respir')) {
    return MODULE_ICON_MAP['Pneumologie']
  }
  if (cleanName.includes('neuro') || cleanName.includes('cerveau')) {
    return MODULE_ICON_MAP['Neurologie']
  }
  if (cleanName.includes('gastro') || cleanName.includes('hepato') || cleanName.includes('viscer')) {
    return MODULE_ICON_MAP['Hépato-gastro-entérologie et Chirurgie viscérale']
  }
  if (cleanName.includes('hemato') || cleanName.includes('onco') || cleanName.includes('sang')) {
    return MODULE_ICON_MAP['Hématologie et Oncologie']
  }
  if (cleanName.includes('infectio') || cleanName.includes('viro') || cleanName.includes('bacterio')) {
    return MODULE_ICON_MAP['Infectiologie']
  }
  if (cleanName.includes('uro') || cleanName.includes('nephro') || cleanName.includes('rein')) {
    return MODULE_ICON_MAP['Urologie – Néphrologie']
  }
  if (cleanName.includes('endocrino') || cleanName.includes('diabete') || cleanName.includes('thyro')) {
    return MODULE_ICON_MAP['Endocrinologie']
  }
  if (cleanName.includes('pediat') || cleanName.includes('enfant')) {
    return MODULE_ICON_MAP['Pédiatrie']
  }
  if (cleanName.includes('gyneco') || cleanName.includes('obstet') || cleanName.includes('matern')) {
    return MODULE_ICON_MAP['Obstétrique et Gynécologie']
  }
  if (cleanName.includes('mentale') || cleanName.includes('psychiat') || cleanName.includes('psycho')) {
    return MODULE_ICON_MAP['Santé mentale']
  }
  if (cleanName.includes('musculo') || cleanName.includes('squelett') || cleanName.includes('ortho') || cleanName.includes('rhumato')) {
    return MODULE_ICON_MAP['Système Musculosquelettique']
  }
  if (cleanName.includes('dermato') || cleanName.includes('peau')) {
    return MODULE_ICON_MAP['Dermatologie']
  }
  if (cleanName.includes('ophtalmo') || cleanName.includes('oeil') || cleanName.includes('yeux')) {
    return MODULE_ICON_MAP['Ophtalmologie']
  }
  if (cleanName.includes('orl') || cleanName.includes('oto') || cleanName.includes('laryngo') || cleanName.includes('rhino')) {
    return MODULE_ICON_MAP['O.R.L (Oto-Rhino-Laryngologie)']
  }
  if (cleanName.includes('urgenc') || cleanName.includes('samu') || cleanName.includes('rea') || cleanName.includes('trauma')) {
    return MODULE_ICON_MAP['Médecine d\'urgence']
  }
  if (cleanName.includes('geriat') || cleanName.includes('vieill') || cleanName.includes('senio')) {
    return MODULE_ICON_MAP['Gériatrie']
  }
  if (cleanName.includes('system') || cleanName.includes('autoimmun') || cleanName.includes('lupus')) {
    return MODULE_ICON_MAP['Maladies systémiques']
  }
  if (cleanName.includes('legal') || cleanName.includes('droit') || cleanName.includes('ethiq')) {
    return MODULE_ICON_MAP['Médecine légale et droit médical']
  }
  if (cleanName.includes('epidemio') || cleanName.includes('methodo') || cleanName.includes('econom')) {
    return MODULE_ICON_MAP['Épidémiologie – Méthodologie – Économie']
  }
  if (cleanName.includes('travail') || cleanName.includes('environ') || cleanName.includes('occupat')) {
    return MODULE_ICON_MAP['Santé au travail et environnement']
  }

  // 4. Token partial search against normalized map
  const partial = NORMALIZED_MAP.find(
    (entry) => cleanName.includes(entry.normKey) || entry.normKey.includes(cleanName)
  )
  if (partial) return partial.value

  return DEFAULT_MODULE_VISUAL
}
