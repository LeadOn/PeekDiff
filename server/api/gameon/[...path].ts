import { Buffer } from 'node:buffer'
import { createError, defineEventHandler, getRequestHeader, readRawBody, setResponseHeader, setResponseStatus } from 'h3'
import { resolveAccessToken } from '../../utils/access-token'

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Routes a DELETE may reach, allowlisted by exact shape rather than opened on every prefix, so a
 * script injected into the page cannot use the session to delete anything the API would let a
 * DELETE reach. Every other DELETE is a `405`. Only the admin space deletes: unlinking a smurf
 * (`gameon_admin` upstream; the account and its history stay).
 */
const DELETE_PATHS: RegExp[] = [/^val\/player\/smurfs\/\d+$/i]

/**
 * GameOn API prefixes the front end is allowed to reach. The proxy runs with the user's token, so
 * without this list an XSS could use it to reach any controller on the API (FIFA, tournaments,
 * administration, League of Legends) without ever seeing the token itself.
 */
const ALLOWED_PREFIXES = ['val/', 'player/']

/**
 * Ceiling for a single upstream call. Wide on purpose: the GameOn API is slow on its aggregates and
 * is expected to stay that way (JungleDiff measured 65-73 s on its slowest LoL aggregate). A tight
 * ceiling aborts calls the API was about to answer and reports them as `502 unreachable`.
 *
 * Must stay in step with `DEFAULT_TIMEOUT_MS` in `app/lib/api/BaseApiService.ts`: whichever of the
 * two is lower is the one that actually cuts the call.
 */
const UPSTREAM_TIMEOUT_MS = 120000

/** Tells ofetch's own timeout apart from a genuinely unreachable upstream (see the `.catch` below). */
function isTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const cause = error.cause
  if (cause instanceof Error && (cause.name === 'TimeoutError' || cause.name === 'AbortError')) return true
  return error.name === 'TimeoutError' || error.name === 'AbortError'
}

/**
 * Authenticating proxy to the GameOn API.
 *
 * The browser calls `/api/gameon/...` and never handles a token; Nitro reads the httpOnly session
 * cookies and sets `Authorization` on the outgoing call. Direct consequence: a script injected into
 * the page can no longer exfiltrate any reusable credential.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const baseUrl = (config.gameOnApiUrl || config.public.gameOnApiUrl).replace(/\/$/, '')
  if (!baseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'GameOn API URL is not configured' })
  }

  const method = event.method.toUpperCase()
  if (!ALLOWED_METHODS.has(method)) {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const segments = event.context.params?.path
  const rawPath = Array.isArray(segments) ? segments.join('/') : (segments ?? '')

  // `..` and `//` are rejected rather than normalized: a path that walks upwards has no legitimate
  // reason to exist here, and refusing it outright beats guessing at the intent.
  if (!rawPath || rawPath.includes('..') || rawPath.includes('//')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid upstream path' })
  }

  const path = rawPath.split('/').map(encodeURIComponent).join('/')
  if (!ALLOWED_PREFIXES.some(prefix => `${path}/`.toLowerCase().startsWith(prefix))) {
    throw createError({ statusCode: 403, statusMessage: 'Upstream path not allowed' })
  }

  if (method === 'DELETE' && !DELETE_PATHS.some(pattern => pattern.test(path))) {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  const url = new URL(`${baseUrl}/${path}`)
  const incomingUrl = getRequestURL(event)
  incomingUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value))

  // Headers are built explicitly: nothing from the incoming request is forwarded by default, and
  // in particular not the session `Cookie`, which has no business reaching the GameOn API.
  const headers: Record<string, string> = { accept: 'application/json' }
  const accessToken = await resolveAccessToken(event)
  if (accessToken) headers.authorization = `Bearer ${accessToken}`

  const contentType = getRequestHeader(event, 'content-type')
  if (contentType) headers['content-type'] = contentType

  const body = method === 'GET' ? undefined : await readRawBody(event, false)

  const response = await $fetch.raw<ArrayBuffer>(url.toString(), {
    method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    headers,
    body,
    responseType: 'arrayBuffer',
    timeout: UPSTREAM_TIMEOUT_MS,
    // One retry, and only on reads: replaying a write would duplicate a side effect.
    retry: method === 'GET' ? 1 : 0,
    retryDelay: 300,
    retryStatusCodes: [408, 425, 429, 500, 502, 503, 504],
    // Relay the upstream status as-is instead of turning every 404 into a 500.
    ignoreResponseError: true
  }).catch((error: unknown) => {
    // Timeout, DNS, connection refused: the API did not answer, which is not the client's fault.
    // A timeout is reported separately from a dead upstream: at this ceiling it means the API spent
    // over two minutes on the query, not that it is down, and the two send you looking in different
    // places. ofetch surfaces its own timeout as a `FetchError` wrapping a `TimeoutError` cause, so
    // the name has to be read off `cause` — the outer error is always named `FetchError`.
    const timedOut = isTimeout(error)
    console.error(`[gameon-proxy] ${method} ${path} ${timedOut ? `timed out after ${UPSTREAM_TIMEOUT_MS}ms` : 'unreachable'}:`, error)
    throw createError({
      statusCode: timedOut ? 504 : 502,
      statusMessage: timedOut ? 'GameOn API timed out' : 'GameOn API unreachable'
    })
  })

  setResponseStatus(event, response.status)
  const upstreamContentType = response.headers.get('content-type')
  if (upstreamContentType) setResponseHeader(event, 'content-type', upstreamContentType)
  setResponseHeader(event, 'cache-control', 'no-store')

  return response._data ? Buffer.from(response._data) : null
})
