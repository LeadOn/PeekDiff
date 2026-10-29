<script setup lang="ts">
import { computed } from 'vue'
import type { LadderEntry } from '~/utils/val-ladder'
import { tierColor } from '~/utils/val-tier'
import { formatSigned } from '~/utils/number'
import ValPlayerCard from '~/components/val/ValPlayerCard.vue'
import ValRankEmblem from '~/components/val/ValRankEmblem.vue'

const props = defineProps<{
  entry: LadderEntry
  hovered: boolean
  isMe: boolean
}>()

const emit = defineEmits<{
  (e: 'hover', id: number | null): void
}>()

const ranked = computed(() => props.entry.rank !== null)

const rowClass = computed(() => {
  if (props.hovered) return 'bg-surface-hover'
  if (props.isMe) return 'bg-surface-selected'
  return 'bg-surface-base'
})

// The ladder's 2px rule: the tier's colour, or the brand red on the viewer's own row.
const ruleStyle = computed(() => ({ borderLeftColor: props.isMe ? 'var(--color-red)' : tierColor(props.entry.family) }))

const rrText = computed(() => (props.entry.rank ? `${props.entry.rank.rankedRating} RR` : ''))

const deltaClass = computed(() => {
  const delta = props.entry.delta
  if (delta === null || delta === 0) return 'text-text-sec'
  return delta > 0 ? 'text-win' : 'text-loss'
})
</script>

<template>
  <div
    class="relative grid grid-cols-[40px_36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-l-2 border-b-border-base px-3 py-2.5 transition-colors duration-150 ease-snap last:border-b-0 sm:grid-cols-[40px_36px_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_72px_64px]"
    :class="rowClass"
    :style="ruleStyle"
    @mouseenter="emit('hover', entry.id)"
    @mouseleave="emit('hover', null)"
  >
    <span class="font-display text-[28px] font-extrabold leading-none" :class="isMe ? 'text-brand-red' : 'text-text-ter'">
      <span class="sr-only">Position </span>{{ entry.position === null ? '—' : String(entry.position).padStart(2, '0') }}
    </span>

    <ValPlayerCard :src="entry.cardSmall" :name="entry.name" class="size-9" />

    <span class="flex min-w-0 flex-col">
      <span class="flex min-w-0 items-center gap-1.5">
        <NuxtLink :to="`/player/${entry.id}`" class="truncate font-semibold after:absolute after:inset-0 after:content-[''] hover:text-brand-red">{{ entry.name }}</NuxtLink>
        <span v-if="isMe" class="shrink-0 bg-brand-red-fill px-1.5 font-mono text-[10px] font-bold uppercase text-white">Vous</span>
        <span
          v-if="entry.smurf"
          :title="entry.mainName ? `Compte secondaire de ${entry.mainName}` : 'Compte secondaire'"
          class="relative z-[1] shrink-0 cursor-help border border-border-strong px-1 font-mono text-[10px] uppercase"
        >Smurf</span>
      </span>
      <span class="hidden font-mono text-xs text-text-ter sm:block">{{ entry.tag }}</span>
      <span class="whitespace-nowrap font-mono text-xs text-text-sec sm:hidden">{{ entry.tierLabel }}<template v-if="rrText"> · {{ rrText }}</template></span>
    </span>

    <span class="hidden min-w-0 items-center gap-2 sm:flex">
      <ValRankEmblem :tier-id="entry.rank?.tierId ?? 0" :src="entry.emblemUrl" alt="" class="size-8 shrink-0" :class="ranked ? '' : 'opacity-40'" />
      <span class="flex min-w-0 flex-col">
        <span class="whitespace-nowrap text-sm font-semibold" :class="ranked ? 'text-text-main' : 'text-text-sec'">{{ entry.tierLabel }}</span>
        <span class="font-mono text-[11px] text-text-sec">{{ rrText }}</span>
      </span>
    </span>

    <span class="hidden min-w-0 items-center gap-1.5 sm:flex">
      <template v-if="entry.peak">
        <ValRankEmblem :tier-id="entry.peak.tierId" alt="" class="size-6 shrink-0" />
        <span class="truncate font-mono text-xs text-text-sec">{{ entry.peak.label }}<template v-if="entry.peak.season"> · {{ entry.peak.season }}</template></span>
      </template>
      <span v-else class="font-mono text-xs text-text-ter">—</span>
    </span>

    <span class="hidden text-right sm:block">
      <span
        v-if="entry.gap !== null"
        :title="`${entry.gap} RR pour dépasser ${entry.previousName}`"
        class="relative z-[1] whitespace-nowrap font-mono text-xs text-text-sec"
      >{{ formatSigned(-entry.gap) }}</span>
    </span>

    <span class="relative z-[1] text-right font-mono text-[13px] font-medium" :class="deltaClass" :title="entry.delta === null ? 'Pas de point de comparaison à 7 jours' : 'Progression sur 7 jours'">
      {{ entry.delta === null ? '—' : formatSigned(entry.delta) }}
    </span>
  </div>
</template>
