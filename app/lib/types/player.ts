import type { ValPerformanceStatsDto } from './stats'

/**
 * One entry of a player's Valorant rank history (`ValorantRankHistory` on the API): either the rank
 * after a competitive match (`matchId` set, `lastChange` the RR it moved) or a standalone snapshot.
 */
export interface ValRankHistoryDto {
  id: number;
  playerId: number;
  /** The competitive match that produced this entry, `null` for a standalone MMR snapshot. */
  matchId: string | null;
  seasonId: string | null;
  /** Act short code, e.g. "e9a3". */
  seasonShort: string | null;
  /** 0 = unranked, 3 = Iron 1 … 27 = Radiant. 1 and 2 are unused. */
  tierId: number;
  /** English tier name from the API, e.g. "Platinum 3". The UI prints `tierInfo(tierId).label`. */
  tierName: string;
  /** RR inside the current tier. */
  rankedRating: number;
  /** Continuous cross-tier score: 100 per tier, so `elo = (tierId - 3) * 100 + rankedRating`. */
  elo: number;
  /** RR won or lost on `matchId`. Meaningless on a snapshot. */
  lastChange: number;
  refundedRr: number;
  wasDerankProtected: boolean;
  /** The map's game path (`/Game/Maps/Ascent/Ascent`) or uuid; `resolveMap` accepts both. */
  mapId: string | null;
  mapName: string | null;
  createdOn: string;
  /** Emblem URLs on media.valorant-api.com, `null` for tiers without one. */
  smallIconUrl: string | null;
  largeIconUrl: string | null;
}

/**
 * A crew member as `GET /val/player` returns it (`PlayerDto` on the API). The DTO is shared with
 * League of Legends; only the identity and Valorant fields are declared here.
 */
export interface ValPlayerDto {
  id: number;
  nickname: string;
  fullName?: string | null;
  profilePictureUrl: string | null;
  riotGamesNickname: string | null;
  riotGamesTagLine: string | null;
  /** The Riot account's PUUID, shared with League of Legends; set once a Riot sync found the account. */
  riotGamesPUUID?: string | null;
  /** The main account's id for a smurf. See `isSmurf` for the values that do NOT mean "smurf". */
  primaryPlayerId?: number | null;
  archived?: boolean;
  inCrew?: boolean;
  valorantPuuid: string | null;
  valorantAccountLevel: number | null;
  valorantPlayerCardId: string | null;
  valorantPlayerCardSmallUrl: string | null;
  valorantPlayerCardWideUrl: string | null;
  valorantPlayerCardLargeUrl: string | null;
  valorantPlayerTitleId: string | null;
  /** "eu", "na", "ap", "kr", "latam", "br". */
  valorantRegion: string | null;
  valorantRefreshedOn: string | null;
  valorantPeakTierId: number | null;
  valorantPeakTierName: string | null;
  valorantPeakRr: number | null;
  valorantPeakSeasonShort: string | null;
  valorantPeakRankIconUrl: string | null;
  /** The most recent rank history entry, `null` before the first synchronisation. */
  valorantCurrentRank: ValRankHistoryDto | null;
  /**
   * Elo moved over the last 7 days (current minus 7 days ago). `null` when there is no ranked
   * snapshot both now and at least 7 days ago — not the same as 0.
   */
  rrChange7DaysValorant: number | null;
  /**
   * The latest ranked results, newest first (`true` = win): 5 on `GET /val/player`, 8 on
   * `GET /val/player/{id}`. Optional, like every field below: an API build older than the match
   * history (2026-10-29) does not send them, and the front degrades instead of failing.
   */
  recentFormValorant?: boolean[];
  /** The agent this account played the most over the last 30 days, customs and remakes left out. */
  mainAgentName?: string | null;
  mainAgentIconUrl?: string | null;
  /** The secondary accounts of a main. Only served by `GET /val/player/{id}`. */
  smurfAccounts?: ValPlayerDto[];
  /**
   * The performance recap over the requested filters. Only served by `GET /val/player/{id}`, and
   * `null` when the account has no counted game in them.
   */
  valorantPerformanceStats?: ValPerformanceStatsDto | null;
}

/** Same enum as the LoL rank history on the API. */
export type ValRankHistoryGranularity = 'Day' | 'Week' | 'Month';

/** The body of `PATCH /player/me` (`UpdatePlayerDto` on the API). The API binds it case-insensitively. */
export interface PlayerUpdateDto {
  fullName: string;
  nickname: string;
  riotGamesNickname?: string;
  riotGamesTagLine?: string;
}
