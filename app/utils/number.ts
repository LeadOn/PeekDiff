/**
 * Number formatting shared by the dashboard. French typography: a real minus sign, a comma for the
 * decimal separator, a narrow no-break space before "%".
 */

/** "+12", "−7", "0". */
export function formatSigned(value: number): string {
  if (value > 0) return `+${value}`
  if (value < 0) return `−${Math.abs(value)}`
  return '0'
}

/** "54 %" */
export function formatPercent(value: number): string {
  return `${Math.round(value)}\u202F%`
}

const decimalFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

/** "3,8", "1 234" — at most one decimal. */
export function formatDecimal(value: number): string {
  return decimalFormat.format(value)
}

/** Win rate of a record, `null` when nothing was played. */
export function computeWinRate(wins: number, losses: number): number | null {
  const games = wins + losses
  return games > 0 ? Math.round((wins / games) * 100) : null
}
