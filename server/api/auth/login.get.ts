import { createHash, randomBytes } from 'node:crypto'
import { defineEventHandler, getQuery, sendRedirect } from 'h3'
import { getDiscovery } from '../../utils/oidc'
import { setPkceCookie, setSsoProbeCookie } from '../../utils/session'
import { safeInternalPath } from '../../utils/redirect-target'

const base64Url = (input: Buffer): string => input.toString('base64url')

/**
 * Starts the Authorization Code + PKCE flow.
 *
 * The `code_verifier` and `state` go into a 10-minute httpOnly cookie rather than browser storage,
 * so only `/api/auth/callback` can read them back.
 *
 * `?silent=1` is the single sign-on probe started by the client for an anonymous visitor: it adds
 * `prompt=none`, so Keycloak either signs the user in from its existing SSO session (opened by
 * JungleDiff, for instance) or comes straight back with `error=login_required` — it never shows a
 * login form the visitor did not ask for.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const silent = query.silent === '1'
  const redirectTo = safeInternalPath(query.redirect)

  // Set before anything can fail: whatever happens on the way (Keycloak down, the visitor closing
  // the tab, a callback error), the client will not start another probe until the marker expires.
  if (silent) setSsoProbeCookie(event)

  let authorizationEndpoint: string
  try {
    authorizationEndpoint = (await getDiscovery()).authorization_endpoint
  } catch (error) {
    // The visitor never asked to sign in: a Keycloak outage must not turn their page into an error.
    if (!silent) throw error
    console.warn('[auth] Silent sign-in skipped, discovery unavailable:', error)
    return sendRedirect(event, redirectTo, 302)
  }

  const codeVerifier = base64Url(randomBytes(32))
  const codeChallenge = base64Url(createHash('sha256').update(codeVerifier).digest())
  const state = base64Url(randomBytes(16))

  setPkceCookie(event, JSON.stringify({ codeVerifier, state, redirectTo, silent }))

  const redirectUri = new URL('/api/auth/callback', getRequestURL(event)).toString()
  const authorizeUrl = new URL(authorizationEndpoint)
  authorizeUrl.searchParams.set('client_id', config.public.keycloak.clientId)
  authorizeUrl.searchParams.set('redirect_uri', redirectUri)
  authorizeUrl.searchParams.set('response_type', 'code')
  // `offline_access` is required for long-lived sessions: it is what lets a returning visitor stay
  // signed in for weeks instead of re-authenticating daily. The refresh token it yields is safe
  // here because it is stored in an httpOnly cookie, never in browser-readable storage.
  authorizeUrl.searchParams.set('scope', 'openid profile email offline_access')
  authorizeUrl.searchParams.set('state', state)
  authorizeUrl.searchParams.set('code_challenge', codeChallenge)
  authorizeUrl.searchParams.set('code_challenge_method', 'S256')
  if (silent) authorizeUrl.searchParams.set('prompt', 'none')

  return sendRedirect(event, authorizeUrl.toString(), 302)
})
