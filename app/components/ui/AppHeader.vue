<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { usePlayerStore } from '~/stores/player'
import { useSearchPalette } from '~/composables/useSearchPalette'
import { applyTheme, isLightTheme } from '~/utils/theme'
import ValPlayerCard from '~/components/val/ValPlayerCard.vue'

const authStore = useAuthStore()
const playerStore = usePlayerStore()
const palette = useSearchPalette()
const isLight = ref(false)

/** "⌘K" on Apple platforms, "Ctrl K" elsewhere; read after mount, the server cannot know. */
const shortcutLabel = ref('⌘K')

// The current player only feeds the header pill and the ladder's "Vous": abort the request if the
// header goes away before the response, rather than leaving a pending state write behind.
const profileRequest = new AbortController()

onMounted(() => {
  // `public/theme-init.js` already set the class before render; here we only mirror the document's
  // actual state into the component.
  isLight.value = isLightTheme()
  if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) shortcutLabel.value = 'Ctrl K'

  if (authStore.isAuthenticated) {
    playerStore.fetchCurrentPlayer(false, profileRequest.signal)
  }
})

onBeforeUnmount(() => profileRequest.abort())

watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    playerStore.fetchCurrentPlayer(false, profileRequest.signal)
  } else {
    playerStore.setCurrentPlayer(null)
  }
})

const profileLabel = computed(() =>
  playerStore.currentPlayer?.riotGamesNickname
  || playerStore.currentPlayer?.nickname
  || authStore.displayName
  || 'Mon compte'
)

/** The player's own profile once `/player/me` answered; settings until then (or without a GameOn account). */
const profileLink = computed(() => (playerStore.currentPlayer ? `/player/${playerStore.currentPlayer.id}` : '/settings'))

const toggleTheme = () => {
  isLight.value = !isLight.value
  applyTheme(isLight.value ? 'light' : 'dark')
}
</script>

<template>
  <header class="bg-header sticky top-0 z-20 border-b border-border-base backdrop-blur-[10px]">
    <div class="mx-auto flex h-[60px] max-w-[1280px] items-center gap-3 px-4 md:gap-6 md:px-6">
      <NuxtLink to="/" aria-label="PeekDiff, accueil" class="flex shrink-0 items-center gap-2.5">
        <img src="~/assets/img/PeekDiff_Logo.png" alt="" width="128" height="128" class="size-10 object-contain">
        <span class="font-display text-[26px] font-black uppercase leading-none tracking-[0.02em] text-text-main">Peek<span class="text-brand-red">/</span>Diff</span>
      </NuxtLink>

      <nav aria-label="Navigation principale" class="hidden items-center gap-5 md:flex">
        <NuxtLink to="/" class="nav-link">Crew</NuxtLink>
        <NuxtLink to="/stats" class="nav-link">Records</NuxtLink>
      </nav>

      <span class="flex-1" />

      <!-- Phones search from the bottom bar. -->
      <button
        type="button"
        aria-label="Chercher un joueur du crew"
        aria-keyshortcuts="Meta+K Control+K /"
        class="hidden h-10 cursor-pointer items-center gap-2 border border-border-base bg-surface-sunken px-3 font-mono text-xs text-text-ter transition-colors duration-150 ease-snap hover:border-border-strong hover:text-text-sec md:flex lg:w-60"
        @click="palette.open()"
      >
        <span aria-hidden="true">&gt;_</span>
        <span class="hidden flex-1 text-left lg:inline">chercher un joueur</span>
        <kbd class="border border-border-base px-1.5 py-0.5 font-mono text-[10px] text-text-sec">{{ shortcutLabel }}</kbd>
      </button>

      <div class="flex items-center gap-2">
        <button
          type="button"
          :aria-label="isLight ? 'Passer au thème sombre' : 'Passer au thème clair'"
          :title="isLight ? 'Thème sombre' : 'Thème clair'"
          class="flex size-10 cursor-pointer items-center justify-center border border-border-base text-text-sec transition-colors duration-150 ease-snap hover:border-border-strong hover:text-text-main"
          @click="toggleTheme"
        >
          <Icon :name="isLight ? 'lucide:moon' : 'lucide:sun'" class="size-[18px]" />
        </button>

        <ClientOnly>
          <div v-if="authStore.isAuthenticated" class="flex items-center gap-2">
            <NuxtLink
              :to="profileLink"
              :aria-label="`${profileLabel}, ${playerStore.currentPlayer ? 'mon profil' : 'paramètres'}`"
              class="flex h-10 items-center gap-2 border border-border-base p-1 transition-colors duration-150 ease-snap hover:border-border-strong lg:pr-3"
            >
              <ValPlayerCard :src="playerStore.currentPlayer?.valorantPlayerCardSmallUrl" :name="profileLabel" class="size-8" />
              <span class="hidden max-w-[150px] truncate text-sm font-semibold lg:block">{{ profileLabel }}</span>
            </NuxtLink>
            <NuxtLink
              to="/settings"
              aria-label="Paramètres"
              title="Paramètres"
              class="flex size-10 items-center justify-center border border-border-base text-text-sec transition-colors duration-150 ease-snap hover:border-border-strong hover:text-text-main"
            >
              <Icon name="lucide:settings" class="size-[18px]" />
            </NuxtLink>
            <button
              type="button"
              aria-label="Se déconnecter"
              title="Se déconnecter"
              class="hidden size-10 sm:flex cursor-pointer items-center justify-center border border-border-base text-text-sec transition-colors duration-150 ease-snap hover:border-border-strong hover:text-text-main"
              @click="authStore.logout()"
            >
              <Icon name="lucide:log-out" class="size-[18px]" />
            </button>
          </div>
          <button
            v-else
            type="button"
            class="notch focus-visible:outline-offset-[-4px] focus-visible:outline-white flex h-10 cursor-pointer items-center whitespace-nowrap bg-brand-red-fill pl-3 pr-5 text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors duration-150 ease-snap hover:bg-brand-red-hover md:pl-4 md:pr-6"
            @click="authStore.login()"
          >
            <span class="md:hidden">Connexion</span>
            <span class="hidden md:inline">Se connecter</span>
          </button>
          <template #fallback>
            <div class="h-10 w-10 animate-pulse border border-border-base bg-surface-base md:w-32" />
          </template>
        </ClientOnly>
      </div>
    </div>
  </header>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.nav-link {
  @apply border-b-2 border-transparent py-[19px] font-mono text-xs font-medium uppercase tracking-[0.08em] text-text-sec transition-colors duration-150 hover:text-text-main;
}

.nav-link[aria-current='page'] {
  @apply border-brand-red text-text-main;
}
</style>
