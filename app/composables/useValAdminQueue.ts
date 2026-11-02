import { useState } from '#app'
import type { ValBackgroundQueueStatusDto } from '~/lib/types'
import { useGameOnVal } from '~/composables/useGameOnVal'

/**
 * The API's Valorant background queue as the admin space last saw it, shared by the "Données
 * Valorant" block (which shows it and polls it) and the account rows (which queue work for one
 * account). Every enqueuing route answers with the queue's new state: `apply` it, and the block's
 * polling picks up from there.
 */
export function useValAdminQueue() {
  const client = useGameOnVal()
  const status = useState<ValBackgroundQueueStatusDto | null>('val-admin-queue', () => null)

  function apply(next: ValBackgroundQueueStatusDto) {
    status.value = next
  }

  async function refresh(signal?: AbortSignal) {
    status.value = await client.getValBackgroundQueue(signal)
  }

  return { status, apply, refresh }
}
