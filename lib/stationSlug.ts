/**
 * Utility functions for generating and parsing human-readable station slugs.
 * E.g., 'cardiology-station-01' or 'station-01' instead of raw database UUIDs.
 */

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD') // normalize accented characters
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-') // replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
}

export interface StationSlugData {
  station_number: number | string
  module_name?: string
  title?: string
  id?: string
}

/**
 * Generates a clean human-readable slug for a station.
 * Examples:
 * - Module: 'Cardiology', Number: 1 -> 'cardiology-station-01'
 * - Module: 'Pediatrics', Number: 12 -> 'pediatrics-station-12'
 * - Without module: Number: 2 -> 'station-02'
 */
export function getStationSlug(station: StationSlugData): string {
  const num = Number(station.station_number) || 1
  const paddedNum = String(num).padStart(2, '0')

  if (station.module_name && station.module_name.trim()) {
    const modSlug = slugify(station.module_name)
    if (modSlug && modSlug !== 'general' && modSlug !== 'general-module') {
      return `${modSlug}-station-${paddedNum}`
    }
  }

  return `station-${paddedNum}`
}

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface ParsedStationIdentifier {
  isUuid: boolean
  raw: string
  stationNumber?: number
  moduleSlug?: string
}

/**
 * Parses a station URL identifier (UUID or human-readable slug).
 */
export function parseStationIdentifier(identifier: string): ParsedStationIdentifier {
  const trimmed = (identifier || '').trim()

  if (UUID_REGEX.test(trimmed)) {
    return {
      isUuid: true,
      raw: trimmed,
    }
  }

  // Check pattern: '{module}-station-{number}' (e.g. 'cardiology-station-01')
  const moduleStationMatch = trimmed.match(/^(.*?)-station-(\d+)$/i)
  if (moduleStationMatch) {
    const modSlug = slugify(moduleStationMatch[1])
    const num = parseInt(moduleStationMatch[2], 10)
    return {
      isUuid: false,
      raw: trimmed,
      moduleSlug: modSlug || undefined,
      stationNumber: isNaN(num) ? undefined : num,
    }
  }

  // Check pattern: 'station-{number}' (e.g. 'station-01' or 'station-1')
  const stationMatch = trimmed.match(/^station-(\d+)$/i)
  if (stationMatch) {
    const num = parseInt(stationMatch[1], 10)
    return {
      isUuid: false,
      raw: trimmed,
      stationNumber: isNaN(num) ? undefined : num,
    }
  }

  // Check pattern: raw number (e.g. '1')
  const numMatch = trimmed.match(/^(\d+)$/)
  if (numMatch) {
    const num = parseInt(numMatch[1], 10)
    return {
      isUuid: false,
      raw: trimmed,
      stationNumber: isNaN(num) ? undefined : num,
    }
  }

  return {
    isUuid: false,
    raw: trimmed,
  }
}
