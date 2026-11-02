<script setup lang="ts">
import { computed } from 'vue'
import type { ValAgentMasteryDto } from '~/lib/types'
import type { Loadable } from '~/composables/useProfileExtras'
import { glyphBar } from '~/utils/ascii'
import { agentImageUrl } from '~/utils/val-assets'
import FrameHead from '~/components/ui/FrameHead.vue'
import ValAgentIcon from '~/components/val/ValAgentIcon.vue'

/**
 * "Maîtrise": the agents the account has levelled, highest first (Riot's agent mastery, read once a
 * day). Agents never levelled (`level` null) are left out rather than shown at zero.
 */
const props = withDefaults(defineProps<{
  mastery: Loadable<ValAgentMasteryDto[]>
  limit?: number
}>(), { limit: 8 })

const rows = computed(() => {
  const levelled = (props.mastery.data ?? []).filter((entry): entry is ValAgentMasteryDto & { level: number } => entry.level !== null)
    .sort((a, b) => b.level - a.level)
    .slice(0, props.limit)
  const top = Math.max(1, ...levelled.map(entry => entry.level))
  return levelled.map(entry => ({
    key: entry.agentId,
    name: entry.agentName ?? 'Agent inconnu',
    iconUrl: entry.agentIconUrl ?? agentImageUrl(entry.agentId),
    agentId: entry.agentId,
    level: entry.level,
    bar: glyphBar(entry.level / top, 10),
  }))
})
</script>

<template>
  <section class="min-w-0 border border-border-base bg-surface-base p-4">
    <FrameHead title="Maîtrise" aside="niveau d'agent" />

    <div v-if="mastery.status === 'loading'" aria-busy="true" class="flex animate-pulse flex-col gap-2">
      <span v-for="i in 4" :key="i" class="h-10 bg-surface-high" />
    </div>
    <p v-else-if="mastery.status === 'unavailable'" class="font-mono text-xs text-text-ter">// Maîtrise indisponible : l'API ne la fournit pas encore.</p>
    <p v-else-if="mastery.status === 'error'" class="font-mono text-xs text-text-ter">La maîtrise n'a pas pu être chargée.</p>
    <p v-else-if="rows.length === 0" class="font-mono text-xs text-text-ter">Aucun agent monté pour l'instant.</p>

    <ol v-else class="flex flex-col">
      <li v-for="row in rows" :key="row.key" class="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border-base py-1.5 first:border-t-0">
        <ValAgentIcon :src="row.iconUrl" :name="row.name" class="size-8" />
        <span class="flex min-w-0 flex-col">
          <span class="truncate text-sm font-semibold">{{ row.name }}</span>
          <span class="ascii text-[11px]" aria-hidden="true"><span class="text-text-main">{{ row.bar.on }}</span><span class="text-border-ascii">{{ row.bar.off }}</span></span>
        </span>
        <span class="font-mono text-xs text-text-sec">Niv. <b class="text-[13px] font-medium text-text-main">{{ row.level }}</b></span>
      </li>
    </ol>
  </section>
</template>
