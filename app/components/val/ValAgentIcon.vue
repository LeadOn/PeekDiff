<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AgentRole } from '~/utils/val-assets'
import { AGENT_ROLES } from '~/utils/val-assets'
import { agentRole } from '~/utils/val-agents'

/**
 * An agent's square icon (`displayicon`), set in a `surface-high` square with no rounding and a 2px
 * bottom rule in the colour of the agent's role (design system §8); `border-strong` for an agent the
 * role table does not know. Without an icon, or when it fails, the ASCII fallback prints the agent's
 * initials. The role's name rides in `title`: the colour never carries it alone.
 */
const props = withDefaults(defineProps<{
  src: string | null | undefined
  name: string
  /** Empty when the agent's name is printed next to the icon. */
  alt?: string
  /** Off where the icon is too small for a rule, as in the crew feed's stacked faces. */
  rule?: boolean
}>(), { alt: '', rule: true })

/** Literal classes, so Tailwind sees every one of them. */
const RULE_CLASSES: Record<AgentRole, string> = {
  duelist: 'border-b-role-duelist',
  initiator: 'border-b-role-initiator',
  controller: 'border-b-role-controller',
  sentinel: 'border-b-role-sentinel',
}

const failed = ref(false)
watch(() => props.src, () => { failed.value = false })

const initials = computed(() => props.name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '??')
const role = computed(() => agentRole({ iconUrl: props.src, name: props.name }))
const title = computed(() => (role.value ? `${props.name} · ${AGENT_ROLES[role.value].label}` : props.name))
const ruleClass = computed(() => (props.rule ? ['border-b-2', role.value ? RULE_CLASSES[role.value] : 'border-b-border-strong'] : []))
</script>

<template>
  <span :title="title" class="flex items-center justify-center overflow-hidden bg-surface-high" :class="ruleClass">
    <img
      v-if="src && !failed"
      :src="src"
      :alt="alt"
      width="1024"
      height="1024"
      loading="lazy"
      class="size-full object-cover"
      @error="failed = true"
    >
    <span v-else class="font-mono text-[13px] font-bold text-text-sec">
      <span aria-hidden="true">{{ initials }}</span>
      <span v-if="alt" class="sr-only">{{ alt }}</span>
    </span>
  </span>
</template>
