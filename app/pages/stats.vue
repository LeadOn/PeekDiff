<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAsyncData, useRoute, useRouter } from '#app'
import { errorStatusCode } from '~/lib/types/error'
import { useGameOnVal } from '~/composables/useGameOnVal'
import { cacheOnlyDuringHydration } from '~/utils/async-data'
import { DEFAULT_RECORDS_PERIOD, RECORDS_PERIODS, parseRecordsPeriod, recordsPeriod } from '~/utils/val-period'
import type { RecordsPeriod } from '~/utils/val-period'
import SectionIndex from '~/components/ui/SectionIndex.vue'
import SegmentSwitch from '~/components/ui/SegmentSwitch.vue'
import CrewRecords from '~/components/home/CrewRecords.vue'
import CrewAgents from '~/components/home/CrewAgents.vue'
import ValMapList from '~/components/val/ValMapList.vue'

const route = useRoute()
const router = useRouter()
const client = useGameOnVal()

type RecordsQueue = 'competitive' | 'all'

/** `rankedOnly` on the API: competitive alone, or every mode it counts (customs and deathmatch never). */
const QUEUES: { value: RecordsQueue, label: string }[] = [
  { value: 'competitive', label: 'Compétition' },
  { value: 'all', label: 'Toutes' },
]

/**
 * Kept in the query string, so a filtered view can be shared and survives a reload. The defaults are
 * the home page's records (competitive, 30 days, no smurfs): only a departure from them reaches the
 * URL. Smurfs are left out by default because a smurf in a low-elo bracket distorts every award it
 * touches.
 */
const period = ref<RecordsPeriod>(parseRecordsPeriod(route.query.period))
const queue = ref<RecordsQueue>(route.query.queue === 'all' ? 'all' : 'competitive')
const includeSmurfs = ref(route.query.smurfs === '1')

const periodOption = computed(() => recordsPeriod(period.value))
const rankedOnly = computed(() => queue.value === 'competitive')

// Rendered on the server like the home page; a filter change re-runs the handler, and Nuxt aborts the
// previous request through `signal` so a late answer cannot overwrite a newer one.
const { data: stats, error, status, refresh } = await useAsyncData(
  'valGlobalStats',
  (_nuxtApp, { signal }) => client.getValGlobalStats({
    period: periodOption.value.api,
    rankedOnly: rankedOnly.value,
    includeSmurfs: includeSmurfs.value,
  }, signal),
  { getCachedData: cacheOnlyDuringHydration, watch: [period, queue, includeSmurfs] }
)

const loading = computed(() => status.value === 'pending')
const hasError = computed(() => error.value != null || !stats.value)
/** An API build older than 2026-10-29 has no `/val/stats/global`: not an outage, nothing to retry. */
const isUnsupported = computed(() => errorStatusCode(error.value) === 404)

const subtitle = computed(() => {
  const parts = [rankedOnly.value ? 'Compétition' : 'Toutes les files', periodOption.value.window]
  if (stats.value) {
    const games = stats.value.totalGamesAnalyzed
    const players = stats.value.totalPlayersTracked
    parts.push(`${games} partie${games > 1 ? 's' : ''} analysée${games > 1 ? 's' : ''}`)
    parts.push(`${players} joueur${players > 1 ? 's' : ''}`)
  }
  return parts.join(' · ')
})

function updateQuery() {
  const query = { ...route.query }
  if (period.value !== DEFAULT_RECORDS_PERIOD) query.period = period.value
  else delete query.period
  if (queue.value !== 'competitive') query.queue = queue.value
  else delete query.queue
  if (includeSmurfs.value) query.smurfs = '1'
  else delete query.smurfs
  router.replace({ query })
}

function onPeriodChange(next: RecordsPeriod) {
  if (next === period.value) return
  period.value = next
  updateQuery()
}

function onQueueChange(next: RecordsQueue) {
  if (next === queue.value) return
  queue.value = next
  updateQuery()
}

function toggleSmurfs() {
  includeSmurfs.value = !includeSmurfs.value
  updateQuery()
}

useSeoMeta({
  title: 'Records',
  description: 'Les records du crew PeekDiff sur Valorant : meilleur ACS, séries, headshots, agents et cartes les plus joués.'
})
</script>

<template>
  <div>
    <section aria-labelledby="records-title">
      <SectionIndex index="01" label="Records" />
      <div class="mb-5 mt-3 flex flex-wrap items-end justify-between gap-x-5 gap-y-3.5">
        <div class="min-w-0">
          <h1 id="records-title" class="font-display text-[40px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] md:text-5xl">Records du crew</h1>
          <p class="mt-2 font-mono text-[13px] text-text-sec">{{ subtitle }}</p>
        </div>
        <button
          type="button"
          role="switch"
          :aria-checked="includeSmurfs"
          class="inline-flex h-11 cursor-pointer items-center gap-2 border border-border-strong px-3.5 font-mono text-[13px] font-medium uppercase tracking-[0.06em] transition-colors duration-150 ease-snap hover:bg-surface-hover"
          @click="toggleSmurfs"
        >
          <span aria-hidden="true" class="text-text-ter">[</span>
          <span aria-hidden="true" class="w-[1ch] text-center" :class="includeSmurfs ? 'text-brand-red' : 'text-text-ter'">{{ includeSmurfs ? 'x' : ' ' }}</span>
          <span aria-hidden="true" class="text-text-ter">]</span>
          Smurfs
        </button>
      </div>

      <div class="mb-5 flex flex-wrap items-center gap-2">
        <SegmentSwitch :model-value="period" :options="RECORDS_PERIODS" label="Période" @update:model-value="onPeriodChange" />
        <SegmentSwitch :model-value="queue" :options="QUEUES" label="File de jeu" @update:model-value="onQueueChange" />
      </div>

      <div v-if="hasError && isUnsupported" class="ticks flex flex-wrap items-center gap-5 border border-border-base bg-surface-base p-6">
        <pre aria-hidden="true" class="ascii text-sm text-border-ascii">  │
──<span class="text-brand-red">┼</span>──
  │</pre>
        <div class="min-w-60 flex-1">
          <h2 class="font-display text-3xl font-black uppercase leading-none">Records indisponibles</h2>
          <p class="mt-2 text-pretty text-sm text-text-sec">
            Cette version de l'API ne calcule pas encore les records du crew.
          </p>
        </div>
      </div>

      <div v-else-if="hasError" class="ticks flex flex-wrap items-center gap-5 border border-brand-red/40 bg-surface-base p-6">
        <pre aria-hidden="true" class="ascii text-sm text-border-ascii">  │
──<span class="text-brand-red">┼</span>──
  │</pre>
        <div class="min-w-60 flex-1">
          <h2 class="font-display text-3xl font-black uppercase leading-none">L'API ne répond pas</h2>
          <p class="mt-2 text-pretty text-sm text-text-sec">
            Impossible de calculer les records du crew. Le serveur semble indisponible pour le moment.
          </p>
        </div>
        <button
          type="button"
          :disabled="loading"
          class="inline-flex h-11 cursor-pointer items-center gap-2 border border-border-strong px-4 font-mono text-[13px] font-medium uppercase tracking-[0.06em] transition-colors duration-150 ease-snap hover:bg-surface-hover disabled:cursor-wait disabled:opacity-40"
          @click="refresh()"
        >
          <span aria-hidden="true" class="text-text-ter">[</span>{{ loading ? 'Chargement…' : 'Réessayer' }}<span aria-hidden="true" class="text-text-ter">]</span>
        </button>
      </div>

      <!-- The previous answer stays on screen, dimmed, while a filter change re-queries the API. -->
      <div v-else-if="stats" :aria-busy="loading" class="transition-opacity duration-150 ease-snap" :class="loading ? 'opacity-50' : ''">
        <CrewRecords :records="stats" :period-phrase="periodOption.phrase" :ranked-only="rankedOnly" />
      </div>
    </section>

    <section v-if="!hasError && stats" aria-labelledby="records-picks-title" class="mt-12">
      <SectionIndex index="02" label="Agents et cartes" />
      <h2 id="records-picks-title" class="mb-5 mt-3 font-display text-[40px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] md:text-5xl">Agents et cartes</h2>
      <div :aria-busy="loading" class="grid items-start gap-4 transition-opacity duration-150 ease-snap md:grid-cols-2" :class="loading ? 'opacity-50' : ''">
        <CrewAgents :agents="stats.topAgents" :period-phrase="periodOption.phrase" />
        <ValMapList :maps="stats.topMaps" :period-phrase="periodOption.phrase" as="h3" />
      </div>
    </section>
  </div>
</template>
