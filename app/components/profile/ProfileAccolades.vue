<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ValAccoladeSummaryDto } from '~/lib/types'
import type { Loadable } from '~/composables/useProfileExtras'
import { formatDecimal } from '~/utils/number'
import { accoladeLabel, accoladeUnit } from '~/utils/val-labels'
import FrameHead from '~/components/ui/FrameHead.vue'
import SegmentSwitch from '~/components/ui/SegmentSwitch.vue'

/**
 * "Accolades": the end-of-game stars Riot hands out, counted per kind with the best value reached,
 * all-time by default and act by act on demand. Read once a day upstream.
 */
const props = defineProps<{
  accolades: Loadable<ValAccoladeSummaryDto[]>
}>()

/** `null` = all-time; otherwise an act's `seasonId`. */
const scope = ref<string | null>(null)

/** The acts that have accolades, newest first (the API sends them oldest first). */
const actOptions = computed(() => {
  const seen = new Map<string, string>()
  for (const entry of props.accolades.data ?? []) {
    if (entry.seasonId && !seen.has(entry.seasonId)) seen.set(entry.seasonId, (entry.seasonShort ?? entry.seasonId).toUpperCase())
  }
  return [{ value: null, label: 'Tout' }, ...[...seen].reverse().slice(0, 5).map(([value, label]) => ({ value, label }))]
})

const rows = computed(() => (props.accolades.data ?? [])
  .filter(entry => entry.seasonId === scope.value)
  .sort((a, b) => b.count - a.count)
  .map((entry) => {
    const unit = accoladeUnit(entry.type)
    return {
      key: `${entry.type}-${entry.accoladeId}`,
      label: accoladeLabel(entry.type),
      count: entry.count,
      best: entry.bestValue > 0 ? `${formatDecimal(entry.bestValue)}${unit ? ` ${unit}` : ''}` : null,
    }
  }))
</script>

<template>
  <section class="min-w-0 border border-border-base bg-surface-base p-4">
    <FrameHead title="Accolades" aside="étoiles de fin de partie" />

    <div v-if="accolades.status === 'loading'" aria-busy="true" class="grid animate-pulse grid-cols-2 gap-2">
      <span v-for="i in 6" :key="i" class="h-14 bg-surface-high" />
    </div>
    <p v-else-if="accolades.status === 'unavailable'" class="font-mono text-xs text-text-ter">// Accolades indisponibles : l'API ne les fournit pas encore.</p>
    <p v-else-if="accolades.status === 'error'" class="font-mono text-xs text-text-ter">Les accolades n'ont pas pu être chargées.</p>
    <p v-else-if="(accolades.data ?? []).length === 0" class="font-mono text-xs text-text-ter">Aucune accolade relevée pour ce compte.</p>

    <template v-else>
      <SegmentSwitch v-if="actOptions.length > 1" v-model="scope" :options="actOptions" label="Période des accolades" class="mb-3" />
      <ul v-if="rows.length" class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <li v-for="row in rows" :key="row.key" class="flex min-w-0 items-center justify-between gap-3 border border-border-base bg-surface-high px-3 py-2">
          <span class="flex min-w-0 flex-col">
            <span class="truncate text-sm font-semibold">{{ row.label }}</span>
            <span v-if="row.best" class="truncate font-mono text-[11px] text-text-sec">meilleur : {{ row.best }}</span>
          </span>
          <span class="shrink-0 font-display text-[28px] font-black leading-none">×{{ row.count }}</span>
        </li>
      </ul>
      <p v-else class="font-mono text-xs text-text-ter">Aucune accolade sur cet acte.</p>
    </template>
  </section>
</template>
