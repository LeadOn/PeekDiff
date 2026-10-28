<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { refreshNuxtData, useAsyncData } from '#app'
import { useValStore } from '~/stores/val'
import { cacheOnlyDuringHydration } from '~/utils/async-data'
import { buildLadder } from '~/utils/val-ladder'
import { timeAgo } from '~/utils/date'
import SectionIndex from '~/components/ui/SectionIndex.vue'
import WeekBento from '~/components/home/WeekBento.vue'
import CrewLadder from '~/components/home/CrewLadder.vue'
import PlayerOfTheWeek from '~/components/home/PlayerOfTheWeek.vue'
import PeakRecords from '~/components/home/PeakRecords.vue'
import LastRankedGames from '~/components/home/LastRankedGames.vue'
import { isSmurf } from '~/utils/val-smurf'

const store = useValStore()

/**
 * Owned by the page because it governs the whole dashboard, not just the ladder: the tiles, the
 * ladder and the rail are all derived from the same filtered roster. Defaults to excluding smurfs.
 */
const includeSmurfs = ref(false)

// "Synchro il y a 4 min" depends on the reader's clock, and `/` is served from a shared SWR cache:
// the relative time only exists client side, refreshed every minute.
const now = ref<number | null>(null)
let clock: ReturnType<typeof setInterval> | undefined

// Lifecycle hooks go before the first top-level `await`, or they are silently dropped.
onMounted(() => {
  now.value = Date.now()
  clock = setInterval(() => { now.value = Date.now() }, 60_000)
})
onBeforeUnmount(() => clearInterval(clock))

// The handler replays on every return to the home page (see cacheOnlyDuringHydration); the store's
// freshness window is what decides whether the API actually needs to be called again.
const { error: playersError } = await useAsyncData(
  'valPlayers',
  () => store.fetchPlayers(),
  { getCachedData: cacheOnlyDuringHydration }
)

// The error surfaced by `useAsyncData` is authoritative: an empty list is an answer, not a failure.
const hasApiError = computed(() => playersError.value != null)

const ladder = computed(() => buildLadder(store.players, includeSmurfs.value))

/** The best positive 7-day swing; no card when nobody climbed. */
const playerOfTheWeek = computed(() => ladder.value.ranked
  .filter(entry => (entry.delta ?? 0) > 0)
  .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0] ?? null)

const visiblePlayers = computed(() => (includeSmurfs.value ? store.players : store.players.filter(player => !isSmurf(player))))

/** The act most of the crew's current ranks belong to, e.g. "e9a3". */
const currentAct = computed(() => {
  const counts = new Map<string, number>()
  for (const player of store.players) {
    const act = player.valorantCurrentRank?.seasonShort
    if (act) counts.set(act, (counts.get(act) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
})

/** The most recent profile refresh across the crew: when the API last synchronised anyone. */
const lastSyncedAt = computed(() => store.players.reduce<string | null>(
  (latest, player) => (player.valorantRefreshedOn && (!latest || player.valorantRefreshedOn > latest) ? player.valorantRefreshedOn : latest),
  null
))

const syncLabel = computed(() => (now.value !== null && lastSyncedAt.value ? `Synchro ${timeAgo(lastSyncedAt.value, now.value)}` : 'Synchro'))

const reloading = ref(false)

/** Re-reads the crew from the API. It does not ask the API to re-synchronise with Riot. */
const reload = async () => {
  if (reloading.value) return
  reloading.value = true
  store.invalidateDashboard()
  try {
    await refreshNuxtData(['valPlayers'])
    now.value = Date.now()
  } finally {
    reloading.value = false
  }
}

useSeoMeta({
  title: 'Accueil',
  description: 'Le classement Valorant du crew PeekDiff : rangs, progression sur 7 jours et pics de rang.'
})
</script>

<template>
  <div>
    <section aria-label="Le crew en un coup d'œil">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          title="Recharger les données du crew"
          class="chip cursor-pointer transition-colors duration-150 ease-snap hover:border-border-strong hover:bg-surface-hover"
          @click="reload"
        >
          <Icon name="lucide:refresh-cw" class="size-[13px] text-brand-red" :class="reloading ? 'animate-spin' : ''" />
          {{ reloading ? 'Chargement…' : syncLabel }}
        </button>
        <span class="chip">7 derniers jours</span>
        <span v-if="currentAct" class="chip">Acte {{ currentAct }}</span>
      </div>

      <WeekBento v-if="!hasApiError" :ladder="ladder" />

      <div v-else class="ticks flex flex-wrap items-center gap-5 border border-brand-red/40 bg-surface-base p-6">
        <pre aria-hidden="true" class="ascii text-sm text-border-ascii">  │
──<span class="text-brand-red">┼</span>──
  │</pre>
        <div class="min-w-60 flex-1">
          <h2 class="font-display text-3xl font-black uppercase leading-none">L'API ne répond pas</h2>
          <p class="mt-2 text-pretty text-sm text-text-sec">
            Impossible de récupérer le classement du crew. Le serveur semble indisponible pour le moment.
          </p>
        </div>
        <button
          type="button"
          :disabled="reloading"
          class="inline-flex h-11 cursor-pointer items-center gap-2 border border-border-strong px-4 font-mono text-[13px] font-medium uppercase tracking-[0.06em] transition-colors duration-150 ease-snap hover:bg-surface-hover disabled:cursor-wait disabled:opacity-40"
          @click="reload"
        >
          <span aria-hidden="true" class="text-text-ter">[</span>{{ reloading ? 'Chargement…' : 'Réessayer' }}<span aria-hidden="true" class="text-text-ter">]</span>
        </button>
      </div>
    </section>

    <div v-if="!hasApiError" class="mt-12 grid items-start gap-10 rail:grid-cols-[minmax(0,1fr)_340px]">
      <CrewLadder v-model:include-smurfs="includeSmurfs" :ladder="ladder" class="min-w-0" />

      <aside class="min-w-0" aria-label="Le crew cette semaine">
        <SectionIndex index="02" label="Cette semaine" class="mb-4" />
        <div class="grid items-start gap-4 md:max-rail:grid-cols-2">
          <PlayerOfTheWeek v-if="playerOfTheWeek" :entry="playerOfTheWeek" class="md:max-rail:col-span-2" />
          <LastRankedGames :players="visiblePlayers" />
          <PeakRecords :entries="[...ladder.ranked, ...ladder.unranked]" />
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/css/main.css";

.chip {
  @apply inline-flex h-[30px] items-center gap-[7px] border border-border-base bg-surface-base px-3 font-mono text-xs font-medium uppercase tracking-[0.06em] text-text-main;
}
</style>
