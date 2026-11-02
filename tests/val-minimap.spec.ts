import { expect, test } from '@playwright/test'
import { isOnMinimap, minimapDirection, minimapPercent, projectToMinimap, viewConePath } from '../app/utils/val-minimap'
import { accoladeLabel, parseActWins, parsePrestige } from '../app/utils/val-labels'

/**
 * Pure helpers of the match minimap and the profile heatmap. No server, no browser: these run in the
 * test process itself, alongside the e2e suite, so they need neither an API nor a build to be useful.
 */

/** Ascent's transform as valorant-api.com serves it. */
const ASCENT = {
  minimapUrl: 'https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/displayicon.png',
  xMultiplier: 0.00007,
  yMultiplier: -0.00007,
  xScalarToAdd: 0.813895,
  yScalarToAdd: 0.573242,
}

test.describe('projectToMinimap', () => {
  test('swaps the axes: minimap X follows game Y, minimap Y follows game X', () => {
    const point = projectToMinimap(ASCENT, -1000, 2000)
    expect(point).not.toBeNull()
    expect(point!.x).toBeCloseTo(2000 * 0.00007 + 0.813895, 9)
    expect(point!.y).toBeCloseTo(-1000 * -0.00007 + 0.573242, 9)
  })

  test('applies each multiplier and offset to its own axis', () => {
    const transform = { minimapUrl: null, xMultiplier: 2, yMultiplier: 3, xScalarToAdd: 0.1, yScalarToAdd: 0.2 }
    expect(projectToMinimap(transform, 1, 10)).toEqual({ x: 20.1, y: 3.2 })
    expect(projectToMinimap(transform, 0, 0)).toEqual({ x: 0.1, y: 0.2 })
  })

  test('answers null rather than a made-up point when anything is unknown', () => {
    expect(projectToMinimap(null, 1, 2)).toBeNull()
    expect(projectToMinimap(undefined, 1, 2)).toBeNull()
    expect(projectToMinimap(ASCENT, null, 2)).toBeNull()
    expect(projectToMinimap(ASCENT, 1, undefined)).toBeNull()
    expect(projectToMinimap(ASCENT, Number.NaN, 2)).toBeNull()
    expect(projectToMinimap({ ...ASCENT, xMultiplier: Number.POSITIVE_INFINITY }, 1, 2)).toBeNull()
  })

  test('keeps 0 as a real coordinate', () => {
    expect(projectToMinimap(ASCENT, 0, 0)).toEqual({ x: 0.813895, y: 0.573242 })
  })
})

test.describe('minimap placement', () => {
  test('isOnMinimap accepts the image and a small margin, nothing beyond', () => {
    expect(isOnMinimap({ x: 0, y: 1 })).toBe(true)
    expect(isOnMinimap({ x: -0.01, y: 1.01 })).toBe(true)
    expect(isOnMinimap({ x: -0.1, y: 0.5 })).toBe(false)
    expect(isOnMinimap({ x: 0.5, y: 1.2 })).toBe(false)
  })

  test('minimapPercent gives clamped CSS percentages', () => {
    expect(minimapPercent({ x: 0.25, y: 0.5 })).toEqual({ left: '25.00%', top: '50.00%' })
    expect(minimapPercent({ x: -0.5, y: 1.5 })).toEqual({ left: '0.00%', top: '100.00%' })
  })
})

test.describe('minimapDirection', () => {
  test('goes through the same axis swap as positions', () => {
    // Looking along +X in game: on the minimap, along the vertical axis, flipped by Ascent's negative multiplier.
    const alongX = minimapDirection(ASCENT, 0)!
    expect(alongX.x).toBeCloseTo(0, 9)
    expect(alongX.y).toBeCloseTo(-1, 9)
    // Looking along +Y in game: along the minimap's horizontal axis.
    const alongY = minimapDirection(ASCENT, Math.PI / 2)!
    expect(alongY.x).toBeCloseTo(1, 9)
    expect(alongY.y).toBeCloseTo(0, 9)
  })

  test('is a unit vector, and null when the view is unknown', () => {
    const direction = minimapDirection(ASCENT, 1.234)!
    expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1, 9)
    expect(minimapDirection(ASCENT, null)).toBeNull()
    expect(minimapDirection(null, 1)).toBeNull()
    expect(minimapDirection(ASCENT, Number.NaN)).toBeNull()
  })

  test('viewConePath starts at the point, in the 0–100 box', () => {
    const path = viewConePath({ x: 0.5, y: 0.25 }, { x: 1, y: 0 })
    expect(path.startsWith('M50.00,25.00 L')).toBe(true)
    expect(path.endsWith('Z')).toBe(true)
  })
})

test.describe('raw JSON fields and labels', () => {
  test('parsePrestige reads the counts, highest family first, and drops anything unreadable', () => {
    expect(parsePrestige('{"DIAMOND":{"count":6},"ASCENDANT":{"count":2},"GOLD":{"count":0},"BOGUS":{"count":3}}'))
      .toEqual([{ family: 'ascendant', count: 2 }, { family: 'diamond', count: 6 }])
    expect(parsePrestige('not json')).toEqual([])
    expect(parsePrestige(null)).toEqual([])
    expect(parsePrestige('[1,2]')).toEqual([])
  })

  test('parseActWins keeps the tier ids, best first', () => {
    expect(parseActWins('[12, 15, "x", 9]')).toEqual([15, 12, 9])
    expect(parseActWins('{}')).toEqual([])
    expect(parseActWins(undefined)).toEqual([])
  })

  test('accoladeLabel words every known type in French and never prints a raw code', () => {
    expect(accoladeLabel('first_blood')).toBe('Premier sang')
    expect(accoladeLabel('headshot_percentage')).toBe('Headshots')
    expect(accoladeLabel('some_new_riot_code')).toBe('Distinction')
  })
})
