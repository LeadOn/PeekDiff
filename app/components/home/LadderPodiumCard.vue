<script setup lang="ts">
import { computed } from 'vue'
import type { LadderEntry } from '~/utils/val-ladder'
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

const isFirst = computed(() => props.entry.position === 1)
const position = computed(() => String(props.entry.position ?? 0).padStart(2, '0'))

const bannerStyle = computed(() => (props.entry.cardWide ? { backgroundImage: `url('${props.entry.cardWide}')` } : {}))

const deltaClass = computed(() => {
  const delta = props.entry.delta
  if (delta === null || delta === 0) return 'bg-surface-high text-text-sec'
  return delta > 0 ? 'bg-win-soft text-win' : 'bg-loss-soft text-loss'
})

const deltaText = computed(() => (props.entry.delta === null ? '— RR' : `${formatSigned(props.entry.delta)} RR`))

const gapText = computed(() => (props.entry.gap === null
  ? 'En tête du crew'
  : `${formatSigned(-props.entry.gap)} RR sur ${props.entry.previousName}`))
</script>

<template>
  <article
    class="notch notch-edge relative border bg-surface-base px-4 pb-4 transition-[translate,border-color] duration-200 ease-snap"
    :class="[
      hovered ? '-translate-y-1' : '',
      isFirst ? 'border-brand-red/60' : hovered ? 'border-border-strong' : 'border-border-base',
    ]"
    @mouseenter="emit('hover', entry.id)"
    @mouseleave="emit('hover', null)"
  >
    <div class="relative -mx-4 h-[92px] overflow-hidden bg-night">
      <div
        aria-hidden="true"
        class="absolute inset-0 bg-cover bg-center grayscale-[0.35] transition-transform duration-700 ease-snap"
        :class="hovered ? 'scale-105' : 'scale-100'"
        :style="bannerStyle"
      />
      <div aria-hidden="true" class="scanlines bg-scrim-rise absolute inset-0" />
      <span
        class="absolute left-3 top-2 font-display text-[44px] font-black leading-none"
        :class="isFirst ? 'text-on-night-red' : 'text-on-night'"
      ><span class="sr-only">Position </span>{{ position }}</span>
    </div>

    <ValRankEmblem :tier-id="entry.rank?.tierId" :src="entry.emblemUrl" alt="" class="absolute right-3 top-[52px] size-16 drop-shadow-lg" />

    <ValPlayerCard :src="entry.cardSmall" :name="entry.name" class="relative -mt-6 size-12 border-2 border-surface-base" />

    <div class="mt-3 flex min-w-0 items-center gap-1.5">
      <h3 class="truncate text-xl font-semibold">
        <NuxtLink :to="`/player/${entry.id}`" class="after:absolute after:inset-0 after:content-[''] hover:text-brand-red">{{ entry.name }}</NuxtLink>
      </h3>
      <span v-if="isMe" class="shrink-0 bg-brand-red-fill px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-white">Vous</span>
      <span
        v-if="entry.smurf"
        :title="entry.mainName ? `Compte secondaire de ${entry.mainName}` : 'Compte secondaire'"
        class="relative z-[1] shrink-0 cursor-help border border-border-strong px-1.5 font-mono text-[10px] uppercase"
      >Smurf</span>
    </div>
    <p class="font-mono text-xs text-text-ter">{{ entry.tag }}</p>
    <p class="mt-2 text-sm font-semibold text-text-sec">
      {{ entry.tierLabel }} <span class="font-mono font-normal">· {{ entry.rank?.rankedRating }} RR</span>
    </p>

    <div class="mt-3 flex flex-wrap items-center gap-1.5">
      <span title="Progression sur 7 jours" class="whitespace-nowrap px-2 py-[3px] font-mono text-xs font-medium" :class="deltaClass">{{ deltaText }} · 7 j</span>
    </div>

    <div class="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-border-strong pt-3 font-mono text-xs">
      <span class="min-w-0 truncate">{{ gapText }}</span>
      <span v-if="entry.peak" :title="`Pic de rang : ${entry.peak.label}`" class="flex shrink-0 items-center gap-1 text-text-ter">
        <span aria-hidden="true">▲</span>{{ entry.peak.label }}
      </span>
    </div>
  </article>
</template>
