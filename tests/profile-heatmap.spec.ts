import { expect, test } from '@playwright/test'
import type { Page, Route } from '@playwright/test'

/**
 * The profile's heatmap, against a GameOn API mocked in the browser. The suite runs without any
 * upstream: the profile's server render fails ("L'API ne répond pas"), and `[ Réessayer ]` re-reads the
 * player from the browser, where every `/api/gameon` call is answered here. Everything the heatmap
 * shows is loaded after mount, so this is the path it really takes.
 */

test.skip(!!process.env.NUXT_PUBLIC_GAME_ON_API_URL, 'a real API is configured: the server render would not fail')

const PLAYER_ID = 7
const ASCENT_ID = '7eaecc1b-4337-bbf6-6ab9-04b8f06b3319'
const BREEZE_ID = '2fb9a4fd-47b8-4e7d-a969-74b4046ebd53'

const mapStat = (mapId: string, mapName: string, gamesPlayed: number) => ({ mapId, mapName, mapListViewIconUrl: null, gamesPlayed, wins: 1, winRate: 50, acs: 220 })

const player = {
  id: PLAYER_ID,
  nickname: 'Tester',
  fullName: null,
  profilePictureUrl: null,
  riotGamesNickname: 'Tester',
  riotGamesTagLine: 'EUW',
  valorantPuuid: 'puuid-7',
  valorantAccountLevel: 120,
  valorantPlayerCardId: null,
  valorantPlayerCardSmallUrl: null,
  valorantPlayerCardWideUrl: null,
  valorantPlayerCardLargeUrl: null,
  valorantPlayerTitleId: null,
  valorantRegion: 'eu',
  valorantRefreshedOn: '2026-11-01T10:00:00Z',
  valorantPeakTierId: null,
  valorantPeakTierName: null,
  valorantPeakRr: 0,
  valorantPeakSeasonShort: null,
  valorantPeakRankIconUrl: null,
  valorantCurrentRank: null,
  rrChange7DaysValorant: null,
  // Present (even null) only on an API that serves the full data: it turns the heatmap section on.
  valorantExtrasRefreshedOn: null,
  valorantPremierTeamId: null,
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
    mapStats: [mapStat(ASCENT_ID, 'Ascent', 2), mapStat(BREEZE_ID, 'Breeze', 1)],
    duoStats: [],
  },
}

const TRANSFORM = { minimapUrl: `https://media.valorant-api.com/maps/${ASCENT_ID}/displayicon.png`, xMultiplier: 0.00007, yMultiplier: -0.00007, xScalarToAdd: 0.813895, yScalarToAdd: 0.573242 }

const point = (minimapX: number | null, minimapY: number | null, side: 'Attack' | 'Defense', zone: string) => ({
  matchId: '089e84c4-bb73-4207-91d5-8aa057ac010b',
  roundNumber: 3,
  x: 1000,
  y: -2000,
  minimapX,
  minimapY,
  zone,
  side,
  weaponName: 'Vandal',
  distanceMeters: 21.4,
})

const ascentKills = {
  mapId: ASCENT_ID,
  mapName: 'Ascent',
  type: 'Kills',
  mapTransform: TRANSFORM,
  points: [
    point(0.42, 0.31, 'Attack', 'A Main'),
    point(0.44, 0.33, 'Attack', 'A Main'),
    point(0.61, 0.58, 'Defense', 'Mid Courtyard'),
    // Not projectable: counted, never drawn.
    point(null, null, 'Defense', 'Mid Courtyard'),
  ],
  zones: [
    { zone: 'A Main', count: 2, sharePercent: 50 },
    { zone: 'Mid Courtyard', count: 2, sharePercent: 50 },
  ],
}

const ascentDeaths = {
  ...ascentKills,
  type: 'Deaths',
  points: [
    point(0.43, 0.32, 'Attack', 'A Main'),
    point(0.7, 0.2, 'Defense', 'B Site'),
  ],
  zones: [
    { zone: 'A Main', count: 1, sharePercent: 50 },
    { zone: 'B Site', count: 1, sharePercent: 50 },
  ],
}

interface MockOptions {
  /** Status of the heatmap route, 200 by default. */
  heatmapStatus?: number
}

/** Answers every `/api/gameon` call the profile makes, and records the heatmap requests. */
async function mockApi(page: Page, options: MockOptions = {}) {
  const heatmapRequests: URL[] = []

  // No silent sign-in round trip to a Keycloak that does not exist: the session says it was tried.
  await page.route('**/api/auth/session', route => route.fulfill({ json: { authenticated: false, user: null, expiresAt: 0, ssoProbed: true } }))
  // Game art is irrelevant here and must not depend on the network.
  await page.route('https://media.valorant-api.com/**', route => route.abort())

  await page.route('**/api/gameon/**', async (route: Route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace(/^\/api\/gameon/, '')

    if (path === `/val/player/${PLAYER_ID}/heatmap`) {
      heatmapRequests.push(url)
      if (options.heatmapStatus && options.heatmapStatus !== 200) return route.fulfill({ status: options.heatmapStatus, json: 'Not found' })
      const map = url.searchParams.get('map')
      const type = url.searchParams.get('type')
      if (map === 'Breeze') return route.fulfill({ json: { mapId: BREEZE_ID, mapName: 'Breeze', type, mapTransform: null, points: [], zones: [] } })
      // No death on defense: what the "nothing positioned" state is tested with.
      if (type === 'Deaths') return route.fulfill({ json: url.searchParams.get('side') === 'Defense' ? { ...ascentDeaths, points: [], zones: [] } : ascentDeaths })
      return route.fulfill({ json: ascentKills })
    }
    if (path === `/val/player/${PLAYER_ID}`) return route.fulfill({ json: player })
    if (path === `/val/player/${PLAYER_ID}/rank`) return route.fulfill({ json: [] })
    if (/^\/val\/player\/\d+\/(seasons|mastery|accolades)$/.test(path)) return route.fulfill({ json: [] })
    if (path === `/val/match/player/${PLAYER_ID}`) return route.fulfill({ json: { page: 1, resultsPerPage: 10, total: 0, results: [] } })
    if (path === '/val/player') return route.fulfill({ json: [player] })
    return route.fulfill({ status: 404, json: 'Not mocked' })
  })

  return heatmapRequests
}

/** Opens the profile: its server render fails without an API, and the retry reads the mocked one. */
async function openProfile(page: Page) {
  await page.goto(`/player/${PLAYER_ID}`)
  await expect(page.getByRole('heading', { name: 'L\'API ne répond pas' })).toBeVisible()
  await page.getByRole('button', { name: 'Réessayer' }).click()
  // The heatmap has its own tab, and loads when it opens.
  await page.getByRole('tab', { name: 'Heatmap' }).click()
  await expect(page.getByRole('heading', { name: 'Heatmap', level: 2 })).toBeVisible()
  await expect(page).toHaveURL(/[?&]tab=heatmap/)
}

test.describe('profile heatmap', () => {
  test('draws kills and deaths together on the minimap and lists the zones', async ({ page }) => {
    const requests = await mockApi(page)
    await openProfile(page)

    const points = page.getByTestId('heatmap-points')
    await expect(points).toBeVisible()
    // Four kills, one without a projection: three dots. Two deaths: two crosses.
    await expect(points.locator('circle')).toHaveCount(3)
    await expect(points.locator('[data-kind="death"]')).toHaveCount(2)
    await expect(points).toHaveAttribute('aria-label', /4 kills et 2 morts.*Ascent.*5 points/)
    await expect(page.getByText('4 kills', { exact: true })).toBeVisible()
    await expect(page.getByText('2 morts', { exact: true })).toBeVisible()
    await expect(page.getByText('5 placés sur la carte')).toBeVisible()

    // Kills and deaths merged per zone, busiest first.
    const zones = page.getByTestId('heatmap-zones')
    await expect(zones.getByRole('listitem')).toHaveCount(3)
    await expect(zones.getByRole('button').first()).toHaveAccessibleName('A Main : 2 kills, 1 mort')

    // One request per type: the most played map, both sides, the profile's default period.
    expect(requests.map(request => request.searchParams.get('type')).sort()).toEqual(['Deaths', 'Kills'])
    for (const request of requests) {
      expect(request.searchParams.get('map')).toBe('Ascent')
      expect(request.searchParams.get('side')).toBeNull()
      expect(request.searchParams.get('period')).toBe('Month')
    }
  })

  test('a zone picked in the list isolates its points on the map', async ({ page }) => {
    await mockApi(page)
    await openProfile(page)
    const points = page.getByTestId('heatmap-points')
    await expect(points.locator('circle')).toHaveCount(3)

    const zone = page.getByTestId('heatmap-zones').getByRole('button', { name: /A Main/ })
    await zone.click()
    await expect(zone).toHaveAttribute('aria-pressed', 'true')
    // Mid Courtyard's kill and B Site's death fade; A Main's two kills and its death stay.
    await expect(points.locator('circle[fill-opacity="0.15"]')).toHaveCount(1)
    await expect(points.locator('circle[fill-opacity="0.95"]')).toHaveCount(2)
    await expect(points.locator('[data-kind="death"][opacity="0.15"]')).toHaveCount(1)

    await zone.click()
    await page.mouse.move(0, 0)
    await expect(zone).toHaveAttribute('aria-pressed', 'false')
    await expect(points.locator('circle[fill-opacity="0.15"]')).toHaveCount(0)
  })

  test('sends the side and says why nothing is drawn when there are no positions', async ({ page }) => {
    const requests = await mockApi(page)
    await openProfile(page)
    await expect(page.getByTestId('heatmap-points')).toBeVisible()

    await page.getByRole('group', { name: 'Côté' }).getByRole('button', { name: 'Défense' }).click()
    await expect.poll(() => requests.at(-1)?.searchParams.get('side')).toBe('Defense')

    await page.getByRole('group', { name: 'Kills ou morts' }).getByRole('button', { name: 'Morts', exact: true }).click()
    const empty = page.getByTestId('heatmap-empty')
    await expect(empty).toContainText('Aucune mort positionnée sur Ascent')
    await expect(empty).toContainText('avant l\'enregistrement des positions')
    await expect(page.getByTestId('heatmap-points')).toHaveCount(0)
  })

  test('says a map without a minimap cannot be drawn', async ({ page }) => {
    await mockApi(page)
    await openProfile(page)
    await expect(page.getByTestId('heatmap-points')).toBeVisible()

    await page.getByRole('combobox', { name: /Carte/ }).selectOption('Breeze')
    await expect(page.getByTestId('heatmap-empty')).toContainText('Pas de minimap pour Breeze')
  })

  test('an API without the heatmap route shows it unavailable, not an error', async ({ page }) => {
    await mockApi(page, { heatmapStatus: 404 })
    await openProfile(page)

    await expect(page.getByTestId('heatmap-empty')).toContainText('Heatmap indisponible')
    await expect(page.getByRole('button', { name: 'Réessayer' })).toHaveCount(0)
  })
})
