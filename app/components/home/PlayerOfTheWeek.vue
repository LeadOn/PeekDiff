<script setup lang="ts">
import { computed } from 'vue'
import type { ValFactOfTheWeekDto } from '~/lib/types'
import type { LadderEntry } from '~/utils/val-ladder'
import { formatSigned } from '~/utils/number'
import ValRankEmblem from '~/components/val/ValRankEmblem.vue'

/**
 * The best 7-day RR swing of the visible crew, told as a hero card over the player's `largeart`.
 *
 * With `fact` (`GET /val/home`), the swing is the sum of the RR each ranked game moved, and the card
 * adds the week's games and longest win streak. Without it (an API older than the match history), the
 * page derives the swing from `rrChange7DaysValorant` and passes the entry alone.
 */
const props = withDefaults(defineProps<{
  entry: LadderEntry
  fact?: ValFactOfTheWeekDto | null
}>(), { fact: null })

const delta = computed(() => props.fact?.rrChange ?? props.entry.delta ?? 0)
const deltaClass = computed(() => (delta.value > 0 ? 'text-on-night-win' : delta.value < 0 ? 'text-on-night-loss' : 'text-on-night'))

const factLine = computed(() => {
  const fact = props.fact
  if (!fact) return null
  const parts = [`${fact.gamesThisWeek} classée${fact.gamesThisWeek > 1 ? 's' : ''}`, `${fact.winsThisWeek} V`]
  if (fact.longestWinStreakThisWeek > 1) parts.push(`série de ${fact.longestWinStreakThisWeek}`)
  return parts.join(' · ')
})

const backdropStyle = computed(() => (props.entry.cardLarge ? { backgroundImage: `url('${props.entry.cardLarge}')` } : {}))
</script>

<template>
  <section aria-labelledby="player-of-the-week" class="notch-2 relative isolate overflow-hidden bg-night p-5 text-on-night">
    <div aria-hidden="true" class="absolute inset-y-0 right-0 -z-10 w-[62%] bg-cover bg-top grayscale-[0.35]" :style="backdropStyle" />
    <div aria-hidden="true" class="scanlines bg-scrim-night absolute inset-0 -z-10" />

    <h2 id="player-of-the-week" class="font-mono text-[11px] uppercase tracking-[0.08em] text-on-night-red">// Joueur de la semaine</h2>
    <p class="mt-10 font-display text-[52px] font-black uppercase leading-[0.85]">
      <NuxtLink :to="`/player/${entry.id}`" class="after:absolute after:inset-0 after:content-[''] hover:text-on-night-red">{{ entry.name }}</NuxtLink>
    </p>
    <p class="mt-1.5 font-mono text-xs text-on-night-2">{{ entry.tag }}</p>
    <p class="mt-3 flex items-center gap-2 text-sm font-semibold">
      <ValRankEmblem :tier-id="entry.rank?.tierId" :src="entry.emblemUrl" alt="" class="size-6" />
      {{ entry.tierLabel }} <span class="font-mono font-normal text-on-night-2">· {{ entry.rank?.rankedRating }} RR</span>
    </p>
    <div aria-hidden="true" class="mt-4 h-0.5 max-w-40 origin-left animate-wipe bg-on-night-red" />
    <p class="mt-4 flex items-baseline gap-2">
      <span class="font-display text-[64px] font-black leading-[0.85]" :class="deltaClass">{{ formatSigned(delta) }}</span>
      <span class="font-mono text-xs uppercase tracking-[0.06em] text-on-night-2">RR en 7 jours</span>
    </p>
    <p v-if="factLine" class="mt-2 font-mono text-xs text-on-night-2">{{ factLine }}</p>
  </section>
</template>
