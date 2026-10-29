import type { ValPlayerDto } from './player'

/**
 * Rolling window of the profile's performance stats (`LoLStatsPeriod` on the API, shared with League
 * of Legends).
 */
export type ValStatsPeriod = 'Week' | 'Month' | 'ThreeMonths' | 'SixMonths' | 'AllTime'

/** One agent of a performance recap (`ValAgentStatDto`). */
export interface ValAgentStatDto {
  agentId: string | null;
  agentName: string;
  agentIconUrl: string | null;
  gamesPlayed: number;
  wins: number;
  /** 0–100. */
  winRate: number;
  kda: number;
  acs: number;
  headshotPercent: number;
}

/** One map of a performance recap (`ValMapStatDto`). */
export interface ValMapStatDto {
  mapId: string | null;
  mapName: string;
  mapListViewIconUrl: string | null;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  acs: number;
}

/** A crew member met in the player's games (`ValDuoStatDto`), counted per account. */
export interface ValDuoStatDto {
  player: ValPlayerDto;
  gamesPlayed: number;
  /** Games played in the same party (same `partyId`), as opposed to matched together by chance. */
  premadeGames: number;
  wins: number;
  winRate: number;
}

/**
 * `PlayerDto.valorantPerformanceStats`: one account's recap over a period, its queues and agent
 * filters. Customs and deathmatch modes never count; a game without a winner is a draw, not a loss.
 */
export interface ValPerformanceStatsDto {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRatePercent: number;
  totalPlaytimeSeconds: number;
  averageGameDurationSeconds: number;
  roundsPlayed: number;
  averageAcs: number;
  averageAdr: number;
  kda: number;
  kdRatio: number;
  headshotPercent: number;
  kastPercent: number;
  /** Out of 10. */
  averageRating: number;
  firstKills: number;
  firstDeaths: number;
  /** Most played first. */
  agentStats: ValAgentStatDto[];
  mapStats: ValMapStatDto[];
  duoStats: ValDuoStatDto[];
}
