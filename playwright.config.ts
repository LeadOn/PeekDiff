import { defineConfig, devices } from '@playwright/test'

/**
 * The suite runs against the **production build**, not the dev server: the things most worth
 * guarding (the CSP nonce, SWR route rules, real 404 status codes) behave differently under Vite's
 * dev middleware, so testing `nuxt dev` would test something we never ship.
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3210)
const baseURL = `http://127.0.0.1:${PORT}`

/**
 * Placeholder upstreams so the server boots with no secrets at all. `smoke.spec.ts` is written to
 * pass without any upstream; the specs that do need live data skip themselves. Source the real
 * `.env` before running to exercise those too.
 */
const serverEnv = {
  NUXT_PUBLIC_GAME_ON_API_URL: process.env.NUXT_PUBLIC_GAME_ON_API_URL ?? 'http://127.0.0.1:9',
  NUXT_PUBLIC_KEYCLOAK_AUTHORITY: process.env.NUXT_PUBLIC_KEYCLOAK_AUTHORITY ?? 'http://127.0.0.1:9/realms/test',
  NUXT_PUBLIC_KEYCLOAK_CLIENT_ID: process.env.NUXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? 'pickdiff-test',
  NUXT_PUBLIC_KEYCLOAK_REALM: process.env.NUXT_PUBLIC_KEYCLOAK_REALM ?? 'test',
  PORT: String(PORT),
  NODE_ENV: 'production',
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // A stray `test.only` would silently shrink the suite; fail rather than pass a partial run.
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    // `.output` must already be built: `npm run build && npm run test:e2e`.
    command: 'node .output/server/index.mjs',
    url: `${baseURL}/healthz`,
    // Reuses a server already listening on the port, so the suite can be re-run while iterating.
    // It does mean a stale `.output` is reused too — rebuild before a run that has to be trusted.
    reuseExistingServer: true,
    timeout: 60_000,
    env: serverEnv,
  },
})
