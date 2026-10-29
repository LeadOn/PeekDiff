import { defineEventHandler, getQuery, sendRedirect } from 'h3'
import { exchangeCode, expiresAtFrom } from '../../utils/oidc'
import {
  clearSessionCookies,
  setAccessCookie,
  setIdTokenCookie,
  setRefreshCookie,
  setSsoProbeCookie,
  takePkceCookie
} from '../../utils/session'
import { safeInternalPath } from '../../utils/redirect-target'

interface PkcePayload {
  codeVerifier: string
  state: string
  redirectTo: string
  silent: boolean
}

const parsePkce = (raw: string | undefined): PkcePayload | null => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<PkcePayload>
    if (typeof parsed.codeVerifier !== 'string' || typeof parsed.state !== 'string') return null
    return {
      codeVerifier: parsed.codeVerifier,
      state: parsed.state,
      redirectTo: safeInternalPath(parsed.redirectTo),
      silent: parsed.silent === true
    }
  } catch {
    return null
  }
}

/** What Keycloak answers a `prompt=none` request when it cannot sign the user in without them. */
const SILENT_REFUSALS = new Set(['login_required', 'consent_required', 'interaction_required'])

/**
 * Keycloak return leg: exchanges the code for tokens, which are stored in httpOnly cookies.
 *
 * Failures of an interactive sign-in send the user back to the home page with a coarse
 * `?auth_error=` code and no detail: raw OIDC error messages tell an attacker about the realm
 * configuration.
 *
 * A silent sign-in (`prompt=none`, see `login.get.ts`) never reports an error: the visitor did not
 * ask to sign in, so whatever happens they land back on the page they were reading, anonymous, with
 * the probe marker set so the client does not try again right away.
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const pkce = parsePkce(takePkceCookie(event))
  const failure = (reason: string) => {
    if (pkce?.silent) {
      setSsoProbeCookie(event)
      return sendRedirect(event, pkce.redirectTo, 302)
    }
    return sendRedirect(event, `/?auth_error=${reason}`, 302)
  }

  if (typeof query.error === 'string') {
    // The expected outcome of a probe for a visitor with no Keycloak session: not worth a log line.
    if (!(pkce?.silent && SILENT_REFUSALS.has(query.error))) {
      console.error('[auth] Keycloak denied the authorization request:', query.error)
    }
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
    if (tokens.id_token) setIdTokenCookie(event, tokens.id_token)
    setAccessCookie(event, tokens.access_token, expiresAtFrom(tokens))

    return sendRedirect(event, pkce.redirectTo, 302)
  } catch (error) {
    console.error('[auth] Authorization code exchange failed:', error)
    clearSessionCookies(event)
    return failure('exchange')
  }
})
