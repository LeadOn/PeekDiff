<script setup lang="ts">
import { computed } from 'vue'
import type { ValSeasonResultDto } from '~/lib/types'
import type { Loadable } from '~/composables/useProfileExtras'
import { isRankedTier, tierColor, tierInfo } from '~/utils/val-tier'
import { parseActWins } from '~/utils/val-labels'
import FrameHead from '~/components/ui/FrameHead.vue'
import ValRankEmblem from '~/components/val/ValRankEmblem.vue'

/**
 * "Saisons": the account's acts, oldest to newest, as a frieze that scrolls sideways. Each act shows
 * its act rank badge, the rank it ended on, its record and, when the API has it, the triangle of the
 * act's top wins (one mark per win, in its tier's colour, best at the top).
 */
const props = defineProps<{
  seasons: Loadable<ValSeasonResultDto[]>
}>()

/** The act badge's triangle: rows of 1, 3 and 5 wins. */
const TRIANGLE_ROWS = [1, 3, 5]

const acts = computed(() => (props.seasons.data ?? []).map((season) => {
  const wins = parseActWins(season.actWinsJson)
  let offset = 0
  const triangle = TRIANGLE_ROWS.map((size) => {
    const row = wins.slice(offset, offset + size).map(tierId => ({ tierId, color: tierColor(tierInfo(tierId).family) }))
    offset += size
    return row
  }).filter(row => row.length > 0)
  const end = isRankedTier(season.endTierId) ? tierInfo(season.endTierId).label : null
  const badge = isRankedTier(season.actRankTierId) ? tierInfo(season.actRankTierId).label : null
  return {
    id: season.id,
    act: (season.seasonShort ?? season.seasonId).toUpperCase(),
    badgeTierId: season.actRankTierId,
    badgeUrl: season.actRankIconUrl,
    badge,
    end: end ? `${end} · ${season.endRr} RR` : null,
    record: season.games > 0 ? `${season.wins}V / ${season.games} partie${season.games > 1 ? 's' : ''}` : 'Aucune classée',
    placement: season.gamesNeededForRating > 0 ? `${season.gamesNeededForRating} placement${season.gamesNeededForRating > 1 ? 's' : ''} restant${season.gamesNeededForRating > 1 ? 's' : ''}` : null,
    leaderboard: season.leaderboardRank && season.leaderboardRank > 0 ? `#${season.leaderboardRank.toLocaleString('fr-FR')}` : null,
    triangle,
    triangleLabel: wins.length ? `Meilleures victoires de l'acte : ${wins.map(tierId => tierInfo(tierId).label).join(', ')}` : '',
  }
}))
</script>

<template>
  <section class="min-w-0 border border-border-base bg-surface-base p-4">
    <FrameHead title="Saisons" :aside="acts.length ? `${acts.length} acte${acts.length > 1 ? 's' : ''}` : null" />

    <div v-if="seasons.status === 'loading'" aria-busy="true" class="flex animate-pulse gap-2">
      <span v-for="i in 4" :key="i" class="h-44 w-36 shrink-0 bg-surface-high" />
    </div>
    <p v-else-if="seasons.status === 'unavailable'" class="font-mono text-xs text-text-ter">// Saisons indisponibles : l'API ne fournit pas encore les résultats de fin d'acte.</p>
    <p v-else-if="seasons.status === 'error'" class="font-mono text-xs text-text-ter">Les saisons n'ont pas pu être chargées.</p>
    <p v-else-if="acts.length === 0" class="font-mono text-xs text-text-ter">Aucun acte classé connu pour ce compte.</p>

    <div v-else class="-mx-1 overflow-x-auto px-1 pb-1">
      <ol class="flex min-w-max gap-2" aria-label="Actes, du plus ancien au plus récent">
        <li v-for="act in acts" :key="act.id" class="flex w-36 shrink-0 flex-col border border-border-base bg-surface-high p-3 last:border-border-strong">
          <span class="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-text-sec">{{ act.act }}</span>
          <div class="mt-2 flex items-center gap-2">
            <ValRankEmblem :tier-id="act.badgeTierId ?? 0" :src="act.badgeUrl" size="large" :alt="act.badge ? `Badge d'acte ${act.badge}` : 'Pas de badge d\'acte'" class="size-12 shrink-0" />
            <div
              v-if="act.triangle.length"
              role="img"
              :aria-label="act.triangleLabel"
              class="flex flex-col items-center gap-px"
            >
              <span v-for="(row, index) in act.triangle" :key="index" class="flex gap-px">
                <span v-for="(win, cell) in row" :key="cell" class="size-1.5" :style="{ backgroundColor: win.color }" />
              </span>
            </div>
          </div>
          <span class="mt-2 text-sm font-semibold">{{ act.badge ?? 'Sans badge' }}</span>
          <span v-if="act.end" class="font-mono text-[11px] text-text-sec">Fin : {{ act.end }}</span>
          <span class="mt-auto pt-2 font-mono text-[11px] text-text-ter">{{ act.record }}</span>
          <span v-if="act.placement" class="font-mono text-[11px] text-text-ter">{{ act.placement }}</span>
          <span v-if="act.leaderboard" class="font-mono text-[11px] text-text-sec">Leaderboard {{ act.leaderboard }}</span>
        </li>
      </ol>
    </div>
  </section>
</template>
