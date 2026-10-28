import type { H3Event } from 'h3'
import { expiresAtFrom, refreshTokens } from './oidc'
import { clearSessionCookies, getRefreshToken, getValidAccessToken, setAccessCookie, setRefreshCookie } from './session'

/**
 * Returns a valid access token for the current request, or `null` when the user has no usable
 * session. Transparently refreshes when the cookie-held token has expired.
 *
 * Used both by `/api/auth/session` (to report the state to the client) and by the `/api/gameon`
 * proxy (to authenticate the outgoing call).
 */
export const resolveAccessToken = async (event: H3Event): Promise<string | null> => {
  const cached = getValidAccessToken(event)
  if (cached) return cached

  const refreshToken = getRefreshToken(event)
  if (!refreshToken) return null

  try {
    const tokens = await refreshTokens(refreshToken)
    // Keycloak may rotate refresh tokens, so always persist the one it returns — otherwise
    // rotation would invalidate the session on the next cycle.
    if (tokens.refresh_token) setRefreshCookie(event, tokens.refresh_token)
    setAccessCookie(event, tokens.access_token, expiresAtFrom(tokens))
    return tokens.access_token
  } catch (error) {
    // Refresh token revoked or expired: clear the session so we don't retry on every request.
    console.warn('[auth] Token refresh failed, session cleared:', error)
    clearSessionCookies(event)
    return null
  }
}
