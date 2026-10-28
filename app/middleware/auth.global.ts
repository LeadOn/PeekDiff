import { defineNuxtRouteMiddleware } from '#app'
import { useAuthStore } from '~/stores/auth'

/**
 * Pages are public by default. `definePageMeta({ auth: true })` requires a session.
 *
 * It is checked on the client only: server-rendering such a page produces nothing but a shell with no
 * personal data, and the GameOn API remains the real authority on permissions anyway. No page needs
 * it yet; the settings page will.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.auth !== true || import.meta.server) return

  const auth = useAuthStore()

  // A direct navigation to a protected page can run before the session is resolved; without this
  // wait we would bounce an already-signed-in user back to Keycloak.
  if (!auth.isInitialized) await auth.initAuth()

  if (!auth.isAuthenticated) {
    auth.login(to.fullPath)
    // Navigation cancelled: the redirect to Keycloak is already under way.
    return false
  }
})
