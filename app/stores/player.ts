import { defineStore } from 'pinia'
import { ref } from 'vue'
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

  return {
    currentPlayer,
    loading,
    fetchCurrentPlayer,
    setCurrentPlayer
  }
})
