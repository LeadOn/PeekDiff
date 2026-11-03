<script setup lang="ts" generic="T extends string">
import { ref } from 'vue'

/**
 * The tabs of a page (`APERÇU · STYLE DE JEU · …`): mono caps on the bar's bottom hairline, the active
 * tab in the main text colour over the 2px red rule of the active element of a set. An ARIA tablist:
 * one tab in the tab order, arrows, Home and End move between them and select as they go. Each tab
 * controls the panel `${idPrefix}-panel-${value}`, which the page renders with `role="tabpanel"`.
 */
const props = defineProps<{
  tabs: { value: T, label: string }[]
  modelValue: T
  /** Names the tablist for assistive technologies: "Sections du profil". */
  label: string
  idPrefix: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: T): void
}>()

const buttons = ref<HTMLButtonElement[]>([])

function onKeydown(event: KeyboardEvent, index: number) {
  const last = props.tabs.length - 1
  const next = {
    ArrowRight: index === last ? 0 : index + 1,
    ArrowLeft: index === 0 ? last : index - 1,
    Home: 0,
    End: last,
  }[event.key]
  if (next === undefined) return
  event.preventDefault()
  emit('update:modelValue', props.tabs[next]!.value)
  buttons.value[next]?.focus()
}
</script>

<template>
  <div role="tablist" :aria-label="label" class="flex max-w-full overflow-x-auto">
    <button
      v-for="(tab, index) in tabs"
      :id="`${idPrefix}-tab-${tab.value}`"
      :key="tab.value"
      ref="buttons"
      type="button"
      role="tab"
      :aria-selected="tab.value === modelValue"
      :aria-controls="`${idPrefix}-panel-${tab.value}`"
      :tabindex="tab.value === modelValue ? 0 : -1"
      class="-mb-px h-11 shrink-0 cursor-pointer whitespace-nowrap border-b-2 px-3 font-mono text-xs font-medium uppercase tracking-[0.08em] transition-colors duration-150 ease-snap first:pl-0 focus-visible:outline-offset-[-4px]"
      :class="tab.value === modelValue
        ? 'border-brand-red text-text-main'
        : 'border-transparent text-text-ter hover:text-text-main'"
      @click="emit('update:modelValue', tab.value)"
      @keydown="onKeydown($event, index)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
