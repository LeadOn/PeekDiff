import { defineEventHandler, getRequestURL } from 'h3'
import { isAdminPath } from '#shared/utils/admin-access'
import { resolveAccessToken } from '../utils/access-token'
import { sessionUserFromToken } from '../utils/oidc'

/**
 * Resolves the session of a request for an admin page, before Nuxt renders it.
 *
 * The admin space is the one place where server rendering must know who is asking: the route
 * middleware (`app/middleware/auth.global.ts`) reads `event.context.sessionUser` during SSR to send an
 * anonymous visitor to Keycloak and answer a signed-in non-admin with a real 403, instead of serving
 * them the page shell. It is resolved here rather than by the page calling `/api/auth/session`
 * internally: a token refreshed on this event sets its rotated cookies on the actual response, where
 * an internal sub-request would drop them and lose the refresh token Keycloak just rotated.
 *
 * Nothing is refused here. Deciding stays in the route middleware, so the answer goes through the
 * normal render — CSP nonce, security headers and `error.vue` included.
 */
export default defineEventHandler(async (event) => {
  if (!isAdminPath(getRequestURL(event).pathname)) return

  const accessToken = await resolveAccessToken(event)
  event.context.sessionUser = accessToken ? sessionUserFromToken(accessToken) : null
})
