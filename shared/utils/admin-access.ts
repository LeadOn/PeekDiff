/**
 * Who may enter the admin space, shared by the Nitro middleware that resolves the session on admin
 * page requests and by the route middleware that enforces it.
 */

/** The Keycloak realm role the GameOn API itself checks on every admin route. */
export const ADMIN_ROLE = 'gameon_admin'

/**
 * Whether a request path lands on the admin space.
 *
 * vue-router matches paths case-insensitively and after percent-decoding, so `/Admin` and `/%61dmin`
 * render the admin page just like `/admin`: the path is normalised the same way before comparing,
 * or those spellings would reach the page without the session having been resolved for them.
 */
export function isAdminPath(pathname: string): boolean {
  let path = pathname
  try {
    path = decodeURIComponent(pathname)
  } catch {
    // A malformed escape cannot match a route either; compare it as it came.
  }
  path = path.toLowerCase().replace(/\/{2,}/g, '/')
  return path === '/admin' || path.startsWith('/admin/')
}
