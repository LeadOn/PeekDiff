import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ValGameDto, ValHomeStatsDto, ValPlayerDto } from '~/lib/types'
import { useGameOnVal } from '~/composables/useGameOnVal'

/**
 * How long an already-loaded value is reused as-is. Without it, values stay frozen for the whole SPA
 * session: coming back to the home page would show the ranks from the very first load.
 */
const FRESHNESS_MS = 60_000

/** Games in the home page's crew feed. */
const LAST_MATCHES_SIZE = 6

export const useValStore = defineStore('val', () => {
  const players = ref<ValPlayerDto[]>([])
  const homeStats = ref<ValHomeStatsDto | null>(null)
  const lastMatches = ref<ValGameDto[]>([])

  /**
   * Timestamps of the last successful load. Part of the returned state on purpose: `@pinia/nuxt`
   * only serializes what is returned into the SSR payload, and without them the client would restart
   * from 0 right after hydration and replay the requests already made server-side.
   */
  const playersFetchedAt = ref(0)
  const homeStatsFetchedAt = ref(0)
  const lastMatchesFetchedAt = ref(0)

  /**
   * The `includeSmurfs` value the home recap and the feed were loaded with. The freshness window only
   * looks at the clock: without these, toggling smurfs inside it would serve the previous answer.
   * Returned with the state so the client agrees with the SSR payload.
   */
  const homeStatsIncludeSmurfs = ref<boolean | null>(null)
  const lastMatchesIncludeSmurfs = ref<boolean | null>(null)
  /** Same guard for the crew list and the home page's "Sans Valorant" switch. */
  const playersIncludeWithoutValorant = ref<boolean | null>(null)

  const isFresh = (fetchedAt: number) => fetchedAt > 0 && Date.now() - fetchedAt < FRESHNESS_MS

  /**
   * The crew list behind the ladder and its fallbacks, the search palette and a smurf's main on a
   * profile. By default only the members with Valorant data: League of Legends players without a
   * Valorant account are left out unless the home page's "Sans Valorant" switch asks for them. The
   * admin space reads its own list.
   *
   * Propagates its errors: swallowing them would let `useAsyncData` see no error at all and the UI
   * render an empty ladder as though the crew had no ranks.
   */
  const fetchPlayers = async (includeWithoutValorant = false, signal?: AbortSignal): Promise<ValPlayerDto[]> => {
    if (players.value.length > 0 && playersIncludeWithoutValorant.value === includeWithoutValorant && isFresh(playersFetchedAt.value)) {
      return players.value
    }

    const data = await useGameOnVal().getValPlayers({ includeWithoutValorant }, signal)
    players.value = data
    playersFetchedAt.value = Date.now()
    playersIncludeWithoutValorant.value = includeWithoutValorant
    return data
  }

  /**
   * The week's recap, over the last 7 days rather than the API's default calendar week: the ladder's
   * 7-day moves and the tiles then describe the same window. Propagates its errors; the page falls
   * back to the rank-only tiles when it fails, which is what an API build older than 2026-10-29 does.
   */
  const fetchHomeStats = async (includeSmurfs: boolean, signal?: AbortSignal): Promise<ValHomeStatsDto> => {
    if (homeStats.value && homeStatsIncludeSmurfs.value === includeSmurfs && isFresh(homeStatsFetchedAt.value)) {
      return homeStats.value
    }

    const data = await useGameOnVal().getValHome(includeSmurfs, 'Last7Days', signal)
    homeStats.value = data
    homeStatsFetchedAt.value = Date.now()
    homeStatsIncludeSmurfs.value = includeSmurfs
    return data
  }

  /** The crew feed. Same guard and same fallback as `fetchHomeStats`. */
  const fetchLastMatches = async (includeSmurfs: boolean, signal?: AbortSignal): Promise<ValGameDto[]> => {
    if (lastMatchesIncludeSmurfs.value === includeSmurfs && isFresh(lastMatchesFetchedAt.value)) return lastMatches.value

    const data = await useGameOnVal().getValLastMatches({ size: LAST_MATCHES_SIZE, includeSmurfs }, signal)
    lastMatches.value = data.results
    lastMatchesFetchedAt.value = Date.now()
    lastMatchesIncludeSmurfs.value = includeSmurfs
    return data.results
  }

  /**
   * Expires every freshness window so the next load really calls the API. Behind the home page's
   * reload chip: without it, a reload inside the 60 s window would look like it did nothing.
   */
  const invalidateDashboard = () => {
    playersFetchedAt.value = 0
    homeStatsFetchedAt.value = 0
    lastMatchesFetchedAt.value = 0
  }

  return {
    players,
    homeStats,
    lastMatches,
    playersFetchedAt,
    homeStatsFetchedAt,
    lastMatchesFetchedAt,
    homeStatsIncludeSmurfs,
    lastMatchesIncludeSmurfs,
    playersIncludeWithoutValorant,
    fetchPlayers,
    fetchHomeStats,
    fetchLastMatches,
    invalidateDashboard
  }
})
