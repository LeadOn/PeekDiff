import { BaseApiService, encodePathSegment as segment } from './BaseApiService'
import type { RequestOptions } from './BaseApiService'
import type { ValPlayerDto, ValRankHistoryDto, ValRankHistoryGranularity } from '../types'

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

  public getValPlayerById(id: string | number, signal?: AbortSignal) {
    return this.get<ValPlayerDto>(`/val/player/${segment(id)}`, GameOnClient.opts(signal))
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

  /** The signed-in user's GameOn account (`GET /player/me`), for the header and the "Vous" badges. */
  public getCurrentPlayer(signal?: AbortSignal) {
    return this.get<ValPlayerDto>('/player/me', GameOnClient.opts(signal))
  }
}
