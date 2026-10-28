import { createError } from 'h3'
import type { SessionUser } from '#shared/types/auth'

export interface OidcDiscovery {
  authorization_endpoint: string
  token_endpoint: string
  end_session_endpoint?: string
  userinfo_endpoint?: string
}

export interface OidcTokenSet {
  access_token: string
  refresh_token?: string
  expires_in: number
  id_token?: string
}

interface CachedDiscovery {
  value: OidcDiscovery
  expiresAt: number
}

let discoveryCache: CachedDiscovery | null = null
const DISCOVERY_TTL_MS = 60 * 60 * 1000

const authorityFromConfig = (): string => {
  const authority = useRuntimeConfig().public.keycloak.authority
  if (!authority) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_PUBLIC_KEYCLOAK_AUTHORITY is not configured' })
  }
  return authority.replace(/\/$/, '')
}

/**
 * Realm OIDC metadata, cached for an hour. Without the cache, every sign-in and every token
 * refresh would pay an extra round trip to Keycloak.
 */
export const getDiscovery = async (): Promise<OidcDiscovery> => {
  if (discoveryCache && discoveryCache.expiresAt > Date.now()) {
    return discoveryCache.value
  }

  const authority = authorityFromConfig()
  const value = await $fetch<OidcDiscovery>(`${authority}/.well-known/openid-configuration`, {
    timeout: 5000,
    retry: 1
  })

  discoveryCache = { value, expiresAt: Date.now() + DISCOVERY_TTL_MS }
  return value
}

const tokenRequest = async (body: URLSearchParams): Promise<OidcTokenSet> => {
  const config = useRuntimeConfig()
  const { token_endpoint } = await getDiscovery()

  body.set('client_id', config.public.keycloak.clientId)
  if (config.keycloak.clientSecret) {
    body.set('client_secret', config.keycloak.clientSecret)
  }

  return await $fetch<OidcTokenSet>(token_endpoint, {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    timeout: 8000,
    retry: 1
  })
}

export const exchangeCode = (code: string, redirectUri: string, codeVerifier: string) =>
  tokenRequest(new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier
  }))

export const refreshTokens = (refreshToken: string) =>
  tokenRequest(new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  }))

/** Decodes a JWT payload without verifying its signature. */
const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Builds the profile returned to the client from the access token.
 *
 * The signature is deliberately not verified here: the token was just issued by Keycloak over a
 * server-to-server TLS channel, and it is only used for display. The GameOn API remains the sole
 * authority on whether the token actually authorizes anything.
 */
export const sessionUserFromToken = (accessToken: string): SessionUser | null => {
  const claims = decodeJwtPayload(accessToken)
  if (!claims || typeof claims.sub !== 'string') return null

  const realmAccess = claims.realm_access as { roles?: unknown } | undefined
  const roles = Array.isArray(realmAccess?.roles)
    ? realmAccess.roles.filter((role): role is string => typeof role === 'string')
    : []

  const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null)

  return {
    sub: claims.sub,
    preferredUsername: asString(claims.preferred_username),
    name: asString(claims.name),
    email: asString(claims.email),
    roles
  }
}

export const expiresAtFrom = (tokenSet: OidcTokenSet): number =>
  Date.now() + Math.max(0, tokenSet.expires_in - 30) * 1000
