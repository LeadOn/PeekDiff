import type { ValMapTransformDto } from '~/lib/types'

/**
 * Game coordinates → minimap, with valorant-api.com's map transform. The result is a fraction of the
 * minimap image, 0–1 on both axes from its top-left corner. The axes are swapped on purpose: the
 * minimap's horizontal axis follows the game's Y, its vertical axis the game's X.
 *
 * Pure, with no runtime import, so the Playwright suite can test it directly.
 */

export interface MinimapPoint {
  /** 0 (left) to 1 (right). */
  x: number
  /** 0 (top) to 1 (bottom). */
  y: number
}

export function projectToMinimap(
  transform: ValMapTransformDto | null | undefined,
  gameX: number | null | undefined,
  gameY: number | null | undefined,
): MinimapPoint | null {
  if (!transform || typeof gameX !== 'number' || typeof gameY !== 'number') return null
  const x = gameY * transform.xMultiplier + transform.xScalarToAdd
  const y = gameX * transform.yMultiplier + transform.yScalarToAdd
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
}

/** Whether a projected point lands on the image, with a small margin for callouts drawn on its edge. */
export function isOnMinimap(point: MinimapPoint, margin = 0.02): boolean {
  return point.x >= -margin && point.x <= 1 + margin && point.y >= -margin && point.y <= 1 + margin
}

/** The point clamped to the image, as CSS percentages for an absolutely positioned marker. */
export function minimapPercent(point: MinimapPoint): { left: string, top: string } {
  const clamp = (value: number) => Math.min(100, Math.max(0, value * 100))
  return { left: `${clamp(point.x).toFixed(2)}%`, top: `${clamp(point.y).toFixed(2)}%` }
}

/**
 * Where someone looks on the minimap, as a unit vector. `viewRadians` is read as an angle in the game's
 * plane from +X towards +Y; the direction goes through the same transform as positions (one game unit
 * along the view), so the axis swap and any flipped multiplier apply to it too. `null` when unknown.
 */
export function minimapDirection(
  transform: ValMapTransformDto | null | undefined,
  viewRadians: number | null | undefined,
): MinimapPoint | null {
  if (!transform || typeof viewRadians !== 'number' || !Number.isFinite(viewRadians)) return null
  const dx = Math.sin(viewRadians) * transform.xMultiplier
  const dy = Math.cos(viewRadians) * transform.yMultiplier
  const length = Math.hypot(dx, dy)
  return length > 0 ? { x: dx / length, y: dy / length } : null
}

/**
 * A view cone in a 0–100 SVG box: a triangle from the point along `direction`, `length` long (as a
 * fraction of the minimap) and `spread` radians wide on each side.
 */
export function viewConePath(point: MinimapPoint, direction: MinimapPoint, length = 0.07, spread = 0.45): string {
  const angle = Math.atan2(direction.y, direction.x)
  const corner = (offset: number) => ({
    x: (point.x + Math.cos(angle + offset) * length) * 100,
    y: (point.y + Math.sin(angle + offset) * length) * 100,
  })
  const left = corner(-spread)
  const right = corner(spread)
  const at = (value: number) => value.toFixed(2)
  return `M${at(point.x * 100)},${at(point.y * 100)} L${at(left.x)},${at(left.y)} L${at(right.x)},${at(right.y)} Z`
}
