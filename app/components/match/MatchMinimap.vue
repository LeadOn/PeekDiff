<script setup lang="ts">
import { computed } from 'vue'
import type { RoundMinimap, Side } from '~/utils/val-game'

/**
 * The selected round on the minimap. With no kill picked: every death of the round (✕ in the colour of
 * the fallen side), the killer's line faint behind it, and the spike. With a kill picked in the feed:
 * every living player at that moment, the killer's line to the victim, and where the killer looked.
 * Decorative for assistive technologies beyond its summary: the kill feed beside it is the text.
 */
const props = defineProps<{
  minimap: RoundMinimap
  /** The kill the feed points at (hover, focus or selection), `null` for the overview. */
  activeKillId: number | null
}>()

const active = computed(() => props.minimap.kills.find(kill => kill.id === props.activeKillId) ?? null)

const fill = (side: Side | null) => (side === 'ally' ? 'fill-ally' : side === 'enemy' ? 'fill-enemy' : 'fill-text-main')
const stroke = (side: Side | null) => (side === 'ally' ? 'stroke-ally' : side === 'enemy' ? 'stroke-enemy' : 'stroke-text-main')

/** A ✕ of half-size `r` at a point of the 0–100 box. */
const cross = (x: number, y: number, r = 1.6) => `M${x - r},${y - r} L${x + r},${y + r} M${x + r},${y - r} L${x - r},${y + r}`
const at = (value: number) => value * 100
</script>

<template>
  <figure class="min-w-0">
    <div class="relative mx-auto aspect-square w-full max-w-[420px] border border-border-base bg-night">
      <img v-if="minimap.imageUrl" :src="minimap.imageUrl" alt="" width="1024" height="1024" loading="lazy" class="absolute inset-0 size-full object-contain opacity-75">
      <svg viewBox="0 0 100 100" role="img" :aria-label="minimap.label" data-testid="round-minimap" class="absolute inset-0 size-full">
        <!-- Spike -->
        <g v-if="minimap.plant">
          <rect :x="at(minimap.plant.x) - 1.8" :y="at(minimap.plant.y) - 1.8" width="3.6" height="3.6" :transform="`rotate(45 ${at(minimap.plant.x)} ${at(minimap.plant.y)})`" class="fill-spike stroke-night" stroke-width="0.4" />
        </g>
        <g v-if="minimap.defuse">
          <rect :x="at(minimap.defuse.x) - 1.4" :y="at(minimap.defuse.y) - 1.4" width="2.8" height="2.8" class="fill-none stroke-spike" stroke-width="0.6" />
        </g>

        <!-- Overview: every death of the round -->
        <template v-if="!active">
          <g v-for="kill in minimap.kills" :key="kill.id">
            <line
              v-if="kill.killer && kill.victim"
              :x1="at(kill.killer.x)"
              :y1="at(kill.killer.y)"
              :x2="at(kill.victim.x)"
              :y2="at(kill.victim.y)"
              class="stroke-on-night"
              stroke-opacity="0.25"
              stroke-width="0.4"
            />
            <path v-if="kill.victim" :d="cross(at(kill.victim.x), at(kill.victim.y))" :class="stroke(kill.victimSide)" stroke-width="0.9" />
          </g>
        </template>

        <!-- One kill: every living player, the shot, the killer's view -->
        <template v-else>
          <g v-for="player in active.players" :key="player.puuid">
            <path v-if="player.cone" :d="player.cone" :class="fill(player.side)" fill-opacity="0.12" />
            <rect
              :x="at(player.point.x) - 1.3"
              :y="at(player.point.y) - 1.3"
              width="2.6"
              height="2.6"
              :class="[fill(player.side), player.isFocus ? 'stroke-on-night' : 'stroke-night']"
              :stroke-width="player.isFocus ? 0.6 : 0.3"
            >
              <title>{{ player.name }} · {{ player.agentName }}</title>
            </rect>
          </g>
          <path v-if="active.killerCone" :d="active.killerCone" :class="fill(active.killerSide)" fill-opacity="0.3" />
          <line
            v-if="active.killer && active.victim"
            :x1="at(active.killer.x)"
            :y1="at(active.killer.y)"
            :x2="at(active.victim.x)"
            :y2="at(active.victim.y)"
            :class="stroke(active.killerSide)"
            stroke-width="0.7"
            stroke-dasharray="1.5 1"
          />
          <rect v-if="active.killer" :x="at(active.killer.x) - 1.6" :y="at(active.killer.y) - 1.6" width="3.2" height="3.2" class="fill-none stroke-on-night" stroke-width="0.6" />
          <path v-if="active.victim" :d="cross(at(active.victim.x), at(active.victim.y), 2)" :class="stroke(active.victimSide)" stroke-width="1.1" />
        </template>
      </svg>
    </div>
    <figcaption class="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-text-ter">
      <span><span aria-hidden="true" class="text-ally">■</span> alliés</span>
      <span><span aria-hidden="true" class="text-enemy">■</span> ennemis</span>
      <span><span aria-hidden="true">✕</span> mort</span>
      <span v-if="minimap.plant"><span aria-hidden="true" class="text-spike">◆</span> spike</span>
      <span>{{ active ? 'kill sélectionné · positions à cet instant' : 'survolez un kill pour voir les positions' }}</span>
    </figcaption>
  </figure>
</template>
