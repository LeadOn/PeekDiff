/**
 * Normalizes a post-login redirect target.
 *
 * Only internal paths are accepted: without this filter, `?redirect=https://evil.example` would
 * turn `/api/auth/login` into an open redirect, usable to land an authenticated user on a third
 * party site from a link that appears to come from PeekDiff.
 */
export const safeInternalPath = (value: unknown, fallback = '/'): string => {
  if (typeof value !== 'string' || value.length === 0) return fallback
  // Rejects absolute URLs (`https://…`), protocol-relative ones (`//evil`), and backslashes, which
  // some browsers normalize to `/`.
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  return value
}
