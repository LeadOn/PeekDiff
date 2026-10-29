import type { ValGameDto, ValGameParticipantDto } from '~/lib/types'
import { longDayLabel, parisDayKey } from '~/utils/date'
import { formatSigned } from '~/utils/number'
import { mapImageUrl } from '~/utils/val-assets'
import { playerDisplayName } from '~/utils/val-ladder'
import { tierInfo } from '~/utils/val-tier'

/**
 * A game seen from one crew member: the rows of a profile's match history.
 *
 * The API returns every game with its ten participants; everything here reads the participant that
 * belongs to the player and the team they were on.
 */

/** The API's queue ids, labelled in French (the API's `queueName` is English and never printed). */
const QUEUE_LABELS: Record<string, string> = {
  competitive: 'Compétition',
  unrated: 'Non classée',
  swiftplay: 'Vélocité',
  spikerush: 'Spike Rush',
  premier: 'Premier',
  deathmatch: 'Combat à mort',
  hurm: 'Combat à mort par équipe',
  ggteam: 'Escalade',
  onefa: 'Réplication',
  snowball: 'Bataille de boules de neige',
  custom: 'Personnalisée',
}

export function queueLabel(queueId: string | null | undefined, fallback?: string | null): string {
  return (queueId ? QUEUE_LABELS[queueId] : undefined) ?? fallback ?? 'Mode inconnu'
}

/** The queues the profile filters on, in the order the switch shows them. `null` is every queue. */
export const QUEUE_FILTERS: { value: string | null, label: string }[] = [
  { value: null, label: 'Toutes' },
  { value: 'competitive', label: 'Compétition' },
  { value: 'unrated', label: 'Non classée' },
  { value: 'swiftplay', label: 'Vélocité' },
]

/**
 * V / D / N as the design system prints them, plus R for a remake (a game over in three rounds or
 * fewer), which counts in no stat and is neither a win nor a loss.
 */
export type GameResult = 'V' | 'D' | 'N' | 'R'

export const RESULT_LABELS: Record<GameResult, string> = {
  V: 'Victoire',
  D: 'Défaite',
  N: 'Match nul',
  R: 'Partie annulée',
}

export interface GameMate {
  id: number
  name: string
}

export interface GameLine {
  matchId: string
  /** The match page, told from this player's side. */
  href: string
  /** Paris calendar day, for grouping. */
  dayKey: string
  startedAt: string
  durationSeconds: number
  result: GameResult
  /** Rounds won and lost by the player's team. */
  roundsFor: number
  roundsAgainst: number
  mapName: string
  mapBannerUrl: string | null
  queueId: string | null
  queueLabel: string
  agentId: string | null
  agentName: string
  agentIconUrl: string | null
  kills: number
  deaths: number
  assists: number
  /** `null` when the API has no derived stats for the participant. */
  acs: number | null
  adr: number | null
  headshotPercent: number | null
  rating: number | null
  /** RR this game moved, `null` outside competitive or when unknown. */
  rrChange: number | null
  /** French label of the tier after the game, when the rank history has it. */
  postGameTier: string | null
  isMvp: boolean
  isTeamMvp: boolean
  /** Crew members on the player's side. */
  mates: GameMate[]
  /** Whether at least one of `mates` queued in the player's party. */
  premade: boolean
}

function resultOf(game: ValGameDto, participant: ValGameParticipantDto): GameResult {
  if (game.isRemake) return 'R'
  if (!game.winningTeamId) return 'N'
  return participant.teamId === game.winningTeamId ? 'V' : 'D'
}

function mateName(participant: ValGameParticipantDto): string {
  if (participant.player) return playerDisplayName(participant.player)
  return participant.riotIdGameName ?? 'Joueur'
}

/** The game as `playerId` lived it, `null` when they are not among its participants. */
export function buildGameLine(game: ValGameDto, playerId: number): GameLine | null {
  const participant = game.valorantGameParticipants.find(entry => entry.playerId === playerId)
  if (!participant) return null

  const team = game.valorantGameTeams.find(entry => entry.teamId === participant.teamId)
  const mates = game.valorantGameParticipants.filter(entry =>
    entry.id !== participant.id && entry.playerId !== null && entry.teamId === participant.teamId)

  return {
    matchId: game.matchId,
    href: `/match/${game.matchId}?player=${playerId}`,
    dayKey: parisDayKey(game.gameStart),
    startedAt: game.gameStart,
    durationSeconds: Math.round(game.gameLengthMs / 1000),
    result: resultOf(game, participant),
    roundsFor: team?.roundsWon ?? 0,
    roundsAgainst: team?.roundsLost ?? 0,
    mapName: game.mapName ?? 'Carte inconnue',
    mapBannerUrl: game.mapListViewIconUrl ?? mapImageUrl(game.mapId),
    queueId: game.queueId,
    queueLabel: queueLabel(game.queueId, game.queueName),
    agentId: participant.agentId,
    agentName: participant.agentName ?? 'Agent inconnu',
    agentIconUrl: participant.agentIconUrl,
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    acs: participant.stats?.acs ?? null,
    adr: participant.stats?.adr ?? null,
    headshotPercent: participant.stats?.headshotPercent ?? null,
    rating: participant.stats?.rating ?? null,
    rrChange: participant.rrChange,
    postGameTier: participant.postGameTierId ? tierInfo(participant.postGameTierId).label : null,
    isMvp: game.mvpParticipantId === participant.id,
    isTeamMvp: game.aceParticipantId === participant.id,
    mates: mates.map(entry => ({ id: entry.playerId!, name: mateName(entry) })),
    premade: !!participant.partyId && mates.some(entry => entry.partyId === participant.partyId),
  }
}

export interface GameDay {
  key: string
  label: string
  lines: GameLine[]
  /** "3V · 1D", remakes left out; draws only when there is one. */
  record: string
  /** Net RR of the day's games that carry one, `null` when none does: a sum over nothing is not 0. */
  rr: number | null
  rrText: string | null
}

/** Consecutive lines of the same Paris day, newest first, as the history lists them. */
export function groupGamesByDay(lines: GameLine[], todayKey: string): GameDay[] {
  const groups: { key: string, lines: GameLine[] }[] = []
  for (const line of lines) {
    const last = groups[groups.length - 1]
    if (last && last.key === line.dayKey) last.lines.push(line)
    else groups.push({ key: line.dayKey, lines: [line] })
  }

  return groups.map((group) => {
    const count = (result: GameResult) => group.lines.filter(line => line.result === result).length
    const draws = count('N')
    const known = group.lines.flatMap(line => (line.rrChange === null ? [] : [line.rrChange]))
    const rr = known.length > 0 ? known.reduce((sum, value) => sum + value, 0) : null
    return {
      key: group.key,
      label: longDayLabel(group.key, todayKey),
      lines: group.lines,
      record: `${count('V')}V · ${count('D')}D${draws > 0 ? ` · ${draws}N` : ''}`,
      rr,
      rrText: rr === null ? null : `${formatSigned(rr)} RR`,
    }
  })
}
