import type { ValGameDamageDto, ValGameDto, ValGameKillDto, ValGameParticipantDto, ValGameParticipantPerformanceDto, ValGameRoundDto, ValGameRoundPlayerStatDto, ValGameTimelineDto } from '~/lib/types'
import type { GameResult } from '~/utils/val-match'
import { playerDisplayName } from '~/utils/val-ladder'
import { agentImageUrl, mapImageUrl, playerCardUrl, valorantCdnUrl } from '~/utils/val-assets'
import { tierInfo } from '~/utils/val-tier'
import { accoladeLabel, accoladeUnit, isPerformanceRating, PERFORMANCE_DIMENSIONS, PERFORMANCE_RATINGS, RIOT_SCORE_BETA, RIOT_SCORE_LABEL } from '~/utils/val-labels'
import type { MinimapPoint } from '~/utils/val-minimap'
import { isOnMinimap, minimapDirection, projectToMinimap, viewConePath } from '~/utils/val-minimap'

/**
 * A game seen whole, for the match page: the two teams, their scoreboard, the round timeline and the
 * kill feed.
 *
 * Every view is told from one side, as in the game: "Alliés" (teal) is the team of the player the
 * page focuses on, "Ennemis" (red) the other. Sides are not results: the enemy can lose.
 */

export type Side = 'ally' | 'enemy'

export interface GamePerspective {
  allyTeamId: string | null
  /** The participant the page is told from, highlighted everywhere; `null` when none was asked for. */
  focusId: number | null
}

/**
 * The side the page is told from: the focused crew member's team when they played it, otherwise the
 * team with the most crew members (the winners on a tie), since every stored game has at least one.
 */
export function resolvePerspective(game: ValGameDto, focusPlayerId: number | null): GamePerspective {
  const focus = focusPlayerId === null ? undefined : game.valorantGameParticipants.find(entry => entry.playerId === focusPlayerId)
  if (focus) return { allyTeamId: focus.teamId, focusId: focus.id }

  const crewCount = (teamId: string) => game.valorantGameParticipants.filter(entry => entry.teamId === teamId && entry.playerId !== null).length
  const teams = [...game.valorantGameTeams].sort((a, b) => (crewCount(b.teamId) - crewCount(a.teamId)) || (Number(b.won) - Number(a.won)))
  return { allyTeamId: teams[0]?.teamId ?? null, focusId: null }
}

export const SIDE_LABELS: Record<Side, string> = { ally: 'Alliés', enemy: 'Ennemis' }

/** The match page's tabs. The scoreboard is the default and never reaches the query string. */
export type MatchTab = 'scoreboard' | 'rounds' | 'economy' | 'damages'

export const MATCH_TABS: { value: MatchTab, label: string }[] = [
  { value: 'scoreboard', label: 'Tableau des scores' },
  { value: 'rounds', label: 'Manches' },
  { value: 'economy', label: 'Économie' },
  { value: 'damages', label: 'Dégâts' },
]

export const DEFAULT_MATCH_TAB: MatchTab = 'scoreboard'

/** `?tab=` as the match page reads it: anything unknown is the scoreboard. */
export function parseMatchTab(value: unknown): MatchTab {
  return MATCH_TABS.some(tab => tab.value === value) ? value as MatchTab : DEFAULT_MATCH_TAB
}

const sideOf = (teamId: string | null | undefined, perspective: GamePerspective): Side =>
  teamId && teamId === perspective.allyTeamId ? 'ally' : 'enemy'

export function participantName(participant: ValGameParticipantDto): string {
  if (participant.player) return playerDisplayName(participant.player)
  return participant.riotIdGameName ?? 'Joueur inconnu'
}

// --- Scoreboard ---

export interface ScoreboardRow {
  id: number
  /** The GameOn player, for a link to their profile; `null` outside the crew. */
  playerId: number | null
  name: string
  tag: string
  agentName: string
  agentIconUrl: string | null
  cardUrl: string | null
  tierId: number
  tierLabel: string
  tierIconUrl: string | null
  acs: number | null
  kills: number
  deaths: number
  assists: number
  /** Kills minus deaths. */
  plusMinus: number
  adr: number | null
  headshotPercent: number | null
  kastPercent: number | null
  firstKills: number | null
  firstDeaths: number | null
  rating: number | null
  isMvp: boolean
  isTeamMvp: boolean
  isFocus: boolean
  /** Riot's performance score (beta on Riot's side), `null` when Riot did not score the game. */
  riotScore: number | null
  /** Riot's ratings spelled out, for the score's tooltip. */
  riotDetail: string | null
  /** Riot's own MVP elections, apart from ours. */
  isRiotMvp: boolean
  isRiotTeamMvp: boolean
  /** End-of-game stars; empty when none or not read yet (once a day upstream). */
  accolades: { key: string, label: string, title: string, actRecord: boolean }[]
  /** The party's RR gain factor when one applied (e.g. 0.25), `null` otherwise. */
  partyPenalty: number | null
}

export interface ScoreboardTeam {
  teamId: string
  side: Side
  label: string
  result: GameResult
  roundsWon: number
  roundsLost: number
  rows: ScoreboardRow[]
}

/** "Note Riot (bêta) 214 · Impact des kills ▲ au-dessus · Dégâts ■ dans la moyenne…", for a tooltip. */
export function riotPerformanceDetail(performance: ValGameParticipantPerformanceDto | null | undefined): string | null {
  if (!performance || performance.score === null) return null
  const ratings = PERFORMANCE_DIMENSIONS.flatMap(({ key, label }) => {
    const rating = performance[key]
    return isPerformanceRating(rating) ? [`${label} ${PERFORMANCE_RATINGS[rating].glyph} ${PERFORMANCE_RATINGS[rating].label}`] : []
  })
  return [`${RIOT_SCORE_LABEL} (${RIOT_SCORE_BETA}) ${Math.round(performance.score)}`, ...ratings].join(' · ')
}

function scoreboardRow(game: ValGameDto, participant: ValGameParticipantDto, perspective: GamePerspective): ScoreboardRow {
  const stats = participant.stats
  const penalty = participant.partyRrPenalty
  return {
    id: participant.id,
    playerId: participant.playerId,
    name: participantName(participant),
    tag: participant.riotIdTagLine ? `#${participant.riotIdTagLine}` : '',
    agentName: participant.agentName ?? 'Agent inconnu',
    agentIconUrl: participant.agentIconUrl ?? agentImageUrl(participant.agentId),
    cardUrl: playerCardUrl(participant.playerCardId, 'small'),
    tierId: participant.tierId,
    tierLabel: tierInfo(participant.tierId).label,
    tierIconUrl: participant.tierIconUrl,
    acs: stats?.acs ?? null,
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    plusMinus: participant.kills - participant.deaths,
    adr: stats?.adr ?? null,
    headshotPercent: stats?.headshotPercent ?? null,
    kastPercent: stats?.kastPercent ?? null,
    firstKills: stats?.firstKills ?? null,
    firstDeaths: stats?.firstDeaths ?? null,
    rating: stats?.rating ?? null,
    isMvp: game.mvpParticipantId === participant.id,
    isTeamMvp: game.aceParticipantId === participant.id,
    isFocus: perspective.focusId === participant.id,
    riotScore: participant.performance?.score ?? null,
    riotDetail: riotPerformanceDetail(participant.performance),
    isRiotMvp: participant.isRiotMatchMvp === true || (!!game.riotMvpPuuid && game.riotMvpPuuid === participant.puuid),
    isRiotTeamMvp: participant.isRiotTeamMvp === true,
    accolades: (participant.accolades ?? []).map((accolade) => {
      const unit = accoladeUnit(accolade.type)
      const value = `${Math.round(accolade.value * 10) / 10}${unit ? ` ${unit}` : ''}`
      return {
        key: `${accolade.id}`,
        label: accoladeLabel(accolade.type),
        title: `${accoladeLabel(accolade.type)} : ${value}${accolade.isActRecord ? ' · record de l\'acte' : ''}`,
        actRecord: accolade.isActRecord,
      }
    }),
    partyPenalty: penalty != null && penalty > 0 && penalty !== 1 ? penalty : null,
  }
}

/** Both teams, allies first, each sorted by ACS like the in-game scoreboard. */
export function buildScoreboard(game: ValGameDto, perspective: GamePerspective): ScoreboardTeam[] {
  return game.valorantGameTeams
    .map((team): ScoreboardTeam => {
      const side = sideOf(team.teamId, perspective)
      let result: GameResult = team.won ? 'V' : 'D'
      if (game.isRemake) result = 'R'
      else if (!game.winningTeamId) result = 'N'
      return {
        teamId: team.teamId,
        side,
        label: SIDE_LABELS[side],
        result,
        roundsWon: team.roundsWon,
        roundsLost: team.roundsLost,
        rows: game.valorantGameParticipants
          .filter(entry => entry.teamId === team.teamId)
          .map(entry => scoreboardRow(game, entry, perspective))
          .sort((a, b) => ((b.acs ?? b.kills) - (a.acs ?? a.kills))),
      }
    })
    .sort((a, b) => (a.side === b.side ? 0 : a.side === 'ally' ? -1 : 1))
}

// --- Rounds ---

/** Round endings with their timeline glyph (design system §5): never the only carrier, a label goes with it. */
const ROUND_ENDS: Record<string, { glyph: string, label: string }> = {
  Elimination: { glyph: '✕', label: 'Élimination' },
  Defuse: { glyph: '◆', label: 'Spike désamorcé' },
  Detonate: { glyph: '✶', label: 'Spike explosé' },
}
const TIMER_END = { glyph: '◷', label: 'Temps écoulé' }

const CEREMONIES: Record<string, string> = {
  CeremonyAce: 'Ace',
  CeremonyTeamAce: 'Ace d\'équipe',
  CeremonyFlawless: 'Sans faute',
  CeremonyClutch: 'Clutch',
  CeremonyCloser: 'Manche décisive',
  CeremonyThrifty: 'Économe',
}

const ROLES: Record<string, string> = { Attacker: 'en attaque', Defender: 'en défense' }

export interface RoundCell {
  /** 0-based, as the API counts. */
  index: number
  /** 1-based, as players count. */
  number: number
  side: Side
  glyph: string
  endLabel: string
  ceremonyLabel: string | null
  /** "Manche 7 · Alliés en défense · Spike désamorcé", for the cell's `aria-label` and `title`. */
  label: string
  /** A separator goes before this round: the half-time swap, or the start of overtime. */
  breakBefore: 'half' | 'overtime' | null
  /** The allies' side this round, from `attackingTeam`; `null` when the API does not say. */
  allyRole: 'attack' | 'defense' | null
}

/** Red's role in a round, read off who won it and on which side. */
function redRole(round: ValGameRoundDto): string | null {
  if (!round.winningTeam || !round.winningTeamRole) return null
  if (round.winningTeam === 'Red') return round.winningTeamRole
  return round.winningTeamRole === 'Attacker' ? 'Defender' : 'Attacker'
}

/**
 * The round timeline. Half time is wherever the teams first swap sides, so it holds for every mode
 * (12 rounds in competitive, 4 in Swiftplay); the second swap opens overtime, where sides change every
 * round and no further separator is drawn.
 */
export function buildRounds(rounds: ValGameRoundDto[], perspective: GamePerspective): RoundCell[] {
  let swaps = 0
  let previousRole: string | null = null

  return [...rounds].sort((a, b) => a.roundNumber - b.roundNumber).map((round) => {
    const role = redRole(round)
    let breakBefore: RoundCell['breakBefore'] = null
    if (previousRole && role && role !== previousRole && swaps < 2) {
      swaps++
      breakBefore = swaps === 1 ? 'half' : 'overtime'
    }
    if (role) previousRole = role

    const side = sideOf(round.winningTeam, perspective)
    const allyRole: RoundCell['allyRole'] = round.attackingTeam && perspective.allyTeamId
      ? (round.attackingTeam === perspective.allyTeamId ? 'attack' : 'defense')
      : null
    const end = (round.result ? ROUND_ENDS[round.result] : undefined) ?? TIMER_END
    const ceremonyLabel = round.ceremony ? CEREMONIES[round.ceremony] ?? null : null
    const roleLabel = round.winningTeamRole ? ROLES[round.winningTeamRole] : undefined

    return {
      index: round.roundNumber,
      number: round.roundNumber + 1,
      side,
      glyph: end.glyph,
      endLabel: end.label,
      ceremonyLabel,
      label: [
        `Manche ${round.roundNumber + 1}`,
        `${SIDE_LABELS[side]}${roleLabel ? ` ${roleLabel}` : ''}`,
        end.label,
        ceremonyLabel,
        allyRole && !roleLabel ? `alliés en ${allyRole === 'attack' ? 'attaque' : 'défense'}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      breakBefore,
      allyRole,
    }
  })
}

// --- Kill feed ---

export interface FeedActor {
  name: string
  side: Side
  agentName: string
  /** The agent's 128×64 kill feed portrait. */
  portraitUrl: string | null
  isFocus: boolean
}

export interface FeedLine {
  id: number
  /** "1:12" into the round. */
  time: string
  killer: FeedActor | null
  victim: FeedActor | null
  weapon: string
  assists: number
  isFirstBlood: boolean
  /** Where the victim fell, e.g. "A Main"; `null` for games imported before positions. */
  zone: string | null
  /** "23 m", `null` when unknown. */
  distance: string | null
}

export interface RoundDetail {
  cell: RoundCell
  /** Plant and defuse, in words: "Spike posé en A par Jett à 1:12". */
  events: string[]
  lines: FeedLine[]
}

/** "1:12" from milliseconds. */
export function formatRoundClock(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function weaponLabel(kill: ValGameKillDto): string {
  if (kill.weaponType === 'Bomb') return 'Spike'
  return kill.weaponName ?? '—'
}

/** The kill feed and events of one round. */
export function buildRoundDetail(
  game: ValGameDto,
  round: ValGameRoundDto,
  cell: RoundCell,
  kills: ValGameKillDto[],
  perspective: GamePerspective,
): RoundDetail {
  const byPuuid = new Map(game.valorantGameParticipants.map(entry => [entry.puuid, entry]))

  const actor = (puuid: string | null): FeedActor | null => {
    const participant = puuid ? byPuuid.get(puuid) : undefined
    if (!participant) return null
    return {
      name: participantName(participant),
      side: sideOf(participant.teamId, perspective),
      agentName: participant.agentName ?? 'Agent inconnu',
      portraitUrl: agentImageUrl(participant.agentId, 'killfeed'),
      isFocus: participant.id === perspective.focusId,
    }
  }
  const nameOf = (puuid: string | null) => (puuid ? byPuuid.get(puuid) : undefined)

  const events: string[] = []
  if (round.plantTimeMs !== null) {
    const planter = nameOf(round.plantPlayerPuuid)
    // The site letter when there is one ("en B"), else the callout the positions give ("en B Site").
    const where = round.plantSite ?? round.plantZone
    events.push(`Spike posé${where ? ` en ${where}` : ''}${planter ? ` par ${participantName(planter)}` : ''} à ${formatRoundClock(round.plantTimeMs)}`)
  }
  if (round.defuseTimeMs !== null) {
    const defuser = nameOf(round.defusePlayerPuuid)
    events.push(`Désamorcé${defuser ? ` par ${participantName(defuser)}` : ''} à ${formatRoundClock(round.defuseTimeMs)}`)
  }

  const roundKills = kills
    .filter(kill => kill.roundNumber === round.roundNumber)
    .sort((a, b) => a.timeInRoundMs - b.timeInRoundMs)

  return {
    cell,
    events,
    lines: roundKills.map((kill, index) => ({
      id: kill.id,
      time: formatRoundClock(kill.timeInRoundMs),
      killer: actor(kill.killerPuuid),
      victim: actor(kill.victimPuuid),
      weapon: weaponLabel(kill),
      assists: kill.assistantsCount,
      isFirstBlood: index === 0,
      zone: kill.victimZone ?? null,
      distance: kill.distanceMeters != null ? `${Math.round(kill.distanceMeters)} m` : null,
    })),
  }
}

// --- Economy ---

/**
 * How a team bought, from its average loadout per player (what each one carried into the round:
 * weapon, armor and abilities, saved gear included). A pistol round is every half's first, whatever
 * was spent: 800 credits buy nothing else.
 */
export type BuyType = 'pistol' | 'eco' | 'semi' | 'full'

export const BUY_LABELS: Record<BuyType, string> = {
  pistol: 'Pistolets',
  eco: 'Éco',
  semi: 'Semi',
  full: 'Achat complet',
}

/** Under 2 000 a player carries a pistol at best; from 3 900 a rifle and heavy shields. */
const ECO_BELOW = 2000
const FULL_FROM = 3900

export function buyType(averageLoadout: number, pistol: boolean): BuyType {
  if (pistol) return 'pistol'
  if (averageLoadout < ECO_BELOW) return 'eco'
  return averageLoadout < FULL_FROM ? 'semi' : 'full'
}

export interface EconomyTeam {
  side: Side
  /** Sum of the players' loadouts, in credits. */
  loadout: number
  /** Credits the team kept after buying. */
  remaining: number
  buy: BuyType
  damage: number
}

export interface EconomyRound {
  /** 0-based, as the API counts. */
  index: number
  number: number
  /** The side that won the round, from the timeline. */
  winner: Side
  ally: EconomyTeam | null
  enemy: EconomyTeam | null
  /** "Manche 4 · Alliés 18 400 crédits (semi) · Ennemis 22 100 crédits (achat complet) · gagnée par les alliés". */
  label: string
}

const credits = (value: number) => `${value.toLocaleString('fr-FR')} crédits`

/**
 * The economy of each round, team by team, aligned on the timeline's cells: the rounds the stats
 * cover, nothing for a round without any. Empty when the game was imported before the API stored
 * per-round stats, which the page says rather than drawing zeros.
 */
export function buildEconomy(stats: ValGameRoundPlayerStatDto[], cells: RoundCell[], perspective: GamePerspective): EconomyRound[] {
  if (stats.length === 0) return []
  const pistolRounds = new Set(cells.filter((cell, position) => position === 0 || cell.breakBefore === 'half').map(cell => cell.index))

  return cells.flatMap((cell) => {
    const roundStats = stats.filter(entry => entry.roundNumber === cell.index)
    if (roundStats.length === 0) return []

    const team = (side: Side): EconomyTeam | null => {
      const players = roundStats.filter(entry => sideOf(entry.team, perspective) === side)
      if (players.length === 0) return null
      const loadout = players.reduce((sum, entry) => sum + entry.loadoutValue, 0)
      return {
        side,
        loadout,
        remaining: players.reduce((sum, entry) => sum + entry.remaining, 0),
        buy: buyType(loadout / players.length, pistolRounds.has(cell.index)),
        damage: players.reduce((sum, entry) => sum + entry.damage, 0),
      }
    }

    const ally = team('ally')
    const enemy = team('enemy')
    const describe = (economy: EconomyTeam | null) => (economy
      ? `${SIDE_LABELS[economy.side]} ${credits(economy.loadout)} (${BUY_LABELS[economy.buy].toLowerCase()})`
      : null)

    return [{
      index: cell.index,
      number: cell.number,
      winner: cell.side,
      ally,
      enemy,
      label: [`Manche ${cell.number}`, describe(ally), describe(enemy), `gagnée par les ${SIDE_LABELS[cell.side].toLowerCase()}`]
        .filter(Boolean)
        .join(' · '),
    }]
  })
}

/** Armor names as the French client prints them; anything else as the API sends it. */
const ARMORS: Record<string, string> = {
  'Light Shields': 'Bouclier léger',
  'Heavy Shields': 'Bouclier lourd',
  'Regen Shield': 'Bouclier régénérant',
}

export interface LoadoutLine {
  puuid: string
  name: string
  side: Side
  agentName: string
  agentIconUrl: string | null
  /** "Vandal", "Couteau" without a weapon. */
  weapon: string
  /** `null` without armor. */
  armor: string | null
  loadout: number
  remaining: number
  damage: number
  kills: number
  score: number
  wasAfk: boolean
  isFocus: boolean
}

export interface RoundLoadouts {
  side: Side
  label: string
  economy: EconomyTeam | null
  lines: LoadoutLine[]
}

/** What each player carried in one round and what they did with it, allies first, by loadout. */
export function buildRoundLoadouts(
  game: ValGameDto,
  stats: ValGameRoundPlayerStatDto[],
  round: EconomyRound | undefined,
  perspective: GamePerspective,
): RoundLoadouts[] {
  if (!round) return []
  const byPuuid = new Map(game.valorantGameParticipants.map(entry => [entry.puuid, entry]))

  const lines = stats
    .filter(entry => entry.roundNumber === round.index)
    .map((entry): LoadoutLine => {
      const participant = byPuuid.get(entry.puuid)
      return {
        puuid: entry.puuid,
        name: participant ? participantName(participant) : 'Joueur inconnu',
        side: sideOf(entry.team, perspective),
        agentName: participant?.agentName ?? 'Agent inconnu',
        agentIconUrl: participant ? participant.agentIconUrl ?? agentImageUrl(participant.agentId) : null,
        weapon: !entry.weaponName || entry.weaponName === 'Melee' ? 'Couteau' : entry.weaponName,
        armor: entry.armorName ? ARMORS[entry.armorName] ?? entry.armorName : null,
        loadout: entry.loadoutValue,
        remaining: entry.remaining,
        damage: entry.damage,
        kills: entry.kills,
        score: entry.score,
        wasAfk: entry.wasAfk,
        isFocus: participant !== undefined && participant.id === perspective.focusId,
      }
    })
    .sort((a, b) => b.loadout - a.loadout)

  return (['ally', 'enemy'] as const).map(side => ({
    side,
    label: SIDE_LABELS[side],
    economy: round[side],
    lines: lines.filter(line => line.side === side),
  }))
}

// --- Minimap ---

export interface MinimapActor {
  puuid: string
  name: string
  side: Side
  agentName: string
  point: MinimapPoint
  /** SVG path of where they looked, in a 0–100 box; `null` when the view is unknown. */
  cone: string | null
  isFocus: boolean
}

export interface MinimapKill {
  /** `ValGameKillDto.id`, shared with the kill feed line. */
  id: number
  killer: MinimapPoint | null
  victim: MinimapPoint | null
  killerSide: Side | null
  victimSide: Side | null
  killerCone: string | null
  /** Every living player at the time of the kill, the victim included. */
  players: MinimapActor[]
}

export interface RoundMinimap {
  imageUrl: string | null
  kills: MinimapKill[]
  plant: MinimapPoint | null
  defuse: MinimapPoint | null
  /** "Kills et positions de la manche 4 : 7 kills, spike posé en B Site", for the image's label. */
  label: string
}

/**
 * Whether a game has any position at all: games imported before the API stored them have none, and
 * the page says "Positions indisponibles pour cette partie" rather than drawing an empty map.
 */
export function hasPositions(timeline: ValGameTimelineDto): boolean {
  return (timeline.playerLocations?.length ?? 0) > 0 || timeline.kills.some(kill => kill.victimX != null)
}

/**
 * One round on the minimap: where each kill happened and, for each, where every living player stood
 * and looked (`playerLocations` of that kill), plus the spike. `null` without a map transform.
 */
export function buildRoundMinimap(game: ValGameDto, timeline: ValGameTimelineDto, round: ValGameRoundDto, perspective: GamePerspective): RoundMinimap | null {
  const transform = timeline.mapTransform
  if (!transform) return null
  const byPuuid = new Map(game.valorantGameParticipants.map(entry => [entry.puuid, entry]))
  const project = (x: number | null | undefined, y: number | null | undefined) => {
    const point = projectToMinimap(transform, x, y)
    return point && isOnMinimap(point) ? point : null
  }
  const cone = (point: MinimapPoint | null, radians: number | null | undefined) => {
    const direction = minimapDirection(transform, radians)
    return point && direction ? viewConePath(point, direction) : null
  }
  const sideOfPuuid = (puuid: string | null) => {
    const participant = puuid ? byPuuid.get(puuid) : undefined
    return participant ? sideOf(participant.teamId, perspective) : null
  }

  const locationsByKill = new Map<number, NonNullable<ValGameTimelineDto['playerLocations']>>()
  for (const location of timeline.playerLocations ?? []) {
    if (location.eventType !== 'Kill' || location.valGameKillId === null) continue
    const list = locationsByKill.get(location.valGameKillId) ?? []
    list.push(location)
    locationsByKill.set(location.valGameKillId, list)
  }

  const kills = timeline.kills
    .filter(kill => kill.roundNumber === round.roundNumber)
    .sort((a, b) => a.timeInRoundMs - b.timeInRoundMs)
    .map((kill): MinimapKill => {
      const killer = project(kill.killerX, kill.killerY)
      const players = (locationsByKill.get(kill.id) ?? []).flatMap((location): MinimapActor[] => {
        const point = project(location.x, location.y)
        const participant = byPuuid.get(location.puuid)
        if (!point || !participant) return []
        return [{
          puuid: location.puuid,
          name: participantName(participant),
          side: sideOf(participant.teamId, perspective),
          agentName: participant.agentName ?? 'Agent inconnu',
          point,
          cone: cone(point, location.viewRadians),
          isFocus: participant.id === perspective.focusId,
        }]
      })
      return {
        id: kill.id,
        killer,
        victim: project(kill.victimX, kill.victimY),
        killerSide: sideOfPuuid(kill.killerPuuid),
        victimSide: sideOfPuuid(kill.victimPuuid),
        killerCone: cone(killer, kill.killerViewRadians),
        players,
      }
    })

  const plant = project(round.plantX, round.plantY)
  const placed = kills.filter(kill => kill.victim).length
  const label = [
    `Positions de la manche ${round.roundNumber + 1}`,
    `${placed} kill${placed > 1 ? 's' : ''} placé${placed > 1 ? 's' : ''}`,
    plant ? `spike posé${round.plantZone ? ` en ${round.plantZone}` : ''}` : null,
  ].filter(Boolean).join(' · ')

  return {
    imageUrl: valorantCdnUrl(transform.minimapUrl) ?? mapImageUrl(game.mapId, 'minimap'),
    kills,
    plant,
    defuse: project(round.defuseX, round.defuseY),
    label,
  }
}

// --- Damage matrix ---

export interface DamagePlayer {
  puuid: string
  name: string
  agentName: string
  agentIconUrl: string | null
  isFocus: boolean
}

export interface DamageCell {
  /** Damage the ally (row) dealt the enemy (column). */
  dealt: number
  /** Damage the enemy (column) dealt the ally (row). */
  received: number
  /** Both directions with their hits, for the cell's `title` and its screen reader text. */
  label: string
}

export interface DamageMatrix {
  allies: DamagePlayer[]
  enemies: DamagePlayer[]
  /** `cells[ally][enemy]`. */
  cells: DamageCell[][]
  /** Per ally: dealt to every enemy, received from them. */
  allyTotals: { dealt: number, received: number }[]
  enemyTotals: { dealt: number, received: number }[]
  /** The largest single figure, to scale the cells' shading. */
  max: number
}

/**
 * Who hit whom, allies in rows and enemies in columns, over the whole game or one round (`round`,
 * 0-based). Empty damages (a game imported before the API stored them) give `null`.
 */
export function buildDamageMatrix(game: ValGameDto, damages: ValGameDamageDto[], perspective: GamePerspective, round: number | null): DamageMatrix | null {
  if (damages.length === 0) return null
  const player = (participant: ValGameParticipantDto): DamagePlayer => ({
    puuid: participant.puuid,
    name: participantName(participant),
    agentName: participant.agentName ?? 'Agent inconnu',
    agentIconUrl: participant.agentIconUrl ?? agentImageUrl(participant.agentId),
    isFocus: participant.id === perspective.focusId,
  })
  const byAcs = (a: ValGameParticipantDto, b: ValGameParticipantDto) => (b.stats?.acs ?? b.kills) - (a.stats?.acs ?? a.kills)
  const allies = game.valorantGameParticipants.filter(entry => sideOf(entry.teamId, perspective) === 'ally').sort(byAcs).map(player)
  const enemies = game.valorantGameParticipants.filter(entry => sideOf(entry.teamId, perspective) === 'enemy').sort(byAcs).map(player)

  type Hits = { damage: number, headshots: number, bodyshots: number, legshots: number }
  const totals = new Map<string, Hits>()
  for (const entry of damages) {
    if (round !== null && entry.roundNumber !== round) continue
    const key = `${entry.attackerPuuid}>${entry.receiverPuuid}`
    const hits = totals.get(key) ?? { damage: 0, headshots: 0, bodyshots: 0, legshots: 0 }
    hits.damage += entry.damage
    hits.headshots += entry.headshots
    hits.bodyshots += entry.bodyshots
    hits.legshots += entry.legshots
    totals.set(key, hits)
  }
  const hitsOf = (from: string, to: string): Hits => totals.get(`${from}>${to}`) ?? { damage: 0, headshots: 0, bodyshots: 0, legshots: 0 }
  const describe = (from: DamagePlayer, to: DamagePlayer, hits: Hits) => {
    const parts = [hits.headshots && `${hits.headshots} tête`, hits.bodyshots && `${hits.bodyshots} corps`, hits.legshots && `${hits.legshots} jambes`].filter(Boolean)
    return `${from.name} → ${to.name} : ${hits.damage} dégâts${parts.length ? ` (${parts.join(', ')})` : ''}`
  }

  let max = 0
  const cells = allies.map(ally => enemies.map((enemy): DamageCell => {
    const out = hitsOf(ally.puuid, enemy.puuid)
    const back = hitsOf(enemy.puuid, ally.puuid)
    max = Math.max(max, out.damage, back.damage)
    return { dealt: out.damage, received: back.damage, label: `${describe(ally, enemy, out)} · ${describe(enemy, ally, back)}` }
  }))

  return {
    allies,
    enemies,
    cells,
    allyTotals: cells.map(row => ({ dealt: row.reduce((sum, cell) => sum + cell.dealt, 0), received: row.reduce((sum, cell) => sum + cell.received, 0) })),
    enemyTotals: enemies.map((_enemy, column) => ({
      dealt: cells.reduce((sum, row) => sum + (row[column]?.received ?? 0), 0),
      received: cells.reduce((sum, row) => sum + (row[column]?.dealt ?? 0), 0),
    })),
    max,
  }
}
