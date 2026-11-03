<script setup lang="ts">
/**
 * A section title inside a tabbed page: display 24px with its scope in mono beside it
 * (`DERNIÈRES PARTIES  sur 3 mois · Compétition`). Quieter than the 32px title under a section index,
 * which the tab bar replaces there.
 */
withDefaults(defineProps<{
  title: string
  id?: string
  aside?: string | null
  as?: 'h2' | 'h3'
}>(), { id: undefined, aside: null, as: 'h2' })
</script>

<template>
  <div class="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
    <component :is="as" :id="id" class="font-display text-2xl font-extrabold uppercase leading-none tracking-[0.01em]">{{ title }}</component>
    <span v-if="aside" class="font-mono text-xs text-text-ter">{{ aside }}</span>
    <slot />
  </div>
</template>
