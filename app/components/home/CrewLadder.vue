<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Ladder } from '~/utils/val-ladder'
import { usePlayerStore } from '~/stores/player'
import SectionIndex from '~/components/ui/SectionIndex.vue'
import LadderPodiumCard from '~/components/home/LadderPodiumCard.vue'
import LadderRow from '~/components/home/LadderRow.vue'
import RankTrack from '~/components/home/RankTrack.vue'

const props = withDefaults(defineProps<{
  /** Built by the page, which owns both flags (the smurf one also drives the week tiles and the rail). */
  ladder: Ladder
  includeSmurfs?: boolean
  /** Also list the crew members without Valorant data. */
  includeWithoutValorant?: boolean
}>(), { includeSmurfs: false, includeWithoutValorant: false })

const emit = defineEmits<{
  (e: 'update:includeSmurfs' | 'update:includeWithoutValorant', value: boolean): void
}>()

const playerStore = usePlayerStore()

/** One hover shared by the podium, the rank scale and the rows, so each highlights the others. */
const hoveredId = ref<number | null>(null)

const podium = computed(() => props.ladder.ranked.slice(0, 3))
const rows = computed(() => [...props.ladder.ranked.slice(3), ...props.ladder.unranked])

const subtitle = computed(() => `${props.ladder.ranked.length} classés · ${props.ladder.visibleCount} joueurs`)

// Everything that depends on who is looking is resolved after mount: `/` is served from a shared
// SWR cache, and a "Vous" rendered on the server would be cached for every visitor.
const isMounted = ref(false)
const meId = computed(() => (isMounted.value ? playerStore.currentPlayer?.id ?? null : null))

const meText = computed(() => {
  if (meId.value === null) return null
  const me = props.ladder.ranked.find(entry => entry.id === meId.value)
  if (!me) return props.ladder.unranked.some(entry => entry.id === meId.value) ? 'Vous n\'êtes pas classé' : null
  if (me.position === 1) return 'Vous êtes en tête !'
  return `Vous êtes ${me.position}e, à ${me.gap} RR de ${me.previousName}`
})

/** Wide screens show the podium as 2 · 1 · 3, the leader raised in the middle. */
const podiumPlacement = (position: number | null) => {
  if (podium.value.length < 3) return ''
  if (position === 1) return 'sm:order-2'
  return position === 2 ? 'sm:order-1 sm:mt-8' : 'sm:order-3 sm:mt-8'
}

const podiumColumns = computed(() => ({
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
}[podium.value.length] ?? ''))

onMounted(() => { isMounted.value = true })

/** The two view switches over the ladder, both off by default. */
const switches = computed(() => [
  {
    key: 'smurfs',
    label: 'Smurfs',
    title: 'Inclure les comptes secondaires',
    checked: props.includeSmurfs,
    toggle: () => emit('update:includeSmurfs', !props.includeSmurfs),
  },
  {
    key: 'without-valorant',
    label: 'Sans Valorant',
    title: 'Inclure les membres du crew sans profil Valorant',
    checked: props.includeWithoutValorant,
    toggle: () => emit('update:includeWithoutValorant', !props.includeWithoutValorant),
  },
])

const flip = (toggle: () => void) => {
  hoveredId.value = null
  toggle()
}
</script>

<template>
  <section aria-labelledby="crew-ladder-title">
    <SectionIndex index="01" label="Classement" />
    <div class="mb-5 mt-3 flex flex-wrap items-end justify-between gap-x-5 gap-y-3.5">
      <div class="min-w-0">
        <h2 id="crew-ladder-title" class="font-display text-[40px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] md:text-5xl">Classement du crew</h2>
        <p class="mt-2 flex flex-wrap items-center gap-2 font-mono text-[13px] text-text-sec">
          {{ subtitle }}
          <span v-if="meText" class="border border-brand-red/40 bg-brand-red-soft px-2 py-[3px] text-xs text-text-main">{{ meText }}</span>
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="item in switches"
          :key="item.key"
          type="button"
          role="switch"
          :aria-checked="item.checked"
          :title="item.title"
          class="group inline-flex h-11 cursor-pointer items-center gap-2 border border-border-strong px-3.5 font-mono text-[13px] font-medium uppercase tracking-[0.06em] transition-colors duration-150 ease-snap hover:bg-surface-hover"
          @click="flip(item.toggle)"
        >
          <span aria-hidden="true" class="text-text-ter">[</span>
          <span aria-hidden="true" class="w-[1ch] text-center" :class="item.checked ? 'text-brand-red' : 'text-text-ter'">{{ item.checked ? 'x' : ' ' }}</span>
          <span aria-hidden="true" class="text-text-ter">]</span>
          {{ item.label }}
        </button>
      </div>
    </div>

    <div v-if="podium.length > 0" class="grid items-start gap-4" :class="podiumColumns">
      <LadderPodiumCard
        v-for="entry in podium"
        :key="entry.id"
        :entry="entry"
        :hovered="hoveredId === entry.id"
        :is-me="meId === entry.id"
        :class="podiumPlacement(entry.position)"
        @hover="hoveredId = $event"
      />
    </div>
    <p v-else class="ticks border border-border-base bg-surface-base p-6 text-sm text-text-sec">
      Personne n'est classé en compétition pour le moment.
    </p>

    <RankTrack
      v-if="ladder.ranked.length > 0"
      :entries="ladder.ranked"
      :hovered-id="hoveredId"
      :me-id="meId"
      @hover="hoveredId = $event"
    />

    <div v-if="rows.length > 0" class="mt-4 border border-border-base bg-surface-base">
      <div aria-hidden="true" class="hidden grid-cols-[40px_36px_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_72px_64px] gap-3 border-b border-border-base bg-surface-high px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter sm:grid">
        <span>#</span><span /><span>Joueur</span><span>Rang</span><span>Pic</span><span class="text-right">Écart</span><span class="text-right">7 j</span>
      </div>
      <LadderRow
        v-for="entry in rows"
        :key="entry.id"
        :entry="entry"
        :hovered="hoveredId === entry.id"
        :is-me="meId === entry.id"
        @hover="hoveredId = $event"
      />
    </div>
  </section>
</template>
