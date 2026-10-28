/**
 * Who may administer the crew. There is no admin space yet; the role already gates `isAdmin` in the
 * auth store, which is what the admin space will check.
 */

/** The Keycloak realm role the GameOn API itself checks on every admin route. */
export const ADMIN_ROLE = 'gameon_admin'
