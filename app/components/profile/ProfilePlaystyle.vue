<script setup lang="ts">
import { computed } from 'vue'
import type { ValPerformanceStatsDto, ValSideStatsDto } from '~/lib/types'
import { formatDecimal, formatPercent } from '~/utils/number'
import { glyphBar } from '~/utils/ascii'
import { BUY_LABELS } from '~/utils/val-game'
import { RIOT_SCORE_BETA, RIOT_SCORE_LABEL } from '~/utils/val-labels'
import FrameHead from '~/components/ui/FrameHead.vue'

/**
 * "Style de jeu": how the player wins rounds, from the same recap as the performance tiles (so it
 * follows the period, queue and agent filters): attack against defense, rounds by buy, clutches,
 * trades, and Riot's own score beside ours. Each card says when its figure is unknown; nothing is
 * drawn at zero for want of data.
 */
const props = defineProps<{
  stats: ValPerformanceStatsDto
  loading: boolean
  periodPhrase: string
}>()

// --- Attack / defense ---
interface SideRow {
  key: string
  label: string
  attack: string
  defense: string
  /** Defense minus attack, signed and formatted; `null` when equal. */
  gap: string | null
  /** Which side the gap favours. */
  better: 'attack' | 'defense' | null
}

const sides = computed(() => {
  const attack = props.stats.attack
  const defense = props.stats.defense
  if (!attack || !defense || attack.rounds + defense.rounds === 0) return null
  const row = (key: string, label: string, read: (side: ValSideStatsDto) => number, format: (value: number) => string, unit = ''): SideRow => {
    const a = read(attack)
    const d = read(defense)
    const delta = Math.round((d - a) * 100) / 100
    return {
      key,
      label,
      attack: format(a),
      defense: format(d),
      gap: delta === 0 ? null : `${delta > 0 ? '+' : '−'}${format(Math.abs(delta))}${unit}`,
      better: delta === 0 ? null : delta > 0 ? 'defense' : 'attack',
    }
  }
  const rows = [
    row('winrate', 'Manches gagnées', side => side.roundWinRatePercent, value => formatDecimal(value), ' pts'),
    row('kd', 'K/D', side => side.kdRatio, value => formatDecimal(value)),
    row('acs', 'ACS', side => side.acs, value => String(Math.round(value))),
  ]
  const lead = rows[0]!
  const headline = lead.better
    ? `${lead.gap!.replace(/^[+−]/, '+')} de manches gagnées en ${lead.better === 'attack' ? 'attaque' : 'défense'}`
    : 'Autant de manches gagnées des deux côtés'
  return {
    rows,
    headline,
    attackRounds: `${attack.roundsWon}/${attack.rounds} manches`,
    defenseRounds: `${defense.roundsWon}/${defense.rounds} manches`,
    attackBar: glyphBar(attack.roundWinRatePercent / 100, 10),
    defenseBar: glyphBar(defense.roundWinRatePercent / 100, 10),
    attackRate: attack.roundWinRatePercent,
    defenseRate: defense.roundWinRatePercent,
  }
})

const gapClass = (better: SideRow['better']) => (better === 'attack' ? 'text-ally' : better === 'defense' ? 'text-enemy' : 'text-text-ter')

// --- Rounds by buy ---
const buys = computed(() => {
  const b = props.stats.buyTypes
  if (!b) return null
  const rows = [
    { key: 'pistol', label: BUY_LABELS.pistol, rounds: b.pistolRounds, won: b.pistolRoundsWon, rate: b.pistolWinRatePercent, hint: 'première manche de chaque mi-temps' },
    { key: 'eco', label: BUY_LABELS.eco, rounds: b.ecoRounds, won: b.ecoRoundsWon, rate: b.ecoWinRatePercent, hint: 'moins de 2 000 crédits d\'équipement par joueur' },
    { key: 'semi', label: BUY_LABELS.semi, rounds: b.forceBuyRounds, won: b.forceBuyRoundsWon, rate: b.forceBuyWinRatePercent, hint: 'achat forcé, de 2 000 à 3 899 crédits' },
    { key: 'full', label: BUY_LABELS.full, rounds: b.fullBuyRounds, won: b.fullBuyRoundsWon, rate: b.fullBuyWinRatePercent, hint: '3 900 crédits et plus' },
  ]
  return rows.map(row => ({
    ...row,
    bar: row.rounds > 0 ? glyphBar(row.rate / 100, 8) : null,
    rateText: row.rounds > 0 ? formatPercent(row.rate) : '—',
  }))
})

// --- Clutches ---
const clutches = computed(() => {
  const c = props.stats.clutches
  if (!c) return null
  const breakdown = [c.won1v1, c.won1v2, c.won1v3, c.won1v4, c.won1v5]
  const max = Math.max(1, ...breakdown)
  return {
    attempts: c.attempts,
    won: c.won,
    rate: c.attempts > 0 ? formatPercent(c.winRatePercent) : null,
    breakdown: breakdown.map((count, index) => ({
      label: `1v${index + 1}`,
      count,
      height: `${count > 0 ? Math.max(8, (count / max) * 100) : 0}%`,
    })),
  }
})

// --- Trades ---
const trades = computed(() => {
  const t = props.stats.trades
  if (!t) return null
  return {
    kills: t.tradeKills,
    traded: t.tradedDeaths,
    deaths: t.deaths,
    rate: t.deaths > 0 ? formatPercent(t.tradedDeathPercent) : null,
    bar: t.deaths > 0 ? glyphBar(t.tradedDeathPercent / 100, 12) : null,
  }
})

// --- Ratings ---
const riotScore = computed(() => {
  const score = props.stats.averageRiotPerformanceScore
  return score == null ? null : String(Math.round(score))
})
</script>

<template>
  <div class="grid gap-3 transition-opacity duration-200 md:grid-cols-2 md:gap-4 xl:grid-cols-4" :class="loading ? 'opacity-60' : ''" :aria-busy="loading">
    <section class="min-w-0 border border-border-base bg-surface-base p-4 md:col-span-2" aria-labelledby="playstyle-sides">
      <FrameHead title="Attaque · Défense" :aside="periodPhrase" />
      <h3 id="playstyle-sides" class="sr-only">Attaque contre défense</h3>
      <template v-if="sides">
        <p class="font-display text-2xl font-extrabold uppercase leading-none">{{ sides.headline }}</p>
        <div class="mt-4 grid grid-cols-2 gap-4">
          <div class="min-w-0 border-l-2 border-l-ally pl-3">
            <span class="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ally">Attaque</span>
            <p class="mt-1 font-display text-[40px] font-black leading-[0.9]">{{ formatDecimal(sides.attackRate) }}<span class="ml-1 font-mono text-xs font-medium text-text-ter">%</span></p>
            <p class="ascii mt-1 text-xs" role="img" :aria-label="`Attaque : ${formatPercent(sides.attackRate)} de manches gagnées`">
              <span class="text-ally">{{ sides.attackBar.on }}</span><span class="text-border-ascii">{{ sides.attackBar.off }}</span>
            </p>
            <p class="mt-1 truncate font-mono text-xs text-text-sec">{{ sides.attackRounds }}</p>
          </div>
          <div class="min-w-0 border-l-2 border-l-enemy pl-3">
            <span class="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-enemy">Défense</span>
            <p class="mt-1 font-display text-[40px] font-black leading-[0.9]">{{ formatDecimal(sides.defenseRate) }}<span class="ml-1 font-mono text-xs font-medium text-text-ter">%</span></p>
            <p class="ascii mt-1 text-xs" role="img" :aria-label="`Défense : ${formatPercent(sides.defenseRate)} de manches gagnées`">
              <span class="text-enemy">{{ sides.defenseBar.on }}</span><span class="text-border-ascii">{{ sides.defenseBar.off }}</span>
            </p>
            <p class="mt-1 truncate font-mono text-xs text-text-sec">{{ sides.defenseRounds }}</p>
          </div>
        </div>
        <table class="mt-4 w-full border-collapse font-mono text-[13px]">
          <thead class="text-[10px] uppercase tracking-[0.08em] text-text-ter">
            <tr>
              <th scope="col" class="py-1 text-left font-medium"><span class="sr-only">Statistique</span></th>
              <th scope="col" class="py-1 text-right font-medium">Att.</th>
              <th scope="col" class="py-1 text-right font-medium">Déf.</th>
              <th scope="col" class="py-1 text-right font-medium" title="Défense moins attaque">Écart</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sides.rows" :key="row.key" class="border-t border-border-base">
              <th scope="row" class="py-1.5 text-left font-sans text-sm font-normal text-text-sec">{{ row.label }}</th>
              <td class="py-1.5 text-right">{{ row.attack }}</td>
              <td class="py-1.5 text-right">{{ row.defense }}</td>
              <td class="py-1.5 text-right font-medium" :class="gapClass(row.better)">
                <template v-if="row.gap">{{ row.gap }} <span class="text-[10px] uppercase">{{ row.better === 'attack' ? 'att.' : 'déf.' }}</span></template>
                <template v-else>=</template>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
      <p v-else class="font-mono text-xs text-text-ter">// Côtés indisponibles : aucune manche rattachée à l'attaque ou à la défense {{ periodPhrase }}.</p>
    </section>

    <section class="min-w-0 border border-border-base bg-surface-base p-4 md:col-span-2" aria-labelledby="playstyle-buys">
      <FrameHead title="Économie" aside="manches gagnées par achat" />
      <h3 id="playstyle-buys" class="sr-only">Manches gagnées par type d'achat</h3>
      <ul v-if="buys" class="flex flex-col">
        <li v-for="row in buys" :key="row.key" class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-t border-border-base py-2 first:border-t-0 sm:grid-cols-[120px_minmax(0,1fr)_auto]">
          <span class="text-sm font-semibold" :title="row.hint">{{ row.label }}</span>
          <span v-if="row.bar" class="ascii order-3 col-span-2 text-xs sm:order-none sm:col-span-1" role="img" :aria-label="`${row.label} : ${row.rateText} de manches gagnées`">
            <span class="text-text-main">{{ row.bar.on }}</span><span class="text-border-ascii">{{ row.bar.off }}</span>
          </span>
          <span v-else class="order-3 col-span-2 font-mono text-xs text-text-ter sm:order-none sm:col-span-1">aucune manche</span>
          <span class="text-right font-mono text-xs text-text-sec">
            <b class="text-[13px] font-medium text-text-main">{{ row.rateText }}</b> · {{ row.won }}/{{ row.rounds }}
          </span>
        </li>
      </ul>
      <p v-else class="font-mono text-xs text-text-ter">// Économie indisponible : les achats ne se comptent qu'en compétition, non classée et Premier.</p>
    </section>

    <section class="min-w-0 border border-border-base bg-surface-base p-4" aria-labelledby="playstyle-clutches">
      <FrameHead title="Clutchs" :aside="periodPhrase" />
      <h3 id="playstyle-clutches" class="sr-only">Clutchs</h3>
      <template v-if="clutches && clutches.attempts > 0">
        <p class="flex items-baseline gap-2">
          <span class="font-display text-[44px] font-black leading-[0.9]">{{ clutches.won }}</span>
          <span class="font-mono text-xs text-text-ter">/ {{ clutches.attempts }} tentés</span>
        </p>
        <p class="mt-1 font-mono text-xs text-text-sec">{{ clutches.rate }} de réussite</p>
        <ol class="mt-3 grid h-20 grid-cols-5 items-end gap-1" aria-label="Clutchs gagnés selon le nombre d'adversaires">
          <li v-for="entry in clutches.breakdown" :key="entry.label" class="flex h-full flex-col justify-end text-center font-mono text-[10px]">
            <span class="text-text-sec">{{ entry.count }}</span>
            <span aria-hidden="true" class="mx-auto w-full max-w-6 bg-text-main" :style="{ height: entry.height }" />
            <span class="mt-1 text-text-ter">{{ entry.label }}</span>
            <span class="sr-only">: {{ entry.count }} gagné{{ entry.count > 1 ? 's' : '' }}</span>
          </li>
        </ol>
      </template>
      <p v-else-if="clutches" class="font-mono text-xs text-text-ter">Aucun clutch tenté {{ periodPhrase }}.</p>
      <p v-else class="font-mono text-xs text-text-ter">// Clutchs indisponibles.</p>
    </section>

    <section class="min-w-0 border border-border-base bg-surface-base p-4" aria-labelledby="playstyle-trades">
      <FrameHead title="Échanges" aside="sous 5 s" />
      <h3 id="playstyle-trades" class="sr-only">Échanges</h3>
      <template v-if="trades">
        <p class="flex items-baseline gap-2">
          <span class="font-display text-[44px] font-black leading-[0.9]">{{ trades.kills }}</span>
          <span class="font-mono text-xs text-text-ter">kill{{ trades.kills > 1 ? 's' : '' }} d'échange</span>
        </p>
        <p class="mt-1 text-sm text-text-sec">coéquipier vengé dans les 5 secondes</p>
        <div class="mt-3 border-t border-dashed border-border-strong pt-3">
          <template v-if="trades.bar">
            <p class="font-mono text-xs text-text-sec"><b class="text-[13px] font-medium text-text-main">{{ trades.rate }}</b> de ses morts vengées</p>
            <p class="ascii mt-1 text-xs" role="img" :aria-label="`${trades.rate} de ses morts vengées`">
              <span class="text-text-main">{{ trades.bar.on }}</span><span class="text-border-ascii">{{ trades.bar.off }}</span>
            </p>
            <p class="mt-1 font-mono text-[11px] text-text-ter">{{ trades.traded }} sur {{ trades.deaths }} morts</p>
          </template>
          <p v-else class="font-mono text-xs text-text-ter">Aucune mort {{ periodPhrase }}.</p>
        </div>
      </template>
      <p v-else class="font-mono text-xs text-text-ter">// Échanges indisponibles.</p>
    </section>

    <section class="min-w-0 border border-border-base bg-surface-base p-4 md:col-span-2" aria-labelledby="playstyle-ratings">
      <FrameHead title="Notes" :aside="periodPhrase" />
      <h3 id="playstyle-ratings" class="sr-only">Notes</h3>
      <div class="grid grid-cols-2 gap-4">
        <div class="min-w-0">
          <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">// Note PeekDiff</span>
          <p class="mt-2 font-display text-[44px] font-black leading-[0.9]">{{ formatDecimal(stats.averageRating) }}<span class="ml-1 font-mono text-xs font-medium text-text-ter">/10</span></p>
          <p class="mt-1 text-pretty text-xs text-text-sec">Celle qui élit le MVP de chaque partie.</p>
        </div>
        <div class="min-w-0 border-l border-dashed border-border-strong pl-4">
          <span class="flex flex-wrap items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">
            // {{ RIOT_SCORE_LABEL }}
            <span class="border border-border-strong px-1 text-[10px] text-text-sec">{{ RIOT_SCORE_BETA }}</span>
          </span>
          <p class="mt-2 font-display text-[44px] font-black leading-[0.9]">{{ riotScore ?? '—' }}</p>
          <p class="mt-1 text-pretty text-xs text-text-sec">
            <template v-if="riotScore">Score de performance moyen de Riot, encore provisoire chez Riot (environ 100 à 320).</template>
            <template v-else>Riot n'a pas noté ces parties.</template>
          </p>
        </div>
      </div>
      <p class="mt-3 border-t border-dashed border-border-strong pt-3 font-mono text-[11px] text-text-ter">
        // Les deux notes ne se comparent pas : chacune a son échelle.
      </p>
    </section>
  </div>
</template>
