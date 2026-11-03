<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ValWeaponStatDto } from '~/lib/types'
import { formatDecimal, formatPercent } from '~/utils/number'
import { glyphBar } from '~/utils/ascii'
import { valorantCdnUrl } from '~/utils/val-assets'
import { weaponKind, weaponName } from '~/utils/val-labels'
import FrameHead from '~/components/ui/FrameHead.vue'

/**
 * What the player kills with, most kills first: the weapon's kill-feed silhouette (a glyph of its kind
 * without one: abilities, the spike, a fall), its share of the kills and how far they land. Follows
 * the profile's filters like the rest of the recap.
 */
const props = withDefaults(defineProps<{
  weapons: ValWeaponStatDto[]
  periodPhrase: string
  limit?: number
}>(), { limit: 8 })

const expanded = ref(false)
const failedIcons = ref(new Set<string>())

const meters = (value: number | null) => (value === null ? null : `${formatDecimal(Math.round(value))} m`)

const rows = computed(() => (expanded.value ? props.weapons : props.weapons.slice(0, props.limit)).map((weapon, index) => {
  const key = weapon.weaponId ?? `${weapon.weaponType}-${weapon.weaponName}-${index}`
  const kind = weaponKind(weapon.weaponType)
  const distances = [
    weapon.averageDistanceMeters !== null ? `moy. ${meters(weapon.averageDistanceMeters)}` : null,
    weapon.longestDistanceMeters !== null ? `max ${meters(weapon.longestDistanceMeters)}` : null,
  ].filter(Boolean).join(' · ')
  return {
    key,
    name: weaponName(weapon.weaponName, weapon.weaponType),
    kind,
    iconUrl: failedIcons.value.has(key) ? null : valorantCdnUrl(weapon.iconUrl),
    kills: weapon.kills,
    share: formatPercent(weapon.killSharePercent),
    bar: glyphBar(weapon.killSharePercent / 100, 10),
    distances,
  }
}))
const hiddenCount = computed(() => props.weapons.length - rows.value.length)

function onIconError(key: string) {
  failedIcons.value = new Set([...failedIcons.value, key])
}
</script>

<template>
  <section class="border border-border-base bg-surface-base p-4">
    <FrameHead title="Armes" as="h3" />
    <ol v-if="rows.length" class="grid gap-x-8 lg:grid-cols-2">
      <li
        v-for="row in rows"
        :key="row.key"
        class="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border-base py-2 first:border-t-0 lg:[&:nth-child(2)]:border-t-0"
      >
        <span class="grid h-8 place-items-center bg-surface-sunken" :title="row.kind.label">
          <img
            v-if="row.iconUrl"
            :src="row.iconUrl"
            alt=""
            loading="lazy"
            class="max-h-6 w-auto max-w-16 object-contain light:invert"
            @error="onIconError(row.key)"
          >
          <span v-else aria-hidden="true" class="font-mono text-base text-text-sec">{{ row.kind.glyph }}</span>
        </span>
        <span class="flex min-w-0 flex-col">
          <span class="flex min-w-0 items-baseline gap-2">
            <span class="truncate text-sm font-semibold">{{ row.name }}</span>
            <span class="shrink-0 font-mono text-[10px] uppercase tracking-[0.06em] text-text-ter">{{ row.kind.label }}</span>
          </span>
          <span class="truncate font-mono text-[11px] text-text-sec">{{ row.distances || 'distance inconnue' }}</span>
        </span>
        <span class="flex flex-col items-end font-mono text-[11px] text-text-sec">
          <span><b class="text-[13px] font-medium text-text-main">{{ row.kills }}</b> kill{{ row.kills > 1 ? 's' : '' }}</span>
          <span class="ascii" role="img" :aria-label="`${row.share} des kills`"><span class="text-text-main">{{ row.bar.on }}</span><span class="text-border-ascii">{{ row.bar.off }}</span> {{ row.share }}</span>
        </span>
      </li>
    </ol>
    <p v-else class="font-mono text-xs text-text-ter">Aucun kill {{ periodPhrase }}.</p>
    <button
      v-if="hiddenCount > 0 || expanded"
      type="button"
      :aria-expanded="expanded"
      class="mt-2 cursor-pointer font-mono text-xs uppercase tracking-[0.06em] text-text-sec transition-colors duration-150 ease-snap hover:text-text-main"
      @click="expanded = !expanded"
    >
      <span aria-hidden="true" class="text-text-ter">[</span>{{ expanded ? 'Moins d\'armes' : `${hiddenCount} arme${hiddenCount > 1 ? 's' : ''} de plus` }}<span aria-hidden="true" class="text-text-ter">]</span>
    </button>
  </section>
</template>
