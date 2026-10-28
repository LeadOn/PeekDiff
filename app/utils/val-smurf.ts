/** The shape the predicate actually needs: the ladder rows and the raw player DTOs both satisfy it. */
interface SmurfCandidate {
  id: number
  primaryPlayerId?: number | null
}

/**
 * A secondary account.
 *
 * Both extra guards are load-bearing and neither is decorative: the API returns `primaryPlayerId`
 * pointing at the account itself for some main accounts, and `0` for others, so the short
 * `!!primaryPlayerId` form crowns real mains as smurfs. Same rule as JungleDiff, kept in one place
 * so the ladder and the docs cannot drift apart.
 */
export function isSmurf(player: SmurfCandidate): boolean {
  const primary = player.primaryPlayerId
  return !!primary && primary !== player.id && primary !== 0
}
