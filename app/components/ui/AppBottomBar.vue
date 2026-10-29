<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from '#app'
import { useAuthStore } from '~/stores/auth'
import { usePlayerStore } from '~/stores/player'
import { useSearchPalette } from '~/composables/useSearchPalette'

/**
 * The mobile bottom bar of the design system (§7): `night`, four entries with icon and label — Crew,
 * Parties (the home page's crew feed), Recherche (the palette) and Profil. Below `md` only: the header
 * carries navigation and search above it.
 */
const route = useRoute()
const authStore = useAuthStore()
const playerStore = usePlayerStore()
const palette = useSearchPalette()

/**
 * The viewer's own profile; settings until `/player/me` answers or while the account has no Riot ID;
 * sign-in when anonymous.
 */
const profileLink = computed(() => (authStore.isAuthenticated ? playerStore.profilePath : null))

const isProfileActive = computed(() => !!profileLink.value && route.path === profileLink.value)
</script>

<template>
  <nav
    aria-label="Navigation mobile"
    class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-on-night/10 bg-night pb-[env(safe-area-inset-bottom,0px)] text-on-night-2 md:hidden"
  >
    <NuxtLink to="/" class="bar-item" :class="route.path === '/' && !route.hash ? 'bar-item-active' : ''">
      <Icon name="lucide:trophy" class="size-5" />Crew
    </NuxtLink>
    <NuxtLink to="/#parties" class="bar-item" :class="route.path === '/' && route.hash === '#parties' ? 'bar-item-active' : ''">
      <Icon name="lucide:swords" class="size-5" />Parties
    </NuxtLink>
    <button type="button" class="bar-item cursor-pointer" :class="palette.isOpen.value ? 'bar-item-active' : ''" @click="palette.open()">
      <Icon name="lucide:search" class="size-5" />Recherche
    </button>
    <ClientOnly>
      <NuxtLink v-if="profileLink" :to="profileLink" class="bar-item" :class="isProfileActive ? 'bar-item-active' : ''">
        <Icon name="lucide:user" class="size-5" />Profil
      </NuxtLink>
      <button v-else type="button" class="bar-item cursor-pointer" @click="authStore.login()">
        <Icon name="lucide:log-in" class="size-5" />Connexion
      </button>
      <template #fallback>
        <span class="bar-item" aria-hidden="true"><Icon name="lucide:user" class="size-5" />Profil</span>
      </template>
    </ClientOnly>
  </nav>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.bar-item {
  @apply flex h-16 flex-col items-center justify-center gap-1 border-t-2 border-transparent font-mono text-[10px] font-medium uppercase tracking-[0.08em] transition-colors duration-150 ease-snap hover:text-on-night focus-visible:outline-offset-[-4px];
}

.bar-item-active {
  @apply border-on-night-red text-on-night;
}
</style>
