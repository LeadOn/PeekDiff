<template>
  <div class="relative min-h-screen overflow-x-clip">
    <div aria-hidden="true" class="bg-page-wash pointer-events-none absolute inset-x-0 top-0 z-0 h-[620px]" />

    <AppHeader />

    <main class="relative z-[1] mx-auto max-w-[1280px] px-4 pt-6 md:px-6 md:pt-10">
      <slot />
    </main>

    <footer class="relative z-[1] mt-24 bg-night text-on-night-2">
      <div class="mx-auto flex max-w-[1280px] flex-wrap items-center gap-y-1 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.06em] md:px-6">
        <span class="mr-3 bg-brand-red-fill px-2 py-0.5 font-bold text-white">PickDiff</span>
        <span class="status-cell">v{{ config.public.appVersion }}</span>
        <a href="https://www.paypal.me/ValentinVirot" target="_blank" rel="noopener noreferrer" class="status-cell transition-colors hover:text-on-night">
          [ Soutenir le projet ]
        </a>
        <span class="status-cell">Créé en France par <a href="https://www.valentinvirot.fr" target="_blank" rel="noopener noreferrer" class="text-on-night-red">LeadOn</a></span>
      </div>
      <p class="mx-auto max-w-[1280px] px-4 pb-4 pt-1 text-[11px] leading-normal text-on-night-2 md:px-6">
        PickDiff n'est pas approuvé par Riot Games et ne reflète pas les opinions de Riot Games ni de quiconque officiellement impliqué dans la production ou la gestion des propriétés Riot Games. Riot Games et toutes les propriétés associées sont des marques commerciales ou des marques déposées de Riot Games, Inc.
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '~/components/ui/AppHeader.vue'
import { useRuntimeConfig } from '#app'

const config = useRuntimeConfig()
</script>

<style scoped>
@reference "../assets/css/main.css";

.status-cell {
  @apply mr-3 border-r border-on-night/15 pr-3 last:border-r-0;
}
</style>
