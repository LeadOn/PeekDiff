<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { LadderEntry } from '~/utils/val-ladder'
import { useEntered } from '~/composables/useEntered'
import { FAMILY_ELO, RADIANT_ELO, familyAtElo, familyBaseTier, familyLabel, tierColor } from '~/utils/val-tier'
import { rankIconUrl } from '~/utils/val-assets'
import { formatSigned } from '~/utils/number'
import FrameHead from '~/components/ui/FrameHead.vue'

/**
 * "L'échelle des rangs": every ranked player placed on the continuous elo axis, over the tier
 * families' bands, with a trail back to where they stood 7 days ago (`rrChange7DaysValorant`).
 *
 * Players too close to share a line are pushed onto extra lanes, which needs the real width of the
 * track: it is measured after mount, and the server renders with a nominal one.
 */

const props = defineProps<{
  entries: LadderEntry[]
  hoveredId: number | null
  meId: number | null
}>()

const emit = defineEmits<{
  (e: 'hover', id: number | null): void
}>()

const entered = useEntered()

const track = ref<HTMLElement | null>(null)
const width = ref(0)
let observer: ResizeObserver | null = null

onMounted(() => {
  if (!track.value || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(([entry]) => {
    const measured = Math.round(entry?.contentRect.width ?? 0)
    if (Math.abs(measured - width.value) > 2) width.value = measured
  })
  observer.observe(track.value)
})
onBeforeUnmount(() => observer?.disconnect())

const trackWidth = computed(() => width.value || 700)
const dotSize = computed(() => (trackWidth.value >= 520 ? 34 : 28))

/** Each ranked entry with its elo now and 7 days ago. A `null` delta draws no trail. */
const placed = computed(() => props.entries.flatMap((entry) => {
  if (entry.elo === null) return []
  return [{ entry, now: entry.elo, before: entry.elo - (entry.delta ?? 0) }]
}))

/** Whole families around the points; Radiant, which has no ceiling, gets one family's width. */
const bounds = computed(() => {
  const points = placed.value.flatMap(({ now, before }) => [now, before])
  if (points.length === 0) return { low: 0, high: FAMILY_ELO * 3 }
  const low = Math.floor(Math.min(...points) / FAMILY_ELO) * FAMILY_ELO
  const high = Math.max(low + FAMILY_ELO, (Math.floor(Math.max(...points) / FAMILY_ELO) + 1) * FAMILY_ELO)
  return { low: Math.max(0, low), high }
})

/** Percentage along the track. */
const toX = (elo: number) => {
  const { low, high } = bounds.value
  return Math.max(0, Math.min(100, ((elo - low) / (high - low)) * 100))
}

const bands = computed(() => {
  const { low, high } = bounds.value
  const bandWidth = (FAMILY_ELO / (high - low)) * 100
  const result = []
  for (let elo = low; elo < high; elo += FAMILY_ELO) {
    const family = familyAtElo(Math.min(elo, RADIANT_ELO))
    result.push({
      key: elo,
      style: { left: `${toX(elo)}%`, width: `${bandWidth}%` },
      fill: { backgroundColor: tierColor(family) },
      emblem: rankIconUrl(familyBaseTier(family)),
      label: familyLabel(family),
      showLabel: (bandWidth / 100) * trackWidth.value > 104,
    })
  }
  return result
})

const railY = computed(() => 40 + dotSize.value / 2)
const laneStep = computed(() => dotSize.value + 14)

/** Greedy lane assignment, left to right: a dot goes on the first lane it does not collide on. */
const lanes = computed(() => {
  const ends: number[] = []
  const laneOf = new Map<number, number>()
  const byPosition = [...placed.value].sort((a, b) => a.now - b.now)
  for (const { entry, now } of byPosition) {
    const px = (toX(now) / 100) * trackWidth.value
    let lane = 0
    while (ends[lane] !== undefined && px - ends[lane]! < dotSize.value + 10) lane++
    ends[lane] = px
    laneOf.set(entry.id, lane)
  }
  return { laneOf, count: Math.max(1, ends.length) }
})

const isDimmed = (id: number) => props.hoveredId !== null && props.hoveredId !== id
  && placed.value.some(({ entry }) => entry.id === props.hoveredId)

const dots = computed(() => placed.value.map(({ entry, now, before }, index) => {
  const hovered = props.hoveredId === entry.id
  const top = railY.value + (lanes.value.laneOf.get(entry.id) ?? 0) * laneStep.value
  const previousX = toX(before)
  const x = toX(now)
  const moved = entry.delta !== null && entry.delta !== 0
  const trailOpacity = !entered.value || !moved ? 0 : isDimmed(entry.id) ? 0.25 : 1
  return {
    entry,
    hovered,
    isMe: props.meId === entry.id,
    label: `${entry.name}, ${entry.tierLabel} ${entry.rank?.rankedRating ?? 0} RR`,
    detail: `${entry.tierLabel} · ${entry.rank?.rankedRating ?? 0} RR · 7 j ${entry.delta === null ? '—' : formatSigned(entry.delta)}`,
    style: {
      left: `${entered.value ? x : 0}%`,
      top: `${top}px`,
      width: `${dotSize.value}px`,
      height: `${dotSize.value}px`,
      zIndex: hovered ? 5 : 2,
      opacity: isDimmed(entry.id) ? 0.35 : 1,
      transform: `translate(-50%, -50%) scale(${hovered ? 1.15 : 1})`,
      transitionDelay: `${index * 40}ms, 0ms, 0ms, 0ms`,
    },
    avatarStyle: entry.cardSmall ? { backgroundImage: `url('${entry.cardSmall}')` } : {},
    trail: {
      class: (entry.delta ?? 0) >= 0 ? 'bg-win' : 'bg-loss',
      style: {
        left: `${entered.value ? Math.min(previousX, x) : 0}%`,
        width: `${entered.value ? Math.abs(x - previousX) : 0}%`,
        top: `${top}px`,
        opacity: trailOpacity,
      },
      startStyle: { left: `${entered.value ? previousX : 0}%`, top: `${top}px`, opacity: trailOpacity },
    },
  }
}))

const height = computed(() => railY.value + (lanes.value.count - 1) * laneStep.value + dotSize.value / 2 + 14)
</script>

<template>
  <div class="mt-4 border border-border-base bg-surface-base px-4 pb-4 pt-4 md:px-5">
    <FrameHead title="L'échelle des rangs" aside="Le trait = 7 jours" />
    <div ref="track" class="relative transition-[height] duration-300 ease-snap" :style="{ height: `${height}px` }">
      <div
        v-for="band in bands"
        :key="band.key"
        class="absolute inset-y-0 px-px transition-[left,width] duration-500 ease-snap"
        :style="band.style"
      >
        <div class="h-full opacity-[0.16]" :style="band.fill" />
        <div class="absolute inset-y-0 left-0 w-px opacity-60" :style="band.fill" />
        <div class="absolute left-2 right-1 top-1.5 flex h-6 items-center gap-1.5 overflow-hidden whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.06em] text-text-sec">
          <img v-if="band.emblem" :src="band.emblem" alt="" class="size-6 shrink-0 object-contain">
          <span v-if="band.showLabel">{{ band.label }}</span>
        </div>
      </div>

      <template v-for="dot in dots" :key="`trail-${dot.entry.id}`">
        <span
          class="absolute -mt-px h-0.5 transition-[left,width,top,opacity] duration-700 ease-snap"
          :class="dot.trail.class"
          :style="dot.trail.style"
        />
        <span
          class="absolute size-2 -translate-x-1/2 -translate-y-1/2 border border-border-strong bg-surface-base transition-[left,top,opacity] duration-700 ease-snap"
          :style="dot.trail.startStyle"
        />
      </template>

      <NuxtLink
        v-for="dot in dots"
        :key="dot.entry.id"
        :to="`/player/${dot.entry.id}`"
        :aria-label="dot.label"
        class="absolute transition-[left,top,transform,opacity] duration-[700ms,300ms,150ms,200ms] ease-snap"
        :style="dot.style"
        @mouseenter="emit('hover', dot.entry.id)"
        @mouseleave="emit('hover', null)"
        @focus="emit('hover', dot.entry.id)"
        @blur="emit('hover', null)"
      >
        <span
          class="absolute inset-0 flex items-center justify-center border-2 bg-surface-high bg-cover bg-center font-mono text-[10px] font-bold"
          :class="dot.isMe ? 'border-brand-red' : 'border-surface-base'"
          :style="dot.avatarStyle"
        >{{ dot.entry.cardSmall ? '' : dot.entry.name.slice(0, 2).toUpperCase() }}</span>
        <span
          class="absolute -bottom-1.5 -right-2 flex h-[18px] min-w-[18px] items-center justify-center px-1 font-mono text-[10px] font-bold leading-none"
          :class="dot.entry.position === 1 ? 'bg-brand-red-fill text-white' : 'border border-border-strong bg-surface-base'"
        >{{ dot.entry.position }}</span>
        <span
          v-if="dot.hovered"
          role="tooltip"
          class="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-[6] -translate-x-1/2 animate-enter whitespace-nowrap bg-night px-3 py-2 text-left text-on-night shadow-float"
        >
          <span class="block text-[13px] font-semibold">{{ dot.entry.name }}{{ dot.isMe ? ' · vous' : '' }}</span>
          <span class="mt-0.5 block font-mono text-[11px] text-on-night-2">{{ dot.detail }}</span>
        </span>
      </NuxtLink>
    </div>
  </div>
</template>
