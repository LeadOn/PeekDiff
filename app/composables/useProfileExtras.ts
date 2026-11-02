import { onBeforeUnmount, ref } from 'vue'
import type { Ref } from 'vue'
import type { ValAccoladeSummaryDto, ValAgentMasteryDto, ValPremierTeamDto, ValSeasonResultDto } from '~/lib/types'
import { errorStatusCode, isAbortError } from '~/lib/types/error'
import { useGameOnVal } from '~/composables/useGameOnVal'

/**
 * A secondary read of the profile. `unavailable` is a 404: an API older than these routes (2026-11),
 * which the page shows as "nothing to show" rather than as a failure.
 */
export interface Loadable<T> {
  status: 'loading' | 'ready' | 'unavailable' | 'error'
  data: T | null
}

const loading = <T>(): Loadable<T> => ({ status: 'loading', data: null })

/**
 * The profile's career data, none of it tied to a filter: end-of-act results, agent mastery,
 * accolades, and the Premier team when the account has one. Read after mount, each on its own (one
 * failing does not hide the others), cancelled when the page goes away or `load` runs again.
 */
export function useProfileExtras(playerId: string) {
  const client = useGameOnVal()

  const seasons: Ref<Loadable<ValSeasonResultDto[]>> = ref(loading())
  const mastery: Ref<Loadable<ValAgentMasteryDto[]>> = ref(loading())
  const accolades: Ref<Loadable<ValAccoladeSummaryDto[]>> = ref(loading())
  const premier = ref<ValPremierTeamDto | null>(null)

  let controller: AbortController | null = null

  async function read<T>(target: Ref<Loadable<T>>, fetcher: (signal: AbortSignal) => Promise<T>, signal: AbortSignal, what: string) {
    target.value = loading()
    try {
      target.value = { status: 'ready', data: await fetcher(signal) }
    } catch (e) {
      if (isAbortError(e)) return
      if (errorStatusCode(e) === 404) {
        target.value = { status: 'unavailable', data: null }
        return
      }
      console.error(`[player] ${what} indisponible :`, e)
      target.value = { status: 'error', data: null }
    }
  }

  async function readPremier(teamId: string | null | undefined, signal: AbortSignal) {
    premier.value = null
    if (!teamId) return
    try {
      premier.value = await client.getValPremierTeam(teamId, signal)
    } catch (e) {
      // 404: a team the API does not know (yet). The hero keeps the role it already has.
      if (!isAbortError(e) && errorStatusCode(e) !== 404) console.error('[player] Équipe Premier indisponible :', e)
    }
  }

  function load(premierTeamId: string | null | undefined) {
    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal
    read(seasons, s => client.getValPlayerSeasons(playerId, s), signal, 'Saisons')
    read(mastery, s => client.getValPlayerMastery(playerId, s), signal, 'Maîtrise')
    read(accolades, s => client.getValPlayerAccolades(playerId, s), signal, 'Accolades')
    readPremier(premierTeamId, signal)
  }

  onBeforeUnmount(() => controller?.abort())

  return { seasons, mastery, accolades, premier, load }
}
