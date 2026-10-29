import { defineEventHandler, setResponseHeader } from 'h3'
import { getDiscovery, revokeRefreshToken } from '../../utils/oidc'
import { clearSessionCookies, getIdToken, getRefreshToken, setSsoProbeCookie } from '../../utils/session'

/**
 * Ends the local session and tells the client where to continue the Keycloak sign-out.
 *
 * Deliberately POST-only: a sign-out reachable over GET can be triggered from a plain `<img>` tag
 * on a third-party site.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')

  const refreshToken = getRefreshToken(event)
  const idToken = getIdToken(event)
  clearSessionCookies(event)
  // Without it, the next page load would run the silent single sign-on probe and could sign the user
  // straight back in from a Keycloak session another app (JungleDiff) still holds.
  setSsoProbeCookie(event)

  if (refreshToken) {
    try {
      await revokeRefreshToken(refreshToken)
    } catch (error) {
      // The cookie is gone either way; an unrevoked offline session only lingers in Keycloak until
      // it expires, which is not worth failing the sign-out over.
      console.error('[auth] Refresh token revocation failed:', error)
    }
  }

  const config = useRuntimeConfig()
  const postLogoutRedirectUri = new URL('/', getRequestURL(event)).toString()

  try {
    const { end_session_endpoint } = await getDiscovery()
    if (!end_session_endpoint) return { endSessionUrl: null }

    const endSessionUrl = new URL(end_session_endpoint)
    endSessionUrl.searchParams.set('client_id', config.public.keycloak.clientId)
    endSessionUrl.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri)
    // Without the hint Keycloak cannot tell the request comes from the user's own session and asks
    // them to confirm the sign-out on its own page.
    if (idToken) endSessionUrl.searchParams.set('id_token_hint', idToken)
    return { endSessionUrl: endSessionUrl.toString() }
  } catch (error) {
    // Cookies are already cleared, so the user is signed out of PeekDiff even when Keycloak is
    // unreachable. Degrade instead of failing the call.
    console.error('[auth] end_session_endpoint unavailable:', error)
    return { endSessionUrl: null }
  }
})
