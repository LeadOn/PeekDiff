<script setup lang="ts">
import { computed } from 'vue'
import type { DamageMatrix } from '~/utils/val-game'
import FrameHead from '~/components/ui/FrameHead.vue'
import SegmentSwitch from '~/components/ui/SegmentSwitch.vue'
import ValAgentIcon from '~/components/val/ValAgentIcon.vue'

/**
 * "Qui a touché qui": allies in rows, enemies in columns. Each cell holds the damage the ally dealt
 * that enemy (teal, above) and took from them (red, below), over the whole game or the round selected
 * in the frieze. The row and column totals close the table. On a phone it scrolls sideways under a
 * sticky ally column; every cell spells both directions out in its `title` and for screen readers.
 */
const props = defineProps<{
  matrix: DamageMatrix | null
  scope: 'game' | 'round'
  /** The selected round, 1-based, for the switch's label; `null` without rounds. */
  roundNumber: number | null
  loading: boolean
  failed: boolean
}>()

const emit = defineEmits<{
  (e: 'update:scope', scope: 'game' | 'round'): void
}>()

const scopeOptions = computed(() => [
  { value: 'game' as const, label: 'Partie' },
  ...(props.roundNumber !== null ? [{ value: 'round' as const, label: `Manche ${props.roundNumber}` }] : []),
])

/** A cell's figure stands out when it is a large share of the busiest pair. */
const strong = (value: number) => !!props.matrix && props.matrix.max > 0 && value >= props.matrix.max * 0.6
</script>

<template>
  <div class="border border-border-base bg-surface-base p-4 md:p-5">
    <FrameHead title="Dégâts infligés et reçus" />

    <div v-if="loading && !matrix" aria-busy="true" class="h-56 animate-pulse bg-surface-high" />
    <p v-else-if="failed" class="font-mono text-xs text-text-ter">Les dégâts n'ont pas pu être chargés.</p>
    <p v-else-if="!matrix" class="font-mono text-xs text-text-ter">
      // Dégâts indisponibles pour cette partie : elle a été importée avant que l'API n'enregistre qui touche qui.
    </p>

    <template v-else>
      <div class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <SegmentSwitch :model-value="scope" :options="scopeOptions" label="Portée des dégâts" @update:model-value="emit('update:scope', $event)" />
        <p aria-hidden="true" class="flex flex-wrap gap-x-4 font-mono text-[11px] text-text-ter">
          <span><span class="text-ally">▲</span> infligés par l'allié</span>
          <span><span class="text-enemy">▼</span> reçus de l'ennemi</span>
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[420px] border-collapse font-mono text-[13px]">
          <caption class="sr-only">Dégâts entre chaque allié et chaque ennemi, {{ scope === 'game' ? 'sur la partie' : `sur la manche ${roundNumber}` }}</caption>
          <thead>
            <tr>
              <th scope="col" class="sticky left-0 z-[1] w-32 bg-surface-base px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-text-ter">
                Alliés <span aria-hidden="true">╲</span> Ennemis
              </th>
              <th v-for="enemy in matrix.enemies" :key="enemy.puuid" scope="col" class="min-w-14 px-1 py-1.5 font-normal" :title="`${enemy.name} · ${enemy.agentName}`">
                <span class="flex flex-col items-center gap-1">
                  <ValAgentIcon :src="enemy.agentIconUrl" :name="enemy.agentName" :rule="false" class="size-6" />
                  <span class="max-w-14 truncate font-sans text-[11px] text-enemy" :class="enemy.isFocus ? 'font-bold' : ''">{{ enemy.name }}</span>
                </span>
              </th>
              <th scope="col" class="min-w-14 px-2 py-1.5 text-right text-[10px] font-medium uppercase tracking-[0.08em] text-text-ter">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(ally, row) in matrix.allies" :key="ally.puuid" class="border-t border-border-base" :class="ally.isFocus ? 'bg-surface-selected' : ''">
              <th
                scope="row"
                class="sticky left-0 z-[1] border-l-2 px-2 py-1.5 text-left font-sans font-normal"
                :class="ally.isFocus ? 'border-l-brand-red bg-surface-selected' : 'border-l-transparent bg-surface-base'"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <ValAgentIcon :src="ally.agentIconUrl" :name="ally.agentName" :rule="false" class="size-6 shrink-0" />
                  <span class="max-w-20 truncate text-[13px] text-ally" :class="ally.isFocus ? 'font-bold' : 'font-medium'">{{ ally.name }}</span>
                </span>
              </th>
              <td v-for="(cell, column) in matrix.cells[row]" :key="matrix.enemies[column]?.puuid" class="border-l border-border-base px-1 py-1 text-center" :title="cell.label">
                <span class="sr-only">{{ cell.label }}</span>
                <span aria-hidden="true" class="flex flex-col leading-tight">
                  <span :class="[cell.dealt ? 'text-ally' : 'text-text-ter', strong(cell.dealt) ? 'font-bold' : '']">{{ cell.dealt || '·' }}</span>
                  <span class="text-[11px]" :class="[cell.received ? 'text-enemy' : 'text-text-ter', strong(cell.received) ? 'font-bold' : '']">{{ cell.received || '·' }}</span>
                </span>
              </td>
              <td class="border-l border-border-strong px-2 py-1 text-right">
                <span class="flex flex-col leading-tight">
                  <span class="text-ally"><span class="sr-only">Infligés : </span>{{ matrix.allyTotals[row]?.dealt }}</span>
                  <span class="text-[11px] text-enemy"><span class="sr-only">Reçus : </span>{{ matrix.allyTotals[row]?.received }}</span>
                </span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-border-strong">
              <th scope="row" class="sticky left-0 z-[1] bg-surface-base px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-text-ter">Total ennemi</th>
              <td v-for="(total, column) in matrix.enemyTotals" :key="matrix.enemies[column]?.puuid" class="border-l border-border-base px-1 py-1 text-center">
                <span class="flex flex-col leading-tight">
                  <span class="text-ally"><span class="sr-only">Reçus des alliés : </span>{{ total.received }}</span>
                  <span class="text-[11px] text-enemy"><span class="sr-only">Infligés aux alliés : </span>{{ total.dealt }}</span>
                </span>
              </td>
              <td class="border-l border-border-strong" />
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </div>
</template>
