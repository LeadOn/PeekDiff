<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAsyncData, useRoute, useRouter } from '#app'
import type { ValGameTimelineDto } from '~/lib/types'
import { AppError, errorStatusCode, isAbortError } from '~/lib/types/error'
import { useGameOnVal } from '~/composables/useGameOnVal'
import { usePlayerStore } from '~/stores/player'
import { cacheOnlyDuringHydration } from '~/utils/async-data'
import { buildDamageMatrix, buildEconomy, buildRoundDetail, buildRoundLoadouts, buildRoundMinimap, buildRounds, buildScoreboard, DEFAULT_MATCH_TAB, hasPositions, MATCH_TABS, parseMatchTab, resolvePerspective } from '~/utils/val-game'
import type { MatchTab } from '~/utils/val-game'
import { RESULT_LABELS } from '~/utils/val-match'
import SectionTitle from '~/components/ui/SectionTitle.vue'
import TabBar from '~/components/ui/TabBar.vue'
import MatchHero from '~/components/match/MatchHero.vue'
import MatchScoreboard from '~/components/match/MatchScoreboard.vue'
import MatchTimeline from '~/components/match/MatchTimeline.vue'
import MatchEconomy from '~/components/match/MatchEconomy.vue'
import MatchDamageMatrix from '~/components/match/MatchDamageMatrix.vue'

const route = useRoute()
const router = useRouter()
const client = useGameOnVal()
const playerStore = usePlayerStore()

/** Riot match ids are uuids: anything else cannot exist, and is a 404 without calling the API. */
const matchId = String(route.params.id)
const isValidMatchId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchId)

/**
 * The crew member the page is told from, carried by the profile's links (`?player=`). Without it, the
 * viewer once mounted if they played this game, otherwise the side with the most crew members.
 */
const queryPlayerId = /^\d+$/.test(String(route.query.player ?? '')) ? Number(route.query.player) : null

/** The sticky header's height, which the page's sticky bar sits under. */
const HEADER_HEIGHT = 60

const isMounted = ref(false)
const timelineRequest = new AbortController()

// Lifecycle hooks go before the first top-level `await`, or they are silently dropped.
// `loadTimeline` is a hoisted function declaration, so referencing it here is safe.
onMounted(() => {
  isMounted.value = true
  loadTimeline()
})
onBeforeUnmount(() => timelineRequest.abort())

const { data: game, error, refresh: reloadGame } = await useAsyncData(
  `val-match-${matchId}`,
  () => {
    if (!isValidMatchId) throw new AppError('Partie introuvable', 404)
    return client.getValMatch(matchId)
  },
  { getCachedData: cacheOnlyDuringHydration }
)

// Raised here, not in the handler: `useAsyncData` captures what the handler throws, and the response
// would stay 200. Any other failure is transient and offers a retry instead.
if (errorStatusCode(error.value) === 404 || (!game.value && !error.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Partie introuvable', fatal: true })
}

const hasError = computed(() => error.value != null || !game.value)

const focusPlayerId = computed(() => {
  if (queryPlayerId !== null) return queryPlayerId
  const me = isMounted.value ? playerStore.currentPlayer?.id ?? null : null
  return me !== null && game.value?.valorantGameParticipants.some(entry => entry.playerId === me) ? me : null
})

const perspective = computed(() => (game.value ? resolvePerspective(game.value, focusPlayerId.value) : { allyTeamId: null, focusId: null }))
const teams = computed(() => (game.value ? buildScoreboard(game.value, perspective.value) : []))
const focusRow = computed(() => teams.value.flatMap(team => team.rows).find(row => row.isFocus) ?? null)
const focusParticipant = computed(() => game.value?.valorantGameParticipants.find(entry => entry.id === perspective.value.focusId) ?? null)

const allyScore = computed(() => teams.value.find(team => team.side === 'ally')?.roundsWon ?? 0)
const enemyScore = computed(() => teams.value.find(team => team.side === 'enemy')?.roundsWon ?? 0)

// Declared after `game`: it dereferences it, and above `useAsyncData` it would hit the temporal dead
// zone and take hydration down with it.
useSeoMeta({
  title: () => (game.value ? `${game.value.mapName ?? 'Partie'} ${allyScore.value}–${enemyScore.value} · Partie` : 'Partie'),
  description: () => (game.value
    ? `Tableau des scores, manches et kills de la partie sur ${game.value.mapName ?? 'une carte inconnue'} jouée par le crew.`
    : 'Tableau des scores, manches et kills d\'une partie Valorant du crew.'),
})

const allyResult = computed(() => teams.value.find(team => team.side === 'ally')?.result ?? null)

// --- Tabs: the round picked in one stays picked in the others ---
const tab = ref<MatchTab>(parseMatchTab(route.query.tab))
const toolbar = ref<HTMLElement | null>(null)

async function onTabChange(next: MatchTab) {
  if (next === tab.value) return
  tab.value = next
  const query = { ...route.query }
  if (next !== DEFAULT_MATCH_TAB) query.tab = next
  else delete query.tab
  router.replace({ query })
  // Scrolled down a long panel, the next one opens at its top, under the sticky bar.
  await nextTick()
  const bar = toolbar.value
  if (!bar) return
  const top = bar.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT
  if (window.scrollY > top) window.scrollTo({ top })
}

const back = computed(() => (queryPlayerId !== null && focusRow.value
  ? { to: `/player/${queryPlayerId}`, label: `Profil de ${focusRow.value.name}` }
  : { to: '/', label: 'Classement du crew' }))

// --- Rounds and kills: secondary, loaded after render ---
const timeline = ref<ValGameTimelineDto | null>(null)
const timelineLoading = ref(false)
const timelineFailed = ref(false)
const selectedRound = ref<number | null>(null)

async function loadTimeline() {
  if (!game.value) return
  timelineLoading.value = true
  timelineFailed.value = false
  try {
    timeline.value = await client.getValMatchTimeline(matchId, timelineRequest.signal)
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[match] Déroulé des manches indisponible :', e)
    timelineFailed.value = true
  } finally {
    timelineLoading.value = false
  }
}

/** Rounds load after mount: until they answer (server render included), both cards show a skeleton. */
const timelinePending = computed(() => timelineLoading.value || (!timeline.value && !timelineFailed.value))

const cells = computed(() => (timeline.value ? buildRounds(timeline.value.rounds, perspective.value) : []))
const activeRound = computed(() => selectedRound.value ?? cells.value[0]?.index ?? null)

const roundDetail = computed(() => {
  const round = timeline.value?.rounds.find(entry => entry.roundNumber === activeRound.value)
  const cell = cells.value.find(entry => entry.index === activeRound.value)
  if (!game.value || !timeline.value || !round || !cell) return null
  return buildRoundDetail(game.value, round, cell, timeline.value.kills, perspective.value)
})

// Absent from an API build older than 2026-10-30, empty for a game imported before it: same thing here.
const roundPlayerStats = computed(() => timeline.value?.roundPlayerStats ?? [])
const economy = computed(() => buildEconomy(roundPlayerStats.value, cells.value, perspective.value))
const roundLoadouts = computed(() => (game.value
  ? buildRoundLoadouts(game.value, roundPlayerStats.value, economy.value.find(round => round.index === activeRound.value), perspective.value)
  : []))

// --- Positions and damages (API 2026-11): absent from an older build, empty for older games ---
const positions = computed<'ok' | 'none' | 'no-map'>(() => {
  if (!timeline.value || !hasPositions(timeline.value)) return 'none'
  return timeline.value.mapTransform ? 'ok' : 'no-map'
})
const roundMinimap = computed(() => {
  const round = timeline.value?.rounds.find(entry => entry.roundNumber === activeRound.value)
  if (!game.value || !timeline.value || !round || positions.value !== 'ok') return null
  return buildRoundMinimap(game.value, timeline.value, round, perspective.value)
})

const damageScope = ref<'game' | 'round'>('game')
const activeRoundNumber = computed(() => cells.value.find(cell => cell.index === activeRound.value)?.number ?? null)
const damageMatrix = computed(() => (game.value
  ? buildDamageMatrix(game.value, timeline.value?.damages ?? [], perspective.value, damageScope.value === 'round' ? activeRound.value : null)
  : null))

const retrying = ref(false)

async function retry() {
  retrying.value = true
  try {
    await reloadGame()
    loadTimeline()
  } finally {
    retrying.value = false
  }
}
</script>

<template>
  <div>
    <NuxtLink
      :to="back.to"
      class="group mb-4 inline-flex h-9 items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-[0.06em] text-text-sec transition-colors duration-150 ease-snap hover:text-text-main"
    >
      <span aria-hidden="true" class="text-text-ter transition-transform duration-150 ease-snap group-hover:translate-x-0.5">[</span>
      <Icon name="lucide:arrow-left" class="size-3.5" />{{ back.label }}
      <span aria-hidden="true" class="text-text-ter transition-transform duration-150 ease-snap group-hover:-translate-x-0.5">]</span>
    </NuxtLink>

    <div v-if="hasError" class="ticks flex flex-wrap items-center gap-5 border border-brand-red/40 bg-surface-base p-6">
      <pre aria-hidden="true" class="ascii text-sm text-border-ascii">  │
──<span class="text-brand-red">┼</span>──
  │</pre>
      <div class="min-w-60 flex-1">
        <h1 class="font-display text-3xl font-black uppercase leading-none">L'API ne répond pas</h1>
        <p class="mt-2 text-pretty text-sm text-text-sec">
          Impossible de charger cette partie. Le serveur semble indisponible pour le moment.
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

    <template v-else-if="game">
      <MatchHero
        :game="game"
        :teams="teams"
        :focus="focusRow"
        :focus-agent-id="focusParticipant?.agentId ?? null"
        :focus-rr-change="focusParticipant?.rrChange ?? null"
      />

      <!-- The tabs, kept in view with the score while a long panel scrolls. -->
      <div ref="toolbar" class="-mx-4 mt-8 bg-header px-4 backdrop-blur-[10px] md:sticky md:top-[60px] md:z-10 md:-mx-6 md:px-6">
        <div class="flex flex-wrap items-center justify-between gap-x-6 border-b border-border-base">
          <TabBar :model-value="tab" :tabs="MATCH_TABS" label="Sections de la partie" id-prefix="match" @update:model-value="onTabChange" />
          <p class="hidden items-center gap-2 py-2 font-mono text-xs uppercase tracking-[0.06em] md:flex">
            <span class="text-ally">Alliés</span>
            <b class="font-display text-xl font-extrabold leading-none">{{ allyScore }}<span aria-hidden="true">–</span><span class="sr-only"> à </span>{{ enemyScore }}</b>
            <span class="text-enemy">Ennemis</span>
            <span v-if="allyResult" class="sr-only">, {{ RESULT_LABELS[allyResult] }}</span>
          </p>
        </div>
      </div>

      <section
        v-if="tab === 'scoreboard'"
        id="match-panel-scoreboard"
        role="tabpanel"
        aria-labelledby="match-tab-scoreboard"
        class="mt-8"
      >
        <SectionTitle id="match-scoreboard" title="Tableau des scores" aside="trié par ACS" />
        <p v-if="game.isRemake" class="mb-4 border border-border-base bg-surface-base px-4 py-3 text-sm text-text-sec">
          Partie annulée (remake) : elle ne compte dans aucune statistique.
        </p>
        <div class="flex flex-col gap-4">
          <MatchScoreboard v-for="team in teams" :key="team.teamId" :team="team" />
        </div>
      </section>

      <section
        v-else-if="tab === 'rounds'"
        id="match-panel-rounds"
        role="tabpanel"
        aria-labelledby="match-tab-rounds"
        class="mt-8"
      >
        <SectionTitle id="match-timeline" title="Manche par manche" :aside="cells.length ? `${cells.length} manches` : null" />
        <MatchTimeline
          :selected="activeRound"
          :cells="cells"
          :detail="roundDetail"
          :loading="timelinePending"
          :failed="timelineFailed"
          :minimap="roundMinimap"
          :positions="positions"
          @update:selected="selectedRound = $event"
        />
      </section>

      <section
        v-else-if="tab === 'economy'"
        id="match-panel-economy"
        role="tabpanel"
        aria-labelledby="match-tab-economy"
        class="mt-8"
      >
        <SectionTitle id="match-economy" title="Économie" aside="valeur d'équipement par manche" />
        <MatchEconomy
          :selected="activeRound"
          :rounds="economy"
          :loadouts="roundLoadouts"
          :loading="timelinePending"
          :failed="timelineFailed"
          :has-rounds="cells.length > 0"
          @update:selected="selectedRound = $event"
        />
      </section>

      <section
        v-else
        id="match-panel-damages"
        role="tabpanel"
        aria-labelledby="match-tab-damages"
        class="mt-8"
      >
        <SectionTitle id="match-damages" title="Qui a touché qui" aside="alliés en lignes · ennemis en colonnes" />
        <MatchDamageMatrix
          :matrix="damageMatrix"
          :scope="damageScope"
          :round-number="activeRoundNumber"
          :loading="timelinePending"
          :failed="timelineFailed"
          @update:scope="damageScope = $event"
        />
      </section>
    </template>
  </div>
</template>
