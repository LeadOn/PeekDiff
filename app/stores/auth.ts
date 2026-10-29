import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { SessionState, SessionUser } from '#shared/types/auth'
import { ADMIN_ROLE } from '#shared/utils/admin-access'
import { SSO_PROBE_TTL_MS } from '#shared/utils/sso-probe'

/** Per-tab loop breaker for browsers that drop cookies, where the server-side marker cannot stick. */
const SSO_PROBE_STORAGE_KEY = 'pd_sso_probe_at'

/** Crawlers keep no cookies: each of their visits would be one more pointless trip to Keycloak. */
const CRAWLER_UA = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview/i

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
  const ssoProbed = ref(false)

  const isAdmin = computed(() => user.value?.roles.includes(ADMIN_ROLE) ?? false)

  const displayName = computed(() => user.value?.name || user.value?.preferredUsername || null)

  const applySession = (session: SessionState) => {
    isAuthenticated.value = session.authenticated
    user.value = session.user
    ssoProbed.value = session.ssoProbed
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
        // `ssoProbed` too: with the session endpoint down, a silent sign-in could only fail.
        console.error('[auth] Session state unavailable:', error)
        applySession({ authenticated: false, user: null, expiresAt: 0, ssoProbed: true })
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

  /**
   * Silent single sign-on: sends an anonymous visitor through Keycloak with `prompt=none`, which
   * either signs them in from an existing Keycloak session (JungleDiff's) or comes straight back.
   *
   * A top-level navigation rather than a hidden iframe: Safari's ITP and third-party cookie blocking
   * keep Keycloak's session cookie out of a cross-site iframe. Client-side and after mount only — `/`
   * comes from a shared SWR cache, and a server-side redirect would loop for cookie-less crawlers.
   * Returns whether the navigation was started.
   */
  const trySilentSignIn = (): boolean => {
    if (!import.meta.client || !isInitialized.value || isAuthenticated.value || ssoProbed.value) return false
    if (!navigator.cookieEnabled || CRAWLER_UA.test(navigator.userAgent)) return false

    const url = new URL(window.location.href)
    // Right after a failed interactive sign-in: leave the error on screen rather than bouncing.
    if (url.searchParams.has('auth_error')) return false

    try {
      const lastProbe = Number(sessionStorage.getItem(SSO_PROBE_STORAGE_KEY) ?? 0)
      if (Date.now() - lastProbe < SSO_PROBE_TTL_MS) return false
      sessionStorage.setItem(SSO_PROBE_STORAGE_KEY, String(Date.now()))
    } catch {
      // No storage means no loop breaker: stay anonymous rather than risk bouncing forever.
      return false
    }

    ssoProbed.value = true
    const target = `${url.pathname}${url.search}`
    window.location.assign(`/api/auth/login?silent=1&redirect=${encodeURIComponent(target)}`)
    return true
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

    applySession({ authenticated: false, user: null, expiresAt: 0, ssoProbed: true })
    window.location.assign(endSessionUrl ?? '/')
  }

  return {
    isAuthenticated,
    isInitialized,
    user,
    isAdmin,
    ssoProbed,
    displayName,
    initAuth,
    fetchSession,
    login,
    trySilentSignIn,
    logout
  }
})
