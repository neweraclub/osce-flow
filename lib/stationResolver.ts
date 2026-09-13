import { supabaseAdmin } from '@/lib/auth'
import { parseStationIdentifier, getStationSlug, slugify } from '@/lib/stationSlug'

export interface AuthenticatedProf {
  professorId: string
  userId: string
  facultyId: string
}

export interface ResolvedStationResult {
  station: any | null
  module?: any | null
  levelName?: string
  slug?: string
  unauthorized?: boolean
}

/**
 * Resolves a station by either raw UUID or human-readable slug (e.g. 'cardiology-station-01' or 'station-01')
 * scoped to the authenticated professor's assigned modules.
 */
export async function resolveStationRecord(
  identifier: string,
  prof: AuthenticatedProf
): Promise<ResolvedStationResult> {
  const parsed = parseStationIdentifier(identifier)

  // 1. Fetch all modules assigned to this professor
  const { data: profModules, error: modErr } = await supabaseAdmin
    .from('modules')
    .select('id, module_name, level_id, responsible_prof_id')
    .or(`responsible_prof_id.eq.${prof.professorId},responsible_prof_id.eq.${prof.userId}`)

  if (modErr) throw modErr

  const assignedModules = profModules || []
  const moduleIds = assignedModules.map((m) => m.id)
  const moduleMap = new Map(assignedModules.map((m) => [m.id, m]))

  // CASE A: Legacy raw UUID
  if (parsed.isUuid) {
    const { data: station, error: stErr } = await supabaseAdmin
      .from('stations')
      .select('*')
      .eq('id', parsed.raw)
      .single()

    if (stErr || !station) {
      return { station: null }
    }

    // Verify ownership
    let mod = moduleMap.get(station.module_id)
    if (!mod) {
      // Query module directly if not in initial list
      const { data: rawMod } = await supabaseAdmin
        .from('modules')
        .select('id, module_name, level_id, responsible_prof_id')
        .eq('id', station.module_id)
        .single()

      if (
        !rawMod ||
        (rawMod.responsible_prof_id !== prof.professorId &&
          rawMod.responsible_prof_id !== prof.userId)
      ) {
        return { station: null, unauthorized: true }
      }
      mod = rawMod
    }

    let levelName = 'General Level'
    if (mod?.level_id) {
      const { data: lvl } = await supabaseAdmin
        .from('study_levels')
        .select('level_name')
        .eq('id', mod.level_id)
        .single()
      if (lvl?.level_name) levelName = lvl.level_name
    }

    const cleanSlug = getStationSlug({
      station_number: station.station_number,
      module_name: mod?.module_name,
      id: station.id,
    })

    return {
      station,
      module: mod,
      levelName,
      slug: cleanSlug,
    }
  }

  // CASE B: Human-readable slug (e.g. 'cardiology-station-01', 'station-01', or '1')
  if (moduleIds.length === 0) {
    return { station: null }
  }

  // Fetch all candidate stations for the professor's assigned modules
  const { data: candidateStations, error: candErr } = await supabaseAdmin
    .from('stations')
    .select('*')
    .in('module_id', moduleIds)
    .order('station_number', { ascending: true })

  if (candErr || !candidateStations || candidateStations.length === 0) {
    return { station: null }
  }

  // B1. Exact slug match
  for (const st of candidateStations) {
    const mod = moduleMap.get(st.module_id)
    const stSlug = getStationSlug({
      station_number: st.station_number,
      module_name: mod?.module_name,
      id: st.id,
    })
    if (stSlug.toLowerCase() === parsed.raw.toLowerCase()) {
      let levelName = 'General Level'
      if (mod?.level_id) {
        const { data: lvl } = await supabaseAdmin
          .from('study_levels')
          .select('level_name')
          .eq('id', mod.level_id)
          .single()
        if (lvl?.level_name) levelName = lvl.level_name
      }
      return { station: st, module: mod, levelName, slug: stSlug }
    }
  }

  // B2. If stationNumber is parsed
  if (parsed.stationNumber !== undefined) {
    // If moduleSlug is present, match the module first
    if (parsed.moduleSlug) {
      const matchedMod = assignedModules.find((m) => {
        const modSlug = slugify(m.module_name)
        return modSlug.includes(parsed.moduleSlug!) || parsed.moduleSlug!.includes(modSlug)
      })

      if (matchedMod) {
        const st = candidateStations.find(
          (s) => s.module_id === matchedMod.id && Number(s.station_number) === parsed.stationNumber
        )
        if (st) {
          let levelName = 'General Level'
          if (matchedMod.level_id) {
            const { data: lvl } = await supabaseAdmin
              .from('study_levels')
              .select('level_name')
              .eq('id', matchedMod.level_id)
              .single()
            if (lvl?.level_name) levelName = lvl.level_name
          }
          const stSlug = getStationSlug({
            station_number: st.station_number,
            module_name: matchedMod.module_name,
            id: st.id,
          })
          return { station: st, module: matchedMod, levelName, slug: stSlug }
        }
      }
    }

    // Fallback: match any station with this station_number
    const st = candidateStations.find(
      (s) => Number(s.station_number) === parsed.stationNumber
    )
    if (st) {
      const mod = moduleMap.get(st.module_id)
      let levelName = 'General Level'
      if (mod?.level_id) {
        const { data: lvl } = await supabaseAdmin
          .from('study_levels')
          .select('level_name')
          .eq('id', mod.level_id)
          .single()
        if (lvl?.level_name) levelName = lvl.level_name
      }
      const stSlug = getStationSlug({
        station_number: st.station_number,
        module_name: mod?.module_name,
        id: st.id,
      })
      return { station: st, module: mod, levelName, slug: stSlug }
    }
  }

  return { station: null }
}
