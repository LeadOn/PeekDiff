<script setup lang="ts">
/** ASCII motif 1 of the design system: `// 01 ── CLASSEMENT`, above a section title. Decorative. */
defineProps<{
  index: string
  label: string
}>()
</script>

<template>
  <div aria-hidden="true" class="flex items-center gap-2.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-text-ter after:h-px after:flex-1 after:bg-border-base after:content-['']">
    <span class="text-brand-red">{{ index }}</span>
    <span class="text-border-ascii">──</span>
    <span>{{ label }}</span>
  </div>
</template>
