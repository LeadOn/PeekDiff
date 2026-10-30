<script setup lang="ts">
import { computed } from 'vue'
import type { BuyType, EconomyRound, EconomyTeam, RoundLoadouts } from '~/utils/val-game'
import { BUY_LABELS, SIDE_LABELS } from '~/utils/val-game'
import FrameHead from '~/components/ui/FrameHead.vue'
import ValAgentIcon from '~/components/val/ValAgentIcon.vue'

/**
 * The game's economy: one column per round, the allies' loadout rising above the axis and the
 * enemies' falling below it, the axis itself in the colour of the side that won the round. Under it,
 * the selected round (shared with the frieze) team by team: what each player carried, kept and dealt.
 * Games imported before the API stored per-round stats have none: the card says so, it never draws
 * zeros.
 */
const props = defineProps<{
  rounds: EconomyRound[]
  loadouts: RoundLoadouts[]
  /** The selected round's 0-based index. */
  selected: number | null
  loading: boolean
  failed: boolean
  /** Whether the timeline has rounds at all: without, there is nothing to say about the economy. */
  hasRounds: boolean
}>()

const emit = defineEmits<{
  (e: 'update:selected', index: number): void
}>()

/** One letter per buy under each bar; the legend and every column's label spell them out. */
const BUY_SHORT: Record<BuyType, string> = { pistol: 'P', eco: 'É', semi: 'S', full: 'A' }
const BUY_LEGEND = (Object.keys(BUY_SHORT) as BuyType[]).map(buy => `${BUY_SHORT[buy]} ${BUY_LABELS[buy].toLowerCase()}`)

const maxLoadout = computed(() => Math.max(1, ...props.rounds.flatMap(round => [round.ally?.loadout ?? 0, round.enemy?.loadout ?? 0])))
const barHeight = (team: EconomyTeam | null) => `${team ? Math.max(4, (team.loadout / maxLoadout.value) * 100) : 0}%`

const selectedRound = computed(() => props.rounds.find(round => round.index === props.selected) ?? null)

const credits = (value: number) => value.toLocaleString('fr-FR')
const sideText = (side: 'ally' | 'enemy') => (side === 'ally' ? 'text-ally' : 'text-enemy')
</script>

<template>
  <div class="border border-border-base bg-surface-base p-4 md:p-5">
    <FrameHead title="Achats par manche" :aside="rounds.length ? 'valeur d\'équipement par manche' : null" />

    <div v-if="loading && rounds.length === 0" aria-busy="true" class="h-48 animate-pulse bg-surface-high" />

    <p v-else-if="failed" class="font-mono text-xs text-text-ter">L'économie des manches n'a pas pu être chargée.</p>
    <p v-else-if="!hasRounds" class="font-mono text-xs text-text-ter">Aucune manche enregistrée pour cette partie.</p>
    <p v-else-if="rounds.length === 0" class="font-mono text-xs text-text-ter">
      // Économie indisponible pour cette partie : elle a été importée avant que l'API ne conserve les achats de chaque manche.
    </p>

    <template v-else>
      <p aria-hidden="true" class="mb-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-text-ter">
        <span><span class="text-ally">▀</span> alliés</span><span><span class="text-enemy">▄</span> ennemis</span>
        <span v-for="entry in BUY_LEGEND" :key="entry">{{ entry }}</span>
        <span>axe : camp gagnant</span>
      </p>

      <div class="overflow-x-auto">
        <ol class="flex min-w-max gap-0.5 sm:min-w-0" aria-label="Économie des équipes par manche, de la première à la dernière">
          <li v-for="round in rounds" :key="round.index" class="flex max-w-12 flex-1">
            <button
              type="button"
              :aria-label="round.label"
              :title="round.label"
              :aria-pressed="round.index === selected"
              class="flex w-full min-w-6 cursor-pointer flex-col items-stretch border transition-colors duration-150 ease-snap"
              :class="round.index === selected ? 'border-border-strong bg-surface-high' : 'border-transparent hover:bg-surface-hover'"
              @click="emit('update:selected', round.index)"
            >
              <span aria-hidden="true" class="h-3 text-center font-mono text-[10px] leading-3 text-text-ter">{{ round.ally ? BUY_SHORT[round.ally.buy] : '' }}</span>
              <span aria-hidden="true" class="relative h-14">
                <span class="absolute inset-x-1 bottom-0 bg-ally" :style="{ height: barHeight(round.ally) }" />
              </span>
              <span aria-hidden="true" class="h-1" :class="round.winner === 'ally' ? 'bg-ally' : 'bg-enemy'" />
              <span aria-hidden="true" class="relative h-14">
                <span class="absolute inset-x-1 top-0 bg-enemy" :style="{ height: barHeight(round.enemy) }" />
              </span>
              <span aria-hidden="true" class="h-3 text-center font-mono text-[10px] leading-3 text-text-ter">{{ round.enemy ? BUY_SHORT[round.enemy.buy] : '' }}</span>
              <span aria-hidden="true" class="mt-1 text-center font-mono text-[10px] text-text-sec">{{ round.number }}</span>
            </button>
          </li>
        </ol>
      </div>

      <div v-if="selectedRound" class="mt-5 border-t border-dashed border-border-strong pt-4">
        <h4 class="font-display text-[32px] font-extrabold uppercase leading-none">Manche {{ selectedRound.number }}</h4>

        <div class="mt-4 grid gap-4 lg:grid-cols-2">
          <section v-for="team in loadouts" :key="team.side" :aria-label="`${team.label}, manche ${selectedRound.number}`" class="min-w-0">
            <p class="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border-base pb-2">
              <span class="font-mono text-xs font-bold uppercase tracking-[0.08em]" :class="sideText(team.side)">{{ team.label }}</span>
              <template v-if="team.economy">
                <span class="font-mono text-sm text-text-main">{{ credits(team.economy.loadout) }} <span class="text-xs text-text-ter">crédits</span></span>
                <span class="border border-border-strong px-1.5 font-mono text-[11px] uppercase text-text-sec">{{ BUY_LABELS[team.economy.buy] }}</span>
                <span class="font-mono text-xs text-text-ter">{{ credits(team.economy.remaining) }} en banque · {{ credits(team.economy.damage) }} dégâts</span>
              </template>
            </p>

            <div class="overflow-x-auto">
              <table class="w-full min-w-[460px] border-collapse text-left text-[13px]">
                <thead class="font-mono text-[10px] uppercase tracking-[0.08em] text-text-ter">
                  <tr>
                    <th scope="col" class="py-1.5 pr-2 font-medium">Joueur</th>
                    <th scope="col" class="px-2 py-1.5 font-medium">Équipement</th>
                    <th scope="col" class="px-2 py-1.5 text-right font-medium" title="Valeur de l'équipement en début de manche">Valeur</th>
                    <th scope="col" class="px-2 py-1.5 text-right font-medium" title="Crédits gardés après l'achat">Banque</th>
                    <th scope="col" class="px-2 py-1.5 text-right font-medium" title="Dégâts infligés dans la manche">Dég.</th>
                    <th scope="col" class="py-1.5 pl-2 text-right font-medium" title="Kills dans la manche">K</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="line in team.lines" :key="line.puuid" class="border-t border-border-base" :class="line.isFocus ? 'bg-surface-selected' : ''">
                    <th scope="row" class="py-1.5 pr-2 font-normal">
                      <span class="flex min-w-0 items-center gap-2">
                        <ValAgentIcon :src="line.agentIconUrl" :name="line.agentName" :rule="false" class="size-6 shrink-0" />
                        <span class="truncate" :class="line.isFocus ? 'font-bold' : 'font-medium'">{{ line.name }}</span>
                        <span v-if="line.wasAfk" class="font-mono text-[10px] uppercase text-text-ter" title="Absent pendant la manche">AFK</span>
                      </span>
                    </th>
                    <td class="px-2 py-1.5 text-text-sec">
                      <span class="whitespace-nowrap">{{ line.weapon }}</span><template v-if="line.armor"><span class="text-text-ter"> · </span><span class="whitespace-nowrap">{{ line.armor }}</span></template>
                    </td>
                    <td class="px-2 py-1.5 text-right font-mono">{{ credits(line.loadout) }}</td>
                    <td class="px-2 py-1.5 text-right font-mono text-text-sec">{{ credits(line.remaining) }}</td>
                    <td class="px-2 py-1.5 text-right font-mono">{{ line.damage }}</td>
                    <td class="py-1.5 pl-2 text-right font-mono">{{ line.kills }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="team.lines.length === 0" class="mt-2 font-mono text-xs text-text-ter">Aucune donnée pour ce camp.</p>
          </section>
        </div>
        <p class="mt-3 font-mono text-[11px] text-text-ter">// Manche gagnée par les {{ SIDE_LABELS[selectedRound.winner].toLowerCase() }}.</p>
      </div>
    </template>
  </div>
</template>
