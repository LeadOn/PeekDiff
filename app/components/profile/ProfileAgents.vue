<script setup lang="ts">
import { computed } from 'vue'
import type { ValAgentStatDto } from '~/lib/types'
import { formatDecimal, formatPercent } from '~/utils/number'
import FrameHead from '~/components/ui/FrameHead.vue'
import ValAgentIcon from '~/components/val/ValAgentIcon.vue'

/** The agents of the performance recap, most played first. */
const props = withDefaults(defineProps<{
  agents: ValAgentStatDto[]
  periodPhrase: string
  limit?: number
}>(), { limit: 6 })

const rows = computed(() => props.agents.slice(0, props.limit))
</script>

<template>
  <section class="border border-border-base bg-surface-base p-4">
    <FrameHead title="Agents" :aside="periodPhrase" as="h2" />
    <ol v-if="rows.length" class="flex flex-col">
      <li
        v-for="agent in rows"
        :key="agent.agentName"
        class="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border-base py-2 first:border-t-0"
      >
        <ValAgentIcon :src="agent.agentIconUrl" :name="agent.agentName" class="size-9" />
        <span class="flex min-w-0 flex-col">
          <span class="truncate text-sm font-semibold">{{ agent.agentName }}</span>
          <span class="font-mono text-[11px] text-text-sec">{{ agent.gamesPlayed }} partie{{ agent.gamesPlayed > 1 ? 's' : '' }} · {{ agent.wins }}V</span>
        </span>
        <span class="flex flex-col items-end font-mono text-[11px] text-text-sec">
          <span><b class="text-[13px] font-medium" :class="agent.winRate >= 50 ? 'text-win' : 'text-text-main'">{{ formatPercent(agent.winRate) }}</b> vict.</span>
          <span>ACS {{ Math.round(agent.acs) }} · KDA {{ formatDecimal(agent.kda) }}</span>
        </span>
      </li>
    </ol>
    <p v-else class="font-mono text-xs text-text-ter">Aucun agent joué {{ periodPhrase }}.</p>
  </section>
</template>
