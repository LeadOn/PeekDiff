<script setup lang="ts">
import { computed } from 'vue'
import type { ValMapStatDto } from '~/lib/types'
import { formatPercent } from '~/utils/number'
import { mapImageUrl } from '~/utils/val-assets'
import FrameHead from '~/components/ui/FrameHead.vue'

/** The maps of the performance recap, most played first, each over its banner under the veil. */
const props = withDefaults(defineProps<{
  maps: ValMapStatDto[]
  periodPhrase: string
  limit?: number
}>(), { limit: 5 })

const rows = computed(() => props.maps.slice(0, props.limit).map(map => ({
  ...map,
  bannerUrl: map.mapListViewIconUrl ?? mapImageUrl(map.mapId),
})))
</script>

<template>
  <section class="border border-border-base bg-surface-base p-4">
    <FrameHead title="Cartes" :aside="periodPhrase" as="h2" />
    <ul v-if="rows.length" class="flex flex-col gap-1.5">
      <li
        v-for="map in rows"
        :key="map.mapName"
        class="relative isolate flex h-14 items-end justify-between gap-3 overflow-hidden bg-night px-3 py-2 text-on-night"
      >
        <div
          v-if="map.bannerUrl"
          aria-hidden="true"
          class="absolute inset-0 -z-20 bg-cover bg-center grayscale-[0.35]"
          :style="{ backgroundImage: `url('${map.bannerUrl}')` }"
        />
        <div aria-hidden="true" class="bg-scrim-night absolute inset-0 -z-10" />
        <span class="flex min-w-0 flex-col">
          <b class="truncate font-display text-[22px] font-extrabold uppercase leading-none">{{ map.mapName }}</b>
          <span class="mt-1 font-mono text-[11px] text-on-night-2">{{ map.gamesPlayed }} partie{{ map.gamesPlayed > 1 ? 's' : '' }} · ACS {{ Math.round(map.acs) }}</span>
        </span>
        <span class="shrink-0 font-mono text-[13px] font-medium" :class="map.winRate >= 50 ? 'text-on-night-win' : 'text-on-night'">
          {{ formatPercent(map.winRate) }} <span class="text-[11px] font-normal text-on-night-2">vict.</span>
        </span>
      </li>
    </ul>
    <p v-else class="font-mono text-xs text-text-ter">Aucune carte jouée {{ periodPhrase }}.</p>
  </section>
</template>
