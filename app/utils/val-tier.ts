import type { ValRankHistoryDto } from '~/lib/types'

/**
 * Competitive tiers.
 *
 * Tier ids follow Riot's table: 0 is unranked, 3 (Iron 1) to 26 (Immortal 3) come in families of
 * three divisions, 27 is Radiant, and 1 / 2 are unused. Labels are French ("Diamant 2"): the API's
 * `tierName` is English and is never printed.
 */

export type TierFamily =
  | 'unranked' | 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum'
  | 'diamond' | 'ascendant' | 'immortal' | 'radiant'

/** The eight families with divisions, lowest first. Radiant has none and closes the scale. */
export const DIVISION_FAMILIES: { family: TierFamily, label: string }[] = [
  { family: 'iron', label: 'Fer' },
  { family: 'bronze', label: 'Bronze' },
  { family: 'silver', label: 'Argent' },
  { family: 'gold', label: 'Or' },
  { family: 'platinum', label: 'Platine' },
  { family: 'diamond', label: 'Diamant' },
  { family: 'ascendant', label: 'Ascendant' },
  { family: 'immortal', label: 'Immortel' },
]

/** Elo per division and per family. The API's `elo` is 100 per division from Iron 1 at 0. */
export const DIVISION_ELO = 100
export const FAMILY_ELO = DIVISION_ELO * 3
/** Elo where Radiant starts: after the 24 divisions of Iron 1 → Immortal 3. */
export const RADIANT_ELO = FAMILY_ELO * DIVISION_FAMILIES.length

/** Same rule as GameOn-API: 0 and 3–27 are real tiers with an emblem; 1 and 2 are unused. */
export function isValidTier(tierId: number | null | undefined): tierId is number {
  return tierId === 0 || (typeof tierId === 'number' && tierId >= 3 && tierId <= 27)
}

/** A tier that counts on the ladder: a real tier above unranked. */
export function isRankedTier(tierId: number | null | undefined): tierId is number {
  return typeof tierId === 'number' && tierId >= 3 && tierId <= 27
}

/** Family (for the `tier-*` colour token) and French label of a tier: 20 → diamond, "Diamant 3". */
export function tierInfo(tierId: number | null | undefined): { family: TierFamily, label: string } {
  if (tierId === 27) return { family: 'radiant', label: 'Radiant' }
  if (!isRankedTier(tierId)) return { family: 'unranked', label: 'Non classé' }
  const index = tierId - 3
  const base = DIVISION_FAMILIES[Math.floor(index / 3)]!
  return { family: base.family, label: `${base.label} ${(index % 3) + 1}` }
}

/**
 * The tier's colour, as a CSS variable reference for inline styles (`--tier-*` lives on `:root`, so
 * it exists whether or not a Tailwind class used it). Unranked reads as a neutral surface.
 */
export function tierColor(family: TierFamily): string {
  return family === 'unranked' ? 'var(--color-surface-high)' : `var(--tier-${family})`
}

/**
 * Position on the continuous axis. Prefers the API's `elo`, and rebuilds it from the tier and RR when
 * a snapshot carries none (`elo` 0 on a ranked tier).
 */
export function rankElo(rank: Pick<ValRankHistoryDto, 'tierId' | 'rankedRating' | 'elo'>): number | null {
  if (!isRankedTier(rank.tierId)) return null
  if (rank.elo > 0) return rank.elo
  return (rank.tierId - 3) * DIVISION_ELO + rank.rankedRating
}

/** The family an elo falls in, for the rank scale's bands. */
export function familyAtElo(elo: number): TierFamily {
  if (elo >= RADIANT_ELO) return 'radiant'
  return DIVISION_FAMILIES[Math.max(0, Math.floor(elo / FAMILY_ELO))]?.family ?? 'iron'
}

/** The French label of a family, "Diamant", for a band. */
export function familyLabel(family: TierFamily): string {
  if (family === 'radiant') return 'Radiant'
  if (family === 'unranked') return 'Non classé'
  return DIVISION_FAMILIES.find(entry => entry.family === family)?.label ?? ''
}

/** The tier id at the bottom of a family, for its emblem: diamond → 18 (Diamant 1). */
export function familyBaseTier(family: TierFamily): number {
  if (family === 'radiant') return 27
  const index = DIVISION_FAMILIES.findIndex(entry => entry.family === family)
  return index < 0 ? 0 : 3 + index * 3
}
