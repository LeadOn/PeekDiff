/**
 * Silent single sign-on: an anonymous visitor is sent once through Keycloak with `prompt=none`, so a
 * session opened in JungleDiff (same realm, same client) signs them in here without a click.
 */

/**
 * How long a visitor is left alone after a silent sign-in attempt (or a sign-out) before the next
 * one. Long enough that the round trip through Keycloak is rare; short enough that signing in to
 * JungleDiff is picked up here the same day.
 */
export const SSO_PROBE_TTL_MS = 6 * 60 * 60 * 1000
