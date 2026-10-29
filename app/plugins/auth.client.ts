import { defineNuxtPlugin } from '#app'
import { useAuthStore } from '~/stores/auth'

/**
 * Resolves session state before the first client render, so the header does not flip from
 * "Se connecter" to the user pill once the page is already on screen.
 *
 * Once the app is mounted, an anonymous visitor gets one silent single sign-on attempt (see
 * `trySilentSignIn`): signed in to JungleDiff, they come back signed in here without a click.
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  const auth = useAuthStore()
  await auth.initAuth()

  nuxtApp.hook('app:mounted', () => {
    auth.trySilentSignIn()
  })
})
