import type { ValPlayerDto, ValRankHistoryDto } from '~/lib/types'
import { isRankedTier, rankElo, tierInfo } from '~/utils/val-tier'
import type { TierFamily } from '~/utils/val-tier'
import { rankIconUrl } from '~/utils/val-assets'
import { isSmurf } from '~/utils/val-smurf'

export interface LadderPeak {
  tierId: number
  label: string
  rr: number | null
  season: string | null
  iconUrl: string | null
}

export interface LadderEntry {
  id: number
  name: string
  tag: string
  smurf: boolean
  /** The main account's name, for a smurf. */
  mainName: string | null
  cardSmall: string | null
  cardWide: string | null
  cardLarge: string | null
  /** The current rank entry, `null` when unranked or never synchronised. */
  rank: ValRankHistoryDto | null
  tierLabel: string
  family: TierFamily
  emblemUrl: string | null
  /** Position on the continuous elo axis, `null` when unranked. */
  elo: number | null
  /** Elo moved over 7 days; `null` when the API has no comparable pair (not the same as 0). */
  delta: number | null
  peak: LadderPeak | null
  /** 1-based place among the ranked, `null` when unranked. */
  position: number | null
  /** Elo behind the player just above, `null` for the leader and the unranked. */
  gap: number | null
  previousName: string | null
}

export interface Ladder {
  ranked: LadderEntry[]
  unranked: LadderEntry[]
  /** Accounts shown once the smurf filter applies, ranked or not. */
  visibleCount: number
}

export const playerDisplayName = (player: Pick<ValPlayerDto, 'riotGamesNickname' | 'nickname'>): string =>
  player.riotGamesNickname || player.nickname

export function playerPeak(player: ValPlayerDto): LadderPeak | null {
  const tierId = player.valorantPeakTierId
  if (!isRankedTier(tierId)) return null
  return {
    tierId,
    label: tierInfo(tierId).label,
    rr: player.valorantPeakRr,
    season: player.valorantPeakSeasonShort,
    iconUrl: player.valorantPeakRankIconUrl ?? rankIconUrl(tierId, 'large'),
  }
}

/**
 * The crew's ladder: the ranked sorted best first on the elo axis, then the unranked.
 *
 * The smurf filter is applied here, on the view, and never on the store: `useValStore().players`
 * keeps every account so a smurf can still resolve its main's name.
 */
export function buildLadder(players: ValPlayerDto[], includeSmurfs: boolean): Ladder {
  const byId = new Map(players.map(player => [player.id, player]))

  const entries = players
    .filter(player => includeSmurfs || !isSmurf(player))
    .map((player): LadderEntry => {
      const current = player.valorantCurrentRank
      const rank = current && isRankedTier(current.tierId) ? current : null
      const smurf = isSmurf(player)
      const main = smurf && player.primaryPlayerId ? byId.get(player.primaryPlayerId) : undefined
      const info = tierInfo(rank?.tierId)

      return {
        id: player.id,
        name: playerDisplayName(player),
        tag: player.riotGamesTagLine ? `#${player.riotGamesTagLine}` : '',
        smurf,
        mainName: main ? playerDisplayName(main) : null,
        cardSmall: player.valorantPlayerCardSmallUrl,
        cardWide: player.valorantPlayerCardWideUrl,
        cardLarge: player.valorantPlayerCardLargeUrl,
        rank,
        tierLabel: info.label,
        family: info.family,
        emblemUrl: rank ? rank.smallIconUrl ?? rankIconUrl(rank.tierId) : rankIconUrl(0),
        elo: rank ? rankElo(rank) : null,
        delta: rank ? player.rrChange7DaysValorant : null,
        peak: playerPeak(player),
        position: null,
        gap: null,
        previousName: null,
      }
    })

  const ranked = entries
    .filter(entry => entry.elo !== null)
    .sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0))
    .map((entry, index, list) => {
      const previous = index > 0 ? list[index - 1] : undefined
      return {
        ...entry,
        position: index + 1,
        gap: previous ? Math.max(0, (previous.elo ?? 0) - (entry.elo ?? 0)) : null,
        previousName: previous?.name ?? null,
      }
    })

  return {
    ranked,
    unranked: entries.filter(entry => entry.elo === null),
    visibleCount: entries.length,
  }
}
