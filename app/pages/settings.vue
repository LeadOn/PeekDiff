<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { usePlayerStore } from '~/stores/player'
import { useValStore } from '~/stores/val'
import { useGameOnVal } from '~/composables/useGameOnVal'
import { isAbortError } from '~/lib/types/error'
import { playerDisplayName } from '~/utils/val-ladder'
import SectionIndex from '~/components/ui/SectionIndex.vue'
import FrameHead from '~/components/ui/FrameHead.vue'
import ValPlayerCard from '~/components/val/ValPlayerCard.vue'

definePageMeta({
  auth: true
})

useSeoMeta({
  title: 'Paramètres',
  description: 'Gérez votre profil PeekDiff : nom, pseudo et Riot ID.'
})

const authStore = useAuthStore()
const playerStore = usePlayerStore()
const valStore = useValStore()
const client = useGameOnVal()

// Everything here is personal: it is loaded after mount, through the session cookies, and never
// rendered on the server.
const pageRequests = new AbortController()
let successTimer: ReturnType<typeof setTimeout> | undefined

const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const saveError = ref<string | null>(null)

const form = ref({
  fullName: '',
  nickname: '',
  riotGamesNickname: '',
  riotGamesTagLine: '',
})

const player = computed(() => playerStore.currentPlayer)
const name = computed(() => (player.value ? playerDisplayName(player.value) : authStore.displayName ?? 'Mon compte'))

const fillForm = () => {
  if (!player.value) return
  form.value = {
    fullName: player.value.fullName ?? '',
    nickname: player.value.nickname ?? '',
    riotGamesNickname: player.value.riotGamesNickname ?? '',
    riotGamesTagLine: player.value.riotGamesTagLine ?? '',
  }
}

onMounted(async () => {
  try {
    await playerStore.fetchCurrentPlayer(false, pageRequests.signal)
    fillForm()
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  pageRequests.abort()
  clearTimeout(successTimer)
})

const canSave = computed(() => !saving.value && form.value.fullName.trim() !== '' && form.value.nickname.trim() !== '')

const save = async () => {
  if (!player.value || !canSave.value) return
  saving.value = true
  saved.value = false
  saveError.value = null
  try {
    await client.updateCurrentPlayer({
      fullName: form.value.fullName.trim(),
      nickname: form.value.nickname.trim(),
      riotGamesNickname: form.value.riotGamesNickname.trim() || undefined,
      // "#EUW" and "EUW" are the same tag: the API stores it without the hash.
      riotGamesTagLine: form.value.riotGamesTagLine.trim().replace(/^#/, '') || undefined,
    }, pageRequests.signal)
    // The update answers with the raw entity: re-read the profile for the card URLs the header shows.
    await playerStore.fetchCurrentPlayer(true, pageRequests.signal)
    fillForm()
    // Names appear on the ladder: the next visit of `/` must not reuse the cached crew.
    valStore.invalidateDashboard()

    saved.value = true
    clearTimeout(successTimer)
    successTimer = setTimeout(() => { saved.value = false }, 4000)
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[settings] Mise à jour du profil en échec :', e)
    saveError.value = 'La mise à jour n\'a pas pu être enregistrée. Réessayez dans un instant.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-[820px]">
    <SectionIndex index="01" label="Compte" />
    <h1 class="mt-3 font-display text-[40px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] md:text-5xl">Paramètres</h1>

    <div v-if="loading" aria-busy="true" aria-label="Chargement du profil" class="mt-8 flex animate-pulse flex-col gap-4">
      <span class="h-[104px] border border-border-base bg-surface-base" />
      <span class="h-[320px] border border-border-base bg-surface-base" />
    </div>

    <div v-else-if="!player" class="ticks mt-8 border border-brand-red/40 bg-surface-base p-6">
      <p class="font-display text-2xl font-black uppercase leading-none">Profil indisponible</p>
      <p class="mt-2 text-pretty text-sm text-text-sec">
        Impossible de retrouver votre compte GameOn. Le serveur ne répond peut-être pas, ou votre compte n'est pas encore relié au crew.
      </p>
    </div>

    <template v-else>
      <section class="notch notch-edge relative mt-8 flex flex-wrap items-center gap-4 border border-border-base bg-surface-base p-5">
        <ValPlayerCard :src="player.valorantPlayerCardSmallUrl" :name="name" class="size-16 shrink-0" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-xl font-semibold">{{ name }}</p>
          <p class="truncate font-mono text-xs text-text-ter">
            {{ authStore.user?.email ?? authStore.user?.preferredUsername ?? '' }}<template v-if="authStore.isAdmin"> · administrateur</template>
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-if="playerStore.hasProfile"
            :to="playerStore.profilePath"
            class="inline-flex h-10 items-center gap-1.5 border border-border-strong px-3.5 font-mono text-xs font-medium uppercase tracking-[0.06em] transition-colors duration-150 ease-snap hover:bg-surface-hover"
          >
            <span aria-hidden="true" class="text-text-ter">[</span>Mon profil<span aria-hidden="true" class="text-text-ter">]</span>
          </NuxtLink>
          <button
            type="button"
            class="inline-flex h-10 cursor-pointer items-center gap-1.5 px-2 font-mono text-xs font-medium uppercase tracking-[0.06em] text-text-sec transition-colors duration-150 ease-snap hover:text-text-main"
            @click="authStore.logout()"
          >
            <span aria-hidden="true" class="text-text-ter">[</span>Se déconnecter<span aria-hidden="true" class="text-text-ter">]</span>
          </button>
        </div>
      </section>

      <form class="mt-4 border border-border-base bg-surface-base p-5" novalidate @submit.prevent="save">
        <FrameHead title="Identité" aside="visible par le crew" as="h2" />

        <div class="grid gap-4 md:grid-cols-2">
          <label class="field">
            <span class="field-label">Nom complet <span aria-hidden="true">*</span></span>
            <input v-model="form.fullName" type="text" required autocomplete="name" class="field-input">
          </label>
          <label class="field">
            <span class="field-label">Pseudo <span aria-hidden="true">*</span></span>
            <input v-model="form.nickname" type="text" required autocomplete="nickname" class="field-input">
          </label>
        </div>

        <div class="mt-8">
          <FrameHead title="Riot ID" aside="sert à retrouver votre compte Valorant" />
        </div>
        <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
          <label class="field">
            <span class="field-label">Nom de jeu</span>
            <input v-model="form.riotGamesNickname" type="text" placeholder="Ex : LeadOn" autocomplete="off" class="field-input">
          </label>
          <label class="field">
            <span class="field-label">Tag</span>
            <input v-model="form.riotGamesTagLine" type="text" placeholder="Ex : EUW" autocomplete="off" class="field-input font-mono uppercase">
          </label>
        </div>
        <p v-if="playerStore.hasProfile" class="mt-3 text-pretty text-sm text-text-sec">
          Après un changement de Riot ID, lancez une synchronisation depuis votre profil pour récupérer rang et parties.
        </p>
        <p v-else class="mt-3 border border-border-strong bg-surface-high px-4 py-3 text-pretty text-sm">
          Renseignez votre Riot ID pour ouvrir votre profil : rang, performances et dernières parties.
        </p>

        <div class="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            :disabled="!canSave"
            :aria-busy="saving"
            class="notch focus-visible:outline-offset-[-4px] focus-visible:outline-white inline-flex h-11 cursor-pointer items-center gap-2 bg-brand-red-fill pl-5 pr-7 text-sm font-semibold uppercase tracking-[0.08em] text-white transition-[background-color,box-shadow] duration-150 ease-snap hover:bg-brand-red-hover hover:shadow-glow-red disabled:cursor-not-allowed disabled:opacity-40"
          >
            <template v-if="saving"><span aria-hidden="true" class="ascii">[■■■□□]</span> Enregistrement…</template>
            <template v-else>Enregistrer <span aria-hidden="true">▸</span></template>
          </button>
          <p v-if="saved" role="status" class="font-mono text-xs text-win">Profil enregistré.</p>
          <p v-if="saveError" role="alert" class="border border-brand-red/40 bg-brand-red-soft px-3 py-2 text-sm">{{ saveError }}</p>
        </div>
      </form>
    </template>
  </div>
</template>

<style scoped>
@reference "../assets/css/main.css";

.field {
  @apply flex flex-col gap-2;
}

.field-label {
  @apply font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-text-ter;
}

.field-input {
  @apply h-11 border border-border-base bg-surface-sunken px-3 text-sm text-text-main transition-colors duration-150 ease-snap placeholder:text-text-ter hover:border-border-strong focus:border-brand-red focus:outline-none focus-visible:outline-none;
}
</style>
