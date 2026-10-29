<script setup lang="ts">
import { computed } from 'vue'
import type { ValCrewAgentStatDto } from '~/lib/types'
import { formatPercent } from '~/utils/number'
import { playerDisplayName } from '~/utils/val-ladder'
import { agentRole } from '~/utils/val-agents'
import FrameHead from '~/components/ui/FrameHead.vue'
import ValAgentIcon from '~/components/val/ValAgentIcon.vue'
import ValRoleChip from '~/components/val/ValRoleChip.vue'

/** The crew's most played agents over the records' window, each with the member who played it most. */
const props = defineProps<{
  agents: ValCrewAgentStatDto[]
  periodPhrase: string
}>()

const rows = computed(() => props.agents.map(agent => ({
  ...agent,
  topName: playerDisplayName(agent.topPlayer.player),
  role: agentRole({ id: agent.agentId, iconUrl: agent.agentIconUrl, name: agent.agentName }),
})))
</script>

<template>
  <section class="border border-border-base bg-surface-base p-4">
    <FrameHead title="Agents du crew" :aside="periodPhrase" as="h3" />
    <ol v-if="rows.length" class="flex flex-col">
      <li
        v-for="agent in rows"
        :key="agent.agentName"
        class="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border-base py-2 first:border-t-0"
      >
        <ValAgentIcon :src="agent.agentIconUrl" :name="agent.agentName" class="size-9" />
        <span class="flex min-w-0 flex-col">
          <span class="flex min-w-0 items-center gap-2">
            <span class="truncate text-sm font-semibold">{{ agent.agentName }}</span>
            <ValRoleChip v-if="agent.role" :role="agent.role" class="hidden sm:inline-flex" />
          </span>
          <span class="truncate font-mono text-[11px] text-text-sec">
            {{ agent.gamesPlayed }} partie{{ agent.gamesPlayed > 1 ? 's' : '' }} · surtout
            <NuxtLink :to="`/player/${agent.topPlayer.player.id}`" class="text-text-main hover:text-brand-red">{{ agent.topName }}</NuxtLink>
          </span>
        </span>
        <span class="font-mono text-[11px] text-text-sec">
          <b class="text-[13px] font-medium" :class="agent.winRate >= 50 ? 'text-win' : 'text-text-main'">{{ formatPercent(agent.winRate) }}</b> vict.
        </span>
      </li>
    </ol>
    <p v-else class="font-mono text-xs text-text-ter">Aucun agent joué {{ periodPhrase }}.</p>
  </section>
</template>
