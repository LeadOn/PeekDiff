<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAsyncData, useRoute, useRouter } from '#app'
import type { ValGameDto, ValRankHistoryDto } from '~/lib/types'
import { AppError, errorStatusCode, isAbortError } from '~/lib/types/error'
import { useGameOnVal } from '~/composables/useGameOnVal'
import { useNow } from '~/composables/useNow'
import { useAuthStore } from '~/stores/auth'
import { usePlayerStore } from '~/stores/player'
import { useValStore } from '~/stores/val'
import { cacheOnlyDuringHydration } from '~/utils/async-data'
import { parisDayKey } from '~/utils/date'
import { playerDisplayName } from '~/utils/val-ladder'
import { buildGameLine, groupGamesByDay, QUEUE_FILTERS } from '~/utils/val-match'
import type { GameLine } from '~/utils/val-match'
import { DEFAULT_PROFILE_PERIOD, PROFILE_PERIODS, parseProfilePeriod, profilePeriod } from '~/utils/val-period'
import type { ProfilePeriod } from '~/utils/val-period'
import SectionIndex from '~/components/ui/SectionIndex.vue'
import SegmentSwitch from '~/components/ui/SegmentSwitch.vue'
import ProfileHero from '~/components/profile/ProfileHero.vue'
import ProfileKpis from '~/components/profile/ProfileKpis.vue'
import ProfileRankProgress from '~/components/profile/ProfileRankProgress.vue'
import ProfileAgents from '~/components/profile/ProfileAgents.vue'
import ValMapList from '~/components/val/ValMapList.vue'
import ProfileDuos from '~/components/profile/ProfileDuos.vue'
import ValMatchRow from '~/components/val/ValMatchRow.vue'

const route = useRoute()
const router = useRouter()
const client = useGameOnVal()
const authStore = useAuthStore()
const playerStore = usePlayerStore()
const valStore = useValStore()

/**
 * The API only knows `GET /val/player/{id:int}`: a non-numeric segment cannot designate anyone, and
 * deciding it here yields a genuine 404 instead of a call doomed to fail.
 */
const playerId = String(route.params.id)
const isValidPlayerId = /^\d+$/.test(playerId)

const HISTORY_PAGE_SIZE = 10
const RANK_CHANGES_LIMIT = 50

/** Kept in the query string, so a filtered profile can be shared and survives a reload. */
const period = ref<ProfilePeriod>(parseProfilePeriod(route.query.period))
const queue = ref<string | null>(QUEUE_FILTERS.some(option => option.value === route.query.queue) ? route.query.queue as string : null)

const periodOption = computed(() => profilePeriod(period.value))
const queueList = computed(() => (queue.value ? [queue.value] : undefined))

/**
 * Secondary requests (stats on a filter change, rank history, games) are cancelled when the page is
 * left or a filter changes, so a late response cannot overwrite the state of a newer one.
 */
let pageRequests = new AbortController()
// The crew list is not tied to a filter: its own controller, aborted only when the page goes away.
const crewRequest = new AbortController()
const restartRequests = () => {
  pageRequests.abort()
  pageRequests = new AbortController()
  return pageRequests.signal
}

const now = useNow()
const isMounted = ref(false)

// Lifecycle hooks go before the first top-level `await`, or they are silently dropped.
// `loadSecondaryData` is a hoisted function declaration, so referencing it here is safe.
onMounted(() => {
  isMounted.value = true
  loadSecondaryData()
})
onBeforeUnmount(() => {
  pageRequests.abort()
  crewRequest.abort()
})

const { data: player, error, refresh: reloadPlayer } = await useAsyncData(
  `val-player-${playerId}`,
  () => {
    if (!isValidPlayerId) throw new AppError('Joueur introuvable', 404)
    return client.getValPlayerById(playerId, { period: periodOption.value.api, queues: queueList.value })
  },
  { getCachedData: cacheOnlyDuringHydration }
)

/**
 * A missing player is a real 404, raised here rather than in the handler: `useAsyncData` captures
 * whatever the handler throws, and the response would stay 200. Any other failure is transient and
 * stays in `error`, so the page can offer a retry instead.
 */
if (errorStatusCode(error.value) === 404 || (!player.value && !error.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Joueur introuvable', fatal: true })
}

const hasError = computed(() => error.value != null || !player.value)
const name = computed(() => (player.value ? playerDisplayName(player.value) : 'Joueur'))
const hasValorant = computed(() => !!player.value?.valorantPuuid)

// Declared after `player`: it dereferences it, and above the `useAsyncData` call it would hit the
// temporal dead zone and take hydration down with it.
useSeoMeta({
  title: () => (player.value ? `${name.value} · Profil` : 'Profil joueur'),
  description: () => (player.value
    ? `Rang, performances et dernières parties Valorant de ${name.value} sur PeekDiff.`
    : 'Rang, performances et dernières parties Valorant d\'un joueur du crew sur PeekDiff.'),
})

// --- Viewer-dependent bits, resolved after mount ---
const isMe = computed(() => isMounted.value && !!player.value && playerStore.currentPlayer?.id === player.value.id)
const canSync = computed(() => isMounted.value && authStore.isAuthenticated && hasValorant.value)

/** The main account's name for a smurf, read from the crew list (cached a minute by the store). */
const mainName = computed(() => {
  const mainId = player.value?.primaryPlayerId
  if (!mainId) return null
  const main = valStore.players.find(entry => entry.id === mainId)
  return main ? playerDisplayName(main) : null
})

// --- Performance recap ---
const statsLoading = ref(false)
const stats = computed(() => player.value?.valorantPerformanceStats ?? null)

async function reloadStats(signal: AbortSignal) {
  statsLoading.value = true
  try {
    // `useAsyncData` data is a shallow ref: reassigning it is what Vue tracks.
    player.value = await client.getValPlayerById(playerId, { period: periodOption.value.api, queues: queueList.value }, signal)
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[player] Performances indisponibles :', e)
  } finally {
    if (!signal.aborted) statsLoading.value = false
  }
}

// --- Rank progression ---
const rankLoading = ref(false)
const rankSnapshots = ref<ValRankHistoryDto[]>([])
const rankChanges = ref<ValRankHistoryDto[]>([])

async function loadRank(signal: AbortSignal) {
  rankLoading.value = true
  try {
    const [snapshots, changes] = await Promise.all([
      client.getValRankHistory(playerId, { granularity: periodOption.value.granularity, days: periodOption.value.days }, signal),
      client.getValRankHistory(playerId, { limit: RANK_CHANGES_LIMIT }, signal),
    ])
    // Raw entries are restricted to the period here: the API's `days` only applies to buckets.
    const since = periodOption.value.days ? Date.now() - periodOption.value.days * 86_400_000 : 0
    rankSnapshots.value = snapshots ?? []
    rankChanges.value = (changes ?? []).filter(entry => new Date(entry.createdOn).getTime() >= since)
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[player] Historique de rang indisponible :', e)
  } finally {
    if (!signal.aborted) rankLoading.value = false
  }
}

// --- Match history ---
const historyLoading = ref(false)
const loadingMore = ref(false)
const games = ref<ValGameDto[]>([])
const historyPage = ref(1)
const historyTotal = ref(0)

async function loadGames(signal: AbortSignal, append = false) {
  const page = append ? historyPage.value + 1 : 1
  if (append) loadingMore.value = true
  else historyLoading.value = true
  try {
    const result = await client.getValPlayerMatches(playerId, { page, size: HISTORY_PAGE_SIZE, queues: queueList.value }, signal)
    games.value = append ? [...games.value, ...result.results] : result.results
    historyPage.value = page
    historyTotal.value = result.total
  } catch (e) {
    if (isAbortError(e)) return
    // 404: the account has no Valorant PUUID, so no game can be stored for it. Not a failure.
    if (errorStatusCode(e) !== 404) console.error('[player] Historique de parties indisponible :', e)
    if (!append) {
      games.value = []
      historyTotal.value = 0
    }
  } finally {
    if (!signal.aborted) {
      historyLoading.value = false
      loadingMore.value = false
    }
  }
}

const lines = computed(() => {
  const id = player.value?.id
  if (id === undefined) return []
  return games.value.flatMap((game): GameLine[] => {
    const line = buildGameLine(game, id)
    return line ? [line] : []
  })
})

const days = computed(() => groupGamesByDay(lines.value, parisDayKey(now.value || Date.now())).map(day => ({
  ...day,
  rrClass: day.rr === null || day.rr === 0 ? 'bg-surface-high text-text-sec' : day.rr > 0 ? 'bg-win-soft text-win' : 'bg-loss-soft text-loss',
})))
const hasMoreGames = computed(() => games.value.length < historyTotal.value)
const historySubtitle = computed(() => {
  if (historyLoading.value) return 'Chargement des parties…'
  if (historyTotal.value === 0) return 'Aucune partie'
  return `${games.value.length} partie${games.value.length > 1 ? 's' : ''} sur ${historyTotal.value} · toutes périodes`
})

async function loadCrew() {
  try {
    await valStore.fetchPlayers(crewRequest.signal)
  } catch (e) {
    if (!isAbortError(e)) console.error('[player] Liste du crew indisponible :', e)
  }
}

/** Rank history, games and the crew list: loaded after render, cancellable. */
function loadSecondaryData() {
  if (!player.value || !hasValorant.value) return
  const signal = restartRequests()
  loadCrew()
  loadRank(signal)
  loadGames(signal)
}

function updateQuery() {
  const query = { ...route.query }
  if (period.value !== DEFAULT_PROFILE_PERIOD) query.period = period.value
  else delete query.period
  if (queue.value) query.queue = queue.value
  else delete query.queue
  router.replace({ query })
}

function onPeriodChange(next: ProfilePeriod) {
  if (next === period.value) return
  period.value = next
  updateQuery()
  const signal = restartRequests()
  reloadStats(signal)
  loadRank(signal)
  // The history is not restricted to the period, but a restart aborted its pending page.
  if (historyLoading.value || loadingMore.value) loadGames(signal)
}

function onQueueChange(next: string | null) {
  if (next === queue.value) return
  queue.value = next
  updateQuery()
  const signal = restartRequests()
  reloadStats(signal)
  loadGames(signal)
  if (rankLoading.value) loadRank(signal)
}

function loadMoreGames() {
  if (loadingMore.value) return
  loadGames(pageRequests.signal, true)
}

// --- Retry and sync ---
const retrying = ref(false)

async function retry() {
  retrying.value = true
  try {
    await reloadPlayer()
    loadSecondaryData()
  } finally {
    retrying.value = false
  }
}

const syncing = ref(false)
const syncError = ref<string | null>(null)

/** Asks the API to re-synchronise the account with Riot, then re-reads everything. */
async function sync() {
  if (syncing.value || !player.value) return
  syncing.value = true
  syncError.value = null
  try {
    await client.refreshValPlayer(playerId, pageRequests.signal)
    await reloadPlayer()
    valStore.invalidateDashboard()
    loadSecondaryData()
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[player] Synchronisation en échec :', e)
    syncError.value = 'La synchronisation avec Riot a échoué. Réessayez dans un instant.'
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <div>
    <NuxtLink
      to="/"
      class="group mb-4 inline-flex h-9 items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-[0.06em] text-text-sec transition-colors duration-150 ease-snap hover:text-text-main"
    >
      <span aria-hidden="true" class="text-text-ter transition-transform duration-150 ease-snap group-hover:translate-x-0.5">[</span>
      <Icon name="lucide:arrow-left" class="size-3.5" />Classement du crew
      <span aria-hidden="true" class="text-text-ter transition-transform duration-150 ease-snap group-hover:-translate-x-0.5">]</span>
    </NuxtLink>

    <div v-if="hasError" class="ticks flex flex-wrap items-center gap-5 border border-brand-red/40 bg-surface-base p-6">
      <pre aria-hidden="true" class="ascii text-sm text-border-ascii">  │
──<span class="text-brand-red">┼</span>──
  │</pre>
      <div class="min-w-60 flex-1">
        <h1 class="font-display text-3xl font-black uppercase leading-none">L'API ne répond pas</h1>
        <p class="mt-2 text-pretty text-sm text-text-sec">
          Impossible de charger ce profil. Le serveur semble indisponible pour le moment.
        </p>
      </div>
      <button
        type="button"
        :disabled="retrying"
        class="inline-flex h-11 cursor-pointer items-center gap-2 border border-border-strong px-4 font-mono text-[13px] font-medium uppercase tracking-[0.06em] transition-colors duration-150 ease-snap hover:bg-surface-hover disabled:cursor-wait disabled:opacity-40"
        @click="retry"
      >
        <span aria-hidden="true" class="text-text-ter">[</span>{{ retrying ? 'Chargement…' : 'Réessayer' }}<span aria-hidden="true" class="text-text-ter">]</span>
      </button>
    </div>

    <template v-else-if="player">
      <ProfileHero
        :player="player"
        :main-name="mainName"
        :is-me="isMe"
        :can-sync="canSync"
        :syncing="syncing"
        @sync="sync"
      />
      <p v-if="syncError" role="alert" class="mt-3 border border-brand-red/40 bg-brand-red-soft px-4 py-3 text-sm">{{ syncError }}</p>

      <div v-if="!hasValorant" class="ticks mt-10 flex flex-wrap items-center gap-5 border border-border-base bg-surface-base p-6">
        <pre aria-hidden="true" class="ascii text-sm text-border-ascii">  │
──<span class="text-brand-red">┼</span>──
  │</pre>
        <div class="min-w-60 flex-1">
          <h2 class="font-display text-2xl font-black uppercase leading-none">Aucun compte Valorant relié</h2>
          <p class="mt-2 text-pretty text-sm text-text-sec">
            Ce joueur fait partie du crew, mais aucun compte Valorant n'a encore été retrouvé à partir de son Riot ID.
          </p>
        </div>
        <ClientOnly>
          <NuxtLink
            v-if="isMe"
            to="/settings"
            class="inline-flex h-11 items-center gap-2 border border-border-strong px-4 font-mono text-[13px] font-medium uppercase tracking-[0.06em] transition-colors duration-150 ease-snap hover:bg-surface-hover"
          >
            <span aria-hidden="true" class="text-text-ter">[</span>Renseigner mon Riot ID<span aria-hidden="true" class="text-text-ter">]</span>
          </NuxtLink>
        </ClientOnly>
      </div>

      <template v-else>
        <section aria-labelledby="profile-performance" class="mt-12">
          <SectionIndex index="01" label="Performances" />
          <div class="mb-5 mt-3 flex flex-wrap items-end justify-between gap-x-5 gap-y-3.5">
            <h2 id="profile-performance" class="font-display text-[40px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] md:text-5xl">Performances</h2>
            <div class="flex flex-wrap gap-2">
              <SegmentSwitch :model-value="period" :options="PROFILE_PERIODS" label="Période" @update:model-value="onPeriodChange" />
              <SegmentSwitch :model-value="queue" :options="QUEUE_FILTERS" label="File de jeu" @update:model-value="onQueueChange" />
            </div>
          </div>
          <ProfileKpis :stats="stats" :loading="statsLoading" :period-phrase="periodOption.phrase" />
        </section>

        <div class="mt-12 grid items-start gap-10 rail:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-labelledby="profile-history" class="min-w-0">
            <SectionIndex index="02" label="Historique" />
            <h2 id="profile-history" class="mt-3 font-display text-[40px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] md:text-5xl">Dernières parties</h2>
            <p class="mt-2 font-mono text-[13px] text-text-sec">{{ historySubtitle }}</p>

            <div v-if="historyLoading && games.length === 0" aria-busy="true" aria-label="Chargement des parties" class="mt-6 flex animate-pulse flex-col gap-2">
              <span class="h-4 w-36 bg-surface-high" />
              <span v-for="i in 5" :key="i" class="h-[92px] border border-border-base bg-surface-base" />
            </div>

            <p v-else-if="lines.length === 0" class="ticks mt-6 border border-border-base bg-surface-base p-6 text-sm text-text-sec">
              Aucune partie enregistrée<template v-if="queue"> dans cette file</template>. Une synchronisation récupère les 10 dernières.
            </p>

            <div v-else class="transition-opacity duration-200" :class="historyLoading ? 'opacity-60' : ''">
              <div v-for="day in days" :key="day.key" class="mt-6">
                <div class="mb-3 flex flex-wrap items-center gap-2.5 font-mono text-xs font-medium uppercase tracking-[0.08em]">
                  <span aria-hidden="true" class="text-brand-red">//</span>
                  <h3 class="text-text-main">{{ day.label }}</h3>
                  <span aria-hidden="true" class="h-px min-w-5 flex-1 bg-border-base" />
                  <span class="text-text-sec">{{ day.record }}</span>
                  <span
                    v-if="day.rrText"
                    class="px-2 py-[3px] normal-case"
                    :class="day.rrClass"
                  >{{ day.rrText }}</span>
                </div>
                <div class="flex flex-col gap-2">
                  <ValMatchRow v-for="line in day.lines" :key="line.matchId" :line="line" />
                </div>
              </div>

              <button
                v-if="hasMoreGames"
                type="button"
                :disabled="loadingMore"
                :aria-busy="loadingMore"
                class="mt-5 flex h-11 w-full cursor-pointer items-center justify-center gap-2 border border-border-strong font-mono text-[13px] font-medium uppercase tracking-[0.06em] transition-colors duration-150 ease-snap hover:bg-surface-hover disabled:cursor-wait disabled:opacity-40"
                @click="loadMoreGames"
              >
                <span aria-hidden="true" class="text-text-ter">[</span>{{ loadingMore ? 'Chargement…' : `${HISTORY_PAGE_SIZE} parties de plus` }}<span aria-hidden="true" class="text-text-ter">]</span>
              </button>
            </div>
          </section>

          <aside class="min-w-0" aria-label="Détails du joueur">
            <SectionIndex index="03" label="Détails" class="mb-4" />
            <div class="grid items-start gap-4 md:max-rail:grid-cols-2">
              <ProfileRankProgress
                :snapshots="rankSnapshots"
                :changes="rankChanges"
                :loading="rankLoading"
                :period-phrase="periodOption.phrase"
                class="md:max-rail:col-span-2"
              />
              <ProfileAgents :agents="stats?.agentStats ?? []" :period-phrase="periodOption.phrase" />
              <ValMapList :maps="stats?.mapStats ?? []" :period-phrase="periodOption.phrase" />
              <ProfileDuos :duos="stats?.duoStats ?? []" :period-phrase="periodOption.phrase" />
            </div>
          </aside>
        </div>
      </template>
    </template>
  </div>
</template>
