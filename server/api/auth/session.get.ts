import { defineEventHandler, setResponseHeader } from 'h3'
import { sessionUserFromToken } from '../../utils/oidc'
import { resolveAccessToken } from '../../utils/access-token'
import { getAccessTokenExpiry, hasSsoProbeCookie } from '../../utils/session'

/**
 * Browser-facing session state.
 *
 * Returns **no token whatsoever**: the client only needs to know whether it is signed in and as
 * whom. Authenticated calls go through `/api/gameon`, which reads the cookies server-side.
 *
 * `ssoProbed` tells an anonymous client whether it may try a silent sign-in: the marker is an
 * httpOnly cookie, so this is the only way the client can read it.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')

  const accessToken = await resolveAccessToken(event)
  if (!accessToken) {
    return { authenticated: false as const, user: null, expiresAt: 0, ssoProbed: hasSsoProbeCookie(event) }
  }

  return {
    authenticated: true as const,
    user: sessionUserFromToken(accessToken),
    expiresAt: getAccessTokenExpiry(event),
    ssoProbed: hasSsoProbeCookie(event)
  }
})
