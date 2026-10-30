<script setup lang="ts">
import { computed } from 'vue'
import type { ValRankHistoryDto } from '~/lib/types'
import { DIVISION_ELO, isRankedTier, rankElo, tierInfo } from '~/utils/val-tier'
import { formatDayMonth } from '~/utils/date'
import { formatSigned } from '~/utils/number'
import FrameHead from '~/components/ui/FrameHead.vue'

/**
 * "Progression" card of a profile: the elo curve over the period (one snapshot per bucket, from
 * `GET /val/player/{id}/rank?granularity=…`), and under it one bar per ranked game with the RR it
 * moved (the raw entries that carry a `matchId`). A bar opens its match page only when the API says
 * the game is stored (`matchStored`): the MMR history also knows ranked games that were never imported.
 *
 * Elo, not RR, is the axis: RR resets at every division while elo runs on (100 per division).
 */
const props = defineProps<{
  /** Bucketed snapshots, oldest first. */
  snapshots: ValRankHistoryDto[]
  /** Raw entries, oldest first. */
  changes: ValRankHistoryDto[]
  /** The profile's player, followed on the match pages the bars open. */
  playerId: string
  loading: boolean
  periodPhrase: string
}>()

const WIDTH = 300
const HEIGHT = 96

const toPoints = (entries: ValRankHistoryDto[]) => entries.flatMap((entry) => {
  const elo = rankElo(entry)
  return elo === null ? [] : [{ elo, at: entry.createdOn, tierId: entry.tierId }]
})

/**
 * One point per bucket; the raw entries instead when the buckets are too coarse to draw anything
 * (a month of history read by month is a single point), as long as they say more.
 */
const points = computed(() => {
  const buckets = toPoints(props.snapshots)
  if (buckets.length >= 3) return buckets
  const raw = toPoints(props.changes)
  return raw.length > buckets.length ? raw : buckets
})

const net = computed(() => {
  const first = points.value[0]
  const last = points.value[points.value.length - 1]
  return first && last && points.value.length > 1 ? last.elo - first.elo : null
})

const lastTier = computed(() => {
  const last = points.value[points.value.length - 1]
  return last ? tierInfo(last.tierId).label : null
})

/** Whole divisions around the curve, so a flat line does not sit on the edge. */
const bounds = computed(() => {
  const values = points.value.map(point => point.elo)
  if (values.length === 0) return { low: 0, high: DIVISION_ELO }
  const low = Math.floor(Math.min(...values) / DIVISION_ELO) * DIVISION_ELO
  const high = Math.max(low + DIVISION_ELO, Math.ceil(Math.max(...values) / DIVISION_ELO) * DIVISION_ELO)
  return { low, high: high === Math.max(...values) ? high + DIVISION_ELO / 2 : high }
})

const toY = (elo: number) => {
  const { low, high } = bounds.value
  return HEIGHT - ((elo - low) / (high - low)) * HEIGHT
}

const toX = (index: number) => (points.value.length > 1 ? (index / (points.value.length - 1)) * WIDTH : WIDTH / 2)

const linePath = computed(() => points.value
  .map((point, index) => `${index === 0 ? 'M' : 'L'}${toX(index).toFixed(1)},${toY(point.elo).toFixed(1)}`)
  .join(' '))

const areaPath = computed(() => (points.value.length > 1 ? `${linePath.value} L${WIDTH},${HEIGHT} L0,${HEIGHT} Z` : ''))

/** Division boundaries crossing the chart; every third one (a family) when there are too many. */
const gridLines = computed(() => {
  const { low, high } = bounds.value
  const step = (high - low) / DIVISION_ELO > 6 ? DIVISION_ELO * 3 : DIVISION_ELO
  const lines: { y: number }[] = []
  for (let elo = Math.ceil(low / step) * step; elo <= high; elo += step) lines.push({ y: toY(elo) })
  return lines
})

const lastPoint = computed(() => {
  const index = points.value.length - 1
  return index >= 0 ? { x: toX(index), y: toY(points.value[index]!.elo) } : null
})

const chartLabel = computed(() => {
  if (points.value.length < 2 || net.value === null) return ''
  return `Progression ${props.periodPhrase} : ${formatSigned(net.value)} RR, aujourd'hui ${lastTier.value}`
})

/** The ranked games with their RR move; the 20 latest. */
const games = computed(() => props.changes
  .filter(entry => entry.matchId !== null && (isRankedTier(entry.tierId) || entry.lastChange !== 0))
  .slice(-20)
  .map(entry => ({
    id: entry.id,
    change: entry.lastChange,
    title: `${formatDayMonth(entry.createdOn)} · ${entry.mapName ?? 'Carte inconnue'} · ${formatSigned(entry.lastChange)} RR${entry.wasDerankProtected ? ' (protégé)' : ''}`,
    href: entry.matchStored ? `/match/${entry.matchId}?player=${props.playerId}` : null,
  })))

const maxChange = computed(() => Math.max(1, ...games.value.map(game => Math.abs(game.change))))

const bars = computed(() => games.value.map(game => ({
  ...game,
  barClass: game.change >= 0 ? 'bottom-1/2 bg-win' : 'top-1/2 bg-loss',
  barHeight: `${Math.max(2, (Math.abs(game.change) / maxChange.value) * 50)}%`,
})))

const average = (values: number[]) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null)
const averageGain = computed(() => average(games.value.filter(game => game.change > 0).map(game => game.change)))
const averageLoss = computed(() => average(games.value.filter(game => game.change < 0).map(game => game.change)))

const netClass = computed(() => (net.value === null || net.value === 0 ? 'text-text-main' : net.value > 0 ? 'text-win' : 'text-loss'))
</script>

<template>
  <section class="border border-border-base bg-surface-base p-4">
    <FrameHead title="Progression" :aside="periodPhrase" as="h2" />

    <div v-if="loading && points.length === 0" aria-busy="true" class="h-[176px] animate-pulse bg-surface-high" />

    <template v-else>
      <template v-if="points.length > 1">
        <p class="flex items-baseline justify-between gap-3">
          <span class="font-display text-[40px] font-black leading-none" :class="netClass">{{ formatSigned(net ?? 0) }}<span class="ml-1 font-mono text-xs font-medium text-text-ter">RR</span></span>
          <span class="truncate font-mono text-xs text-text-sec">{{ lastTier }}</span>
        </p>

        <div class="relative mt-3">
          <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" preserveAspectRatio="none" role="img" :aria-label="chartLabel" class="block h-24 w-full overflow-visible">
            <line
              v-for="line in gridLines"
              :key="line.y"
              x1="0"
              :x2="WIDTH"
              :y1="line.y"
              :y2="line.y"
              class="stroke-border-base"
              vector-effect="non-scaling-stroke"
              stroke-dasharray="2 3"
            />
            <path :d="areaPath" class="fill-brand-red/10" />
            <path :d="linePath" fill="none" class="stroke-brand-red" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
          </svg>
          <span
            v-if="lastPoint"
            aria-hidden="true"
            class="absolute size-2 -translate-x-1/2 -translate-y-1/2 bg-brand-red"
            :style="{ left: `${(lastPoint.x / WIDTH) * 100}%`, top: `${(lastPoint.y / HEIGHT) * 100}%` }"
          />
        </div>
        <p aria-hidden="true" class="mt-1 flex justify-between font-mono text-[10px] uppercase text-text-ter">
          <span>{{ formatDayMonth(points[0]!.at) }}</span><span>{{ formatDayMonth(points[points.length - 1]!.at) }}</span>
        </p>
      </template>
      <p v-else class="font-mono text-xs text-text-ter">Pas assez de rangs connus {{ periodPhrase }} pour tracer une courbe.</p>

      <div v-if="games.length" class="mt-4 border-t border-dashed border-border-strong pt-3">
        <p class="flex flex-wrap justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.06em] text-text-ter">
          <span>RR par classée</span>
          <span>
            <template v-if="averageGain !== null">Gain moy. <b class="font-medium text-win">{{ formatSigned(averageGain) }}</b></template>
            <template v-if="averageGain !== null && averageLoss !== null"> · </template>
            <template v-if="averageLoss !== null">Perte moy. <b class="font-medium text-loss">{{ formatSigned(averageLoss) }}</b></template>
          </span>
        </p>
        <ol class="mt-2 flex h-16 items-stretch gap-0.5" aria-label="RR gagnés ou perdus par partie classée, de la plus ancienne à la plus récente">
          <li v-for="game in bars" :key="game.id" :title="game.title" class="relative flex-1">
            <NuxtLink v-if="game.href" :to="game.href" class="absolute inset-0 hover:bg-surface-hover focus-visible:outline-offset-[-2px]">
              <span
                aria-hidden="true"
                class="absolute inset-x-0"
                :class="game.barClass"
                :style="{ height: game.barHeight }"
              />
              <span class="sr-only">{{ game.title }} · ouvrir la partie</span>
            </NuxtLink>
            <template v-else>
              <span
                aria-hidden="true"
                class="absolute inset-x-0"
                :class="game.barClass"
                :style="{ height: game.barHeight }"
              />
              <span class="sr-only">{{ game.title }}</span>
            </template>
          </li>
        </ol>
      </div>
    </template>
  </section>
</template>
