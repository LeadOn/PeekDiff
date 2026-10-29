import { expect, test } from '@playwright/test'
import type { APIResponse, Page } from '@playwright/test'

/**
 * Guards the production-hardening work. Every assertion here holds with **no upstream at all** —
 * no GameOn API, no Keycloak — so it can be run anywhere, with no credentials, and fails only on a
 * real regression rather than on someone else's outage.
 */

test.describe('liveness', () => {
  test('/healthz answers without touching any dependency', async ({ request }) => {
    const response = await request.get('/healthz')

    expect(response.status()).toBe(200)
    expect(await response.json()).toMatchObject({ status: 'ok' })
    // A probe that cached would keep reporting a dead process as healthy.
    expect(response.headers()['cache-control']).toContain('no-store')
  })
})

test.describe('security headers', () => {
  test('documents carry a nonce-based CSP and the hardening headers', async ({ request }) => {
    const response = await request.get('/')
    const headers = response.headers()
    const csp = headers['content-security-policy']

    // The nonce is what allows Nuxt's inline bootstrap scripts without opening the door to any
    // injected script. Losing it silently breaks hydration, so assert it explicitly.
    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+'/)
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")

    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['cross-origin-opener-policy']).toBe('same-origin')
  })

  test('every inline script carries the nonce from the header', async ({ request }) => {
    const response = await request.get('/')
    const html = await response.text()
    const nonce = response.headers()['content-security-policy']?.match(/'nonce-([^']+)'/)?.[1]

    expect(nonce).toBeTruthy()

    // Only *executable* inline scripts matter. Nuxt also emits the SSR payload as
    // `<script type="application/json">`, which the browser never executes and CSP never blocks,
    // so requiring a nonce there would fail the test without any real exposure.
    const inlineScripts = [...html.matchAll(/<script(?![^>]*\ssrc=)([^>]*)>/g)]
      .map(m => m[1] ?? '')
      .filter(attrs => !/type="application\/(ld\+)?json"/.test(attrs))

    expect(inlineScripts.length).toBeGreaterThan(0)
    for (const attrs of inlineScripts) {
      expect(attrs).toContain(`nonce="${nonce}"`)
    }
  })

  test('HSTS is withheld over plain HTTP and sent behind a TLS proxy', async ({ request }) => {
    const plain = await request.get('/healthz')
    expect(plain.headers()['strict-transport-security']).toBeUndefined()

    const forwarded = await request.get('/healthz', { headers: { 'x-forwarded-proto': 'https' } })
    expect(forwarded.headers()['strict-transport-security']).toContain('max-age=')
  })
})

test.describe('GameOn proxy guards', () => {
  // These all short-circuit before the proxy contacts the upstream, so they hold with the API down.

  test('rejects paths outside the allowlist', async ({ request }) => {
    const response = await request.get('/api/gameon/fifa/tournament')
    expect(response.status()).toBe(403)

    // League of Legends lives on the same API but is JungleDiff's business, not ours.
    expect((await request.get('/api/gameon/lol/summoner')).status()).toBe(403)
  })

  test('rejects path traversal instead of normalising it', async ({ request }) => {
    // The separators are percent-encoded so the whole thing stays a *single* path segment. Any
    // form with real `/` boundaries — including `%2e%2e`, which URL parsers decode before
    // normalising — is collapsed by the HTTP client and never reaches the guard under test.
    // `%2f` is the shape that matters anyway: it survives the client and h3 decodes it into the
    // route param, which is exactly how a crafted URL could otherwise escape the intended path.
    const response = await request.get('/api/gameon/val%2f..%2f..%2fadmin')
    expect(response.status()).toBe(400)
  })

  test('refuses every DELETE: nothing on the front end deletes yet', async ({ request }) => {
    expect((await request.delete('/api/gameon/val/player/12')).status()).toBe(405)
    expect((await request.delete('/api/gameon/player/me')).status()).toBe(405)
  })

  test('lets the home page\'s aggregates through the allowlist', async ({ request }) => {
    test.skip(!!process.env.NUXT_PUBLIC_GAME_ON_API_URL, 'a real API is configured')

    // 502 (dead upstream) rather than 403 proves the path was allowed and actually forwarded.
    expect((await request.get('/api/gameon/val/home?includeSmurfs=false&window=Last7Days')).status()).toBe(502)
    expect((await request.get('/api/gameon/val/match/last?page=1&size=6')).status()).toBe(502)
  })

  test('reports an unreachable upstream as 502, not 500', async ({ request }) => {
    // The config points the proxy at a dead port unless a real API URL is provided.
    test.skip(!!process.env.NUXT_PUBLIC_GAME_ON_API_URL, 'a real API is configured')

    const response = await request.get('/api/gameon/val/player')
    expect(response.status()).toBe(502)
  })
})

test.describe('authentication', () => {
  test('reports an anonymous session without calling Keycloak', async ({ request }) => {
    const response = await request.get('/api/auth/session')

    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ authenticated: false, user: null, expiresAt: 0, ssoProbed: false })
    expect(response.headers()['cache-control']).toContain('no-store')
  })

  test('never returns a token to the browser', async ({ request }) => {
    const body = await (await request.get('/api/auth/session')).text()

    // The whole point of the server-side flow: tokens live in httpOnly cookies and the session
    // endpoint is the only thing the client talks to.
    expect(body).not.toContain('access_token')
    expect(body).not.toContain('refresh_token')
  })

  test('sign-out is not reachable over GET', async ({ request }) => {
    // A GET sign-out can be triggered from a third-party <img> tag.
    const response = await request.get('/api/auth/logout')
    expect(response.status()).toBe(404)
  })
})

test.describe('silent single sign-on', () => {
  const setCookies = (response: APIResponse): string[] =>
    response.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie').map(h => h.value)

  /** A PKCE cookie as `/api/auth/login` would have issued it. */
  const pkceCookie = (silent: boolean) => `pd_pkce=${encodeURIComponent(JSON.stringify({
    codeVerifier: 'verifier',
    state: 'state',
    redirectTo: '/classement?saison=2',
    silent
  }))}`

  test('the session endpoint exposes the probe marker it cannot let the client read', async ({ request }) => {
    const response = await request.get('/api/auth/session', { headers: { cookie: 'pd_sso_probe=1' } })
    expect(await response.json()).toMatchObject({ authenticated: false, ssoProbed: true })
  })

  test('a silent flow refused by Keycloak returns to the page, quietly, with the marker set', async ({ request }) => {
    for (const error of ['login_required', 'consent_required', 'interaction_required']) {
      const response = await request.get(`/api/auth/callback?error=${error}&state=state`, {
        headers: { cookie: pkceCookie(true) },
        maxRedirects: 0
      })

      expect(response.status()).toBe(302)
      expect(response.headers().location).toBe('/classement?saison=2')
      expect(setCookies(response).some(c => c.startsWith('pd_sso_probe=1') && /httponly/i.test(c))).toBe(true)
    }
  })

  test('an interactive flow refused by Keycloak still reports the error', async ({ request }) => {
    const response = await request.get('/api/auth/callback?error=access_denied&state=state', {
      headers: { cookie: pkceCookie(false) },
      maxRedirects: 0
    })

    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/?auth_error=denied')
  })

  test('an unreachable Keycloak sends a silent probe back to the page instead of failing', async ({ request }) => {
    test.skip(!!process.env.NUXT_PUBLIC_KEYCLOAK_AUTHORITY, 'a real Keycloak is configured')

    const response = await request.get('/api/auth/login?silent=1&redirect=%2Fclassement', { maxRedirects: 0 })
    expect(response.status()).toBe(302)
    expect(response.headers().location).toBe('/classement')
    expect(setCookies(response).some(c => c.startsWith('pd_sso_probe=1'))).toBe(true)

    // The redirect target stays internal on the silent path too.
    const offsite = await request.get('/api/auth/login?silent=1&redirect=https%3A%2F%2Fevil.example', { maxRedirects: 0 })
    expect(offsite.headers().location).toBe('/')
  })

  test('signing out sets the marker, so the probe does not sign the user straight back in', async ({ request }) => {
    const response = await request.post('/api/auth/logout')

    expect(response.status()).toBe(200)
    expect(setCookies(response).some(c => c.startsWith('pd_sso_probe=1'))).toBe(true)
  })

  test('an anonymous visit probes once, comes back to the same page, and does not loop', async ({ page }) => {
    test.skip(!!process.env.NUXT_PUBLIC_KEYCLOAK_AUTHORITY, 'a real Keycloak is configured')

    const probes: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/login')) probes.push(req.url())
    })

    await page.goto('/')
    await expect.poll(() => probes.length).toBe(1)
    expect(probes[0]).toContain('silent=1')
    await page.waitForURL(url => url.pathname === '/' && !url.search.includes('auth_error'))
    await page.waitForLoadState('networkidle')

    // Back on the page with the marker set: no second round trip.
    expect(probes).toHaveLength(1)
    await page.reload()
    await page.waitForLoadState('networkidle')
    expect(probes).toHaveLength(1)
  })
})

test.describe('error handling', () => {
  test('an unknown route is a real 404 with the error page', async ({ page }) => {
    const response = await page.goto('/route-qui-nexiste-pas')

    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible()
  })
})

test.describe('player profile', () => {
  test('a non-numeric id is a real 404 without calling the API', async ({ page }) => {
    const response = await page.goto('/player/pas-un-id')

    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible()
  })

  test('an unreachable API degrades to a retry panel, not a 404 or a 5xx', async ({ page }) => {
    test.skip(!!process.env.NUXT_PUBLIC_GAME_ON_API_URL, 'a real API is configured')

    const response = await page.goto('/player/12')

    // A dead upstream says nothing about whether the player exists: it must not read as a 404.
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'L\'API ne répond pas' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
  })
})

test.describe('match page', () => {
  test('an id that is not a Riot match uuid is a real 404 without calling the API', async ({ page }) => {
    const response = await page.goto('/match/pas-une-partie')

    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible()
  })

  test('an unreachable API degrades to a retry panel, not a 404 or a 5xx', async ({ page }) => {
    test.skip(!!process.env.NUXT_PUBLIC_GAME_ON_API_URL, 'a real API is configured')

    const response = await page.goto('/match/089e84c4-bb73-4207-91d5-8aa057ac010b?player=12')

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'L\'API ne répond pas' })).toBeVisible()
    // Without the game, the page cannot name the player: the way back falls to the ladder.
    await expect(page.getByRole('link', { name: 'Classement du crew' })).toBeVisible()
  })
})

/**
 * The sign-in button is client-only (`<ClientOnly>` in the header): once it shows, the app is mounted
 * and its click handlers and keyboard shortcuts are live.
 */
const hydrated = async (page: Page) => {
  await expect(page.getByRole('button', { name: /^(Se connecter|Connexion)$/ }).first()).toBeVisible()
}

test.describe('navigation', () => {
  // The silent sign-in probe would otherwise bounce the page through `/api/auth/login` right after
  // mount; the marker says it already ran.
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: 'pd_sso_probe', value: '1', url: baseURL! }])
  })

  test('the search palette opens on "/" and ⌘K, and closes on Escape', async ({ page }) => {
    await page.goto('/')
    await hydrated(page)

    await page.keyboard.press('/')
    const dialog = page.getByRole('dialog', { name: 'Chercher un joueur du crew' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('combobox')).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    await page.keyboard.press('ControlOrMeta+k')
    await expect(dialog).toBeVisible()
  })

  test('the palette says so when the crew cannot be loaded', async ({ page }) => {
    test.skip(!!process.env.NUXT_PUBLIC_GAME_ON_API_URL, 'a real API is configured')

    await page.goto('/')
    await hydrated(page)
    await page.getByRole('button', { name: 'Chercher un joueur du crew' }).click()
    await expect(page.getByText('Impossible de charger la liste du crew.')).toBeVisible()
  })

  test('phones get the bottom bar instead of the header search', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await hydrated(page)

    const bar = page.getByRole('navigation', { name: 'Navigation mobile' })
    await expect(bar).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Crew' })).toHaveAttribute('href', '/')
    await expect(bar.getByRole('link', { name: 'Parties' })).toHaveAttribute('href', '/#parties')
    await expect(page.getByRole('button', { name: 'Chercher un joueur du crew' })).toBeHidden()

    await bar.getByRole('button', { name: 'Recherche' }).click()
    await expect(page.getByRole('dialog', { name: 'Chercher un joueur du crew' })).toBeVisible()
  })
})

test.describe('settings', () => {
  test('is never cached and renders no personal data on the server', async ({ request }) => {
    const response = await request.get('/settings')

    expect(response.status()).toBe(200)
    expect(response.headers()['cache-control']).toContain('no-store')
    // The form is filled after mount, from `/player/me`: the server HTML only carries the shell.
    expect(await response.text()).not.toContain('Nom complet')
  })
})

test.describe('resilience', () => {
  test('the home page still renders when the API is unreachable', async ({ page }) => {
    test.skip(!!process.env.NUXT_PUBLIC_GAME_ON_API_URL, 'a real API is configured')

    const response = await page.goto('/')

    // Degrading to an error panel is fine; returning a 5xx because a dependency is down is not.
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('link', { name: 'PeekDiff, accueil' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'L\'API ne répond pas' })).toBeVisible()
  })
})
