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
  riotIdGameName: string | null;
  riotIdTagLine: string | null;
  teamId: string | null;
  /** Players sharing a `partyId` queued together. */
  partyId: string | null;
  agentId: string | null;
  agentName: string | null;
  agentIconUrl: string | null;
  /** The tier at the time of the game, 0 when unranked. */
  tierId: number;
  score: number;
  kills: number;
  deaths: number;
  assists: number;
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
