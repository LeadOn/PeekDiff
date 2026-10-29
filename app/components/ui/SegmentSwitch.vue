<script setup lang="ts" generic="T extends string | null">
/**
 * A row of mutually exclusive filters (`7 J · 30 J · 3 MOIS · TOUT`). The active option carries the
 * 2px red rule the design system reserves for the active element of a set, like a tab.
 */
defineProps<{
  options: { value: T, label: string }[]
  modelValue: T
  /** Names the group for assistive technologies: "Période". */
  label: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: T): void
}>()
</script>

<template>
  <div role="group" :aria-label="label" class="inline-flex max-w-full overflow-x-auto border border-border-base bg-surface-base">
    <button
      v-for="option in options"
      :key="option.value ?? 'all'"
      type="button"
      :aria-pressed="option.value === modelValue"
      class="h-9 shrink-0 cursor-pointer whitespace-nowrap border-b-2 px-3 font-mono text-xs font-medium uppercase tracking-[0.06em] transition-colors duration-150 ease-snap focus-visible:outline-offset-[-4px]"
      :class="option.value === modelValue
        ? 'border-brand-red bg-surface-high text-text-main'
        : 'border-transparent text-text-sec hover:bg-surface-hover hover:text-text-main'"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
