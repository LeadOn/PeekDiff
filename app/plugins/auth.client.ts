import { defineNuxtPlugin } from '#app'
import { useAuthStore } from '~/stores/auth'

/**
 * Resolves session state before the first client render, so the header does not flip from
 * "Se connecter" to the user pill once the page is already on screen.
 */
export default defineNuxtPlugin(async () => {
  await useAuthStore().initAuth()
})
