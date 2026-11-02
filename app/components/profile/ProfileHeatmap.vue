<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ValHeatmapDto, ValHeatmapType, ValMapStatDto, ValSide, ValStatsPeriod } from '~/lib/types'
import { errorStatusCode, isAbortError } from '~/lib/types/error'
import { useGameOnVal } from '~/composables/useGameOnVal'
import { formatPercent } from '~/utils/number'
import { glyphBar } from '~/utils/ascii'
import { mapImageUrl, valorantCdnUrl } from '~/utils/val-assets'
import SegmentSwitch from '~/components/ui/SegmentSwitch.vue'

/**
 * Where the player kills from, or falls, on one map (`GET /val/player/{id}/heatmap`): every point on
 * the minimap, teal on attack and red on defense, and beside it the zones that gather the most. Loaded
 * after mount and on every change of map, type, side or the profile's period and queue (the API takes
 * no agent). Each empty state says why: an API without the route, a map without a minimap, games
 * imported before positions were stored.
 */
const props = defineProps<{
  playerId: string
  /** The recap's maps, most played first: the ones a heatmap can be asked for. */
  maps: ValMapStatDto[]
  period: ValStatsPeriod
  queues: string[] | undefined
  /** "sur 30 jours". */
  periodPhrase: string
  /** The profile's agent filter, which the heatmap cannot apply: said, not hidden. */
  agent: string | null
}>()

const client = useGameOnVal()

const TYPE_OPTIONS: { value: ValHeatmapType, label: string }[] = [
  { value: 'Kills', label: 'Kills' },
  { value: 'Deaths', label: 'Morts' },
]
const SIDE_OPTIONS: { value: ValSide | null, label: string }[] = [
  { value: null, label: 'Les deux' },
  { value: 'Attack', label: 'Attaque' },
  { value: 'Defense', label: 'Défense' },
]
const ZONE_LIMIT = 8

const mapOptions = computed(() => props.maps.map(map => ({ value: map.mapName, label: map.mapName })))
const selectedMap = ref<string | null>(props.maps[0]?.mapName ?? null)
const type = ref<ValHeatmapType>('Kills')
const side = ref<ValSide | null>(null)

const heatmap = ref<ValHeatmapDto | null>(null)
const status = ref<'idle' | 'loading' | 'success' | 'unavailable' | 'error'>('idle')
let request: AbortController | null = null

async function load() {
  request?.abort()
  const map = selectedMap.value
  if (!map) {
    heatmap.value = null
    status.value = 'success'
    return
  }
  const controller = new AbortController()
  request = controller
  status.value = 'loading'
  try {
    heatmap.value = await client.getValPlayerHeatmap(props.playerId, {
      map,
      type: type.value,
      side: side.value ?? undefined,
      period: props.period,
      queues: props.queues,
    }, controller.signal)
    status.value = 'success'
  } catch (e) {
    if (isAbortError(e)) return
    heatmap.value = null
    // 404: an API older than the positions does not serve the route. Not a failure.
    if (errorStatusCode(e) === 404) {
      status.value = 'unavailable'
      return
    }
    console.error('[player] Heatmap indisponible :', e)
    status.value = 'error'
  } finally {
    if (request === controller) request = null
  }
}

onMounted(load)
onBeforeUnmount(() => request?.abort())

// A filter of the profile may drop the selected map from the recap: fall back to the most played one.
watch(() => props.maps.map(map => map.mapName).join('|'), () => {
  if (!props.maps.some(map => map.mapName === selectedMap.value)) selectedMap.value = props.maps[0]?.mapName ?? null
})
watch([selectedMap, type, side, () => props.period, () => props.queues?.join(',')], () => load())

const imageUrl = computed(() => valorantCdnUrl(heatmap.value?.mapTransform?.minimapUrl) ?? mapImageUrl(heatmap.value?.mapId, 'minimap'))

const SIDE_CLASSES: Record<string, string> = { Attack: 'fill-ally', Defense: 'fill-enemy' }

/** The points that can be drawn: projected by the API, on the image. */
const dots = computed(() => (heatmap.value?.points ?? []).flatMap((point, index) => {
  if (point.minimapX === null || point.minimapY === null) return []
  if (point.minimapX < -0.02 || point.minimapX > 1.02 || point.minimapY < -0.02 || point.minimapY > 1.02) return []
  return [{
    key: `${point.matchId}-${point.roundNumber}-${index}`,
    x: point.minimapX * 100,
    y: point.minimapY * 100,
    fillClass: (point.side ? SIDE_CLASSES[point.side] : undefined) ?? 'fill-text-main',
  }]
}))

const pointCount = computed(() => heatmap.value?.points.length ?? 0)
const noun = computed(() => (type.value === 'Kills' ? 'kill' : 'mort'))
const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`

const zones = computed(() => (heatmap.value?.zones ?? []).slice(0, ZONE_LIMIT).map(zone => ({
  ...zone,
  share: formatPercent(zone.sharePercent),
  bar: glyphBar(zone.sharePercent / 100, 10),
})))

/** Why nothing is drawn, when nothing is. */
const emptyReason = computed(() => {
  if (props.maps.length === 0) return `Aucune carte jouée ${props.periodPhrase} : rien à placer sur une minimap.`
  if (status.value === 'unavailable') return 'Heatmap indisponible : l\'API ne fournit pas encore les positions des kills.'
  if (status.value === 'error') return 'La heatmap n\'a pas pu être chargée. Réessayez dans un instant.'
  if (status.value !== 'success' || !heatmap.value) return null
  if (!heatmap.value.mapTransform) return `Pas de minimap pour ${heatmap.value.mapName || selectedMap.value} : les positions ne peuvent pas y être placées.`
  if (pointCount.value === 0) {
    return `Aucun${type.value === 'Kills' ? '' : 'e'} ${noun.value} positionné${type.value === 'Kills' ? '' : 'e'} sur ${selectedMap.value} ${props.periodPhrase}. Les parties importées avant l'enregistrement des positions n'en ont pas.`
  }
  if (dots.value.length === 0) return 'Les positions de ces parties ne peuvent pas être placées sur la minimap.'
  return null
})

const summary = computed(() => {
  const what = type.value === 'Kills' ? 'Positions de tir des kills' : 'Positions des morts'
  const sideText = side.value === 'Attack' ? ' en attaque' : side.value === 'Defense' ? ' en défense' : ''
  return `${what}${sideText} sur ${selectedMap.value ?? ''} ${props.periodPhrase} : ${plural(dots.value.length, 'point')}. Détail par zone ci-contre.`
})
</script>

<template>
  <div class="border border-border-base bg-surface-base p-4 md:p-5">
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <SegmentSwitch v-if="mapOptions.length" v-model="selectedMap" :options="mapOptions" label="Carte" />
      <SegmentSwitch v-model="type" :options="TYPE_OPTIONS" label="Kills ou morts" />
      <SegmentSwitch v-model="side" :options="SIDE_OPTIONS" label="Côté" />
    </div>
    <p class="mb-4 font-mono text-[11px] text-text-ter">
      // {{ type === 'Kills' ? 'Où il se tenait quand il a tué' : 'Où il est tombé' }} · {{ periodPhrase }}<template v-if="agent"> · tous agents (la heatmap ne filtre pas par agent)</template>
    </p>

    <div v-if="status === 'loading' && !heatmap" aria-busy="true" aria-label="Chargement de la heatmap" class="grid animate-pulse gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
      <span class="aspect-square max-w-[560px] bg-surface-high" />
      <span class="h-48 bg-surface-high" />
    </div>

    <div
      v-else-if="emptyReason"
      data-testid="heatmap-empty"
      class="ticks flex flex-wrap items-center gap-5 border border-border-base bg-surface-sunken p-6"
    >
      <pre aria-hidden="true" class="ascii text-sm text-border-ascii">  │
──<span class="text-brand-red">┼</span>──
  │</pre>
      <p class="min-w-60 flex-1 text-pretty text-sm text-text-sec">{{ emptyReason }}</p>
      <button
        v-if="status === 'error'"
        type="button"
        class="inline-flex h-11 cursor-pointer items-center gap-2 border border-border-strong px-4 font-mono text-[13px] font-medium uppercase tracking-[0.06em] transition-colors duration-150 ease-snap hover:bg-surface-hover"
        @click="load"
      >
        <span aria-hidden="true" class="text-text-ter">[</span>Réessayer<span aria-hidden="true" class="text-text-ter">]</span>
      </button>
    </div>

    <div v-else-if="heatmap" class="grid items-start gap-5 transition-opacity duration-200 md:grid-cols-[minmax(0,1fr)_260px]" :class="status === 'loading' ? 'opacity-60' : ''" :aria-busy="status === 'loading'">
      <figure class="min-w-0">
        <div class="relative mx-auto aspect-square w-full max-w-[560px] border border-border-base bg-night">
          <img v-if="imageUrl" :src="imageUrl" alt="" width="1024" height="1024" loading="lazy" class="absolute inset-0 size-full object-contain opacity-80">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            :aria-label="summary"
            data-testid="heatmap-points"
            class="absolute inset-0 size-full"
          >
            <rect
              v-for="dot in dots"
              :key="dot.key"
              :x="dot.x - 0.6"
              :y="dot.y - 0.6"
              width="1.2"
              height="1.2"
              :class="dot.fillClass"
              fill-opacity="0.75"
              class="stroke-night"
              stroke-width="0.2"
            />
          </svg>
        </div>
        <figcaption class="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-text-ter">
          <span><span aria-hidden="true" class="text-ally">■</span> attaque</span>
          <span><span aria-hidden="true" class="text-enemy">■</span> défense</span>
          <span>{{ plural(pointCount, noun) }}<template v-if="dots.length < pointCount"> · {{ dots.length }} placé{{ dots.length > 1 ? 's' : '' }}</template></span>
        </figcaption>
      </figure>

      <section class="min-w-0" aria-label="Zones">
        <p class="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-text-main">Zones</p>
        <ol v-if="zones.length" class="flex flex-col" data-testid="heatmap-zones">
          <li v-for="zone in zones" :key="zone.zone" class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-t border-border-base py-1.5 first:border-t-0">
            <span class="truncate text-sm font-semibold">{{ zone.zone }}</span>
            <span class="font-mono text-xs text-text-sec"><b class="font-medium text-text-main">{{ zone.share }}</b> · {{ zone.count }}</span>
            <span class="ascii col-span-2 text-[11px]" aria-hidden="true"><span class="text-text-main">{{ zone.bar.on }}</span><span class="text-border-ascii">{{ zone.bar.off }}</span></span>
          </li>
        </ol>
        <p v-else class="font-mono text-xs text-text-ter">Aucune zone nommée pour ces positions.</p>
      </section>
    </div>
  </div>
</template>
