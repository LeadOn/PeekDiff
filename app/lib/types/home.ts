import type { ValPlayerDto } from './player'
import type { ValAgentStatDto, ValMapStatDto } from './stats'

/** Window of the home recap (`LoLHomeWindow` on the API, shared with League of Legends). */
export type ValHomeWindow = 'CalendarWeek' | 'Last7Days'

/** One day of the crew's competitive activity, on the Paris wall clock. */
export interface ValDailyActivityDto {
  /** "2026-10-27". */
  date: string;
  games: number;
  wins: number;
  losses: number;
  playtimeMinutes: number;
  /** `null` when no ranked match falls on that day — not the same as 0. */
  netRrChange: number | null;
}

/** An account that played competitive in the window. */
export interface ValActivePlayerDto {
  player: ValPlayerDto;
  games: number;
  wins: number;
}

/** The crew's competitive activity over the window, against the seven days before. */
export interface ValWeeklyActivityDto {
  windowStart: string;
  windowEnd: string;
  previousWindowStart: string;
  gamesThisWeek: number;
  gamesLastWeek: number;
  winsThisWeek: number;
  lossesThisWeek: number;
  winsLastWeek: number;
  lossesLastWeek: number;
  winRateThisWeek: number;
  totalPlaytimeMinutesThisWeek: number;
  averageGameDurationMinutesThisWeek: number;
  /** Sum of the RR every ranked match of the window moved. The days add up to it exactly. */
  netRrChangeThisWeek: number;
  /** Oldest first, every day of the window, empty ones included. */
  days: ValDailyActivityDto[];
  /** Most games first. */
  activePlayers: ValActivePlayerDto[];
}

/** The account with the best net RR over the window — negative when the whole crew lost RR. */
export interface ValFactOfTheWeekDto {
  player: ValPlayerDto;
  rrChange: number;
  gamesThisWeek: number;
  winsThisWeek: number;
  winRateThisWeek: number;
  longestWinStreakThisWeek: number;
}

/**
 * One award of the crew records. `detail` is an English sentence and is never printed: the UI words
 * the award itself from `value`.
 */
export interface ValFunStatDto {
  player: ValPlayerDto | null;
  value: number;
  detail: string | null;
  /** The game the record was set in, `null` for a record built over the whole period. */
  matchId: string | null;
  gameDate: string | null;
}

/** An agent across the crew, with the account that played it the most. */
export interface ValCrewAgentStatDto extends ValAgentStatDto {
  topPlayer: { player: ValPlayerDto, gamesPlayed: number };
}

/** `GET /val/stats/global`: the crew's awards and most played agents and maps. Every award may be `null`. */
export interface ValGlobalStatsDto {
  totalGamesAnalyzed: number;
  totalPlayersTracked: number;
  sharpshooter: ValFunStatDto | null;
  bodyshotEnjoyer: ValFunStatDto | null;
  highestCombatScore: ValFunStatDto | null;
  entryKing: ValFunStatDto | null;
  firstBloodVictim: ValFunStatDto | null;
  biggestInter: ValFunStatDto | null;
  spikeCarrier: ValFunStatDto | null;
  knifeAssassin: ValFunStatDto | null;
  nightOwl: ValFunStatDto | null;
  longestWinStreak: ValFunStatDto | null;
  longestLossStreak: ValFunStatDto | null;
  topAgents: ValCrewAgentStatDto[];
  /** A game counts once per crew team: a five-stack is one game. */
  topMaps: ValMapStatDto[];
}

/** `GET /val/home`: the home page's recap. The crew records always cover the last 30 days, competitive only. */
export interface ValHomeStatsDto {
  weeklyActivity: ValWeeklyActivityDto;
  factOfTheWeek: ValFactOfTheWeekDto | null;
  crewRecords: ValGlobalStatsDto;
}
