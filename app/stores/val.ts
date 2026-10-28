import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ValPlayerDto } from '~/lib/types'
import { useGameOnVal } from '~/composables/useGameOnVal'

/**
 * How long an already-loaded value is reused as-is. Without it, values stay frozen for the whole SPA
 * session: coming back to the home page would show the ranks from the very first load.
 */
const FRESHNESS_MS = 60_000

export const useValStore = defineStore('val', () => {
  const players = ref<ValPlayerDto[]>([])

  /**
   * Timestamp of the last successful load. Part of the returned state on purpose: `@pinia/nuxt`
   * only serializes what is returned into the SSR payload, and without it the client would restart
   * from 0 right after hydration and replay the request already made server-side.
   */
  const playersFetchedAt = ref(0)

  const isFresh = (fetchedAt: number) => fetchedAt > 0 && Date.now() - fetchedAt < FRESHNESS_MS

  /**
   * Propagates its errors: swallowing them would let `useAsyncData` see no error at all and the UI
   * render an empty ladder as though the crew had no ranks.
   */
  const fetchPlayers = async (signal?: AbortSignal): Promise<ValPlayerDto[]> => {
    if (players.value.length > 0 && isFresh(playersFetchedAt.value)) return players.value

    const data = await useGameOnVal().getValPlayers(false, signal)
    players.value = data
    playersFetchedAt.value = Date.now()
    return data
  }

  /**
   * Expires the freshness window so the next load really calls the API. Behind the home page's
   * reload chip: without it, a reload inside the 60 s window would look like it did nothing.
   */
  const invalidateDashboard = () => {
    playersFetchedAt.value = 0
  }

  return {
    players,
    playersFetchedAt,
    fetchPlayers,
    invalidateDashboard
  }
})
