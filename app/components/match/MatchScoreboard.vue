<script setup lang="ts">
import { computed } from 'vue'
import type { ScoreboardTeam } from '~/utils/val-game'
import { RESULT_LABELS } from '~/utils/val-match'
import { formatPercent, formatSigned } from '~/utils/number'
import { RIOT_SCORE_BETA } from '~/utils/val-labels'
import ValAgentIcon from '~/components/val/ValAgentIcon.vue'
import ValRankEmblem from '~/components/val/ValRankEmblem.vue'

/**
 * One team's scoreboard (design system §7, "Tableau des scores"): sorted by ACS, the followed player
 * on `surface-selected` with the red rule, crew members linked to their profile. On a phone the table
 * scrolls sideways under a sticky player column. Riot's own figures (its score, its MVPs, the
 * end-of-game stars) sit beside ours, never in their place, and only when the API has them.
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

/** At most three stars under a name; the rest are counted. */
const ACCOLADE_LIMIT = 3
const penaltyTitle = (factor: number) => `Pénalité de groupe : les RR gagnés sont multipliés par ${factor.toLocaleString('fr-FR')} (écart de rang trop grand dans le groupe)`

/** The Riot column only shows when someone in the game has a Riot score. */
const hasRiotScore = computed(() => props.team.rows.some(row => row.riotScore !== null))
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
      <table class="w-full table-fixed border-collapse text-left" :class="hasRiotScore ? 'min-w-[820px]' : 'min-w-[760px]'">
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
            <th v-if="hasRiotScore" scope="col" class="w-16 px-3 py-2 text-right font-medium" :title="`Note de performance Riot (${RIOT_SCORE_BETA}), environ 100 à 320`">Riot</th>
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
                    <span v-if="row.isRiotMvp" title="MVP de la partie élu par Riot" class="border border-current px-1 font-mono text-[9px] font-bold uppercase text-mvp">Riot ★</span>
                    <span v-else-if="row.isRiotTeamMvp" title="MVP de l'équipe élu par Riot" class="border border-current px-1 font-mono text-[9px] font-bold uppercase text-mvp-team">Riot ☆</span>
                    <span v-if="row.partyPenalty !== null" :title="penaltyTitle(row.partyPenalty)" class="font-mono text-[10px] text-text-ter">
                      <span aria-hidden="true">×{{ row.partyPenalty.toLocaleString('fr-FR') }}</span><span class="sr-only">{{ penaltyTitle(row.partyPenalty) }}</span>
                    </span>
                  </span>
                  <span class="font-mono text-[11px] text-text-ter">{{ row.agentName }}<template v-if="row.tag"> · {{ row.tag }}</template></span>
                  <span v-if="row.accolades.length" class="mt-0.5 flex flex-wrap gap-1" aria-label="Accolades de fin de partie">
                    <span
                      v-for="accolade in row.accolades.slice(0, ACCOLADE_LIMIT)"
                      :key="accolade.key"
                      :title="accolade.title"
                      class="border px-1 font-mono text-[9px] uppercase leading-4 text-text-sec"
                      :class="accolade.actRecord ? 'border-mvp' : 'border-border-strong'"
                    >{{ accolade.label }}<span class="sr-only"> — {{ accolade.title }}</span></span>
                    <span v-if="row.accolades.length > ACCOLADE_LIMIT" class="font-mono text-[9px] leading-4 text-text-ter" :title="row.accolades.slice(ACCOLADE_LIMIT).map(accolade => accolade.title).join(' · ')">+{{ row.accolades.length - ACCOLADE_LIMIT }}</span>
                  </span>
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
            <td v-if="hasRiotScore" class="px-3 py-2 text-right text-text-sec" :title="row.riotDetail ?? 'Pas de note Riot pour ce joueur'">
              {{ row.riotScore === null ? '—' : Math.round(row.riotScore) }}<span v-if="row.riotDetail" class="sr-only"> — {{ row.riotDetail }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
