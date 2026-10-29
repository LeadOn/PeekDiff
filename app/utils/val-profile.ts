/** The identity fields `GET /val/player/{id}` decides on; both the API DTOs and the raw accounts carry them. */
interface ProfileCandidate {
  valorantPuuid?: string | null
  riotGamesPUUID?: string | null
  riotGamesNickname?: string | null
  riotGamesTagLine?: string | null
}

/**
 * Whether an account has a profile page. Mirrors the rule behind `GET /val/player/{id}`, which answers
 * 404 for an account with no Valorant PUUID, no Riot PUUID and no complete Riot ID: linking such an
 * account to `/player/{id}` lands on "Page introuvable".
 */
export function hasValorantProfile(player: ProfileCandidate): boolean {
  return !!player.valorantPuuid || !!player.riotGamesPUUID || hasRiotId(player)
}

/** A complete Riot ID: both the game name and the tag. */
export function hasRiotId(player: Pick<ProfileCandidate, 'riotGamesNickname' | 'riotGamesTagLine'>): boolean {
  return !!player.riotGamesNickname && !!player.riotGamesTagLine
}
