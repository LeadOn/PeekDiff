import type { H3Event } from 'h3'
import { deleteCookie, getCookie, setCookie } from 'h3'
import { SSO_PROBE_TTL_MS } from '#shared/utils/sso-probe'

/**
 * Session cookies.
 *
 * All are `httpOnly`, so no script on the page can read a token — including through an XSS. The
 * browser never handles credentials at all: `/api/gameon` reads these cookies server-side and
 * attaches the bearer itself, and the refresh token (the genuinely sensitive secret, valid for
 * weeks) never leaves the server.
 *
 * The `pd_` prefix is not cosmetic: cookies ignore ports, so in development PeekDiff and JungleDiff
 * (`jd_*`) share `localhost` and would overwrite each other's session under the same names.
 */
export const REFRESH_COOKIE = 'pd_rt'
export const ACCESS_COOKIE = 'pd_at'
export const ACCESS_EXPIRY_COOKIE = 'pd_at_exp'
export const ID_TOKEN_COOKIE = 'pd_idt'
export const PKCE_COOKIE = 'pd_pkce'
export const SSO_PROBE_COOKIE = 'pd_sso_probe'

/** 30 days: the "don't ask me to sign in again" session, notably on mobile. */
const REFRESH_MAX_AGE_S = 30 * 24 * 60 * 60

/**
 * The id token is only ever read by `/api/auth/logout` (as `id_token_hint`), so it is scoped to
 * `/api/auth` rather than riding along on every page and asset request.
 */
const ID_TOKEN_PATH = '/api/auth'

const isSecureRequest = (event: H3Event): boolean => {
  const proto = getRequestHeader(event, 'x-forwarded-proto')
  if (proto) return proto.split(',')[0]?.trim() === 'https'
  return getRequestURL(event).protocol === 'https:'
}

const baseCookieOptions = (event: H3Event) => ({
  httpOnly: true,
  // `lax` lets the Keycloak return redirect through (a top-level GET navigation) while still
  // withholding the cookie from cross-site requests triggered by a third party.
  sameSite: 'lax' as const,
  secure: isSecureRequest(event),
  path: '/'
})

export const setRefreshCookie = (event: H3Event, refreshToken: string): void => {
  setCookie(event, REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(event),
    maxAge: REFRESH_MAX_AGE_S
  })
}

export const setAccessCookie = (event: H3Event, accessToken: string, expiresAt: number): void => {
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  setCookie(event, ACCESS_COOKIE, accessToken, { ...baseCookieOptions(event), maxAge })
  setCookie(event, ACCESS_EXPIRY_COOKIE, String(expiresAt), { ...baseCookieOptions(event), maxAge })
}

export const setIdTokenCookie = (event: H3Event, idToken: string): void => {
  setCookie(event, ID_TOKEN_COOKIE, idToken, {
    ...baseCookieOptions(event),
    path: ID_TOKEN_PATH,
    maxAge: REFRESH_MAX_AGE_S
  })
}

export const getIdToken = (event: H3Event): string | undefined => getCookie(event, ID_TOKEN_COOKIE)

export const getRefreshToken = (event: H3Event): string | undefined => getCookie(event, REFRESH_COOKIE)

/** Returns the cookie-held access token while it is still valid, `undefined` otherwise. */
export const getValidAccessToken = (event: H3Event): string | undefined => {
  const token = getCookie(event, ACCESS_COOKIE)
  const expiresAt = Number(getCookie(event, ACCESS_EXPIRY_COOKIE) ?? 0)
  if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return undefined
  return token
}

export const getAccessTokenExpiry = (event: H3Event): number => {
  const expiresAt = Number(getCookie(event, ACCESS_EXPIRY_COOKIE) ?? 0)
  return Number.isFinite(expiresAt) ? expiresAt : 0
}

export const setPkceCookie = (event: H3Event, payload: string): void => {
  setCookie(event, PKCE_COOKIE, payload, { ...baseCookieOptions(event), maxAge: 600 })
}

export const takePkceCookie = (event: H3Event): string | undefined => {
  const value = getCookie(event, PKCE_COOKIE)
  deleteCookie(event, PKCE_COOKIE, baseCookieOptions(event))
  return value
}

/**
 * Records that a silent sign-in was attempted (or that the user signed out), so the client does not
 * send an anonymous visitor through Keycloak again on every page load. httpOnly like the rest: the
 * client learns the state from `GET /api/auth/session`.
 */
export const setSsoProbeCookie = (event: H3Event): void => {
  setCookie(event, SSO_PROBE_COOKIE, '1', { ...baseCookieOptions(event), maxAge: SSO_PROBE_TTL_MS / 1000 })
}

export const hasSsoProbeCookie = (event: H3Event): boolean => getCookie(event, SSO_PROBE_COOKIE) === '1'

export const clearSessionCookies = (event: H3Event): void => {
  const options = baseCookieOptions(event)
  deleteCookie(event, REFRESH_COOKIE, options)
  deleteCookie(event, ACCESS_COOKIE, options)
  deleteCookie(event, ACCESS_EXPIRY_COOKIE, options)
  deleteCookie(event, ID_TOKEN_COOKIE, { ...options, path: ID_TOKEN_PATH })
  deleteCookie(event, PKCE_COOKIE, options)
}
