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
  /**
   * RR Riot *announced* for `matchId`, not the RR applied: a loss absorbed at 0 RR is announced −22 for a
   * real −4, a promotion announced +16 brings +22. Print `rrMove(entry)` (`rrDelta ?? lastChange`).
   * Meaningless on a snapshot.
   */
  lastChange: number;
  /** RR actually won or lost, `null` when unknown (older API, standalone snapshot). */
  rrDelta?: number | null;
  refundedRr: number;
  wasDerankProtected: boolean;
  /** The map's game path (`/Game/Maps/Ascent/Ascent`) or uuid; `resolveMap` accepts both. */
  mapId: string | null;
  mapName: string | null;
  createdOn: string;
  /**
   * Whether `matchId` is a game stored in the database, so its match page opens: the MMR history also
   * knows ranked games that were never imported. Only `GET /val/player/{id}/rank` fills it (on a
   * bucketed read, for the bucket's last entry, the one returned); `false` everywhere else, and absent
   * from an API build older than 2026-10-30.
   */
  matchStored?: boolean;
  /** Emblem URLs on media.valorant-api.com, `null` for tiers without one. */
  smallIconUrl: string | null;
  largeIconUrl: string | null;
  // Optional below: added by the API on 2026-11 (`features/valorant/full-data`), absent before.
  queueId?: string | null;
  matchLengthMs?: number | null;
  /** The tier before the game, to tell a promotion or a demotion. */
  tierBeforeId?: number | null;
  tierBeforeName?: string | null;
  rrBeforeUpdate?: number | null;
  /** RR added for a good performance, part of `rrDelta`. */
  rrPerformanceBonus?: number | null;
  /** RR gain factor of an unbalanced party, e.g. 0.25. */
  rrPenalty?: number | null;
  afkPenalty?: number | null;
  newMapIncentiveRrForgiven?: number | null;
  isPlacementMatch?: boolean | null;
  wasDerankProtectionReplenished?: boolean | null;
}

/** One entry of `recentResultsValorant`. */
export type ValRecentResult = 'Win' | 'Loss' | 'Draw';

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
  /**
   * The same results as `recentFormValorant`, in the same order, but able to tell a draw apart:
   * `false` above is a loss or a draw. Sent by API builds after 2026-11-09; read it first.
   */
  recentResultsValorant?: ValRecentResult[];
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
  // Optional and nullable below: added by the API on 2026-11 (`features/valorant/full-data`). `null`
  // means unknown, never 0.
  /** Derank protection shields left. */
  valorantRankProtectionShields?: number | null;
  /** "Empty", "Full"… */
  valorantRankProtectionStatus?: string | null;
  /** True on a tier where a loss cannot demote (the shields are in play). */
  valorantIsAtRankProtectedTier?: boolean | null;
  valorantGamesNeededForRating?: number | null;
  valorantGamesNeededForLeaderboard?: number | null;
  valorantLeaderboardRank?: number | null;
  valorantLeaderboardUpdatedOn?: string | null;
  valorantIsActRankBadgeHidden?: boolean | null;
  valorantIsLeaderboardAnonymized?: boolean | null;
  /** "base" or "ascendant": the tier table of the peak. */
  valorantPeakRankingSchema?: string | null;
  /** Raw JSON, `{"DIAMOND":{"count":6}}`: read it with `parsePrestige`. */
  valorantLifetimePrestigeJson?: string | null;
  /** Read the team with `GET /val/premier/{id}`. */
  valorantPremierTeamId?: string | null;
  /** "OWNER", "MEMBER"… */
  valorantPremierRole?: string | null;
  valorantPremierJoinedOn?: string | null;
  /** When accolades, mastery and Premier were last read (once a day). */
  valorantExtrasRefreshedOn?: string | null;
}

/** `GET /val/player/{id}/seasons`: one act's end result (`ValorantSeasonResult`), oldest act first. */
export interface ValSeasonResultDto {
  id: number;
  playerId: number;
  seasonId: string;
  /** "e11a6". */
  seasonShort: string | null;
  /** The act rank badge: the best rank of the act's top wins. */
  actRankTierId: number | null;
  actRankTierName: string | null;
  actRankIconUrl: string | null;
  /** The rank the act ended on. */
  endTierId: number | null;
  endTierName: string | null;
  endRr: number;
  games: number;
  wins: number;
  winsWithPlacements: number;
  gamesNeededForRating: number;
  leaderboardRank: number | null;
  rankingSchema: string | null;
  /** Raw JSON array of tier ids, the triangle of the act badge: read it with `parseActWins`. */
  actWinsJson: string | null;
  prestigeJson: string | null;
  refreshedOn: string | null;
}

/** `GET /val/player/{id}/mastery`: one agent's mastery, highest level first. */
export interface ValAgentMasteryDto {
  agentId: string;
  agentName: string | null;
  agentIconUrl: string | null;
  /** `null` for an agent never levelled. */
  level: number | null;
  tracksJson: string | null;
  flourishShortLevel: number | null;
  flourishLongLevel: number | null;
  hypeId: string | null;
  backgroundId: string | null;
  clipId: string | null;
  borderId: string | null;
  refreshedOn: string | null;
}

/**
 * `GET /val/player/{id}/accolades`: one kind of end-of-game star. Rows without `seasonId` (all-time)
 * come first, then one set per act.
 */
export interface ValAccoladeSummaryDto {
  seasonId: string | null;
  seasonShort: string | null;
  accoladeId: string;
  /** "kills", "first_blood", "clutches"… worded by `accoladeLabel`. */
  type: string;
  count: number;
  bestValue: number;
  refreshedOn: string | null;
}

/** `GET /val/premier/{teamId}`: a Premier team. 404 when unknown. */
export interface ValPremierTeamDto {
  id: string;
  name: string | null;
  tag: string | null;
  iconId: string | null;
  /** The team icon, already coloured. */
  imageUrl: string | null;
  /** Hexadecimal without `#`. */
  primaryColor: string | null;
  secondaryColor: string | null;
  tertiaryColor: string | null;
  createdOn: string | null;
  currentSeasonId: string | null;
  currentSeasonName: string | null;
  enrolled: boolean | null;
  conference: string | null;
  division: number | null;
  points: number | null;
  wins: number | null;
  losses: number | null;
  roundsWon: number | null;
  roundsLost: number | null;
  membersJson: string | null;
  seasonsJson: string | null;
  refreshedOn: string | null;
}

/**
 * A GameOn account as `GET /player` returns it: the raw entity, every account of one `archived` value
 * (crew or not, smurfs included, with or without a Riot ID). Only the fields the admin space reads.
 */
export interface PlayerAccountDto {
  id: number;
  nickname: string;
  fullName: string | null;
  riotGamesNickname: string | null;
  riotGamesTagLine: string | null;
  riotGamesPUUID: string | null;
  valorantPuuid: string | null;
  valorantRefreshedOn: string | null;
  inCrew: boolean;
  primaryPlayerId: number | null;
  archived: boolean;
}

/**
 * `PATCH /val/player/{id}/crew` (`gameon_admin`). Crew membership is one flag of the account, shared
 * with League of Legends.
 */
export interface SetCrewMembershipResultDto {
  account: PlayerAccountDto;
  /**
   * Smurfs taken out of the crew along with their main. Only ever non-zero when a main leaves: putting
   * it back does not bring its smurfs back.
   */
  affectedSmurfAccounts: number;
}

/**
 * `POST /val/player/{id}/smurfs` (`gameon_admin`), on success. Refusals answer 404 / 409 with a plain
 * English sentence instead (see `linkSmurfErrorMessage`).
 */
export interface LinkSmurfAccountResultDto {
  status: 'Linked';
  smurfAccount: PlayerAccountDto;
  /** Stored game participations that had no player yet and now belong to the smurf. */
  backfilledParticipations: number;
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
