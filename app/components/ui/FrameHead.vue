<script setup lang="ts">
/**
 * ASCII motif 2 of the design system: a card title set in a box-drawing frame,
 * `┌─[ CLASSEMENT ]──────── aside`. The brackets are decorative; the title is a real heading.
 */
withDefaults(defineProps<{
  title: string
  aside?: string | null
  as?: 'h2' | 'h3' | 'div'
}>(), { aside: null, as: 'h3' })
</script>

<template>
  <div class="mb-4 flex items-center gap-[1ch] font-mono text-xs font-medium uppercase tracking-[0.06em]">
    <span aria-hidden="true" class="text-border-ascii">┌─[</span>
    <component :is="as" class="whitespace-nowrap text-text-main">{{ title }}</component>
    <span aria-hidden="true" class="text-border-ascii">]</span>
    <span aria-hidden="true" class="h-px min-w-4 flex-1 bg-border-ascii opacity-70" />
    <span v-if="aside" class="truncate text-text-ter">{{ aside }}</span>
  </div>
</template>
