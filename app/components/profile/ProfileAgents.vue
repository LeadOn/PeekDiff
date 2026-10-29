<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ValAgentStatDto } from '~/lib/types'
import { formatDecimal, formatPercent } from '~/utils/number'
import FrameHead from '~/components/ui/FrameHead.vue'
import ValAgentIcon from '~/components/val/ValAgentIcon.vue'

/**
 * The agents of the performance recap, most played first. Also the profile's agent filter: picking a
 * row restricts the whole profile to that agent, picking it again lifts the filter. `agents` is the
 * unfiltered list, so every agent stays pickable while one is selected.
 */
const props = withDefaults(defineProps<{
  agents: ValAgentStatDto[]
  periodPhrase: string
  /** The agent the profile is filtered on, or `null`. */
  selected: string | null
  limit?: number
}>(), { limit: 6 })

const emit = defineEmits<{
  (e: 'select', agentName: string | null): void
}>()

const expanded = ref(false)

/** The first `limit` agents, plus the selected one when it sits further down the list. */
const rows = computed(() => {
  if (expanded.value) return props.agents
  const head = props.agents.slice(0, props.limit)
  const selected = props.agents.find(agent => agent.agentName === props.selected)
  return selected && !head.includes(selected) ? [...head, selected] : head
})
const hiddenCount = computed(() => props.agents.length - rows.value.length)

const toggle = (agentName: string) => emit('select', agentName === props.selected ? null : agentName)
</script>

<template>
  <section class="border border-border-base bg-surface-base p-4">
    <FrameHead title="Agents" :aside="periodPhrase" as="h2" />
    <ol v-if="rows.length" class="flex flex-col">
      <li v-for="agent in rows" :key="agent.agentName" class="border-t border-border-base first:border-t-0">
        <button
          type="button"
          :aria-pressed="agent.agentName === selected"
          :title="agent.agentName === selected ? 'Retirer le filtre' : `Filtrer le profil sur ${agent.agentName}`"
          class="grid w-full cursor-pointer grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-l-2 py-2 pl-2 pr-1 text-left transition-colors duration-150 ease-snap focus-visible:outline-offset-[-2px]"
          :class="agent.agentName === selected ? 'border-l-brand-red bg-surface-high' : 'border-l-transparent hover:bg-surface-hover'"
          @click="toggle(agent.agentName)"
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
        </button>
      </li>
    </ol>
    <p v-else class="font-mono text-xs text-text-ter">Aucun agent joué {{ periodPhrase }}.</p>
    <button
      v-if="hiddenCount > 0 || expanded"
      type="button"
      :aria-expanded="expanded"
      class="mt-2 cursor-pointer font-mono text-xs uppercase tracking-[0.06em] text-text-sec transition-colors duration-150 ease-snap hover:text-text-main"
      @click="expanded = !expanded"
    >
      <span aria-hidden="true" class="text-text-ter">[</span>{{ expanded ? 'Moins d\'agents' : `${hiddenCount} agent${hiddenCount > 1 ? 's' : ''} de plus` }}<span aria-hidden="true" class="text-text-ter">]</span>
    </button>
  </section>
</template>
