<script setup lang="ts">
import { computed } from 'vue'
import type { ValFunStatDto, ValGlobalStatsDto } from '~/lib/types'
import { formatDayMonth } from '~/utils/date'
import { formatDecimal } from '~/utils/number'
import { playerDisplayName } from '~/utils/val-ladder'

/**
 * The crew's awards: `crewRecords` of `GET /val/home` (30 days of competitive) on the home page,
 * `GET /val/stats/global` on the records page. The API's `detail` is an English sentence: each award is
 * worded here from its value, and a single-game record links to its match page.
 */
const props = defineProps<{
  records: ValGlobalStatsDto
  /** The records' window, spelled out: "sur 30 jours". */
  periodPhrase: string
  /** Competitive only, or every counted mode: it names what was missing when nothing was awarded. */
  rankedOnly: boolean
}>()

type AwardKey =
  | 'highestCombatScore' | 'entryKing' | 'sharpshooter' | 'longestWinStreak' | 'spikeCarrier' | 'nightOwl'
  | 'knifeAssassin' | 'biggestInter' | 'firstBloodVictim' | 'bodyshotEnjoyer' | 'longestLossStreak'

/**
 * In display order: the flattering ones first. `unit` follows the value; `what` says what was counted,
 * with the period's phrase for the awards built over the whole window.
 */
const AWARDS: { key: AwardKey, title: string, unit: string, what: (value: number, period: string) => string, decimals?: boolean, minimum?: number }[] = [
  { key: 'highestCombatScore', title: 'Meilleur ACS', unit: 'ACS', what: () => 'en une partie' },
  { key: 'entryKing', title: 'Roi de l\'entrée', unit: 'PK', what: value => `premier${value > 1 ? 's' : ''} kill${value > 1 ? 's' : ''} en une partie` },
  { key: 'sharpshooter', title: 'Tireur d\'élite', unit: '%', what: (_value, period) => `de headshots ${period}`, decimals: true },
  { key: 'longestWinStreak', title: 'Série de victoires', unit: 'V', what: () => 'd\'affilée', minimum: 2 },
  { key: 'spikeCarrier', title: 'Porteur de spike', unit: '', what: value => `pose${value > 1 ? 's' : ''} et désamorçage${value > 1 ? 's' : ''} en une partie` },
  { key: 'nightOwl', title: 'Oiseau de nuit', unit: '', what: value => `partie${value > 1 ? 's' : ''} entre minuit et 6 h` },
  { key: 'knifeAssassin', title: 'Assassin au couteau', unit: '', what: value => `kill${value > 1 ? 's' : ''} au couteau` },
  { key: 'biggestInter', title: 'Plus de morts', unit: '', what: value => `mort${value > 1 ? 's' : ''} en une partie` },
  { key: 'firstBloodVictim', title: 'Premier à tomber', unit: '', what: value => `manche${value > 1 ? 's' : ''} ouverte${value > 1 ? 's' : ''} par sa mort` },
  { key: 'bodyshotEnjoyer', title: 'Amateur du torse', unit: '%', what: (_value, period) => `de headshots ${period}`, decimals: true },
  { key: 'longestLossStreak', title: 'Série de défaites', unit: 'D', what: () => 'd\'affilée', minimum: 2 },
]

const awards = computed(() => AWARDS.flatMap((award) => {
  const stat: ValFunStatDto | null = props.records[award.key]
  // A "streak" of one game is not one: the API hands it out whenever anybody won or lost at all.
  if (!stat?.player || stat.value < (award.minimum ?? 0)) return []
  return [{
    key: award.key,
    title: award.title,
    value: award.decimals ? formatDecimal(stat.value) : String(Math.round(stat.value)),
    unit: award.unit,
    what: award.what(stat.value, props.periodPhrase),
    playerId: stat.player.id,
    playerName: playerDisplayName(stat.player),
    date: stat.gameDate ? formatDayMonth(stat.gameDate) : null,
    matchHref: stat.matchId ? `/match/${stat.matchId}?player=${stat.player.id}` : null,
  }]
}))

const emptyText = computed(() => `Pas encore assez de ${props.rankedOnly ? 'classées' : 'parties'} ${props.periodPhrase} pour décerner des records.`)
</script>

<template>
  <ul v-if="awards.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
    <li v-for="(award, index) in awards" :key="award.key" class="flex min-w-0 animate-enter flex-col border border-border-base bg-surface-base p-4" :style="{ animationDelay: `${Math.min(index, 5) * 40}ms` }">
      <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">// {{ award.title }}</span>
      <p class="mt-2 flex items-baseline gap-2">
        <span class="font-display text-[44px] font-black leading-[0.9]">{{ award.value }}</span>
        <span v-if="award.unit" class="font-mono text-xs font-medium text-text-ter">{{ award.unit }}</span>
      </p>
      <p class="mt-1 text-sm text-text-sec">{{ award.what }}</p>
      <p class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-dashed border-border-strong pt-3 font-mono text-xs">
        <NuxtLink :to="`/player/${award.playerId}`" class="font-sans text-sm font-semibold text-text-main hover:text-brand-red">{{ award.playerName }}</NuxtLink>
        <template v-if="award.date"><span class="text-text-ter">· {{ award.date }}</span></template>
        <NuxtLink
          v-if="award.matchHref"
          :to="award.matchHref"
          class="ml-auto uppercase tracking-[0.06em] text-text-sec transition-colors hover:text-text-main"
        >
          <span aria-hidden="true" class="text-text-ter">[</span>La partie<span aria-hidden="true" class="text-text-ter">]</span>
        </NuxtLink>
      </p>
    </li>
  </ul>
  <p v-else class="ticks border border-border-base bg-surface-base p-6 text-sm text-text-sec">
    {{ emptyText }}
  </p>
</template>
