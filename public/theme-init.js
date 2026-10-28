/*
 * Applies the stored theme before the first paint, to avoid a flash of the dark theme for users on
 * the light one. Dark is the default: only an explicit "light" choice sets the class.
 *
 * A static file rather than an inline script: the site's CSP forbids `script-src 'unsafe-inline'`,
 * and an external script served from our own origin satisfies `'self'` without weakening the policy.
 */
try {
  if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.add('light')
  }
} catch (e) {
  /* storage unavailable: keep the default dark theme */
}
