import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { SessionState, SessionUser } from '#shared/types/auth'
import { ADMIN_ROLE } from '#shared/utils/admin-access'

/**
 * Browser-side user session.
 *
 * This store handles **no token at all**. Tokens live in httpOnly cookies set by
 * `server/api/auth/*`, and the `/api/gameon` proxy authenticates outgoing calls. A script injected
 * into the page therefore has nothing reusable to steal — previously both the access token and the
 * long-lived `offline_access` refresh token were readable from `localStorage`.
 */
export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const isInitialized = ref(false)
  const user = ref<SessionUser | null>(null)

  const isAdmin = computed(() => user.value?.roles.includes(ADMIN_ROLE) ?? false)

  const displayName = computed(() => user.value?.name || user.value?.preferredUsername || null)

  const applySession = (session: SessionState) => {
    isAuthenticated.value = session.authenticated
    user.value = session.user
  }

  /**
   * Reads session state from the server. Idempotent: concurrent callers (plugin, middleware,
   * header) share one in-flight promise instead of opening several requests.
   */
  let inflight: Promise<void> | null = null

  const fetchSession = async (): Promise<void> => {
    if (inflight) return inflight

    inflight = (async () => {
      try {
        applySession(await $fetch<SessionState>('/api/auth/session'))
      } catch (error) {
        // A failure here means "unknown", not "signed in": degrade to anonymous rather than
        // rendering an authenticated UI that would fail on its first call.
        console.error('[auth] Session state unavailable:', error)
        applySession({ authenticated: false, user: null, expiresAt: 0 })
      } finally {
        isInitialized.value = true
        inflight = null
      }
    })()

    return inflight
  }

  const initAuth = async (): Promise<void> => {
    if (isInitialized.value) return
    await fetchSession()
  }

  /**
   * Starts the OIDC flow. This is a full navigation rather than a `router.push`: Nitro has to
   * receive the request to generate the PKCE pair and set the state cookie.
   */
  const login = (redirectTo?: string): void => {
    if (!import.meta.client) return
    const target = redirectTo ?? `${window.location.pathname}${window.location.search}`
    window.location.assign(`/api/auth/login?redirect=${encodeURIComponent(target)}`)
  }

  const logout = async (): Promise<void> => {
    if (!import.meta.client) return

    let endSessionUrl: string | null = null
    try {
      const response = await $fetch<{ endSessionUrl: string | null }>('/api/auth/logout', { method: 'POST' })
      endSessionUrl = response.endSessionUrl
    } catch (error) {
      // Cookies may already be cleared despite the error, so carry on with the local sign-out.
      console.error('[auth] Server-side sign-out failed:', error)
    }

    applySession({ authenticated: false, user: null, expiresAt: 0 })
    window.location.assign(endSessionUrl ?? '/')
  }

  return {
    isAuthenticated,
    isInitialized,
    user,
    isAdmin,
    displayName,
    initAuth,
    fetchSession,
    login,
    logout
  }
})
