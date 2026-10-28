import { createHash, randomBytes } from 'node:crypto'
import { defineEventHandler, getQuery, sendRedirect } from 'h3'
import { getDiscovery } from '../../utils/oidc'
import { setPkceCookie } from '../../utils/session'
import { safeInternalPath } from '../../utils/redirect-target'

const base64Url = (input: Buffer): string => input.toString('base64url')

/**
 * Starts the Authorization Code + PKCE flow.
 *
 * The `code_verifier` and `state` go into a 10-minute httpOnly cookie rather than browser storage,
 * so only `/api/auth/callback` can read them back.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { authorization_endpoint } = await getDiscovery()

  const codeVerifier = base64Url(randomBytes(32))
  const codeChallenge = base64Url(createHash('sha256').update(codeVerifier).digest())
  const state = base64Url(randomBytes(16))
  const redirectTo = safeInternalPath(getQuery(event).redirect)

  setPkceCookie(event, JSON.stringify({ codeVerifier, state, redirectTo }))

  const redirectUri = new URL('/api/auth/callback', getRequestURL(event)).toString()
  const authorizeUrl = new URL(authorization_endpoint)
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

  return sendRedirect(event, authorizeUrl.toString(), 302)
})
