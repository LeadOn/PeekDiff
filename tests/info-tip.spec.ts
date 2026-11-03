import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The bubbles that explain each figure (`InfoTip`), on the profile's performance panel, against a GameOn
 * API mocked in the browser: the server render fails without an upstream, and `[ Réessayer ]` re-reads
 * the player from the browser, where every `/api/gameon` call is answered here.
 */

test.skip(!!process.env.NUXT_PUBLIC_GAME_ON_API_URL, 'a real API is configured: the server render would not fail')

const PLAYER_ID = 7

const player = {
  id: PLAYER_ID,
  nickname: 'Tester',
  fullName: null,
  profilePictureUrl: null,
  riotGamesNickname: 'Tester',
  riotGamesTagLine: 'EUW',
  valorantPuuid: 'puuid-7',
  valorantAccountLevel: 120,
  valorantRegion: 'eu',
  valorantRefreshedOn: '2026-11-01T10:00:00Z',
  valorantPeakRr: 0,
  valorantCurrentRank: null,
  rrChange7DaysValorant: null,
  valorantPerformanceStats: {
    gamesPlayed: 3,
    wins: 2,
    losses: 1,
    draws: 0,
    winRatePercent: 66.7,
    totalPlaytimeSeconds: 5400,
    averageGameDurationSeconds: 1800,
    roundsPlayed: 60,
    averageAcs: 230,
    averageAdr: 150,
    kda: 1.5,
    kdRatio: 1.2,
    headshotPercent: 25,
    kastPercent: 72,
    averageRating: 6.4,
    firstKills: 5,
    firstDeaths: 3,
    agentStats: [],
    mapStats: [],
    duoStats: [],
  },
}

async function openProfile(page: Page) {
  await page.route('**/api/auth/session', route => route.fulfill({ json: { authenticated: false, user: null, expiresAt: 0, ssoProbed: true } }))
  await page.route('https://media.valorant-api.com/**', route => route.abort())
  await page.route('**/api/gameon/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api\/gameon/, '')
    if (path === `/val/player/${PLAYER_ID}`) return route.fulfill({ json: player })
    if (path === `/val/player/${PLAYER_ID}/rank`) return route.fulfill({ json: [] })
    if (path === `/val/match/player/${PLAYER_ID}`) return route.fulfill({ json: { page: 1, resultsPerPage: 10, total: 0, results: [] } })
    if (path === '/val/player') return route.fulfill({ json: [player] })
    return route.fulfill({ status: 404, json: 'Not mocked' })
  })
  await page.goto(`/player/${PLAYER_ID}`)
  await page.getByRole('button', { name: 'Réessayer' }).click()
  await expect(page.getByRole('heading', { name: 'Performances' })).toBeVisible()
}

const bubble = (page: Page) => page.locator('[data-info-tip]')

test.describe('stat hints', () => {
  test('a figure explains itself on hover, and its label carries the same words', async ({ page }) => {
    await openProfile(page)
    const kast = page.getByRole('button', { name: 'KAST' })
    await expect(kast).toHaveAccessibleDescription(/Kill, Assist, Survive, Trade.*mort vengée.*5 secondes.*Calcul : manches utiles ÷ manches jouées/)

    await kast.hover()
    await expect(bubble(page)).toBeVisible()
    await expect(bubble(page)).toContainText('KAST · Kill, Assist, Survive, Trade')
    await expect(bubble(page)).toContainText('= manches utiles ÷ manches jouées')

    await page.mouse.move(0, 0)
    await expect(bubble(page)).toHaveCount(0)
  })

  test('the keyboard opens it on focus and Escape closes it', async ({ page }) => {
    await openProfile(page)
    const acs = page.getByRole('button', { name: 'ACS moyen' })
    await page.getByRole('button', { name: 'Victoires' }).focus()
    await page.keyboard.press('Tab')
    await expect(acs).toBeFocused()
    await expect(bubble(page)).toContainText('Average Combat Score')

    await page.keyboard.press('Escape')
    await expect(bubble(page)).toHaveCount(0)
  })
})

test.describe('stat hints on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('a tap toggles it and a tap elsewhere closes it, inside the viewport', async ({ page }) => {
    await openProfile(page)
    const kd = page.getByRole('button', { name: 'Ratio K/D' })
    await kd.scrollIntoViewIfNeeded()
    await kd.tap()
    await expect(bubble(page)).toContainText('Kills par mort')
    const box = await bubble(page).boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)

    await page.getByRole('heading', { name: 'Performances' }).tap()
    await expect(bubble(page)).toHaveCount(0)
  })
})
