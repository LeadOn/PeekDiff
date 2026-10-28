<script setup lang="ts">
import { computed } from 'vue'
import type { LadderEntry } from '~/utils/val-ladder'
import { formatSigned } from '~/utils/number'
import ValRankEmblem from '~/components/val/ValRankEmblem.vue'

/**
 * The best 7-day RR swing of the visible crew, told as a hero card over the player's `largeart`.
 * Derived on the front end from `rrChange7DaysValorant`: the API has no Valorant "fact of the week".
 */
const props = defineProps<{
  entry: LadderEntry
}>()

const backdropStyle = computed(() => (props.entry.cardLarge ? { backgroundImage: `url('${props.entry.cardLarge}')` } : {}))
</script>

<template>
  <section aria-labelledby="player-of-the-week" class="notch-2 relative isolate overflow-hidden bg-night p-5 text-on-night">
    <div aria-hidden="true" class="absolute inset-y-0 right-0 -z-10 w-[62%] bg-cover bg-top grayscale-[0.35]" :style="backdropStyle" />
    <div aria-hidden="true" class="scanlines bg-scrim-night absolute inset-0 -z-10" />

    <h2 id="player-of-the-week" class="font-mono text-[11px] uppercase tracking-[0.08em] text-on-night-red">// Joueur de la semaine</h2>
    <p class="mt-10 font-display text-[52px] font-black uppercase leading-[0.85]">{{ entry.name }}</p>
    <p class="mt-1.5 font-mono text-xs text-on-night-2">{{ entry.tag }}</p>
    <p class="mt-3 flex items-center gap-2 text-sm font-semibold">
      <ValRankEmblem :tier-id="entry.rank?.tierId" :src="entry.emblemUrl" alt="" class="size-6" />
      {{ entry.tierLabel }} <span class="font-mono font-normal text-on-night-2">· {{ entry.rank?.rankedRating }} RR</span>
    </p>
    <div aria-hidden="true" class="mt-4 h-0.5 max-w-40 origin-left animate-wipe bg-on-night-red" />
    <p class="mt-4 flex items-baseline gap-2">
      <span class="font-display text-[64px] font-black leading-[0.85] text-on-night-win">{{ formatSigned(entry.delta ?? 0) }}</span>
      <span class="font-mono text-xs uppercase tracking-[0.06em] text-on-night-2">RR en 7 jours</span>
    </p>
  </section>
</template>
