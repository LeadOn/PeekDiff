<script setup lang="ts">
import { computed } from 'vue'
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const isNotFound = computed(() => props.error?.statusCode === 404)
const isForbidden = computed(() => props.error?.statusCode === 403)

const title = computed(() => {
  if (isNotFound.value) return 'Page introuvable'
  if (isForbidden.value) return 'Accès réservé'
  return 'Une erreur est survenue'
})

const message = computed(() => {
  if (isNotFound.value) return "Cette page n'existe pas ou a été déplacée."
  return props.error?.statusMessage || props.error?.message || "Quelque chose s'est mal passé de notre côté."
})

useSeoMeta({
  title: computed(() => {
    if (isNotFound.value) return 'Page introuvable'
    if (isForbidden.value) return 'Accès réservé'
    return 'Erreur'
  }),
})

const handleHome = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="relative flex min-h-screen flex-col overflow-hidden">
    <div aria-hidden="true" class="bg-page-wash pointer-events-none absolute inset-0 z-0" />

    <div class="relative z-10 flex flex-grow flex-col">
      <header class="mx-auto flex w-full max-w-[1280px] items-center px-4 py-4 md:px-6">
        <NuxtLink to="/" class="flex items-center gap-2.5">
          <img src="~/assets/img/PeekDiff_Logo.png" alt="" width="128" height="128" class="size-10 object-contain">
          <span class="font-display text-[26px] font-black uppercase leading-none tracking-[0.02em] text-text-main">Peek<span class="text-brand-red">/</span>Diff</span>
        </NuxtLink>
      </header>

      <main class="mx-auto flex w-full max-w-[1280px] flex-grow flex-col items-center justify-center gap-5 px-4 py-24 text-center">
        <pre aria-hidden="true" class="ascii text-sm text-border-ascii">      │
   ───<span class="text-brand-red">┼</span>───
      │</pre>
        <p class="font-mono text-sm font-bold tracking-widest text-brand-red">
          // {{ error?.statusCode || 500 }}
        </p>
        <h1 class="font-display text-5xl font-black uppercase leading-none md:text-6xl">
          {{ title }}
        </h1>
        <p class="max-w-md text-text-sec">
          {{ message }}
        </p>
        <button
          type="button"
          class="notch focus-visible:outline-offset-[-4px] focus-visible:outline-white mt-2 inline-flex h-11 cursor-pointer items-center gap-2 bg-brand-red-fill pl-5 pr-7 text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors duration-150 ease-snap hover:bg-brand-red-hover"
          @click="handleHome"
        >
          Retour à l'accueil <span aria-hidden="true">▸</span>
        </button>
      </main>
    </div>
  </div>
</template>
