<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FeedActor, RoundCell, RoundDetail, RoundMinimap } from '~/utils/val-game'
import { SIDE_LABELS } from '~/utils/val-game'
import FrameHead from '~/components/ui/FrameHead.vue'
import MatchMinimap from '~/components/match/MatchMinimap.vue'

/**
 * The round timeline ("frise des manches", design system §7) and, under it, the selected round's kill
 * feed (ASCII motif 6, "Journal"). Each cell carries the glyph of how the round ended in the colour
 * of the side that won it; the glyph never stands alone, the cell's label spells it out. Under each
 * cell, the allies' side that round (A / D) when the API says it.
 *
 * Beside the feed, the round on the minimap: hovering, focusing or picking a kill shows where everyone
 * stood at that moment. The feed is the minimap's text equivalent, each line carrying the zone and the
 * distance of the kill.
 */
const props = defineProps<{
  cells: RoundCell[]
  detail: RoundDetail | null
  /** The selected round's 0-based index. */
  selected: number | null
  loading: boolean
  failed: boolean
  /** The selected round on the minimap; `null` when it cannot be drawn (see `positions`). */
  minimap: RoundMinimap | null
  /** `none`: a game imported before positions were stored. `no-map`: a map without a minimap. */
  positions: 'ok' | 'none' | 'no-map'
}>()

const emit = defineEmits<{
  (e: 'update:selected', index: number): void
}>()

const position = computed(() => props.cells.findIndex(cell => cell.index === props.selected))
const previous = computed(() => props.cells[position.value - 1] ?? null)
const next = computed(() => props.cells[position.value + 1] ?? null)

const cellClass = (cell: RoundCell) => [
  cell.side === 'ally' ? 'bg-ally-soft text-ally' : 'bg-enemy-soft text-enemy',
  cell.index === props.selected ? 'border-current' : 'border-transparent hover:border-border-strong',
]

const actorClass = (actor: FeedActor) => [
  actor.side === 'ally' ? 'text-ally' : 'text-enemy',
  actor.isFocus ? 'font-bold underline decoration-2 underline-offset-4' : 'font-medium',
]

const detailSideClass = computed(() => (props.detail?.cell.side === 'ally' ? 'text-ally' : 'text-enemy'))

const hasRoles = computed(() => props.cells.some(cell => cell.allyRole !== null))
const ROLE_SHORT = { attack: 'A', defense: 'D' } as const

// --- The kill shown on the minimap: the one hovered or focused, else the one picked ---
const hoveredKill = ref<number | null>(null)
const pickedKill = ref<number | null>(null)
const activeKill = computed(() => hoveredKill.value ?? pickedKill.value)
watch(() => props.selected, () => {
  hoveredKill.value = null
  pickedKill.value = null
})
const togglePick = (id: number) => { pickedKill.value = pickedKill.value === id ? null : id }

const minimapNote = computed(() => (props.positions === 'none'
  ? '// Positions indisponibles pour cette partie : elle a été importée avant que l\'API ne les enregistre.'
  : props.positions === 'no-map' ? '// Pas de minimap pour cette carte : les positions ne peuvent pas y être placées.' : null))
</script>

<template>
  <div class="border border-border-base bg-surface-base p-4 md:p-5">
    <FrameHead title="Frise des manches" :aside="cells.length ? `${cells.length} manches` : null" />

    <div v-if="loading && cells.length === 0" aria-busy="true" class="flex animate-pulse flex-col gap-3">
      <span class="h-8 bg-surface-high" />
      <span class="h-40 bg-surface-high" />
    </div>

    <p v-else-if="failed" class="font-mono text-xs text-text-ter">Le déroulé des manches n'a pas pu être chargé.</p>
    <p v-else-if="cells.length === 0" class="font-mono text-xs text-text-ter">Aucune manche enregistrée pour cette partie.</p>

    <template v-else>
      <p aria-hidden="true" class="mb-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-text-ter">
        <span>✕ élimination</span><span>◆ spike désamorcé</span><span>✶ spike explosé</span><span>◷ temps écoulé</span>
        <span v-if="hasRoles">A / D sous la case : alliés en attaque / en défense</span>
      </p>

      <ol class="flex flex-wrap items-start gap-1" aria-label="Manches, de la première à la dernière">
        <template v-for="cell in cells" :key="cell.index">
          <li v-if="cell.breakBefore" aria-hidden="true" class="mx-1 flex h-8 items-center gap-1 self-start font-mono text-[10px] uppercase text-text-ter">
            <span class="h-full w-px bg-border-strong" />{{ cell.breakBefore === 'half' ? 'MT' : 'Prol.' }}
          </li>
          <li>
            <button
              type="button"
              :aria-label="cell.label"
              :title="cell.label"
              :aria-pressed="cell.index === selected"
              class="relative grid size-8 cursor-pointer place-items-center border-2 font-mono text-sm transition-colors duration-150 ease-snap"
              :class="cellClass(cell)"
              @click="emit('update:selected', cell.index)"
            >
              <span aria-hidden="true">{{ cell.glyph }}</span>
              <span v-if="cell.ceremonyLabel" aria-hidden="true" class="absolute -right-0.5 -top-0.5 size-1.5 bg-mvp" />
            </button>
            <span v-if="hasRoles" aria-hidden="true" class="block text-center font-mono text-[9px] leading-3 text-text-ter">{{ cell.allyRole ? ROLE_SHORT[cell.allyRole] : '' }}</span>
          </li>
        </template>
      </ol>

      <div v-if="detail" class="mt-5 border-t border-dashed border-border-strong pt-4">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h4 class="font-display text-[32px] font-extrabold uppercase leading-none">Manche {{ detail.cell.number }}</h4>
          <span class="font-mono text-xs font-bold uppercase tracking-[0.06em]" :class="detailSideClass">{{ SIDE_LABELS[detail.cell.side] }}</span>
          <span class="font-mono text-xs text-text-sec">{{ detail.cell.endLabel }}</span>
          <span v-if="detail.cell.allyRole" class="font-mono text-xs text-text-ter">Alliés en {{ detail.cell.allyRole === 'attack' ? 'attaque' : 'défense' }}</span>
          <span v-if="detail.cell.ceremonyLabel" class="border border-border-strong px-1.5 font-mono text-[11px] uppercase text-mvp">{{ detail.cell.ceremonyLabel }}</span>
          <span class="flex-1" />
          <span class="flex gap-1">
            <button
              type="button"
              :disabled="!previous"
              class="inline-flex h-9 cursor-pointer items-center px-2 font-mono text-xs uppercase tracking-[0.06em] text-text-sec transition-colors hover:text-text-main disabled:cursor-not-allowed disabled:opacity-40"
              @click="previous && emit('update:selected', previous.index)"
            >
              <span aria-hidden="true" class="text-text-ter">[</span>Précédente<span aria-hidden="true" class="text-text-ter">]</span>
            </button>
            <button
              type="button"
              :disabled="!next"
              class="inline-flex h-9 cursor-pointer items-center px-2 font-mono text-xs uppercase tracking-[0.06em] text-text-sec transition-colors hover:text-text-main disabled:cursor-not-allowed disabled:opacity-40"
              @click="next && emit('update:selected', next.index)"
            >
              <span aria-hidden="true" class="text-text-ter">[</span>Suivante<span aria-hidden="true" class="text-text-ter">]</span>
            </button>
          </span>
        </div>

        <ul v-if="detail.events.length" class="mt-2 flex flex-wrap gap-x-4 font-mono text-xs text-text-sec">
          <li v-for="event in detail.events" :key="event">{{ event }}</li>
        </ul>

        <div class="mt-4 grid items-start gap-5" :class="minimap ? 'lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]' : ''">
          <MatchMinimap v-if="minimap" :minimap="minimap" :active-kill-id="activeKill" class="lg:order-2" />

          <div class="min-w-0 lg:order-1">
            <ol v-if="detail.lines.length" class="flex flex-col gap-0.5 font-mono text-[13px]" aria-label="Kills de la manche, dans l'ordre" @mouseleave="hoveredKill = null">
              <li v-for="line in detail.lines" :key="line.id">
                <component
                  :is="minimap ? 'button' : 'div'"
                  :type="minimap ? 'button' : undefined"
                  :aria-pressed="minimap ? pickedKill === line.id : undefined"
                  class="flex w-full flex-wrap items-center gap-x-2 gap-y-1 border-l-2 px-1.5 py-1 text-left transition-colors duration-150 ease-snap"
                  :class="[minimap ? 'cursor-pointer hover:bg-surface-hover focus-visible:outline-offset-[-2px]' : '', activeKill === line.id ? 'border-l-text-main bg-surface-high' : 'border-l-transparent']"
                  @mouseenter="minimap && (hoveredKill = line.id)"
                  @focus="minimap && (hoveredKill = line.id)"
                  @blur="hoveredKill = null"
                  @click="minimap && togglePick(line.id)"
                >
                  <span class="text-text-ter">[{{ line.time }}]</span>
                  <template v-if="line.killer">
                    <img v-if="line.killer.portraitUrl" :src="line.killer.portraitUrl" alt="" width="128" height="64" loading="lazy" class="h-4 w-8 object-contain">
                    <span class="whitespace-nowrap" :class="actorClass(line.killer)">{{ line.killer.name }}</span>
                  </template>
                  <span v-else class="text-text-ter">—</span>
                  <span aria-hidden="true" class="ascii text-border-ascii">──▸</span>
                  <span class="sr-only">élimine</span>
                  <template v-if="line.victim">
                    <img v-if="line.victim.portraitUrl" :src="line.victim.portraitUrl" alt="" width="128" height="64" loading="lazy" class="h-4 w-8 -scale-x-100 object-contain">
                    <span class="whitespace-nowrap" :class="actorClass(line.victim)">{{ line.victim.name }}</span>
                  </template>
                  <span class="text-text-sec"><span class="sr-only">avec </span>{{ line.weapon }}</span>
                  <span v-if="line.assists" class="text-text-ter" :title="`${line.assists} assistance${line.assists > 1 ? 's' : ''}`">+{{ line.assists }}</span>
                  <span v-if="line.isFirstBlood" class="text-[10px] uppercase tracking-[0.06em] text-text-ter">Premier sang</span>
                  <span v-if="line.zone || line.distance" class="text-[11px] text-text-ter">
                    <span class="sr-only">, </span><template v-if="line.zone">{{ line.zone }}</template><template v-if="line.zone && line.distance"> · </template><template v-if="line.distance">{{ line.distance }}</template>
                  </span>
                </component>
              </li>
            </ol>
            <p v-else class="font-mono text-xs text-text-ter">Aucun kill enregistré pour cette manche.</p>
            <p v-if="minimapNote" class="mt-3 font-mono text-xs text-text-ter">{{ minimapNote }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
