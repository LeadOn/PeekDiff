<script setup lang="ts">
import { computed } from 'vue'
import type { AgentRole } from '~/utils/val-assets'
import { AGENT_ROLES } from '~/utils/val-assets'

/**
 * The role chip of the design system (§7): the official role glyph tinted in the role's colour, then
 * its name, under a 1px rule of the same colour. Never the colour alone.
 */
const props = defineProps<{
  role: AgentRole
}>()

/** Literal classes, so Tailwind sees every one of them. */
const COLOR_CLASSES: Record<AgentRole, string> = {
  duelist: 'border-role-duelist text-role-duelist',
  initiator: 'border-role-initiator text-role-initiator',
  controller: 'border-role-controller text-role-controller',
  sentinel: 'border-role-sentinel text-role-sentinel',
}

const info = computed(() => AGENT_ROLES[props.role])
</script>

<template>
  <span class="inline-flex h-5 shrink-0 items-center gap-1 border px-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em]" :class="COLOR_CLASSES[role]">
    <span aria-hidden="true" class="role-icon size-3 shrink-0" :style="{ '--src': `url('${info.iconUrl}')` }" />
    <span class="text-text-sec">{{ info.label }}</span>
  </span>
</template>
