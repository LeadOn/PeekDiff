import { expect, test } from '@playwright/test'

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
    expect(await response.json()).toEqual({ authenticated: false, user: null, expiresAt: 0 })
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

test.describe('error handling', () => {
  test('an unknown route is a real 404 with the error page', async ({ page }) => {
    const response = await page.goto('/route-qui-nexiste-pas')

    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible()
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
