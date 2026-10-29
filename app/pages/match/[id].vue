<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAsyncData, useRoute } from '#app'
import type { ValGameTimelineDto } from '~/lib/types'
import { AppError, errorStatusCode, isAbortError } from '~/lib/types/error'
import { useGameOnVal } from '~/composables/useGameOnVal'
import { usePlayerStore } from '~/stores/player'
import { cacheOnlyDuringHydration } from '~/utils/async-data'
import { buildRoundDetail, buildRounds, buildScoreboard, resolvePerspective } from '~/utils/val-game'
import SectionIndex from '~/components/ui/SectionIndex.vue'
import MatchHero from '~/components/match/MatchHero.vue'
import MatchScoreboard from '~/components/match/MatchScoreboard.vue'
import MatchTimeline from '~/components/match/MatchTimeline.vue'

const route = useRoute()
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

const cells = computed(() => (timeline.value ? buildRounds(timeline.value.rounds, perspective.value) : []))
const activeRound = computed(() => selectedRound.value ?? cells.value[0]?.index ?? null)

const roundDetail = computed(() => {
  const round = timeline.value?.rounds.find(entry => entry.roundNumber === activeRound.value)
  const cell = cells.value.find(entry => entry.index === activeRound.value)
  if (!game.value || !timeline.value || !round || !cell) return null
  return buildRoundDetail(game.value, round, cell, timeline.value.kills, perspective.value)
})

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

      <section aria-labelledby="match-scoreboard" class="mt-12">
        <SectionIndex index="01" label="Tableau des scores" />
        <h2 id="match-scoreboard" class="mb-5 mt-3 font-display text-[40px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] md:text-5xl">Tableau des scores</h2>
        <p v-if="game.isRemake" class="mb-4 border border-border-base bg-surface-base px-4 py-3 text-sm text-text-sec">
          Partie annulée (remake) : elle ne compte dans aucune statistique.
        </p>
        <div class="flex flex-col gap-4">
          <MatchScoreboard v-for="team in teams" :key="team.teamId" :team="team" />
        </div>
      </section>

      <section aria-labelledby="match-timeline" class="mt-12">
        <SectionIndex index="02" label="Déroulé" />
        <h2 id="match-timeline" class="mb-5 mt-3 font-display text-[40px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] md:text-5xl">Manche par manche</h2>
        <MatchTimeline
          :selected="activeRound"
          :cells="cells"
          :detail="roundDetail"
          :loading="timelineLoading"
          :failed="timelineFailed"
          @update:selected="selectedRound = $event"
        />
      </section>
    </template>
  </div>
</template>
