<script setup lang="ts">
import { computed } from 'vue'
import type { ValPlayerDto } from '~/lib/types'
import { playerDisplayName } from '~/utils/val-ladder'
import { mapImageUrl } from '~/utils/val-assets'
import { tierInfo } from '~/utils/val-tier'
import { timeAgo } from '~/utils/date'
import { formatSigned } from '~/utils/number'
import { useNow } from '~/composables/useNow'
import FrameHead from '~/components/ui/FrameHead.vue'

/**
 * The latest competitive game of each crew member, read off `valorantCurrentRank`: the API has no
 * Valorant match list yet, only the rank entry each match produced. One line per player, never a
 * full history — the frame says so.
 */
const props = withDefaults(defineProps<{
  players: ValPlayerDto[]
  limit?: number
}>(), { limit: 6 })

// Relative times depend on the reader's clock and `/` is served from a shared SWR cache: they only
// appear after mount (`useNow` is 0 until then).
const now = useNow()

const games = computed(() => props.players
  .flatMap((player) => {
    const rank = player.valorantCurrentRank
    if (!rank?.matchId) return []
    return [{
      id: player.id,
      name: playerDisplayName(player),
      map: rank.mapName ?? 'Carte inconnue',
      bannerUrl: mapImageUrl(rank.mapId),
      change: rank.lastChange,
      shielded: rank.wasDerankProtected,
      tierLabel: tierInfo(rank.tierId).label,
      at: rank.createdOn,
    }]
  })
  .sort((a, b) => b.at.localeCompare(a.at))
  .slice(0, props.limit))

const changeClass = (change: number) => (change > 0 ? 'text-win' : change < 0 ? 'text-loss' : 'text-text-sec')
</script>

<template>
  <section class="border border-border-base bg-surface-base p-4">
    <FrameHead title="Dernières classées" aside="1 par joueur" as="h2" />
    <ul v-if="games.length" class="flex flex-col gap-1.5">
      <li
        v-for="game in games"
        :key="game.id"
        class="relative isolate flex items-center gap-3 overflow-hidden border border-border-base px-3 py-2.5"
      >
        <div
          v-if="game.bannerUrl"
          aria-hidden="true"
          class="absolute inset-0 -z-10 bg-cover bg-center grayscale-[0.35]"
          :style="{ backgroundImage: `url('${game.bannerUrl}')` }"
        />
        <div aria-hidden="true" class="absolute inset-0 -z-10 bg-linear-to-r from-surface-base from-40% to-surface-base/70" />
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="truncate text-sm font-semibold">{{ game.name }}</span>
          <span class="truncate font-mono text-[11px] uppercase tracking-[0.04em] text-text-sec">
            {{ game.map }}<ClientOnly><template v-if="now"> · {{ timeAgo(game.at, now) }}</template></ClientOnly>
          </span>
        </span>
        <span class="flex shrink-0 flex-col items-end">
          <span class="font-mono text-sm font-medium" :class="changeClass(game.change)">{{ formatSigned(game.change) }} RR</span>
          <span class="font-mono text-[10px] text-text-ter" :title="game.shielded ? 'Protection de rang activée' : undefined">{{ game.shielded ? '◈ protégé' : game.tierLabel }}</span>
        </span>
      </li>
    </ul>
    <p v-else class="font-mono text-xs text-text-ter">Aucune classée connue pour le moment.</p>
  </section>
</template>
