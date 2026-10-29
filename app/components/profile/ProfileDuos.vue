<script setup lang="ts">
import { computed } from 'vue'
import type { ValDuoStatDto } from '~/lib/types'
import { formatPercent } from '~/utils/number'
import { playerDisplayName } from '~/utils/val-ladder'
import FrameHead from '~/components/ui/FrameHead.vue'
import ValPlayerCard from '~/components/val/ValPlayerCard.vue'

/**
 * The crew members met in the player's games, most frequent first. Counted per account, like the API
 * does: a duo with someone's smurf is a separate line.
 */
const props = withDefaults(defineProps<{
  duos: ValDuoStatDto[]
  periodPhrase: string
  limit?: number
}>(), { limit: 5 })

const rows = computed(() => props.duos.slice(0, props.limit).map(duo => ({
  ...duo,
  name: playerDisplayName(duo.player),
})))
</script>

<template>
  <section class="border border-border-base bg-surface-base p-4">
    <FrameHead title="Duos" :aside="periodPhrase" as="h2" />
    <ol v-if="rows.length" class="flex flex-col">
      <li
        v-for="duo in rows"
        :key="duo.player.id"
        class="relative grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border-base py-2 first:border-t-0"
      >
        <ValPlayerCard :src="duo.player.valorantPlayerCardSmallUrl" :name="duo.name" class="size-8" />
        <span class="flex min-w-0 flex-col">
          <NuxtLink :to="`/player/${duo.player.id}`" class="truncate text-sm font-semibold after:absolute after:inset-0 after:content-[''] hover:text-brand-red">{{ duo.name }}</NuxtLink>
          <span class="font-mono text-[11px] text-text-sec">{{ duo.gamesPlayed }} ensemble · {{ duo.premadeGames }} en groupe</span>
        </span>
        <span class="font-mono text-[11px] text-text-sec">
          <b class="text-[13px] font-medium" :class="duo.winRate >= 50 ? 'text-win' : 'text-text-main'">{{ formatPercent(duo.winRate) }}</b> vict.
        </span>
      </li>
    </ol>
    <p v-else class="font-mono text-xs text-text-ter">Aucun membre du crew croisé {{ periodPhrase }}.</p>
  </section>
</template>
