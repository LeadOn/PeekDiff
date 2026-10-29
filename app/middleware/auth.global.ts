import { abortNavigation, createError, defineNuxtRouteMiddleware, navigateTo, useRequestEvent } from '#app'
import { useAuthStore } from '~/stores/auth'
import { ADMIN_ROLE } from '#shared/utils/admin-access'

const ADMIN_ONLY = 'Cet espace est réservé aux administrateurs.'

const loginUrl = (target: string) => `/api/auth/login?redirect=${encodeURIComponent(target)}`

/**
 * Pages are public by default. `definePageMeta({ auth: true })` requires a session, and
 * `admin: true` (which implies `auth`) requires the `gameon_admin` realm role on top of it.
 *
 * A plain `auth` page is checked on the client only: server-rendering it produces nothing but a
 * shell with no personal data, and the GameOn API remains the real authority on permissions anyway.
 *
 * The admin space is checked on the server too, so a non-admin never receives even its shell:
 * `server/middleware/admin-session.ts` resolves the session on the request and leaves it in
 * `event.context.sessionUser`, which this middleware reads during SSR. An anonymous visitor is sent
 * to Keycloak, a signed-in non-admin gets a real 403.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const needsAdmin = to.meta.admin === true
  const needsAuth = needsAdmin || to.meta.auth === true
  if (!needsAuth) return

  if (import.meta.server) {
    if (!needsAdmin) return
    const sessionUser = useRequestEvent()?.context.sessionUser
    // `undefined` means the Nitro middleware did not recognise this path as an admin one, so the
    // session was never resolved for it: refuse rather than render a page we could not vet.
    if (sessionUser === undefined) return abortNavigation(createError({ statusCode: 403, statusMessage: ADMIN_ONLY }))
    if (sessionUser === null) return navigateTo(loginUrl(to.fullPath), { external: true })
    if (!sessionUser.roles.includes(ADMIN_ROLE)) return abortNavigation(createError({ statusCode: 403, statusMessage: ADMIN_ONLY }))
    return
  }

  const auth = useAuthStore()

  // A direct navigation to a protected page can run before the session is resolved; without this
  // wait we would bounce an already-signed-in user back to Keycloak.
  if (!auth.isInitialized) await auth.initAuth()

  if (!auth.isAuthenticated) {
    auth.login(to.fullPath)
    // Navigation cancelled: the redirect to Keycloak is already under way.
    return false
  }

  if (needsAdmin && !auth.isAdmin) {
    return abortNavigation(createError({ statusCode: 403, statusMessage: ADMIN_ONLY }))
  }
})
