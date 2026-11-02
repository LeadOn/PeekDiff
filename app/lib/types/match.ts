import type { ValPlayerDto } from './player'
import type { ValMapTransformDto } from './stats'

/** A page of results, as the API's `ListResultDto<T>` returns it. */
export interface ValListResultDto<T> {
  page: number;
  resultsPerPage: number;
  total: number;
  results: T[];
}

/** One side of a game (`ValGameTeam`). */
export interface ValGameTeamDto {
  id: number;
  matchId: string;
  /** "Red" or "Blue". */
  teamId: string;
  won: boolean;
  roundsWon: number;
  roundsLost: number;
  // Optional below: added by the API on 2026-11 (`features/valorant/full-data`), absent before.
  placement?: number | null;
  /** The team MVP Riot elected, not our `aceParticipantId`. */
  riotMvpPuuid?: string | null;
  /** Premier games only. */
  premierRosterId?: string | null;
  premierTeamName?: string | null;
  premierTeamTag?: string | null;
}

/** Stats the API derives per participant (`ValGameParticipantStat`). */
export interface ValGameParticipantStatDto {
  roundsPlayed: number;
  acs: number;
  kda: number;
  kdRatio: number;
  killParticipationPercent: number;
  adr: number;
  damageDeltaPerRound: number;
  headshotPercent: number;
  firstKills: number;
  firstDeaths: number;
  kastPercent: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  aces: number;
  clutchesWon: number;
  spikePlants: number;
  spikeDefuses: number;
  knifeKills: number;
  econRating: number;
  /** Out of 10; it is what elects the game's MVP. */
  rating: number;
  // Optional below: added by the API on 2026-11 (`features/valorant/full-data`). `null` = unknown.
  attackRounds?: number | null;
  attackRoundsWon?: number | null;
  attackKills?: number | null;
  attackDeaths?: number | null;
  attackScore?: number | null;
  defenseRounds?: number | null;
  defenseRoundsWon?: number | null;
  defenseKills?: number | null;
  defenseDeaths?: number | null;
  defenseScore?: number | null;
  pistolRounds?: number | null;
  pistolRoundsWon?: number | null;
  ecoRounds?: number | null;
  ecoRoundsWon?: number | null;
  forceBuyRounds?: number | null;
  forceBuyRoundsWon?: number | null;
  fullBuyRounds?: number | null;
  fullBuyRoundsWon?: number | null;
  tradeKills?: number;
  tradedDeaths?: number;
  clutchAttempts?: number;
  clutch1v1Won?: number;
  clutch1v2Won?: number;
  clutch1v3Won?: number;
  clutch1v4Won?: number;
  clutch1v5Won?: number;
  averageKillDistanceMeters?: number | null;
  longestKillDistanceMeters?: number | null;
}

/** One of Riot's performance ratings, from far below to far above expectations. */
export type ValPerformanceRating = 'double_down' | 'down' | 'neutral' | 'up' | 'double_up'

/**
 * Riot's own performance breakdown of a participant. `null` in skirmish, customs and older games.
 * Per-round values are averages per round.
 */
export interface ValGameParticipantPerformanceDto {
  /** Riot's performance score, about 100–320. Provisional on Riot's side. */
  score: number | null;
  /** Only "pass" seen so far. */
  grade: string | null;
  combatKillImpact: ValPerformanceRating | null;
  combatDeathImpact: ValPerformanceRating | null;
  combatDamage: ValPerformanceRating | null;
  combatTrades: ValPerformanceRating | null;
  utilityAssists: ValPerformanceRating | null;
  utilityPlants: ValPerformanceRating | null;
  utilityDefuses: ValPerformanceRating | null;
  utilityUsage: ValPerformanceRating | null;
  adjustedKills: number | null;
  /** Negative. */
  adjustedDeaths: number | null;
  assists: number | null;
  damage: number | null;
  trades: number | null;
  utilityUsagePerRound: number | null;
  plants: number | null;
  defuses: number | null;
}

/**
 * An end-of-game star (`ValGameAccolade`). Read once a day: a very recent game may have none yet. Only
 * `GET /val/match/{id}` fills them.
 */
export interface ValGameAccoladeDto {
  id: number;
  valGameParticipantId: number;
  accoladeId: string;
  /** "kills", "first_blood", "clutches"… worded by `accoladeLabel`. */
  type: string;
  value: number;
  /** The player's best of the act. */
  isActRecord: boolean;
}

/** One of the ten players of a game (`ValGameParticipant`). Only the fields the UI reads. */
export interface ValGameParticipantDto {
  id: number;
  matchId: string;
  /** The GameOn player behind this Riot account, `null` for anyone outside the database. */
  playerId: number | null;
  /** The Riot account; what rounds and kills refer to players by. */
  puuid: string;
  riotIdGameName: string | null;
  riotIdTagLine: string | null;
  teamId: string | null;
  /** Players sharing a `partyId` queued together. */
  partyId: string | null;
  agentId: string | null;
  agentName: string | null;
  agentIconUrl: string | null;
  playerCardId: string | null;
  /** The tier at the time of the game, 0 when unranked. */
  tierId: number;
  tierIconUrl: string | null;
  score: number;
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: number;
  win: boolean;
  /** RR moved by this game, `null` outside competitive or when the rank history has no entry for it. */
  rrChange: number | null;
  postGameTierId: number | null;
  postGameRankedRating: number | null;
  stats: ValGameParticipantStatDto | null;
  /** Filled when `playerId` is set. */
  player?: ValPlayerDto | null;
  // Optional below: added by the API on 2026-11 (`features/valorant/full-data`), absent before.
  teamNumber?: number | null;
  /** The party's RR gain factor, e.g. 0.25 for a party too far apart in rank. */
  partyRrPenalty?: number | null;
  /** Riot's MVP of the game, not our `mvpParticipantId`. */
  isRiotMatchMvp?: boolean;
  isRiotTeamMvp?: boolean;
  /** Agent mastery level shown in game. */
  bloomlineLevel?: number | null;
  preferredLevelBorderId?: string | null;
  performance?: ValGameParticipantPerformanceDto | null;
  /** Only `GET /val/match/{id}` fills them. */
  accolades?: ValGameAccoladeDto[];
}

/** A Valorant game (`ValGame`) with its teams and participants, as `/val/match/...` returns it. */
export interface ValGameDto {
  matchId: string;
  mapId: string | null;
  mapName: string | null;
  mapSplashUrl: string | null;
  mapListViewIconUrl: string | null;
  /** "competitive", "unrated", "swiftplay", "custom"… */
  queueId: string | null;
  /** The API's English label, e.g. "Unrated". The UI prints `queueLabel(queueId)`. */
  queueName: string | null;
  seasonShort: string | null;
  gameStart: string;
  gameLengthMs: number;
  isCompleted: boolean;
  /** A competitive or unrated game over in 3 rounds or fewer: it counts in no stat. */
  isRemake: boolean;
  /** `null` for a draw. */
  winningTeamId: string | null;
  /** Best rating of the winning team ("MVP du match"); `null` on a draw or a remake. */
  mvpParticipantId: number | null;
  /** Best rating of the losing team ("MVP d'équipe"), despite its name: it is not a five-kill round. */
  aceParticipantId: number | null;
  /** Riot's MVP of the game, not ours. Absent from an API older than 2026-11. */
  riotMvpPuuid?: string | null;
  premierInfoJson?: string | null;
  valorantGameTeams: ValGameTeamDto[];
  valorantGameParticipants: ValGameParticipantDto[];
}

/** One round of a game (`ValGameRound`). */
export interface ValGameRoundDto {
  id: number;
  /** 0-based: the first round is 0. */
  roundNumber: number;
  /** How the round ended: "Elimination", "Defuse", "Detonate", or empty when the timer ran out. */
  result: string | null;
  /** "CeremonyAce", "CeremonyClutch", "CeremonyFlawless"… "CeremonyDefault" when nothing stood out. */
  ceremony: string | null;
  /** "Red" or "Blue". */
  winningTeam: string | null;
  /** "Attacker" or "Defender". */
  winningTeamRole: string | null;
  firstBloodPuuid: string | null;
  firstBloodTeam: string | null;
  ceremonyPlayerPuuid: string | null;
  plantTimeMs: number | null;
  /** "A", "B" or "C". */
  plantSite: string | null;
  plantPlayerPuuid: string | null;
  defuseTimeMs: number | null;
  defusePlayerPuuid: string | null;
  // Optional below: added by the API on 2026-11 (`features/valorant/full-data`), absent before.
  /** The team on attack this round. */
  attackingTeam?: 'Red' | 'Blue' | null;
  /** Game coordinates; project them with `projectToMinimap`. */
  plantX?: number | null;
  plantY?: number | null;
  defuseX?: number | null;
  defuseY?: number | null;
  /** The callout, e.g. "B Site". */
  plantZone?: string | null;
}

/** One kill of a game (`ValGameKill`). There is no headshot flag per kill. */
export interface ValGameKillDto {
  id: number;
  roundNumber: number;
  timeInRoundMs: number;
  timeInMatchMs: number;
  killerPuuid: string | null;
  killerTeam: string | null;
  victimPuuid: string | null;
  victimTeam: string | null;
  assistantsCount: number;
  /** Comma-separated puuids. */
  assistantPuuids: string | null;
  weaponId: string | null;
  /** "Vandal", an ability's name ("Hot Hands"), or `null`. */
  weaponName: string | null;
  /** "Weapon", "Ability" or "Bomb" (the spike). */
  weaponType: string | null;
  // Optional below: added by the API on 2026-11 (`features/valorant/full-data`), absent before.
  victimX?: number | null;
  victimY?: number | null;
  killerX?: number | null;
  killerY?: number | null;
  /** Where the killer looked, in game radians. */
  killerViewRadians?: number | null;
  distanceMeters?: number | null;
  /** The callout, e.g. "A Main". */
  victimZone?: string | null;
  killerZone?: string | null;
}

/**
 * One player's round (`ValGameRoundPlayerStat`): what they bought, what they did with it. There is no
 * headshot per kill here either, only hits per body part.
 */
export interface ValGameRoundPlayerStatDto {
  id: number;
  matchId: string;
  /** 0-based, like rounds and kills. */
  roundNumber: number;
  puuid: string;
  /** "Red" or "Blue". */
  team: string | null;
  /** The value of what the player carried into the round, in credits. */
  loadoutValue: number;
  /** Credits left after the buy phase. */
  remaining: number;
  weaponId: string | null;
  /** English name, e.g. "Vandal"; `null` with no main weapon. */
  weaponName: string | null;
  armorId: string | null;
  /** English name, e.g. "Heavy Shields"; `null` without armor. */
  armorName: string | null;
  /** Combat score of the round; can be negative. */
  score: number;
  kills: number;
  headshots: number;
  bodyshots: number;
  legshots: number;
  /** Total damage dealt in the round, over every player hit. */
  damage: number;
  wasAfk: boolean;
  // Optional below: added by the API on 2026-11.
  receivedPenalty?: boolean;
  stayedInSpawn?: boolean;
}

/** Where one living player stood, and looked, at a kill, a plant or a defuse. */
export interface ValGamePlayerLocationDto {
  id: number;
  matchId: string;
  roundNumber: number;
  eventType: 'Kill' | 'Plant' | 'Defuse';
  /** The kill (`ValGameKillDto.id`) for a `Kill` event. */
  valGameKillId: number | null;
  puuid: string;
  /** "Red" or "Blue". */
  team: string | null;
  x: number;
  y: number;
  viewRadians: number | null;
}

/** Damage one player dealt another over a round. */
export interface ValGameDamageDto {
  id: number;
  matchId: string;
  roundNumber: number;
  attackerPuuid: string;
  receiverPuuid: string;
  damage: number;
  headshots: number;
  bodyshots: number;
  legshots: number;
}

/** `GET /val/match/{id}/rounds`: the round timeline and every kill, in order. */
export interface ValGameTimelineDto {
  matchId: string;
  rounds: ValGameRoundDto[];
  kills: ValGameKillDto[];
  /**
   * Every player's round, sorted by round, team and puuid. Empty for games imported before the API
   * stored them, and absent from an API build older than 2026-10-30: the economy is then unavailable,
   * never drawn at zero.
   */
  roundPlayerStats?: ValGameRoundPlayerStatDto[];
  // Optional below: added by the API on 2026-11. Empty for games imported before it.
  playerLocations?: ValGamePlayerLocationDto[];
  damages?: ValGameDamageDto[];
  /** `null` on a map without a minimap (skirmish). */
  mapTransform?: ValMapTransformDto | null;
}
