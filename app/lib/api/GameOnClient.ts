import { BaseApiService, encodePathSegment as segment } from './BaseApiService'
import type { RequestOptions } from './BaseApiService'
import type { PlayerUpdateDto, ValGameDto, ValGameTimelineDto, ValListResultDto, ValPlayerDto, ValRankHistoryDto, ValRankHistoryGranularity, ValStatsPeriod } from '../types'

/** Filters of the profile's performance recap and match history. `queues` are API queue ids. */
export interface ValPlayerFilters {
  period?: ValStatsPeriod
  queues?: string[]
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
   * One account with its performance recap (`valorantPerformanceStats`) over `period` and `queues`,
   * its smurfs and its main agent. Unknown ids answer 404.
   */
  public getValPlayerById(id: string | number, filters: ValPlayerFilters = {}, signal?: AbortSignal) {
    const params = new URLSearchParams()
    if (filters.period) params.set('period', filters.period)
    if (filters.queues?.length) params.set('queues', filters.queues.join(','))
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
   * A player's games, newest first, each with its ten participants. 404 when the account has no
   * Valorant PUUID. The first call for an account with no stored game synchronises its last 10 games
   * from HenrikDev before answering, so it can be slow.
   */
  public getValPlayerMatches(id: string | number, options: { page?: number, size?: number, queues?: string[] } = {}, signal?: AbortSignal) {
    const params = new URLSearchParams()
    params.set('page', String(options.page ?? 1))
    params.set('size', String(options.size ?? 10))
    if (options.queues?.length) params.set('queues', options.queues.join(','))
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

  /** One game with its teams and ten participants (stats included). Unknown ids answer 404. */
  public getValMatch(matchId: string, signal?: AbortSignal) {
    return this.get<ValGameDto>(`/val/match/${segment(matchId)}`, GameOnClient.opts(signal))
  }

  /** A game's rounds and kills, in order. Unknown ids answer 404. */
  public getValMatchTimeline(matchId: string, signal?: AbortSignal) {
    return this.get<ValGameTimelineDto>(`/val/match/${segment(matchId)}/rounds`, GameOnClient.opts(signal))
  }

  /** The signed-in user's GameOn account (`GET /player/me`), for the header and the "Vous" badges. */
  public getCurrentPlayer(signal?: AbortSignal) {
    return this.get<ValPlayerDto>('/player/me', GameOnClient.opts(signal))
  }

  /** Updates the signed-in user's identity and Riot ID (`PATCH /player/me`). */
  public updateCurrentPlayer(data: PlayerUpdateDto, signal?: AbortSignal) {
    return this.patch<ValPlayerDto>('/player/me', data, GameOnClient.opts(signal))
  }
}
