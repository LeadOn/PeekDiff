import type { ValPlayerDto } from './player'

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
}
