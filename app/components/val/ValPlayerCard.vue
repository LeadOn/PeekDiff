<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * A player card art (`smallart`, `wideart` or `largeart`). Decorative: the player's name is always
 * printed beside it. Without a card, or when it fails, the ASCII fallback shows the initials.
 */
const props = defineProps<{
  src: string | null | undefined
  name: string
}>()

const failed = ref(false)
watch(() => props.src, () => { failed.value = false })

const initials = computed(() => props.name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '??')
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    alt=""
    loading="lazy"
    class="object-cover"
    @error="failed = true"
  >
  <span v-else aria-hidden="true" class="flex items-center justify-center bg-surface-high font-mono text-[13px] font-bold text-text-sec">{{ initials }}</span>
</template>
