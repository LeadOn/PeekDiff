<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * An agent's square icon (`displayicon`), set in a `surface-high` square with no rounding (design
 * system §8). Without an icon, or when it fails, the ASCII fallback prints the agent's initials.
 */
const props = withDefaults(defineProps<{
  src: string | null | undefined
  name: string
  /** Empty when the agent's name is printed next to the icon. */
  alt?: string
}>(), { alt: '' })

const failed = ref(false)
watch(() => props.src, () => { failed.value = false })

const initials = computed(() => props.name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '??')
</script>

<template>
  <span class="flex items-center justify-center overflow-hidden bg-surface-high">
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
    <span v-else :title="name" class="font-mono text-[13px] font-bold text-text-sec">
      <span aria-hidden="true">{{ initials }}</span>
      <span v-if="alt" class="sr-only">{{ alt }}</span>
    </span>
  </span>
</template>
