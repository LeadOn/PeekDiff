<script setup lang="ts">
import { computed } from 'vue'
import type { GameLine } from '~/utils/val-match'
import { RESULT_LABELS } from '~/utils/val-match'
import { formatClock, formatDuration } from '~/utils/date'
import { formatDecimal, formatPercent, formatSigned } from '~/utils/number'
import { glyphBar } from '~/utils/ascii'
import ValAgentIcon from '~/components/val/ValAgentIcon.vue'

/**
 * "Partie (fil)" of the design system (§7): a game seen from one player — result, agent, score, map
 * banner under the surface veil, K/D/A, ACS, ADR, headshots and the RR it moved. Not a link yet:
 * there is no match page.
 */
const props = defineProps<{
  line: GameLine
}>()

const sideClass = computed(() => ({
  V: 'bg-win',
  D: 'bg-loss',
  N: 'bg-border-strong',
  R: 'bg-border-base',
}[props.line.result]))

const resultClass = computed(() => ({
  V: 'bg-win-soft text-win',
  D: 'bg-loss-soft text-loss',
  N: 'bg-surface-high text-text-sec',
  R: 'bg-surface-high text-text-ter',
}[props.line.result]))

const bannerStyle = computed(() => (props.line.mapBannerUrl ? { backgroundImage: `url('${props.line.mapBannerUrl}')` } : {}))

const hsBar = computed(() => (props.line.headshotPercent === null ? null : glyphBar(props.line.headshotPercent / 100, 6)))

const rrClass = computed(() => {
  const rr = props.line.rrChange
  if (rr === null || rr === 0) return 'text-text-sec'
  return rr > 0 ? 'text-win' : 'text-loss'
})

const when = computed(() => `${props.line.queueLabel} · ${formatClock(props.line.startedAt)} · ${formatDuration(props.line.durationSeconds)}`)
</script>

<template>
  <article
    class="group relative isolate grid grid-cols-[4px_44px_minmax(0,1fr)] gap-x-3 overflow-hidden border border-border-base bg-surface-base transition-colors duration-150 ease-snap hover:border-border-strong sm:grid-cols-[4px_52px_minmax(0,1fr)] sm:gap-x-3.5"
    :class="line.result === 'R' ? 'opacity-70' : ''"
  >
    <div aria-hidden="true" class="absolute inset-0 -z-10 bg-cover bg-center grayscale-[0.35] contrast-[1.05]" :style="bannerStyle" />
    <div aria-hidden="true" class="absolute inset-0 -z-10 bg-linear-to-r from-surface-base from-35% to-surface-base/70 transition-colors duration-150 group-hover:from-surface-hover group-hover:to-surface-hover/65" />

    <span aria-hidden="true" :class="sideClass" />

    <ValAgentIcon :src="line.agentIconUrl" :name="line.agentName" :alt="line.agentName" class="my-3 size-11 border-b-2 border-border-strong sm:size-[52px]" />

    <div class="flex min-w-0 flex-col gap-2 py-3 pr-3 sm:pr-3.5">
      <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span :title="RESULT_LABELS[line.result]" class="grid size-6 shrink-0 place-items-center font-mono text-xs font-bold" :class="resultClass">
          <span aria-hidden="true">{{ line.result }}</span><span class="sr-only">{{ RESULT_LABELS[line.result] }}</span>
        </span>
        <span class="font-display text-[28px] font-extrabold leading-none">
          {{ line.roundsFor }}<span aria-hidden="true">–</span><span class="sr-only"> à </span>{{ line.roundsAgainst }}
        </span>
        <span class="text-[15px] font-semibold uppercase tracking-[0.04em]">{{ line.mapName }}</span>
        <span v-if="line.isMvp" title="Meilleure note de la partie" class="font-mono text-[11px] font-bold uppercase text-mvp">MVP</span>
        <span v-else-if="line.isTeamMvp" title="Meilleure note de l'équipe perdante" class="font-mono text-[11px] font-bold uppercase text-mvp-team">MVP équipe</span>
        <span class="w-full font-mono text-[11px] text-text-ter sm:ml-auto sm:w-auto">{{ when }}</span>
      </div>

      <div class="flex flex-wrap items-center gap-x-[18px] gap-y-1.5 font-mono text-[13px] text-text-sec">
        <span>K/D/A <b class="font-medium text-text-main">{{ line.kills }}/{{ line.deaths }}/{{ line.assists }}</b></span>
        <span v-if="line.acs !== null">ACS <b class="font-medium text-text-main">{{ Math.round(line.acs) }}</b></span>
        <span v-if="line.adr !== null" class="hidden sm:inline">ADR <b class="font-medium text-text-main">{{ Math.round(line.adr) }}</b></span>
        <span v-if="hsBar && line.headshotPercent !== null" class="ascii" role="img" :aria-label="`Headshots : ${formatPercent(line.headshotPercent)}`">
          <span aria-hidden="true"><span class="text-text-main">{{ hsBar.on }}</span><span class="text-border-ascii">{{ hsBar.off }}</span> </span><b class="font-medium text-text-main">{{ formatPercent(line.headshotPercent) }}</b>
        </span>
        <span v-if="line.rating !== null" class="hidden md:inline" title="Note de la partie, sur 10">Note <b class="font-medium text-text-main">{{ formatDecimal(line.rating) }}</b></span>
        <span v-if="line.rrChange !== null" class="font-medium" :class="rrClass" :title="line.postGameTier ? `Après la partie : ${line.postGameTier}` : undefined">
          {{ line.rrChange === 0 ? '±0' : formatSigned(line.rrChange) }} RR
        </span>
      </div>

      <p v-if="line.mates.length" class="flex flex-wrap items-center gap-x-1.5 text-xs text-text-sec">
        <span>{{ line.premade ? 'En groupe avec' : 'Avec' }}</span>
        <template v-for="(mate, index) in line.mates" :key="mate.id">
          <NuxtLink :to="`/player/${mate.id}`" class="font-semibold text-text-main underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-brand-red">{{ mate.name }}</NuxtLink><span v-if="index < line.mates.length - 1" aria-hidden="true">·</span>
        </template>
      </p>
    </div>
  </article>
</template>
