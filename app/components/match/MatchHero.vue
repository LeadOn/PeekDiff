<script setup lang="ts">
import { computed } from 'vue'
import type { ValGameDto } from '~/lib/types'
import type { ScoreboardRow, ScoreboardTeam } from '~/utils/val-game'
import { RESULT_LABELS, queueLabel } from '~/utils/val-match'
import { agentImageUrl, mapImageUrl } from '~/utils/val-assets'
import { formatClock, formatDuration, formatLongDate } from '~/utils/date'
import { formatSigned } from '~/utils/number'
import { STAT_HINTS } from '~/utils/val-glossary'
import InfoTip from '~/components/ui/InfoTip.vue'

/**
 * "Héros match" of the design system (§7): the map's splash under the night veil, the map and the date
 * on top, then a strip with the score told from the allies' side and — when the page follows a
 * player — that player's line. It stays `night` in both themes.
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
  <section aria-labelledby="match-title" class="notch-2 relative isolate overflow-hidden bg-night text-on-night">
    <div aria-hidden="true" class="absolute inset-0 -z-20 bg-cover bg-center grayscale-[0.35] contrast-[1.05]" :style="splashStyle" />
    <!-- As on the profile: the splash is a texture under a 75 % veil, the agent's portrait the subject. -->
    <div aria-hidden="true" class="absolute inset-0 -z-20 bg-night/75" />
    <div aria-hidden="true" class="scanlines bg-scrim-night absolute inset-0 -z-10" />
    <img
      v-if="portraitUrl"
      :src="portraitUrl"
      alt=""
      width="2048"
      height="1860"
      class="pointer-events-none absolute -bottom-[42%] -right-10 -z-10 hidden h-[175%] w-auto max-w-none [mask-image:linear-gradient(90deg,transparent_10%,black_55%)] md:block"
    >

    <div class="px-5 pb-6 pt-7 md:px-8 md:pb-8 md:pt-9">
      <p class="font-mono text-[11px] uppercase tracking-[0.08em] text-on-night-red">// {{ label }}</p>
      <h1 id="match-title" class="mt-3 font-display text-[56px] font-black uppercase leading-[0.85] md:text-[88px]">
        {{ game.mapName ?? 'Carte inconnue' }}
      </h1>
      <p class="mt-2 font-mono text-[13px] text-on-night-2">{{ when }}</p>
      <div aria-hidden="true" class="mt-5 h-0.5 max-w-48 origin-left animate-wipe bg-on-night-red" />
    </div>

    <!-- The score strip: the result first, then the line of the player the page follows. -->
    <div class="flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-on-night/15 bg-night/80 px-5 py-4 md:px-8">
      <div class="flex items-center gap-4">
        <p class="flex items-end gap-3">
          <span class="flex flex-col">
            <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-on-night-win">Alliés</span>
            <span class="font-display text-[56px] font-black leading-[0.85]">{{ allies?.roundsWon ?? 0 }}</span>
          </span>
          <span aria-hidden="true" class="pb-1 font-display text-3xl font-black text-on-night-2">–</span>
          <span class="sr-only">à</span>
          <span class="flex flex-col">
            <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-on-night-loss">Ennemis</span>
            <span class="font-display text-[56px] font-black leading-[0.85]">{{ enemies?.roundsWon ?? 0 }}</span>
          </span>
        </p>
        <span v-if="result" class="inline-flex items-center gap-2 self-end px-2.5 py-1 font-mono text-xs font-bold uppercase" :class="resultClass">
          <span aria-hidden="true">{{ result }}</span>{{ RESULT_LABELS[result] }}
        </span>
      </div>

      <dl v-if="focus" class="flex flex-wrap items-end gap-x-6 gap-y-3 font-mono text-xs sm:border-l sm:border-on-night/15 sm:pl-8">
        <div>
          <dt class="text-[11px] uppercase tracking-[0.08em] text-on-night-2">Vue de</dt>
          <dd class="mt-1 text-sm">
            <NuxtLink v-if="focus.playerId" :to="`/player/${focus.playerId}`" class="font-sans font-semibold underline decoration-on-night/30 underline-offset-4 hover:text-on-night-red">{{ focus.name }}</NuxtLink><b v-else class="font-sans font-semibold">{{ focus.name }}</b>
            <span class="text-on-night-2"> · {{ focus.agentName }}</span>
            <InfoTip v-if="focus.isMvp" v-bind="STAT_HINTS.mvp" class="ml-2 text-[11px] font-bold uppercase text-on-night-mvp">MVP</InfoTip>
            <InfoTip v-else-if="focus.isTeamMvp" v-bind="STAT_HINTS.teamMvp" class="ml-2 text-[11px] font-bold uppercase text-on-night-mvp-team">MVP équipe</InfoTip>
          </dd>
        </div>
        <div>
          <dt class="text-[11px] uppercase tracking-[0.08em] text-on-night-2"><InfoTip v-bind="STAT_HINTS.kdaLine" /></dt>
          <dd class="mt-1 font-display text-2xl font-extrabold leading-none">{{ focus.kills }}/{{ focus.deaths }}/{{ focus.assists }}</dd>
        </div>
        <div v-if="focus.acs !== null">
          <dt class="text-[11px] uppercase tracking-[0.08em] text-on-night-2"><InfoTip v-bind="STAT_HINTS.acs">ACS</InfoTip></dt>
          <dd class="mt-1 font-display text-2xl font-extrabold leading-none">{{ Math.round(focus.acs) }}</dd>
        </div>
        <div v-if="focusRrChange !== null">
          <dt class="text-[11px] uppercase tracking-[0.08em] text-on-night-2"><InfoTip v-bind="STAT_HINTS.rr">RR</InfoTip></dt>
          <dd class="mt-1 font-display text-2xl font-extrabold leading-none" :class="rrClass">{{ focusRrChange === 0 ? '±0' : formatSigned(focusRrChange) }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
