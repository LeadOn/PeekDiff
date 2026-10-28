import { defineEventHandler, setResponseHeader } from 'h3'
import { getDiscovery } from '../../utils/oidc'
import { clearSessionCookies } from '../../utils/session'

/**
 * Ends the local session and tells the client where to continue the Keycloak sign-out.
 *
 * Deliberately POST-only: a sign-out reachable over GET can be triggered from a plain `<img>` tag
 * on a third-party site.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  clearSessionCookies(event)

  const config = useRuntimeConfig()
  const postLogoutRedirectUri = new URL('/', getRequestURL(event)).toString()

  try {
    const { end_session_endpoint } = await getDiscovery()
    if (!end_session_endpoint) return { endSessionUrl: null }

    const endSessionUrl = new URL(end_session_endpoint)
    endSessionUrl.searchParams.set('client_id', config.public.keycloak.clientId)
    endSessionUrl.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri)
    return { endSessionUrl: endSessionUrl.toString() }
  } catch (error) {
    // Cookies are already cleared, so the user is signed out of PeekDiff even when Keycloak is
    // unreachable. Degrade instead of failing the call.
    console.error('[auth] end_session_endpoint unavailable:', error)
    return { endSessionUrl: null }
  }
})
