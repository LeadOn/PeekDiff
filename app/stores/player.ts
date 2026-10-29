import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ValPlayerDto } from '~/lib/types'
import { useGameOnVal } from '~/composables/useGameOnVal'
import { useAuthStore } from './auth'

export const usePlayerStore = defineStore('player', () => {
  const currentPlayer = ref<ValPlayerDto | null>(null)
  const loading = ref(false)

  const fetchCurrentPlayer = async (force = false, signal?: AbortSignal): Promise<void> => {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      currentPlayer.value = null
      return
    }

    if (currentPlayer.value && !force) return

    loading.value = true
    try {
      currentPlayer.value = await useGameOnVal().getCurrentPlayer(signal)
    } catch (error) {
      // This call only feeds the header pill and the ladder's "Vous": a failure must not break
      // navigation.
      console.error('[player] Current player profile unavailable:', error)
      currentPlayer.value = null
    } finally {
      loading.value = false
    }
  }

  const setCurrentPlayer = (player: ValPlayerDto | null) => {
    currentPlayer.value = player
  }

  /**
   * Whether the signed-in account has a profile page. Mirrors the rule behind `GET /val/player/{id}`,
   * which answers 404 for an account with no Valorant PUUID, no Riot PUUID and no complete Riot ID:
   * a crew member who never entered one would land on "Page introuvable".
   */
  const hasProfile = computed(() => {
    const player = currentPlayer.value
    if (!player) return false
    return !!player.valorantPuuid || !!player.riotGamesPUUID || (!!player.riotGamesNickname && !!player.riotGamesTagLine)
  })

  /** The viewer's profile, or the settings where the Riot ID is entered (also until `/player/me` answers). */
  const profilePath = computed(() => (currentPlayer.value && hasProfile.value ? `/player/${currentPlayer.value.id}` : '/settings'))

  return {
    currentPlayer,
    loading,
    hasProfile,
    profilePath,
    fetchCurrentPlayer,
    setCurrentPlayer
  }
})
