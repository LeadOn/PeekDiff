<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { rankIconUrl } from '~/utils/val-assets'
import { tierInfo } from '~/utils/val-tier'

/**
 * A competitive tier's emblem. Emblems are never recoloured nor filtered (design system §8). When the
 * tier has no image, or the image fails, the ASCII fallback `[ — ]` takes its place.
 */
const props = withDefaults(defineProps<{
  tierId: number | null | undefined
  /** The URL the API sent, preferred over the one built from `tierId`. */
  src?: string | null
  size?: 'small' | 'large'
  /** Empty when the tier's name is printed next to the emblem. */
  alt?: string | null
}>(), { src: null, size: 'small', alt: null })

const failed = ref(false)
watch(() => [props.src, props.tierId], () => { failed.value = false })

const url = computed(() => props.src ?? rankIconUrl(props.tierId, props.size))
const label = computed(() => props.alt ?? tierInfo(props.tierId).label)
</script>

<template>
  <img
    v-if="url && !failed"
    :src="url"
    :alt="label"
    width="256"
    height="256"
    loading="lazy"
    class="object-contain"
    @error="failed = true"
  >
  <span v-else :title="label" class="inline-flex items-center justify-center font-mono text-[11px] text-text-ter">
    <span aria-hidden="true">[ — ]</span>
    <span class="sr-only">{{ label }}</span>
  </span>
</template>
