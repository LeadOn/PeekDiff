<script setup lang="ts">
import { computed } from 'vue'
import type { ValGameDto } from '~/lib/types'
import type { ScoreboardRow, ScoreboardTeam } from '~/utils/val-game'
import { RESULT_LABELS, queueLabel } from '~/utils/val-match'
import { agentImageUrl, mapImageUrl } from '~/utils/val-assets'
import { formatClock, formatDuration, formatLongDate } from '~/utils/date'
import { formatSigned } from '~/utils/number'

/**
 * "Héros match" of the design system (§7): the map's splash under the night veil, the score told from
 * the allies' side, and — when the page follows a player — that player's agent and line. It stays
 * `night` in both themes.
 */
const props = defineProps<{
  game: ValGameDto
  /** Allies first. */
  teams: ScoreboardTeam[]
  focus: ScoreboardRow | null
  /** The focused player's agent uuid, for the full portrait. */
  focusAgentId: string | null
  focusRrChange: number | null
}>()

const allies = computed(() => props.teams.find(team => team.side === 'ally') ?? null)
const enemies = computed(() => props.teams.find(team => team.side === 'enemy') ?? null)

const splashStyle = computed(() => {
  const url = props.game.mapSplashUrl ?? mapImageUrl(props.game.mapId, 'splash')
  return url ? { backgroundImage: `url('${url}')` } : {}
})

const portraitUrl = computed(() => agentImageUrl(props.focusAgentId, 'portrait'))

const label = computed(() => [queueLabel(props.game.queueId, props.game.queueName), props.game.seasonShort].filter(Boolean).join(' · '))

const when = computed(() => `${formatLongDate(props.game.gameStart)} · ${formatClock(props.game.gameStart)} · ${formatDuration(props.game.gameLengthMs / 1000)}`)

const result = computed(() => allies.value?.result ?? null)
const resultClass = computed(() => ({
  V: 'bg-on-night-win/15 text-on-night-win',
  D: 'bg-on-night-loss/15 text-on-night-loss',
  N: 'bg-on-night/10 text-on-night-2',
  R: 'bg-on-night/10 text-on-night-2',
}[result.value ?? 'N']))

const rrClass = computed(() => {
  const rr = props.focusRrChange
  if (rr === null || rr === 0) return 'text-on-night-2'
  return rr > 0 ? 'text-on-night-win' : 'text-on-night-loss'
})
</script>

<template>
  <section aria-labelledby="match-title" class="notch-2 relative isolate overflow-hidden bg-night px-5 pb-6 pt-7 text-on-night md:min-h-[300px] md:px-8 md:pb-8">
    <div aria-hidden="true" class="absolute inset-0 -z-20 bg-cover bg-center grayscale-[0.35] contrast-[1.05]" :style="splashStyle" />
    <div aria-hidden="true" class="absolute inset-0 -z-20 bg-night/50" />
    <div aria-hidden="true" class="scanlines bg-scrim-night absolute inset-0 -z-10" />
    <img
      v-if="portraitUrl"
      :src="portraitUrl"
      alt=""
      width="2048"
      height="1860"
      class="pointer-events-none absolute -bottom-[42%] -right-10 -z-10 hidden h-[175%] w-auto max-w-none [mask-image:linear-gradient(90deg,transparent_10%,black_55%)] md:block"
    >

    <p class="font-mono text-[11px] uppercase tracking-[0.08em] text-on-night-red">// {{ label }}</p>
    <h1 id="match-title" class="mt-3 font-display text-[56px] font-black uppercase leading-[0.85] md:text-[88px]">
      {{ game.mapName ?? 'Carte inconnue' }}
    </h1>
    <p class="mt-2 font-mono text-[13px] text-on-night-2">{{ when }}</p>

    <div aria-hidden="true" class="mt-5 h-0.5 max-w-48 origin-left animate-wipe bg-on-night-red" />

    <div class="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
      <p class="flex items-end gap-4">
        <span class="flex flex-col">
          <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-on-night-win">Alliés</span>
          <span class="font-display text-[64px] font-black leading-[0.85] md:text-[80px]">{{ allies?.roundsWon ?? 0 }}</span>
        </span>
        <span aria-hidden="true" class="pb-2 font-display text-4xl font-black text-on-night-2">–</span>
        <span class="sr-only">à</span>
        <span class="flex flex-col">
          <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-on-night-loss">Ennemis</span>
          <span class="font-display text-[64px] font-black leading-[0.85] md:text-[80px]">{{ enemies?.roundsWon ?? 0 }}</span>
        </span>
      </p>
      <span v-if="result" class="mb-2 inline-flex items-center gap-2 px-2.5 py-1 font-mono text-xs font-bold uppercase" :class="resultClass">
        <span aria-hidden="true">{{ result }}</span>{{ RESULT_LABELS[result] }}
      </span>
    </div>

    <p v-if="focus" class="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-on-night-2">
      <span>
        Vue de <NuxtLink v-if="focus.playerId" :to="`/player/${focus.playerId}`" class="font-semibold text-on-night underline decoration-on-night/30 underline-offset-4 hover:text-on-night-red">{{ focus.name }}</NuxtLink><b v-else class="text-on-night">{{ focus.name }}</b>
        · {{ focus.agentName }}
      </span>
      <span>K/D/A <b class="font-medium text-on-night">{{ focus.kills }}/{{ focus.deaths }}/{{ focus.assists }}</b></span>
      <span v-if="focus.acs !== null">ACS <b class="font-medium text-on-night">{{ Math.round(focus.acs) }}</b></span>
      <span v-if="focusRrChange !== null" class="font-medium" :class="rrClass">{{ focusRrChange === 0 ? '±0' : formatSigned(focusRrChange) }} RR</span>
      <span v-if="focus.isMvp" class="font-bold uppercase text-on-night-mvp">MVP</span>
      <span v-else-if="focus.isTeamMvp" class="font-bold uppercase text-on-night-mvp-team">MVP équipe</span>
    </p>
  </section>
</template>
