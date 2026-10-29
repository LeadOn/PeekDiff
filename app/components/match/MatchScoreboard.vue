<script setup lang="ts">
import { computed } from 'vue'
import type { ScoreboardTeam } from '~/utils/val-game'
import { RESULT_LABELS } from '~/utils/val-match'
import { formatPercent, formatSigned } from '~/utils/number'
import ValAgentIcon from '~/components/val/ValAgentIcon.vue'
import ValRankEmblem from '~/components/val/ValRankEmblem.vue'

/**
 * One team's scoreboard (design system §7, "Tableau des scores"): sorted by ACS, the followed player
 * on `surface-selected` with the red rule, crew members linked to their profile. On a phone the table
 * scrolls sideways under a sticky player column.
 */
const props = defineProps<{
  team: ScoreboardTeam
}>()

const sideClass = computed(() => (props.team.side === 'ally' ? 'border-t-ally text-ally' : 'border-t-enemy text-enemy'))

const resultClass = computed(() => ({
  V: 'bg-win-soft text-win',
  D: 'bg-loss-soft text-loss',
  N: 'bg-surface-high text-text-sec',
  R: 'bg-surface-high text-text-ter',
}[props.team.result]))

const plusMinusClass = (value: number) => (value > 0 ? 'text-win' : value < 0 ? 'text-loss' : 'text-text-sec')

const optional = (value: number | null, format: (value: number) => string) => (value === null ? '—' : format(value))
const round = (value: number) => String(Math.round(value))
</script>

<template>
  <section :aria-label="`${team.label}, ${RESULT_LABELS[team.result].toLowerCase()} ${team.roundsWon} à ${team.roundsLost}`" class="border border-t-2 border-border-base bg-surface-base" :class="sideClass">
    <div class="flex flex-wrap items-center gap-3 px-4 py-3">
      <h3 class="font-mono text-xs font-bold uppercase tracking-[0.08em]">{{ team.label }}</h3>
      <span class="font-display text-[28px] font-extrabold leading-none text-text-main">{{ team.roundsWon }}</span>
      <span :title="RESULT_LABELS[team.result]" class="grid size-6 place-items-center font-mono text-xs font-bold" :class="resultClass">
        <span aria-hidden="true">{{ team.result }}</span><span class="sr-only">{{ RESULT_LABELS[team.result] }}</span>
      </span>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[760px] table-fixed border-collapse text-left">
        <thead class="bg-surface-high font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">
          <tr>
            <th scope="col" class="sticky left-0 z-[1] w-[240px] bg-surface-high px-3 py-2 font-medium">Joueur</th>
            <th scope="col" class="w-11 px-2 py-2 font-medium"><span class="sr-only">Rang</span></th>
            <th scope="col" class="px-2 py-2 text-right font-medium" title="Score de combat moyen">ACS</th>
            <th scope="col" class="px-2 py-2 text-right font-medium" title="Kills">K</th>
            <th scope="col" class="px-2 py-2 text-right font-medium" title="Morts">D</th>
            <th scope="col" class="px-2 py-2 text-right font-medium" title="Assistances">A</th>
            <th scope="col" class="px-2 py-2 text-right font-medium" title="Kills moins morts">+/−</th>
            <th scope="col" class="px-2 py-2 text-right font-medium" title="Dégâts moyens par manche">ADR</th>
            <th scope="col" class="px-2 py-2 text-right font-medium" title="Pourcentage de headshots">HS</th>
            <th scope="col" class="px-2 py-2 text-right font-medium" title="Manches avec kill, assistance, survie ou échange">KAST</th>
            <th scope="col" class="px-2 py-2 text-right font-medium" title="Premiers kills">PK</th>
            <th scope="col" class="px-3 py-2 text-right font-medium" title="Premières morts">PM</th>
          </tr>
        </thead>
        <tbody class="font-mono text-sm text-text-main">
          <tr
            v-for="row in team.rows"
            :key="row.id"
            class="border-t border-border-base"
            :class="row.isFocus ? 'bg-surface-selected' : ''"
          >
            <th
              scope="row"
              class="sticky left-0 z-[1] border-l-2 px-3 py-2 text-left font-sans font-normal"
              :class="row.isFocus ? 'border-l-brand-red bg-surface-selected' : 'border-l-transparent bg-surface-base'"
            >
              <span class="flex min-w-0 items-center gap-2.5">
                <ValAgentIcon :src="row.agentIconUrl" :name="row.agentName" :alt="row.agentName" class="size-8 shrink-0" />
                <span class="flex min-w-0 flex-col">
                  <span class="flex items-center gap-1.5">
                    <NuxtLink
                      v-if="row.playerId"
                      :to="`/player/${row.playerId}`"
                      class="max-w-[150px] truncate text-sm font-semibold underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-brand-red"
                    >{{ row.name }}</NuxtLink>
                    <span v-else class="max-w-[150px] truncate text-sm font-semibold">{{ row.name }}</span>
                    <span v-if="row.isMvp" title="Meilleure note de la partie" class="font-mono text-[10px] font-bold uppercase text-mvp">MVP</span>
                    <span v-else-if="row.isTeamMvp" title="Meilleure note de l'équipe perdante" class="font-mono text-[10px] font-bold uppercase text-mvp-team">MVP éq.</span>
                  </span>
                  <span class="font-mono text-[11px] text-text-ter">{{ row.agentName }}<template v-if="row.tag"> · {{ row.tag }}</template></span>
                </span>
              </span>
            </th>
            <td class="px-2 py-2">
              <ValRankEmblem :tier-id="row.tierId" :src="row.tierIconUrl" :alt="row.tierLabel" class="size-6" />
            </td>
            <td class="px-2 py-2 text-right font-medium">{{ optional(row.acs, round) }}</td>
            <td class="px-2 py-2 text-right">{{ row.kills }}</td>
            <td class="px-2 py-2 text-right">{{ row.deaths }}</td>
            <td class="px-2 py-2 text-right">{{ row.assists }}</td>
            <td class="px-2 py-2 text-right" :class="plusMinusClass(row.plusMinus)">{{ row.plusMinus === 0 ? '0' : formatSigned(row.plusMinus) }}</td>
            <td class="px-2 py-2 text-right">{{ optional(row.adr, round) }}</td>
            <td class="px-2 py-2 text-right">{{ optional(row.headshotPercent, formatPercent) }}</td>
            <td class="px-2 py-2 text-right">{{ optional(row.kastPercent, formatPercent) }}</td>
            <td class="px-2 py-2 text-right">{{ row.firstKills ?? '—' }}</td>
            <td class="px-3 py-2 text-right">{{ row.firstDeaths ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
