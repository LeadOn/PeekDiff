import type { ValGameDto, ValGameKillDto, ValGameParticipantDto, ValGameRoundDto, ValGameRoundPlayerStatDto } from '~/lib/types'
import type { GameResult } from '~/utils/val-match'
import { playerDisplayName } from '~/utils/val-ladder'
import { agentImageUrl, playerCardUrl } from '~/utils/val-assets'
import { tierInfo } from '~/utils/val-tier'

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

function scoreboardRow(game: ValGameDto, participant: ValGameParticipantDto, perspective: GamePerspective): ScoreboardRow {
  const stats = participant.stats
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
      label: [`Manche ${round.roundNumber + 1}`, `${SIDE_LABELS[side]}${roleLabel ? ` ${roleLabel}` : ''}`, end.label, ceremonyLabel]
        .filter(Boolean)
        .join(' · '),
      breakBefore,
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
    events.push(`Spike posé${round.plantSite ? ` en ${round.plantSite}` : ''}${planter ? ` par ${participantName(planter)}` : ''} à ${formatRoundClock(round.plantTimeMs)}`)
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
