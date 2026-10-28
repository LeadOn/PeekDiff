/**
 * Session contract shared between Nitro and the application.
 *
 * Lives in `shared/` so the server that produces it and the client that consumes it depend on the
 * same definition — a drift between the two would only show up at runtime.
 */

/**
 * Minimal profile exposed to the browser. Deliberately no `id_token` and no technical claims: the
 * client only needs enough to display the user and gate the UI on their roles.
 */
export interface SessionUser {
  sub: string
  preferredUsername: string | null
  name: string | null
  email: string | null
  roles: string[]
}

export interface SessionState {
  authenticated: boolean
  user: SessionUser | null
  /** Server-side access token expiry, in ms since epoch. 0 when there is no session. */
  expiresAt: number
}
