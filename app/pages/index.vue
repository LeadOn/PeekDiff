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
import WeekActivity from '~/components/home/WeekActivity.vue'
import CrewFeed from '~/components/home/CrewFeed.vue'
import CrewRecords from '~/components/home/CrewRecords.vue'
import CrewAgents from '~/components/home/CrewAgents.vue'
import ValMapList from '~/components/val/ValMapList.vue'
import { isSmurf } from '~/utils/val-smurf'

const store = useValStore()

/**
 * Owned by the page because it governs the whole dashboard, not just the ladder. Two mechanisms answer
 * to it: the ladder (and the rank fallbacks) filter the full roster in place, while `/val/home` and
 * `/val/match/last` are re-queried with `includeSmurfs`. Defaults to excluding smurfs.
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

// The handlers replay on every return to the home page (see cacheOnlyDuringHydration); the store's
// freshness windows decide whether the API actually needs to be called again. The three run in
// parallel: awaited one by one, the SSR pass would pay for each in turn. `watch` re-runs the two
// smurf-dependent ones when the toggle flips, and the store's flag guard keeps a cached answer for the
// other flag value from being served.
const freshOnNavigation = { getCachedData: cacheOnlyDuringHydration }
const [{ error: playersError }, { error: homeError }, { error: lastMatchesError }] = await Promise.all([
  useAsyncData('valPlayers', (_nuxtApp, { signal }) => store.fetchPlayers(signal), freshOnNavigation),
  useAsyncData('valHome', (_nuxtApp, { signal }) => store.fetchHomeStats(includeSmurfs.value, signal), { ...freshOnNavigation, watch: [includeSmurfs] }),
  useAsyncData('valLastMatches', (_nuxtApp, { signal }) => store.fetchLastMatches(includeSmurfs.value, signal), { ...freshOnNavigation, watch: [includeSmurfs] }),
])

// The error surfaced by `useAsyncData` is authoritative: an empty list is an answer, not a failure.
// Only the roster is vital: without the recap or the feed (an API older than the match history, or a
// failing aggregate) the page falls back to what the roster alone can say.
const hasApiError = computed(() => playersError.value != null)

const ladder = computed(() => buildLadder(store.players, includeSmurfs.value))

// While a smurf toggle re-queries them, the previous answers stay on screen rather than flashing the
// rank-only fallbacks.
const home = computed(() => (homeError.value == null ? store.homeStats : null))
const activity = computed(() => home.value?.weeklyActivity ?? null)
const hasFeed = computed(() => lastMatchesError.value == null && store.lastMatchesFetchedAt > 0)

/**
 * The API's fact of the week when it serves one (the player is looked up on the ladder for their card
 * and rank), else the best positive `rrChange7DaysValorant`. No card when nobody climbed.
 */
const factOfTheWeek = computed(() => home.value?.factOfTheWeek ?? null)
const playerOfTheWeek = computed(() => {
  const fact = factOfTheWeek.value
  if (fact) {
    const entry = [...ladder.value.ranked, ...ladder.value.unranked].find(candidate => candidate.id === fact.player.id)
    if (entry) return entry
  }
  return ladder.value.ranked
    .filter(entry => (entry.delta ?? 0) > 0)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))[0] ?? null
})
const playerOfTheWeekFact = computed(() => (factOfTheWeek.value && factOfTheWeek.value.player.id === playerOfTheWeek.value?.id ? factOfTheWeek.value : null))

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

const recordsSubtitle = computed(() => {
  const analyzed = home.value?.crewRecords.totalGamesAnalyzed ?? 0
  return `Compétition · 30 derniers jours · ${analyzed} partie${analyzed > 1 ? 's' : ''} analysée${analyzed > 1 ? 's' : ''}`
})

const syncLabel = computed(() => (now.value !== null && lastSyncedAt.value ? `Synchro ${timeAgo(lastSyncedAt.value, now.value)}` : 'Synchro'))

const reloading = ref(false)

/** Re-reads the crew from the API. It does not ask the API to re-synchronise with Riot. */
const reload = async () => {
  if (reloading.value) return
  reloading.value = true
  store.invalidateDashboard()
  try {
    await refreshNuxtData(['valPlayers', 'valHome', 'valLastMatches'])
    now.value = Date.now()
  } finally {
    reloading.value = false
  }
}

useSeoMeta({
  title: 'Accueil',
  description: 'Le crew PeekDiff sur Valorant : classement, semaine de classées, dernières parties et records du mois.'
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

      <template v-if="!hasApiError">
        <WeekActivity v-if="activity" :activity="activity" :crew-size="ladder.visibleCount" />
        <WeekBento v-else :ladder="ladder" />
      </template>

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
          <PlayerOfTheWeek v-if="playerOfTheWeek" :entry="playerOfTheWeek" :fact="playerOfTheWeekFact" class="md:max-rail:col-span-2" />
          <!-- `#parties` is the mobile bar's "Parties" target; the margin clears the sticky header. -->
          <CrewFeed v-if="hasFeed" id="parties" :games="store.lastMatches" class="scroll-mt-20" />
          <LastRankedGames v-else id="parties" :players="visiblePlayers" class="scroll-mt-20" />
          <PeakRecords :entries="[...ladder.ranked, ...ladder.unranked]" />
        </div>
      </aside>
    </div>

    <section v-if="!hasApiError && home" aria-labelledby="crew-records-title" class="mt-12">
      <SectionIndex index="03" label="Records" />
      <div class="mb-5 mt-3 flex flex-wrap items-end justify-between gap-x-5 gap-y-3.5">
        <div class="min-w-0">
          <h2 id="crew-records-title" class="font-display text-[40px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] md:text-5xl">Records du mois</h2>
          <p class="mt-2 font-mono text-[13px] text-text-sec">{{ recordsSubtitle }}</p>
        </div>
        <NuxtLink
          to="/stats"
          class="group inline-flex h-11 items-center gap-1.5 border border-border-strong px-4 font-mono text-[13px] font-medium uppercase tracking-[0.06em] transition-colors duration-150 ease-snap hover:bg-surface-hover"
        >
          <span aria-hidden="true" class="text-text-ter">[</span>Tous les records<Icon name="lucide:arrow-right" class="size-3.5 transition-transform duration-150 ease-snap group-hover:translate-x-0.5" /><span aria-hidden="true" class="text-text-ter">]</span>
        </NuxtLink>
      </div>
      <CrewRecords :records="home.crewRecords" period-phrase="sur 30 jours" ranked-only />
      <div class="mt-4 grid items-start gap-4 md:grid-cols-2">
        <CrewAgents :agents="home.crewRecords.topAgents" period-phrase="sur 30 jours" />
        <ValMapList :maps="home.crewRecords.topMaps" period-phrase="sur 30 jours" as="h3" />
      </div>
    </section>
  </div>
</template>

<style scoped>
@reference "../assets/css/main.css";

.chip {
  @apply inline-flex h-[30px] items-center gap-[7px] border border-border-base bg-surface-base px-3 font-mono text-xs font-medium uppercase tracking-[0.06em] text-text-main;
}
</style>
