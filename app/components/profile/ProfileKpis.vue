<script setup lang="ts">
import { computed } from 'vue'
import type { ValPerformanceStatsDto } from '~/lib/types'
import { formatDecimal, formatPercent } from '~/utils/number'
import { formatDuration, formatPlaytime } from '~/utils/date'
import { glyphBar } from '~/utils/ascii'
import { STAT_HINTS } from '~/utils/val-glossary'
import type { StatHintKey } from '~/utils/val-glossary'
import InfoTip from '~/components/ui/InfoTip.vue'

/**
 * The performance panel of a profile (`valorantPerformanceStats`). The recap covers this account
 * only, over the period and queue the page selected; customs and deathmatch never count.
 */
const props = defineProps<{
  stats: ValPerformanceStatsDto | null
  loading: boolean
  /** "sur 30 jours", for the empty state. */
  periodPhrase: string
}>()

interface Tile {
  key: string
  label: string
  /** What the label's bubble explains. */
  hint: StatHintKey
  value: string
  unit?: string
  /** The line under the figure, unless `related` takes its place. */
  detail?: string
  /** A second figure named in the detail line ("ADR 154"), with its own bubble. */
  related?: { label: string, hint: StatHintKey, value: string }
  bar?: { on: string, off: string, label: string }
}

/**
 * Two tiers: the four figures a player is judged on, large, then four context figures, compact. One
 * panel cut by hairlines rather than eight cards, so the eye lands on the first row.
 */
const primary = computed<Tile[]>(() => {
  const s = props.stats
  if (!s) return []
  const record = `${s.wins}V · ${s.losses}D${s.draws > 0 ? ` · ${s.draws}N` : ''}`
  return [
    {
      key: 'winrate',
      label: 'Victoires',
      hint: 'winRate',
      value: formatDecimal(s.winRatePercent),
      unit: '%',
      detail: `${record} · ${s.gamesPlayed} partie${s.gamesPlayed > 1 ? 's' : ''}`,
      bar: { ...glyphBar(s.winRatePercent / 100, 12), label: `Taux de victoire : ${formatPercent(s.winRatePercent)}` },
    },
    {
      key: 'acs',
      label: 'ACS moyen',
      hint: 'acs',
      value: String(Math.round(s.averageAcs)),
      related: { label: 'ADR', hint: 'adr', value: formatDecimal(s.averageAdr) },
    },
    {
      key: 'kd',
      label: 'Ratio K/D',
      hint: 'kd',
      value: formatDecimal(s.kdRatio),
      related: { label: 'KDA', hint: 'kda', value: formatDecimal(s.kda) },
    },
    { key: 'hs', label: 'Headshots', hint: 'headshots', value: formatDecimal(s.headshotPercent), unit: '%', detail: 'des balles qui touchent' },
  ]
})

const secondary = computed<Tile[]>(() => {
  const s = props.stats
  if (!s) return []
  return [
    { key: 'kast', label: 'KAST', hint: 'kast', value: formatDecimal(s.kastPercent), unit: '%', detail: 'kill, assist, survie ou échange' },
    { key: 'rating', label: 'Note', hint: 'rating', value: formatDecimal(s.averageRating), unit: '/10', detail: `sur ${s.roundsPlayed} manches` },
    { key: 'duels', label: 'Premiers duels', hint: 'firstDuels', value: `${s.firstKills}–${s.firstDeaths}`, detail: 'kills – morts d\'ouverture' },
    { key: 'time', label: 'Temps de jeu', hint: 'playtime', value: formatPlaytime(s.totalPlaytimeSeconds), detail: `${formatDuration(s.averageGameDurationSeconds)} par partie` },
  ]
})
</script>

<template>
  <div v-if="loading && !stats" aria-busy="true" aria-label="Chargement des performances" class="h-[260px] animate-pulse border border-border-base bg-surface-base" />

  <div
    v-else-if="primary.length"
    class="ticks border border-border-base bg-surface-base transition-opacity duration-200"
    :class="loading ? 'opacity-60' : ''"
    :aria-busy="loading"
  >
    <dl class="grid grid-cols-2 gap-px bg-border-base lg:grid-cols-4">
      <div v-for="(tile, index) in primary" :key="tile.key" class="min-w-0 animate-enter bg-surface-base p-4 md:px-6 md:py-5" :style="{ animationDelay: `${index * 40}ms` }">
        <dt class="font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">// <InfoTip v-bind="STAT_HINTS[tile.hint]">{{ tile.label }}</InfoTip></dt>
        <dd class="mt-2 whitespace-nowrap font-display text-[44px] font-black leading-[0.9] md:text-[56px]">
          {{ tile.value }}<span v-if="tile.unit" class="ml-1 font-mono text-xs font-medium text-text-ter">{{ tile.unit }}</span>
        </dd>
        <dd v-if="tile.bar" class="ascii mt-2 text-xs" role="img" :aria-label="tile.bar.label">
          <span class="text-text-main">{{ tile.bar.on }}</span><span class="text-border-ascii">{{ tile.bar.off }}</span>
        </dd>
        <dd v-if="tile.related" class="mt-2 truncate font-mono text-xs text-text-sec">
          <InfoTip v-bind="STAT_HINTS[tile.related.hint]">{{ tile.related.label }}</InfoTip> {{ tile.related.value }}
        </dd>
        <dd v-else class="mt-2 truncate font-mono text-xs text-text-sec" :title="tile.detail">{{ tile.detail }}</dd>
      </div>
    </dl>
    <dl class="grid grid-cols-2 gap-px border-t border-border-base bg-border-base lg:grid-cols-4">
      <div v-for="tile in secondary" :key="tile.key" class="min-w-0 bg-surface-base px-4 py-3 md:px-6">
        <dt class="font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter"><InfoTip v-bind="STAT_HINTS[tile.hint]">{{ tile.label }}</InfoTip></dt>
        <dd class="mt-1 flex min-w-0 items-baseline gap-2">
          <span class="whitespace-nowrap font-display text-2xl font-extrabold leading-none">{{ tile.value }}<span v-if="tile.unit" class="ml-0.5 font-mono text-[11px] font-medium text-text-ter">{{ tile.unit }}</span></span>
          <span class="hidden truncate font-mono text-[11px] text-text-sec sm:inline" :title="tile.detail">{{ tile.detail }}</span>
        </dd>
      </div>
    </dl>
  </div>

  <div v-else class="ticks flex flex-wrap items-center gap-5 border border-border-base bg-surface-base p-6">
    <pre aria-hidden="true" class="ascii text-sm text-border-ascii">  │
──<span class="text-brand-red">┼</span>──
  │</pre>
    <div class="min-w-60 flex-1">
      <p class="font-display text-2xl font-black uppercase leading-none">Aucune partie comptée</p>
      <p class="mt-2 text-pretty text-sm text-text-sec">
        Pas de partie {{ periodPhrase }} pour ce filtre. Les parties personnalisées et les combats à mort ne comptent pas.
      </p>
    </div>
  </div>
</template>
