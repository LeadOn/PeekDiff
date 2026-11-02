import type { ValRankHistoryDto } from '~/lib/types'
import { formatSigned } from '~/utils/number'

/**
 * The RR a ranked game really moved. `lastChange` is what Riot *announced*: a loss absorbed at 0 RR is
 * announced −22 for a real −4, a promotion announced +16 brings +22. `rrDelta` is the RR applied; an
 * API older than 2026-11 does not send it, and the announced figure is all there is then.
 */
export function rrMove(entry: Pick<ValRankHistoryDto, 'lastChange' | 'rrDelta'>): number {
  return entry.rrDelta ?? entry.lastChange
}

/**
 * Why the RR moved the way it did, for a tooltip: "−4 RR (−22 annoncés, protégé à 0) · bonus de
 * performance +3 · pénalité de groupe ×0,25". Only the parts that apply.
 */
export function rrMoveDetail(entry: Pick<ValRankHistoryDto, 'lastChange' | 'rrDelta' | 'wasDerankProtected' | 'rrPerformanceBonus' | 'rrPenalty' | 'afkPenalty' | 'newMapIncentiveRrForgiven' | 'isPlacementMatch' | 'wasDerankProtectionReplenished'>): string {
  const move = rrMove(entry)
  const differs = entry.rrDelta != null && entry.rrDelta !== entry.lastChange
  const notes: string[] = []
  if (differs) notes.push(`${formatSigned(entry.lastChange)} annoncés`)
  if (entry.wasDerankProtected) notes.push('protégé à 0')

  const parts = [`${formatSigned(move)} RR${notes.length ? ` (${notes.join(', ')})` : ''}`]
  if (entry.isPlacementMatch) parts.push('placement')
  if (entry.rrPerformanceBonus) parts.push(`bonus de performance ${formatSigned(entry.rrPerformanceBonus)}`)
  if (entry.rrPenalty && entry.rrPenalty > 0 && entry.rrPenalty !== 1) parts.push(`pénalité de groupe ×${entry.rrPenalty.toLocaleString('fr-FR')}`)
  if (entry.afkPenalty) parts.push(`pénalité d'AFK ${formatSigned(-Math.abs(entry.afkPenalty))}`)
  if (entry.newMapIncentiveRrForgiven) parts.push(`${entry.newMapIncentiveRrForgiven} RR pardonnés (nouvelle carte)`)
  if (entry.wasDerankProtectionReplenished) parts.push('bouclier rechargé')
  return parts.join(' · ')
}
