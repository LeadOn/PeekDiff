import type { ValPerformanceRating } from '~/lib/types'
import type { TierFamily } from '~/utils/val-tier'

/**
 * French wording of the API's Valorant codes that only Riot defines: accolade types, performance
 * ratings, Premier roles, weapon kinds. The single dictionary for them: components never print a code
 * the API sends as is.
 */

// --- Accolades (end-of-game stars) ---

interface AccoladeWording {
  label: string
  /** Unit of `bestValue` / `value`, empty for a plain count. */
  unit: string
}

const ACCOLADES: Record<string, AccoladeWording> = {
  kills: { label: 'Kills', unit: 'kills' },
  first_blood: { label: 'Premier sang', unit: 'PK' },
  damage_per_round: { label: 'Dégâts par manche', unit: 'ADR' },
  clutches: { label: 'Clutchs', unit: '' },
  aces: { label: 'Aces', unit: '' },
  trades: { label: 'Échanges', unit: '' },
  headshot_percentage: { label: 'Headshots', unit: '%' },
  distinction: { label: 'Distinction', unit: '' },
  assists: { label: 'Assistances', unit: '' },
  top_frag: { label: 'Top frag', unit: 'kills' },
  plants: { label: 'Poses de spike', unit: '' },
  mvp: { label: 'MVP', unit: '' },
}

/** An accolade type in French; an unknown one reads "Distinction" rather than Riot's code. */
export function accoladeLabel(type: string): string {
  return ACCOLADES[type]?.label ?? 'Distinction'
}

export function accoladeUnit(type: string): string {
  return ACCOLADES[type]?.unit ?? ''
}

// --- Riot's performance ratings ---

export const RIOT_SCORE_LABEL = 'Note Riot'
/** Riot's score is provisional on Riot's side: it is always printed with this mention. */
export const RIOT_SCORE_BETA = 'bêta'

export const PERFORMANCE_RATINGS: Record<ValPerformanceRating, { label: string, glyph: string }> = {
  double_down: { label: 'très en dessous', glyph: '▼▼' },
  down: { label: 'en dessous', glyph: '▼' },
  neutral: { label: 'dans la moyenne', glyph: '■' },
  up: { label: 'au-dessus', glyph: '▲' },
  double_up: { label: 'très au-dessus', glyph: '▲▲' },
}

/** The rated dimensions of `ValGameParticipantPerformanceDto`, in Riot's order. */
export const PERFORMANCE_DIMENSIONS = [
  { key: 'combatKillImpact', label: 'Impact des kills' },
  { key: 'combatDeathImpact', label: 'Impact des morts' },
  { key: 'combatDamage', label: 'Dégâts' },
  { key: 'combatTrades', label: 'Échanges' },
  { key: 'utilityAssists', label: 'Assistances utilitaires' },
  { key: 'utilityPlants', label: 'Poses' },
  { key: 'utilityDefuses', label: 'Désamorçages' },
  { key: 'utilityUsage', label: 'Utilitaires' },
] as const

export type PerformanceDimension = typeof PERFORMANCE_DIMENSIONS[number]['key']

export function isPerformanceRating(value: unknown): value is ValPerformanceRating {
  return typeof value === 'string' && value in PERFORMANCE_RATINGS
}

// --- Premier ---

const PREMIER_ROLES: Record<string, string> = {
  OWNER: 'Capitaine',
  MEMBER: 'Membre',
}

export function premierRoleLabel(role: string | null | undefined): string | null {
  if (!role) return null
  return PREMIER_ROLES[role.toUpperCase()] ?? 'Membre'
}

// --- Weapons ---

/** What killed, when the API has no icon for it: a glyph per kind, never the only carrier. */
export const WEAPON_KINDS: Record<string, { label: string, glyph: string }> = {
  Weapon: { label: 'Arme', glyph: '⌖' },
  Ability: { label: 'Compétence', glyph: '✦' },
  Bomb: { label: 'Spike', glyph: '✶' },
  Melee: { label: 'Couteau', glyph: '†' },
  Fall: { label: 'Chute', glyph: '↓' },
}

export function weaponKind(type: string | null | undefined): { label: string, glyph: string } {
  return (type ? WEAPON_KINDS[type] : undefined) ?? WEAPON_KINDS.Weapon!
}

/** A weapon's printed name: the spike, the knife and a fall have names of their own. */
export function weaponName(name: string | null | undefined, type: string | null | undefined): string {
  if (type === 'Bomb') return 'Spike'
  if (type === 'Fall') return 'Chute'
  if (type === 'Melee' || name === 'Melee') return 'Couteau'
  return name ?? 'Inconnue'
}

// --- Rank protection ---

const PROTECTION_STATUSES: Record<string, string> = {
  Empty: 'boucliers épuisés',
  Full: 'boucliers pleins',
}

export function protectionStatusLabel(status: string | null | undefined): string | null {
  if (!status) return null
  return PROTECTION_STATUSES[status] ?? null
}

// --- Raw JSON fields ---

const PRESTIGE_FAMILIES: Record<string, TierFamily> = {
  IRON: 'iron',
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
  DIAMOND: 'diamond',
  ASCENDANT: 'ascendant',
  IMMORTAL: 'immortal',
  RADIANT: 'radiant',
}
const FAMILY_ORDER: TierFamily[] = ['radiant', 'immortal', 'ascendant', 'diamond', 'platinum', 'gold', 'silver', 'bronze', 'iron']

export interface PrestigeEntry {
  family: TierFamily
  count: number
}

const parseJson = (raw: string | null | undefined): unknown => {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * `valorantLifetimePrestigeJson` (`{"DIAMOND":{"count":6},"ASCENDANT":{"count":2}}`): how many acts the
 * player finished in each rank family, highest first. Anything unreadable is dropped, never guessed.
 */
export function parsePrestige(raw: string | null | undefined): PrestigeEntry[] {
  const value = parseJson(raw)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, entry]): PrestigeEntry[] => {
      const family = PRESTIGE_FAMILIES[key.toUpperCase()]
      const count = entry && typeof entry === 'object' ? (entry as { count?: unknown }).count : undefined
      return family && typeof count === 'number' && count > 0 ? [{ family, count }] : []
    })
    .sort((a, b) => FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family))
}

/** `actWinsJson`: the tier ids of the act badge's triangle, best first. Unreadable → empty. */
export function parseActWins(raw: string | null | undefined): number[] {
  const value = parseJson(raw)
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry)).sort((a, b) => b - a)
}
