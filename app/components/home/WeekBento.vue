<script setup lang="ts">
import { computed } from 'vue'
import type { Ladder, LadderEntry } from '~/utils/val-ladder'
import { useAnimatedNumber } from '~/composables/useAnimatedNumber'
import { formatSigned } from '~/utils/number'
import ValRankEmblem from '~/components/val/ValRankEmblem.vue'

/**
 * The four crew tiles above the ladder. Everything is derived from `GET /val/player`: the API has no
 * Valorant home aggregate (no games, no playtime), so the tiles are about ranks only.
 */
const props = defineProps<{
  ladder: Ladder
}>()

const rankedCount = computed(() => props.ladder.ranked.length)
const crewSize = computed(() => props.ladder.visibleCount)

/** ASCII motif 4: a glyph bar of the ranked share, 16 cells wide. */
const rankedBar = computed(() => {
  const cells = 16
  const filled = crewSize.value > 0 ? Math.round((rankedCount.value / crewSize.value) * cells) : 0
  return { on: '█'.repeat(filled), off: '░'.repeat(cells - filled) }
})

/** Only players with a comparable pair 7 days apart count; `null` is not 0. */
const tracked = computed(() => props.ladder.ranked.filter(entry => entry.delta !== null))
const netRr = computed(() => tracked.value.reduce((sum, entry) => sum + (entry.delta ?? 0), 0))
const animatedNet = useAnimatedNumber(() => netRr.value)
const netClass = computed(() => (netRr.value > 0 ? 'text-win' : netRr.value < 0 ? 'text-loss' : 'text-text-main'))

const leader = computed<LadderEntry | null>(() => props.ladder.ranked[0] ?? null)

/** The best all-time peak of the visible crew: highest tier, then most RR. */
const peakHolder = computed(() => [...props.ladder.ranked, ...props.ladder.unranked]
  .filter(entry => entry.peak !== null)
  .sort((a, b) => (b.peak!.tierId - a.peak!.tierId) || ((b.peak!.rr ?? 0) - (a.peak!.rr ?? 0)))[0] ?? null)
</script>

<template>
  <div class="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
    <div class="ticks animate-enter border border-border-base bg-surface-base p-4 md:p-5">
      <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">// Classés</span>
      <div class="mt-2 font-display text-[56px] font-black leading-[0.9] md:text-[64px]">
        {{ rankedCount }}<span class="ml-1.5 font-mono text-xs font-medium text-text-ter">/ {{ crewSize }}</span>
      </div>
      <div class="ascii mt-2 text-xs" role="img" :aria-label="`${rankedCount} joueurs classés sur ${crewSize}`">
        <span class="text-text-main">{{ rankedBar.on }}</span><span class="text-border-ascii">{{ rankedBar.off }}</span>
      </div>
    </div>

    <div class="ticks animate-enter border border-border-base bg-surface-base p-4 [animation-delay:40ms] md:p-5">
      <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">// RR net · 7 j</span>
      <div class="mt-2 font-display text-[56px] font-black leading-[0.9] md:text-[64px]" :class="netClass">
        {{ tracked.length ? formatSigned(Math.round(animatedNet)) : '—' }}
      </div>
      <div class="mt-2 font-mono text-xs text-text-ter">
        {{ tracked.length }} joueur{{ tracked.length > 1 ? 's' : '' }} comparable{{ tracked.length > 1 ? 's' : '' }}
      </div>
    </div>

    <div class="ticks animate-enter border border-border-base bg-surface-base p-4 [animation-delay:80ms] md:p-5">
      <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">// Meilleur rang</span>
      <template v-if="leader">
        <div class="mt-3 flex items-center gap-2.5">
          <ValRankEmblem :tier-id="leader.rank?.tierId" :src="leader.emblemUrl" alt="" class="size-9 shrink-0 md:size-11" />
          <span class="font-display text-[22px] font-extrabold uppercase leading-none sm:text-[28px] md:text-[32px]">{{ leader.tierLabel }}</span>
        </div>
        <div class="mt-2 truncate font-mono text-xs text-text-sec">{{ leader.name }} · {{ leader.rank?.rankedRating }} RR</div>
      </template>
      <div v-else class="mt-3 font-mono text-sm text-text-ter">[ — ]</div>
    </div>

    <div class="ticks animate-enter border border-border-base bg-surface-base p-4 [animation-delay:120ms] md:p-5">
      <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">// Pic du crew</span>
      <template v-if="peakHolder?.peak">
        <div class="mt-3 flex items-center gap-2.5">
          <ValRankEmblem :tier-id="peakHolder.peak.tierId" :src="peakHolder.peak.iconUrl" size="large" alt="" class="size-9 shrink-0 md:size-11" />
          <span class="font-display text-[22px] font-extrabold uppercase leading-none sm:text-[28px] md:text-[32px]">{{ peakHolder.peak.label }}</span>
        </div>
        <div class="mt-2 truncate font-mono text-xs text-text-sec">
          {{ peakHolder.name }}<template v-if="peakHolder.peak.season"> · {{ peakHolder.peak.season }}</template>
        </div>
      </template>
      <div v-else class="mt-3 font-mono text-sm text-text-ter">[ — ]</div>
    </div>
  </div>
</template>
