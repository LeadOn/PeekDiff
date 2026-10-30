import { BaseApiService, encodePathSegment as segment } from './BaseApiService'
import type { RequestOptions } from './BaseApiService'
import type { LinkSmurfAccountResultDto, PlayerAccountDto, PlayerUpdateDto, SetCrewMembershipResultDto, ValGameDto, ValGameTimelineDto, ValGlobalStatsDto, ValHomeStatsDto, ValHomeWindow, ValListResultDto, ValPlayerDto, ValRankHistoryDto, ValRankHistoryGranularity, ValStatsPeriod } from '../types'

/**
 * Filters of the profile's performance recap and match history. `queues` are API queue ids;
 * `agentName` is the agent's English name as the API stores it ("Jett", "KAY/O").
 */
export interface ValPlayerFilters {
  period?: ValStatsPeriod
  queues?: string[]
  agentName?: string
}

/**
 * GameOn API client.
 *
 * It never targets the API directly but the Nitro proxy at `/api/gameon`, which sets the
 * `Authorization` header from the httpOnly session cookies. No token therefore passes through
 * browser code, and there is no auth header to manage here.
 *
 * Every method accepts an `AbortSignal`: callers are expected to pass one so the request is
 * cancelled when the component unmounts or a filter changes.
 */
export class GameOnClient extends BaseApiService {
  private static opts(signal?: AbortSignal): RequestOptions {
    return signal ? { signal } : {}
  }

  /**
   * The crew with each member's current rank, peak and 7-day RR move. `includeOutOfCrew=false` is
   * pinned even though it is the API's default today: every consumer assumes crew membership. Smurfs
   * are NOT filtered here (`includeSmurfs` defaults to `true`): the ladder hides them with a view
   * filter of its own and still needs them to resolve a smurf's main.
   */
  public getValPlayers(archived: boolean = false, signal?: AbortSignal) {
    return this.get<ValPlayerDto[]>(`/val/player?archived=${archived}&includeOutOfCrew=false`, GameOnClient.opts(signal))
  }

  /**
   * One account with its performance recap (`valorantPerformanceStats`) over `period`, `queues` and
   * `agentName`, its smurfs and its main agent. Unknown ids answer 404.
   */
  public getValPlayerById(id: string | number, filters: ValPlayerFilters = {}, signal?: AbortSignal) {
    const params = new URLSearchParams()
    if (filters.period) params.set('period', filters.period)
    if (filters.queues?.length) params.set('queues', filters.queues.join(','))
    if (filters.agentName) params.set('agentName', filters.agentName)
    const query = params.toString()
    return this.get<ValPlayerDto>(`/val/player/${segment(id)}${query ? `?${query}` : ''}`, GameOnClient.opts(signal))
  }

  /**
   * Re-synchronises an account with Riot (profile, rank and its last 10 games) and returns it. Slow:
   * the API calls HenrikDev. The response carries no performance recap; re-read the profile after.
   */
  public refreshValPlayer(id: string | number, signal?: AbortSignal) {
    return this.patch<ValPlayerDto>(`/val/player/${segment(id)}`, null, GameOnClient.opts(signal))
  }

  /**
   * A player's games, newest first, each with its ten participants; with `agentName`, only those where
   * the player played that agent. 404 when the account has no
   * Valorant PUUID. The first call for an account with no stored game synchronises its last 10 games
   * from HenrikDev before answering, so it can be slow.
   */
  public getValPlayerMatches(id: string | number, options: { page?: number, size?: number, queues?: string[], agentName?: string } = {}, signal?: AbortSignal) {
    const params = new URLSearchParams()
    params.set('page', String(options.page ?? 1))
    params.set('size', String(options.size ?? 10))
    if (options.queues?.length) params.set('queues', options.queues.join(','))
    if (options.agentName) params.set('agentName', options.agentName)
    return this.get<ValListResultDto<ValGameDto>>(`/val/match/player/${segment(id)}?${params.toString()}`, GameOnClient.opts(signal))
  }

  /**
   * Rank history, oldest first. Without `granularity`, the last `limit` raw entries (API default
   * 50). With one, one entry per bucket over `days`, gaps filled with the last known rank.
   */
  public getValRankHistory(id: string | number, options: { granularity?: ValRankHistoryGranularity, days?: number, limit?: number } = {}, signal?: AbortSignal) {
    const params = new URLSearchParams()
    if (options.granularity) params.set('granularity', options.granularity)
    if (options.days !== undefined) params.set('days', String(options.days))
    if (options.limit !== undefined) params.set('limit', String(options.limit))
    const query = params.toString()
    return this.get<ValRankHistoryDto[]>(`/val/player/${segment(id)}/rank${query ? `?${query}` : ''}`, GameOnClient.opts(signal))
  }

  /**
   * The home recap: the crew's competitive activity over `window` against the week before, the player
   * of the week, and the crew records of the last 30 days. Crew only, like `getValPlayers`.
   */
  public getValHome(includeSmurfs: boolean, window: ValHomeWindow = 'Last7Days', signal?: AbortSignal) {
    return this.get<ValHomeStatsDto>(`/val/home?includeSmurfs=${includeSmurfs}&includeOutOfCrew=false&window=${window}`, GameOnClient.opts(signal))
  }

  /**
   * The crew's awards and most played agents and maps over `period`: competitive only when
   * `rankedOnly`, every counted mode otherwise. Crew only, like `getValPlayers`; excluded smurfs are
   * dropped, not merged into their main.
   */
  public getValGlobalStats(filters: { period: ValStatsPeriod, rankedOnly: boolean, includeSmurfs: boolean }, signal?: AbortSignal) {
    const params = new URLSearchParams({
      period: filters.period,
      rankedOnly: String(filters.rankedOnly),
      includeSmurfs: String(filters.includeSmurfs),
      includeOutOfCrew: 'false',
    })
    return this.get<ValGlobalStatsDto>(`/val/stats/global?${params.toString()}`, GameOnClient.opts(signal))
  }

  /** The crew's latest games, newest first, each with its ten participants. */
  public getValLastMatches(options: { size?: number, includeSmurfs?: boolean } = {}, signal?: AbortSignal) {
    const params = new URLSearchParams({
      page: '1',
      size: String(options.size ?? 10),
      includeSmurfs: String(options.includeSmurfs ?? true),
      includeOutOfCrew: 'false',
    })
    return this.get<ValListResultDto<ValGameDto>>(`/val/match/last?${params.toString()}`, GameOnClient.opts(signal))
  }

  /** One game with its teams and ten participants (stats included). Unknown ids answer 404. */
  public getValMatch(matchId: string, signal?: AbortSignal) {
    return this.get<ValGameDto>(`/val/match/${segment(matchId)}`, GameOnClient.opts(signal))
  }

  /** A game's rounds and kills, in order. Unknown ids answer 404. */
  public getValMatchTimeline(matchId: string, signal?: AbortSignal) {
    return this.get<ValGameTimelineDto>(`/val/match/${segment(matchId)}/rounds`, GameOnClient.opts(signal))
  }

  // --- Admin space. Routes marked `gameon_admin` are refused upstream to anyone else; the others are
  // anonymous on the API and merely called from the admin UI. ---

  /**
   * Every GameOn account of one `archived` value: crew or not, smurfs included, and — unlike
   * `GET /val/player` — accounts without a Riot ID too, the ones an admin most needs to see.
   */
  public getPlayerAccounts(archived: boolean, signal?: AbortSignal) {
    return this.get<PlayerAccountDto[]>(`/player?archived=${archived}`, GameOnClient.opts(signal))
  }

  /** The Valorant side of every account with a Riot ID, crew or not, smurfs included: ranks and cards. */
  public getValAccounts(archived: boolean, signal?: AbortSignal) {
    return this.get<ValPlayerDto[]>(`/val/player?archived=${archived}&includeOutOfCrew=true&includeSmurfs=true`, GameOnClient.opts(signal))
  }

  /** Re-reads every crew member's profile and rank from Riot. Slow; answers `204`. */
  public async refreshAllValRanks(signal?: AbortSignal): Promise<void> {
    await this.patch<unknown>('/val/player/ranks', null, GameOnClient.opts(signal))
  }

  /**
   * Points an account at another Riot ID, then re-synchronises it. `gameon_admin`. `409` when another
   * account already uses that Riot ID, and nothing is saved.
   */
  public updateValRiotId(playerId: number, gameName: string, tagLine: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ riotGamesNickname: gameName, riotGamesTagLine: tagLine })
    return this.patch<ValPlayerDto>(`/val/player/${segment(playerId)}/admin?${params.toString()}`, null, GameOnClient.opts(signal))
  }

  /**
   * Moves an account in or out of the crew. `gameon_admin`; `404` for an unknown account. The flag is
   * the account's, shared with League of Legends: JungleDiff sees the change too. A main leaving takes
   * its smurfs with it; coming back does not bring them back.
   */
  public setValCrewMembership(playerId: number, inCrew: boolean, signal?: AbortSignal) {
    return this.patch<SetCrewMembershipResultDto>(`/val/player/${segment(playerId)}/crew?inCrew=${inCrew}`, null, GameOnClient.opts(signal))
  }

  /**
   * Archives or restores an account, for every game. `gameon_admin`; `404` for an unknown account.
   * Never `PATCH /player` for this: that route also rewrites `keycloakId` with whatever it is sent.
   */
  public setPlayerArchived(playerId: number, archived: boolean, signal?: AbortSignal) {
    return this.patch<PlayerAccountDto>(`/player/${segment(playerId)}/archived?archived=${archived}`, null, GameOnClient.opts(signal))
  }

  /**
   * Attaches a Riot account to a main as its smurf (shared with League of Legends). `gameon_admin`. An
   * unknown account is created outside the crew, the stored games it played are re-attached, then it
   * is synchronised from HenrikDev — up to a minute on a busy quota. `404`: main or Riot account
   * unknown. `409`: the main is itself a smurf, or the account belongs to someone else.
   */
  public linkValSmurf(mainPlayerId: number, gameName: string, tagLine: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ riotGamesNickname: gameName, riotGamesTagLine: tagLine })
    return this.post<LinkSmurfAccountResultDto>(`/val/player/${segment(mainPlayerId)}/smurfs?${params.toString()}`, null, GameOnClient.opts(signal))
  }

  /** Detaches a smurf from its main; the account and its history stay. `gameon_admin`; `404` if unknown. */
  public unlinkValSmurf(smurfId: number, signal?: AbortSignal) {
    return this.delete<PlayerAccountDto>(`/val/player/smurfs/${segment(smurfId)}`, GameOnClient.opts(signal))
  }

  /**
   * Fetches a game from HenrikDev and stores it (or refreshes it). `404` when HenrikDev does not know
   * it. Without `region`, the API uses the stored one, else "eu".
   */
  public importValMatch(matchId: string, region?: string, signal?: AbortSignal) {
    const query = region ? `?region=${encodeURIComponent(region)}` : ''
    return this.post<ValGameDto>(`/val/match/${segment(matchId)}/update${query}`, null, GameOnClient.opts(signal))
  }

  /** The signed-in user's GameOn account (`GET /player/me`), for the header and the "Vous" badges. */
  public getCurrentPlayer(signal?: AbortSignal) {
    return this.get<ValPlayerDto>('/player/me', GameOnClient.opts(signal))
  }

  /**
   * Updates the signed-in user's identity and Riot ID (`PATCH /player/me`). `409` when another account
   * already uses that Riot ID, and then nothing is saved, names included.
   */
  public updateCurrentPlayer(data: PlayerUpdateDto, signal?: AbortSignal) {
    return this.patch<ValPlayerDto>('/player/me', data, GameOnClient.opts(signal))
  }
}
