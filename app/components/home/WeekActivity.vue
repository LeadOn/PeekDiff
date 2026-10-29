<script setup lang="ts">
import { computed } from 'vue'
import type { ValWeeklyActivityDto } from '~/lib/types'
import { useAnimatedNumber } from '~/composables/useAnimatedNumber'
import { dayRange, describeDay, formatPlaytime, parisDayKey } from '~/utils/date'
import { formatPercent, formatSigned } from '~/utils/number'
import { glyphBar } from '~/utils/ascii'
import FrameHead from '~/components/ui/FrameHead.vue'

/**
 * The crew's competitive week (`GET /val/home`, last 7 days): four tiles, then the week day by day.
 * Replaces the rank-only `WeekBento` whenever the API serves the recap.
 */
const props = defineProps<{
  activity: ValWeeklyActivityDto
  /** Accounts the dashboard counts under the smurf flag: the denominator of "joueurs actifs". */
  crewSize: number
}>()

const games = useAnimatedNumber(() => props.activity.gamesThisWeek)
const net = useAnimatedNumber(() => props.activity.netRrChangeThisWeek)

const gamesDelta = computed(() => props.activity.gamesThisWeek - props.activity.gamesLastWeek)
const gamesDeltaText = computed(() => {
  if (gamesDelta.value === 0) return 'autant que les 7 jours d\'avant'
  return `${gamesDelta.value > 0 ? '▲' : '▼'} ${formatSigned(gamesDelta.value)} vs les 7 jours d'avant`
})

const winBar = computed(() => glyphBar(props.activity.winRateThisWeek / 100, 16))

const netClass = computed(() => {
  const value = props.activity.netRrChangeThisWeek
  return value > 0 ? 'text-win' : value < 0 ? 'text-loss' : 'text-text-main'
})

const activeCount = computed(() => props.activity.activePlayers.length)

/** The window's last day, as the API computed it: "today" without reading the reader's clock. */
const lastDayKey = computed(() => parisDayKey(props.activity.windowEnd))
const range = computed(() => dayRange(parisDayKey(props.activity.windowStart), lastDayKey.value))

const maxGames = computed(() => Math.max(1, ...props.activity.days.map(day => day.games)))

const days = computed(() => props.activity.days.map((day) => {
  const described = describeDay(day.date, lastDayKey.value)
  const rr = day.netRrChange
  const parts = [`${day.games} partie${day.games > 1 ? 's' : ''}`]
  if (day.games > 0) parts.push(`${day.wins} V, ${day.losses} D`)
  if (rr !== null) parts.push(`${formatSigned(rr)} RR`)
  return {
    key: day.date,
    ...described,
    games: day.games,
    winsHeight: `${(day.wins / maxGames.value) * 100}%`,
    lossesHeight: `${(day.losses / maxGames.value) * 100}%`,
    rrText: rr === null ? '—' : formatSigned(rr),
    rrClass: rr === null || rr === 0 ? 'text-text-ter' : rr > 0 ? 'text-win' : 'text-loss',
    label: `${described.title} : ${parts.join(', ')}`,
  }
}))
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <div class="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      <div class="ticks animate-enter border border-border-base bg-surface-base p-4 md:p-5">
        <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">// Classées · 7 j</span>
        <div class="mt-2 font-display text-[56px] font-black leading-[0.9] md:text-[64px]">{{ Math.round(games) }}</div>
        <div class="mt-2 font-mono text-xs text-text-sec">{{ gamesDeltaText }}</div>
      </div>

      <div class="animate-enter border border-border-base bg-surface-base p-4 [animation-delay:40ms] md:p-5">
        <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">// Victoires</span>
        <div class="mt-2 font-display text-[56px] font-black leading-[0.9] md:text-[64px]">
          {{ Math.round(activity.winRateThisWeek) }}<span class="ml-1 font-mono text-xs font-medium text-text-ter">%</span>
        </div>
        <div class="ascii mt-2 text-xs" role="img" :aria-label="`Taux de victoire : ${formatPercent(activity.winRateThisWeek)}`">
          <span class="text-text-main">{{ winBar.on }}</span><span class="text-border-ascii">{{ winBar.off }}</span>
        </div>
        <div class="mt-1.5 font-mono text-xs text-text-sec">{{ activity.winsThisWeek }}V · {{ activity.lossesThisWeek }}D</div>
      </div>

      <div class="animate-enter border border-border-base bg-surface-base p-4 [animation-delay:80ms] md:p-5">
        <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">// RR net</span>
        <div class="mt-2 font-display text-[56px] font-black leading-[0.9] md:text-[64px]" :class="netClass">{{ formatSigned(Math.round(net)) }}</div>
        <div class="mt-2 font-mono text-xs text-text-sec">{{ activeCount }} joueur{{ activeCount > 1 ? 's' : '' }} actif{{ activeCount > 1 ? 's' : '' }} sur {{ crewSize }}</div>
      </div>

      <div class="animate-enter border border-border-base bg-surface-base p-4 [animation-delay:120ms] md:p-5">
        <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">// Temps de jeu</span>
        <div class="mt-2 whitespace-nowrap font-display text-[44px] font-black leading-[0.9] md:text-[56px]">{{ formatPlaytime(activity.totalPlaytimeMinutesThisWeek * 60) }}</div>
        <div class="mt-2 font-mono text-xs text-text-sec">{{ Math.round(activity.averageGameDurationMinutesThisWeek) }} min par partie</div>
      </div>
    </div>

    <section class="border border-border-base bg-surface-base p-4 md:p-5">
      <FrameHead title="Jour par jour" :aside="range" as="h2" />
      <ol class="grid grid-cols-7 gap-2 md:gap-3">
        <li v-for="day in days" :key="day.key" :aria-label="day.label" class="flex min-w-0 flex-col items-center gap-1.5">
          <span aria-hidden="true" class="font-mono text-xs font-medium" :class="day.games ? 'text-text-main' : 'text-text-ter'">{{ day.games }}</span>
          <span aria-hidden="true" class="flex h-20 w-full max-w-10 flex-col justify-end bg-surface-high">
            <span class="w-full bg-loss transition-[height] duration-300 ease-snap" :style="{ height: day.lossesHeight }" />
            <span class="w-full bg-win transition-[height] duration-300 ease-snap" :style="{ height: day.winsHeight }" />
          </span>
          <span aria-hidden="true" class="font-mono text-[11px]" :class="day.rrClass">{{ day.rrText }}</span>
          <span aria-hidden="true" :title="day.title" class="font-mono text-[11px] uppercase" :class="day.isToday ? 'font-bold text-text-main' : 'text-text-ter'">{{ day.initial }}</span>
        </li>
      </ol>
      <p aria-hidden="true" class="mt-3 flex flex-wrap gap-x-4 font-mono text-[11px] text-text-ter">
        <span><span class="mr-1 inline-block size-2 bg-win" />victoires</span>
        <span><span class="mr-1 inline-block size-2 bg-loss" />défaites</span>
        <span>RR net du jour sous la barre</span>
      </p>
    </section>
  </div>
</template>
