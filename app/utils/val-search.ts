import type { ValPlayerDto } from '~/lib/types'

/**
 * Resolving a crew member by name, for the search palette.
 *
 * The GameOn API has no search by name: profiles are `GET /val/player/{id:int}` only. The crew is a
 * closed set the ladder already loads, so names are matched locally, as JungleDiff does.
 */

/** Lowercase, accent-free, trimmed — so we compare what people actually type. */
export const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

const candidateNames = (player: ValPlayerDto): string[] => {
  const riotId = player.riotGamesNickname && player.riotGamesTagLine
    ? `${player.riotGamesNickname}#${player.riotGamesTagLine}`
    : null

  return [player.riotGamesNickname, riotId, player.nickname, player.fullName]
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
}

/**
 * Every player matching the query — Riot ID, nickname or full name — exact matches first, the given
 * order kept otherwise. An empty query matches everyone.
 */
export const filterPlayersByName = <T extends ValPlayerDto>(players: T[], query: string): T[] => {
  const needle = normalizeSearchText(query)
  if (!needle) return players

  const names = (player: T) => candidateNames(player).map(normalizeSearchText)
  const matching = players.filter(player => names(player).some(name => name.includes(needle)))
  const exact = matching.filter(player => names(player).some(name => name === needle))
  return [...exact, ...matching.filter(player => !exact.includes(player))]
}
