import { AppError } from '../types/error'

/**
 * Past this point we treat the upstream as lost rather than holding the request open forever.
 *
 * Deliberately generous: the GameOn API is slow on some aggregates and is expected to stay that way
 * (JungleDiff measured 65-73 s on its slowest LoL aggregate). A tight ceiling aborts mid-flight and
 * reports "API injoignable" for an API that is merely answering slowly. This ceiling only bounds a genuinely dead upstream, so it must stay in step with
 * `UPSTREAM_TIMEOUT_MS` in `server/api/gameon/[...path].ts`: lowering one alone reintroduces the bug.
 */
const DEFAULT_TIMEOUT_MS = 120000

/** Statuses where another attempt has a chance of succeeding (transient unavailability). */
const RETRYABLE_STATUS = [408, 425, 429, 500, 502, 503, 504]

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Per-call options callers may set.
 *
 * Deliberately narrower than ofetch's `FetchOptions`: the global `$fetch` is Nitro's on the server
 * and its `method` is a string-literal union, which a loosely typed `FetchOptions` does not satisfy.
 * Exposing only what we actually use keeps both sides type-safe without casts.
 */
export interface RequestOptions {
  signal?: AbortSignal
  /** Overrides the per-verb default (1 for reads, 0 for writes). */
  retry?: number
  headers?: Record<string, string>
  /**
   * Overrides `DEFAULT_TIMEOUT_MS`. Nothing needs it today: the default is now wide enough for the
   * slowest aggregate the API serves. Useful mainly to *shorten* the ceiling on a call that must
   * fail fast; raising it above the default also needs the proxy widened, or the call is cut there.
   */
  timeout?: number
}

interface FetchErrorShape {
  status?: number
  statusCode?: number
  message?: string
  data?: { message?: string; title?: string }
}

/**
 * Encodes a segment destined for a URL path.
 *
 * Identifiers come from route params, so ultimately from the user: without encoding, a `%2F..%2F`
 * in the page URL would escape the intended path and call a different endpoint than the one we
 * believe we are calling.
 */
export const encodePathSegment = (value: string | number): string => encodeURIComponent(String(value))

export class BaseApiService {
  protected readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  private async request<T>(
    endpoint: string,
    method: HttpMethod,
    body: unknown,
    options: RequestOptions,
    defaultRetry: number
  ): Promise<T> {
    try {
      // The global `$fetch` (auto-imported by Nuxt), not ofetch's: on the server this is Nitro's,
      // which resolves a relative path such as `/api/gameon/...` into an internal call without
      // going back out over the network.
      const response = await $fetch<T>(`${this.baseUrl}${endpoint}`, {
        method,
        body: body as BodyInit | Record<string, unknown> | undefined,
        signal: options.signal,
        headers: options.headers,
        // Without an explicit timeout, a request to a silent upstream hangs indefinitely: on SSR
        // that ties up a Nitro worker, on the client it freezes a loading screen forever.
        timeout: options.timeout ?? DEFAULT_TIMEOUT_MS,
        retry: options.retry ?? defaultRetry,
        retryDelay: 300,
        retryStatusCodes: RETRYABLE_STATUS
      })

      // Nitro's `$fetch` widens the result to `TypedInternalResponse`, because it also infers the
      // return type of internal routes from their handler. Our endpoints are described by the
      // caller's `T`, so narrow back to it.
      return response as T
    } catch (error: unknown) {
      throw BaseApiService.toAppError(error)
    }
  }

  /**
   * Normalizes any network failure into an `AppError`.
   *
   * Detection is shape-based rather than `instanceof FetchError`: depending on whether the call
   * originates from Nitro's `$fetch` or the client's, the error may come from two distinct ofetch
   * instances, and a class identity check would silently fail.
   */
  private static toAppError(error: unknown): AppError {
    if (error instanceof AppError) return error

    // A cancellation is not a failure: flag it so callers can ignore it without surfacing an error.
    if (error instanceof Error && error.name === 'AbortError') {
      return new AppError('Request aborted', 0, undefined, true)
    }

    const candidate = error as FetchErrorShape | null
    const statusCode = candidate?.status ?? candidate?.statusCode ?? 0

    // `statusCode === 0` means the request never completed (timeout, DNS, connection refused). The
    // UI must not say "not found" when the server simply did not answer.
    const message = candidate?.data?.message
      || candidate?.data?.title
      || (statusCode === 0 ? "Le service n'a pas répondu" : candidate?.message)
      || 'API Request Failed'

    return new AppError(message, statusCode, candidate?.data)
  }

  // A read is idempotent: retrying once absorbs an API restart.
  public get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, 'GET', undefined, options, 1)
  }

  // Writes are never retried by default: a duplicated POST creates a duplicate record.
  public post<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, 'POST', data, options, 0)
  }

  public put<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, 'PUT', data, options, 0)
  }

  public patch<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, 'PATCH', data, options, 0)
  }

  // The proxy only lets a DELETE through on the routes it allowlists for it (see `DELETE_PATHS`).
  public delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, 'DELETE', undefined, options, 0)
  }
}
