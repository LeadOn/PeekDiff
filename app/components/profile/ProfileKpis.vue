<script setup lang="ts">
import { computed } from 'vue'
import type { ValPerformanceStatsDto } from '~/lib/types'
import { formatDecimal, formatPercent } from '~/utils/number'
import { formatDuration, formatPlaytime } from '~/utils/date'
import { glyphBar } from '~/utils/ascii'

/**
 * The performance tiles of a profile (`valorantPerformanceStats`). The recap covers this account
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
  value: string
  unit?: string
  detail: string
  bar?: { on: string, off: string, label: string }
}

const tiles = computed<Tile[]>(() => {
  const s = props.stats
  if (!s) return []
  const record = `${s.wins}V · ${s.losses}D${s.draws > 0 ? ` · ${s.draws}N` : ''}`
  return [
    {
      key: 'games',
      label: 'Parties',
      value: String(s.gamesPlayed),
      detail: `${record} · ${formatPercent(s.winRatePercent)}`,
      bar: { ...glyphBar(s.winRatePercent / 100, 12), label: `Taux de victoire : ${formatPercent(s.winRatePercent)}` },
    },
    { key: 'acs', label: 'ACS moyen', value: String(Math.round(s.averageAcs)), detail: `ADR ${formatDecimal(s.averageAdr)}` },
    { key: 'kd', label: 'Ratio K/D', value: formatDecimal(s.kdRatio), detail: `KDA ${formatDecimal(s.kda)}` },
    {
      key: 'hs',
      label: 'Headshots',
      value: formatDecimal(s.headshotPercent),
      unit: '%',
      detail: 'des balles qui touchent',
      bar: { ...glyphBar(s.headshotPercent / 100, 12), label: `Pourcentage de headshots : ${formatPercent(s.headshotPercent)}` },
    },
    { key: 'kast', label: 'KAST', value: formatDecimal(s.kastPercent), unit: '%', detail: 'manches à kill, assist, survie ou échange' },
    { key: 'rating', label: 'Note', value: formatDecimal(s.averageRating), unit: '/10', detail: `sur ${s.roundsPlayed} manches` },
    {
      key: 'duels',
      label: 'Premiers duels',
      value: `${s.firstKills}–${s.firstDeaths}`,
      detail: 'premiers kills – premières morts',
    },
    {
      key: 'time',
      label: 'Temps de jeu',
      value: formatPlaytime(s.totalPlaytimeSeconds),
      detail: `${formatDuration(s.averageGameDurationSeconds)} par partie`,
    },
  ]
})
</script>

<template>
  <div v-if="loading && !stats" aria-busy="true" aria-label="Chargement des performances" class="grid animate-pulse grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
    <span v-for="i in 8" :key="i" class="h-[132px] border border-border-base bg-surface-base" />
  </div>

  <div v-else-if="tiles.length" class="grid grid-cols-2 gap-3 transition-opacity duration-200 md:gap-4 lg:grid-cols-4" :class="loading ? 'opacity-60' : ''" :aria-busy="loading">
    <div
      v-for="(tile, index) in tiles"
      :key="tile.key"
      class="min-w-0 animate-enter border border-border-base bg-surface-base p-4 md:p-5"
      :class="index === 0 ? 'ticks' : ''"
      :style="{ animationDelay: `${Math.min(index, 5) * 40}ms` }"
    >
      <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">// {{ tile.label }}</span>
      <div class="mt-2 whitespace-nowrap font-display text-[40px] font-black leading-[0.9] md:text-[52px]">
        {{ tile.value }}<span v-if="tile.unit" class="ml-1 font-mono text-xs font-medium text-text-ter">{{ tile.unit }}</span>
      </div>
      <div v-if="tile.bar" class="ascii mt-2 text-xs" role="img" :aria-label="tile.bar.label">
        <span class="text-text-main">{{ tile.bar.on }}</span><span class="text-border-ascii">{{ tile.bar.off }}</span>
      </div>
      <p class="mt-2 truncate font-mono text-xs text-text-sec" :title="tile.detail">{{ tile.detail }}</p>
    </div>
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
