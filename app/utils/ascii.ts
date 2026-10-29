/**
 * ASCII motif 4 of the design system: a glyph bar, `████░░░░`. Decorative on its own: callers always
 * print the value beside it and give the bar an `aria-label`.
 *
 * `ratio` is clamped to 0–1; a non-zero ratio always lights at least one cell, so a small value is
 * never drawn as an empty bar.
 */
export function glyphBar(ratio: number, cells = 10): { on: string, off: string } {
  const clamped = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0
  const filled = clamped > 0 ? Math.max(1, Math.round(clamped * cells)) : 0
  return { on: '█'.repeat(filled), off: '░'.repeat(cells - filled) }
}
