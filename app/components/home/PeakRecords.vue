<script setup lang="ts">
import { computed } from 'vue'
import type { LadderEntry } from '~/utils/val-ladder'
import FrameHead from '~/components/ui/FrameHead.vue'
import ValRankEmblem from '~/components/val/ValRankEmblem.vue'

/** The crew's all-time peaks (`valorantPeak*`), best first. */
const props = withDefaults(defineProps<{
  entries: LadderEntry[]
  limit?: number
}>(), { limit: 5 })

const peaks = computed(() => props.entries
  .filter(entry => entry.peak !== null)
  .sort((a, b) => (b.peak!.tierId - a.peak!.tierId) || ((b.peak!.rr ?? 0) - (a.peak!.rr ?? 0)))
  .slice(0, props.limit))
</script>

<template>
  <section class="border border-border-base bg-surface-base p-4">
    <FrameHead title="Pics de rang" aside="Tous actes" as="h2" />
    <ol v-if="peaks.length" class="flex flex-col">
      <li
        v-for="(entry, index) in peaks"
        :key="entry.id"
        class="grid grid-cols-[24px_32px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-border-base py-2 first:border-t-0"
      >
        <span class="font-mono text-xs text-text-ter">{{ String(index + 1).padStart(2, '0') }}</span>
        <ValRankEmblem :tier-id="entry.peak!.tierId" :src="entry.peak!.iconUrl" size="large" alt="" class="size-8" />
        <span class="flex min-w-0 flex-col">
          <span class="truncate text-sm font-semibold">{{ entry.name }}</span>
          <span class="font-mono text-[11px] text-text-sec">{{ entry.peak!.label }}<template v-if="entry.peak!.rr !== null"> · {{ entry.peak!.rr }} RR</template></span>
        </span>
        <span class="font-mono text-[11px] uppercase text-text-ter">{{ entry.peak!.season ?? '' }}</span>
      </li>
    </ol>
    <p v-else class="font-mono text-xs text-text-ter">Aucun pic connu pour le moment.</p>
  </section>
</template>
