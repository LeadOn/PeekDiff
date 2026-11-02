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
  // Optional below: added by the API on 2026-11 (`features/valorant/full-data`), absent before.
  /**
   * Average of Riot's own performance score (about 100–320). Provisional on Riot's side: printed beside
   * `averageRating`, never instead of it. `null` without any scored game.
   */
  averageRiotPerformanceScore?: number | null;
  attack?: ValSideStatsDto | null;
  defense?: ValSideStatsDto | null;
  /** Competitive, unrated and Premier only; `null` otherwise. */
  buyTypes?: ValBuyTypeStatsDto | null;
  clutches?: ValClutchStatsDto | null;
  /** Trades within 5 seconds. */
  trades?: ValTradeStatsDto | null;
  /** Most kills first. */
  weapons?: ValWeaponStatDto[];
}

/** One side's rounds of a recap: attack or defense. */
export interface ValSideStatsDto {
  rounds: number;
  roundsWon: number;
  roundWinRatePercent: number;
  kills: number;
  deaths: number;
  kdRatio: number;
  acs: number;
}

/**
 * Rounds by buy, from the player's team loadout: eco under 2 000 credits, force buy 2 000–3 899, full
 * buy from 3 900; pistol rounds apart.
 */
export interface ValBuyTypeStatsDto {
  pistolRounds: number;
  pistolRoundsWon: number;
  pistolWinRatePercent: number;
  ecoRounds: number;
  ecoRoundsWon: number;
  ecoWinRatePercent: number;
  forceBuyRounds: number;
  forceBuyRoundsWon: number;
  forceBuyWinRatePercent: number;
  fullBuyRounds: number;
  fullBuyRoundsWon: number;
  fullBuyWinRatePercent: number;
}

export interface ValClutchStatsDto {
  attempts: number;
  won: number;
  winRatePercent: number;
  won1v1: number;
  won1v2: number;
  won1v3: number;
  won1v4: number;
  won1v5: number;
}

export interface ValTradeStatsDto {
  /** Kills avenging a teammate within 5 seconds. */
  tradeKills: number;
  /** Deaths avenged by a teammate within 5 seconds. */
  tradedDeaths: number;
  deaths: number;
  tradedDeathPercent: number;
}

export type ValWeaponType = 'Weapon' | 'Ability' | 'Bomb' | 'Melee' | 'Fall'

export interface ValWeaponStatDto {
  weaponId: string | null;
  /** English, as the game names it: "Vandal", an ability's name. */
  weaponName: string | null;
  weaponType: ValWeaponType | string | null;
  kills: number;
  killSharePercent: number;
  averageDistanceMeters: number | null;
  longestDistanceMeters: number | null;
  iconUrl: string | null;
}

/** Projection of game coordinates on the minimap image (valorant-api.com's map transform). */
export interface ValMapTransformDto {
  minimapUrl: string | null;
  xMultiplier: number;
  yMultiplier: number;
  xScalarToAdd: number;
  yScalarToAdd: number;
}

export type ValSide = 'Attack' | 'Defense'
export type ValHeatmapType = 'Kills' | 'Deaths'

/** One kill or death of a heatmap. */
export interface ValHeatmapPointDto {
  matchId: string;
  roundNumber: number;
  x: number;
  y: number;
  /** Already projected, 0 (left) to 1 (right); `null` when the map has no transform. */
  minimapX: number | null;
  /** 0 (top) to 1 (bottom). */
  minimapY: number | null;
  /** The callout, e.g. "A Main". */
  zone: string | null;
  side: ValSide | null;
  weaponName: string | null;
  distanceMeters: number | null;
}

export interface ValZoneCountDto {
  zone: string;
  count: number;
  sharePercent: number;
}

/**
 * `GET /val/player/{id}/heatmap`: where the player stood when they killed (`Kills`), or where they fell
 * (`Deaths`), on one map.
 */
export interface ValHeatmapDto {
  mapId: string | null;
  mapName: string;
  type: ValHeatmapType;
  /** `null` on a map without a minimap (skirmish). */
  mapTransform: ValMapTransformDto | null;
  points: ValHeatmapPointDto[];
  /** Most first. */
  zones: ValZoneCountDto[];
}
