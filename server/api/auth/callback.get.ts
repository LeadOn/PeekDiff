import { defineEventHandler, getQuery, sendRedirect } from 'h3'
import { exchangeCode, expiresAtFrom } from '../../utils/oidc'
import { clearSessionCookies, setAccessCookie, setRefreshCookie, takePkceCookie } from '../../utils/session'
import { safeInternalPath } from '../../utils/redirect-target'

interface PkcePayload {
  codeVerifier: string
  state: string
  redirectTo: string
}

const parsePkce = (raw: string | undefined): PkcePayload | null => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<PkcePayload>
    if (typeof parsed.codeVerifier !== 'string' || typeof parsed.state !== 'string') return null
    return {
      codeVerifier: parsed.codeVerifier,
      state: parsed.state,
      redirectTo: safeInternalPath(parsed.redirectTo)
    }
  } catch {
    return null
  }
}

/**
 * Keycloak return leg: exchanges the code for tokens, which are stored in httpOnly cookies.
 *
 * Failures always send the user back to the home page with a coarse `?auth_error=` code and no
 * detail: raw OIDC error messages tell an attacker about the realm configuration.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const pkce = parsePkce(takePkceCookie(event))
  const failure = (reason: string) => sendRedirect(event, `/?auth_error=${reason}`, 302)

  if (typeof query.error === 'string') {
    console.error('[auth] Keycloak denied the authorization request:', query.error)
    return failure('denied')
  }

  if (!pkce) return failure('expired')

  // CSRF protection for the flow: the `state` Keycloak echoes back must match the one we issued,
  // otherwise a third party could make us consume their own authorization code.
  if (typeof query.state !== 'string' || query.state !== pkce.state) {
    console.error('[auth] Invalid OIDC state, aborting the exchange')
    return failure('state')
  }

  if (typeof query.code !== 'string') return failure('nocode')

  try {
    const redirectUri = new URL('/api/auth/callback', getRequestURL(event)).toString()
    const tokens = await exchangeCode(query.code, redirectUri, pkce.codeVerifier)

    if (tokens.refresh_token) setRefreshCookie(event, tokens.refresh_token)
    setAccessCookie(event, tokens.access_token, expiresAtFrom(tokens))

    return sendRedirect(event, pkce.redirectTo, 302)
  } catch (error) {
    console.error('[auth] Authorization code exchange failed:', error)
    clearSessionCookies(event)
    return failure('exchange')
  }
})
