<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ValHeatmapDto, ValHeatmapType, ValMapStatDto, ValSide, ValStatsPeriod } from '~/lib/types'
import { errorStatusCode, isAbortError } from '~/lib/types/error'
import { useGameOnVal } from '~/composables/useGameOnVal'
import { mapImageUrl, valorantCdnUrl } from '~/utils/val-assets'
import SegmentSwitch from '~/components/ui/SegmentSwitch.vue'

/**
 * Where the player kills from and where they fall, on one map (`GET /val/player/{id}/heatmap`, once
 * per type): kills as teal dots, deaths as red crosses, both on the same minimap so the duels they win
 * and the ones they lose read side by side. Beside it, the zones with their kills and deaths; a zone
 * hovered, focused or picked in the list isolates its marks on the map. Loaded after mount and on
 * every change of map, type, side or the profile's period and queue (the API takes no agent). Each
 * empty state says why: an API without the route, a map without a minimap, games imported before
 * positions were stored.
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

/** `null` = both, read in two requests. */
const TYPE_OPTIONS: { value: ValHeatmapType | null, label: string }[] = [
  { value: null, label: 'Kills et morts' },
  { value: 'Kills', label: 'Kills' },
  { value: 'Deaths', label: 'Morts' },
]
const SIDE_OPTIONS: { value: ValSide | null, label: string }[] = [
  { value: null, label: 'Les deux' },
  { value: 'Attack', label: 'Attaque' },
  { value: 'Defense', label: 'Défense' },
]
const ZONE_LIMIT = 8

const mapOptions = computed(() => props.maps.map(map => ({ value: map.mapName, label: `${map.mapName} · ${map.gamesPlayed} partie${map.gamesPlayed > 1 ? 's' : ''}` })))
const selectedMap = ref<string | null>(props.maps[0]?.mapName ?? null)
const type = ref<ValHeatmapType | null>(null)
const side = ref<ValSide | null>(null)

/** One answer per type asked; a type not asked stays `null`. */
const layers = ref<{ kills: ValHeatmapDto | null, deaths: ValHeatmapDto | null } | null>(null)
/** The map's own fields (name, transform), the same in both answers. */
const heatmap = computed(() => layers.value?.kills ?? layers.value?.deaths ?? null)
const status = ref<'idle' | 'loading' | 'success' | 'unavailable' | 'error'>('idle')
let request: AbortController | null = null

async function load() {
  request?.abort()
  const map = selectedMap.value
  if (!map) {
    layers.value = null
    status.value = 'success'
    return
  }
  const controller = new AbortController()
  request = controller
  status.value = 'loading'
  const read = (kind: ValHeatmapType) => client.getValPlayerHeatmap(props.playerId, {
    map,
    type: kind,
    side: side.value ?? undefined,
    period: props.period,
    queues: props.queues,
  }, controller.signal)
  try {
    const [kills, deaths] = await Promise.all([
      type.value === 'Deaths' ? null : read('Kills'),
      type.value === 'Kills' ? null : read('Deaths'),
    ])
    layers.value = { kills, deaths }
    status.value = 'success'
  } catch (e) {
    if (isAbortError(e)) return
    layers.value = null
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

const SIDE_NAMES: Record<string, string> = { Attack: 'attaque', Defense: 'défense' }

type MarkKind = 'kill' | 'death'

/** Every point that can be drawn, kills and deaths together: projected by the API, on the image. */
const marks = computed(() => {
  const sources: [MarkKind, ValHeatmapDto | null | undefined][] = [['kill', layers.value?.kills], ['death', layers.value?.deaths]]
  return sources.flatMap(([kind, layer]) => (layer?.points ?? []).flatMap((point, index) => {
    if (point.minimapX === null || point.minimapY === null) return []
    if (point.minimapX < -0.02 || point.minimapX > 1.02 || point.minimapY < -0.02 || point.minimapY > 1.02) return []
    const details = [
      point.zone,
      point.side ? SIDE_NAMES[point.side] : null,
      point.weaponName,
      point.distanceMeters !== null ? `${Math.round(point.distanceMeters)} m` : null,
    ].filter(Boolean)
    return [{
      key: `${kind}-${point.matchId}-${point.roundNumber}-${index}`,
      kind,
      x: point.minimapX * 100,
      y: point.minimapY * 100,
      zone: point.zone,
      title: `${kind === 'kill' ? 'Kill' : 'Mort'} · manche ${point.roundNumber + 1} · ${details.join(' · ')}`,
    }]
  }))
})

// --- Zones: the list isolates its marks on the map ---
const hoveredZone = ref<string | null>(null)
const pickedZone = ref<string | null>(null)
const activeZone = computed(() => hoveredZone.value ?? pickedZone.value)
watch(layers, () => {
  hoveredZone.value = null
  pickedZone.value = null
})
const toggleZone = (zone: string) => { pickedZone.value = pickedZone.value === zone ? null : zone }

/** Deaths under kills, and the active zone's marks last so they sit on top of the dimmed rest. */
const drawnMarks = computed(() => {
  const zone = activeZone.value
  const state = (mark: { zone: string | null }): 'normal' | 'active' | 'dimmed' => (!zone ? 'normal' : mark.zone === zone ? 'active' : 'dimmed')
  const order = { dimmed: 0, normal: 1, active: 2 } as const
  return marks.value
    .map(mark => ({ ...mark, state: state(mark) }))
    .sort((a, b) => order[a.state] - order[b.state] || (a.kind === b.kind ? 0 : a.kind === 'death' ? -1 : 1))
})

/** Smaller marks on a crowded map. */
const markSize = computed(() => (marks.value.length > 80 ? 0.6 : 0.75))
/** A ✕ of half-size `r` at a point of the 0–100 box. */
const cross = (x: number, y: number, r: number) => `M${x - r},${y - r} L${x + r},${y + r} M${x + r},${y - r} L${x - r},${y + r}`

const killCount = computed(() => layers.value?.kills?.points.length ?? 0)
const deathCount = computed(() => layers.value?.deaths?.points.length ?? 0)
const pointCount = computed(() => killCount.value + deathCount.value)
const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`
const showKills = computed(() => type.value !== 'Deaths')
const showDeaths = computed(() => type.value !== 'Kills')

/** Kills and deaths per zone, busiest first; the bar splits each zone's marks into kills and deaths. */
const zones = computed(() => {
  const merged = new Map<string, { kills: number, deaths: number }>()
  for (const zone of layers.value?.kills?.zones ?? []) merged.set(zone.zone, { kills: zone.count, deaths: 0 })
  for (const zone of layers.value?.deaths?.zones ?? []) {
    const entry = merged.get(zone.zone) ?? { kills: 0, deaths: 0 }
    merged.set(zone.zone, { ...entry, deaths: zone.count })
  }
  const rows = [...merged].map(([zone, counts]) => ({ zone, ...counts, total: counts.kills + counts.deaths }))
    .sort((a, b) => b.total - a.total)
    .slice(0, ZONE_LIMIT)
  const top = Math.max(1, ...rows.map(row => row.total))
  const WIDTH = 12
  return rows.map((row) => {
    const length = Math.max(1, Math.round((row.total / top) * WIDTH))
    const killCells = Math.round((row.kills / Math.max(1, row.total)) * length)
    return {
      ...row,
      pressed: pickedZone.value === row.zone,
      active: activeZone.value === row.zone,
      killBar: '█'.repeat(killCells),
      deathBar: '█'.repeat(length - killCells),
      restBar: '░'.repeat(WIDTH - length),
      label: [showKills.value ? plural(row.kills, 'kill') : null, showDeaths.value ? plural(row.deaths, 'mort') : null].filter(Boolean).join(', '),
    }
  })
})

/** What was asked, for sentences: "aucun kill ni mort". */
const nothingPhrase = computed(() => (type.value === 'Kills' ? 'Aucun kill positionné' : type.value === 'Deaths' ? 'Aucune mort positionnée' : 'Aucun kill ni mort positionné'))

/** Why nothing is drawn, when nothing is. */
const emptyReason = computed(() => {
  if (props.maps.length === 0) return `Aucune carte jouée ${props.periodPhrase} : rien à placer sur une minimap.`
  if (status.value === 'unavailable') return 'Heatmap indisponible : l\'API ne fournit pas encore les positions des kills.'
  if (status.value === 'error') return 'La heatmap n\'a pas pu être chargée. Réessayez dans un instant.'
  if (status.value !== 'success' || !heatmap.value) return null
  if (!heatmap.value.mapTransform) return `Pas de minimap pour ${heatmap.value.mapName || selectedMap.value} : les positions ne peuvent pas y être placées.`
  if (pointCount.value === 0) {
    return `${nothingPhrase.value} sur ${selectedMap.value} ${props.periodPhrase}. Les parties importées avant l'enregistrement des positions n'en ont pas.`
  }
  if (marks.value.length === 0) return 'Les positions de ces parties ne peuvent pas être placées sur la minimap.'
  return null
})

const summary = computed(() => {
  const counts = [showKills.value ? plural(killCount.value, 'kill') : null, showDeaths.value ? plural(deathCount.value, 'mort') : null].filter(Boolean).join(' et ')
  const sideText = side.value === 'Attack' ? ' en attaque' : side.value === 'Defense' ? ' en défense' : ''
  return `${counts}${sideText} sur ${selectedMap.value ?? ''} ${props.periodPhrase}, ${plural(marks.value.length, 'point')} placés. Détail par zone ci-contre.`
})
</script>

<template>
  <div class="border border-border-base bg-surface-base p-4 md:p-5">
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <label v-if="mapOptions.length" class="relative inline-flex h-9 items-center border border-border-base bg-surface-base font-mono text-xs font-medium uppercase tracking-[0.06em] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-red">
        <span class="pl-3 text-text-ter">Carte</span>
        <!-- A select, not a segmented switch: a player who rotates the pool has a dozen maps. -->
        <select v-model="selectedMap" class="h-full cursor-pointer appearance-none bg-transparent pl-2 pr-8 uppercase text-text-main outline-none">
          <option v-for="option in mapOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <Icon name="lucide:chevron-down" aria-hidden="true" class="pointer-events-none absolute right-2.5 size-3.5 text-text-ter" />
      </label>
      <SegmentSwitch v-model="type" :options="TYPE_OPTIONS" label="Kills ou morts" />
      <SegmentSwitch v-model="side" :options="SIDE_OPTIONS" label="Côté" />
    </div>
    <p class="mb-4 font-mono text-[11px] text-text-ter">
      // Kill : où il se tenait en tirant · mort : où il est tombé<template v-if="agent"> · tous agents (la heatmap ne filtre pas par agent)</template>
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

    <div v-else-if="heatmap" class="grid items-start gap-5 transition-opacity duration-200 md:grid-cols-[minmax(0,1fr)_280px]" :class="status === 'loading' ? 'opacity-60' : ''" :aria-busy="status === 'loading'">
      <figure class="min-w-0">
        <figcaption class="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-text-sec">
          <span v-if="showKills"><span aria-hidden="true" class="text-ally">●</span> <b class="font-medium text-text-main">{{ plural(killCount, 'kill') }}</b></span>
          <span v-if="showDeaths"><span aria-hidden="true" class="text-enemy">✕</span> <b class="font-medium text-text-main">{{ plural(deathCount, 'mort') }}</b></span>
          <span v-if="marks.length < pointCount" class="text-text-ter">{{ marks.length }} placé{{ marks.length > 1 ? 's' : '' }} sur la carte</span>
        </figcaption>
        <div class="relative mx-auto aspect-square w-full max-w-[640px] border border-border-base bg-night">
          <img v-if="imageUrl" :src="imageUrl" alt="" width="1024" height="1024" loading="lazy" class="absolute inset-0 size-full object-contain opacity-70">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="img"
            :aria-label="summary"
            data-testid="heatmap-points"
            class="absolute inset-0 size-full"
          >
            <template v-for="mark in drawnMarks" :key="mark.key">
              <circle
                v-if="mark.kind === 'kill'"
                :cx="mark.x"
                :cy="mark.y"
                :r="mark.state === 'active' ? 1.1 : markSize"
                class="fill-ally stroke-night"
                :fill-opacity="mark.state === 'dimmed' ? 0.15 : 0.95"
                :stroke-opacity="mark.state === 'dimmed' ? 0 : 1"
                stroke-width="0.3"
              >
                <title>{{ mark.title }}</title>
              </circle>
              <g v-else :opacity="mark.state === 'dimmed' ? 0.15 : 1" data-kind="death">
                <title>{{ mark.title }}</title>
                <!-- A dark outline under the cross keeps it legible over the map's light corridors. -->
                <path v-if="mark.state !== 'dimmed'" :d="cross(mark.x, mark.y, mark.state === 'active' ? 1.2 : markSize)" class="stroke-night" stroke-width="0.9" />
                <path :d="cross(mark.x, mark.y, mark.state === 'active' ? 1.2 : markSize)" class="stroke-enemy" stroke-width="0.45" />
              </g>
            </template>
          </svg>
        </div>
      </figure>

      <section class="min-w-0" aria-labelledby="heatmap-zones-title">
        <p id="heatmap-zones-title" class="mb-2 flex items-baseline justify-between gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-text-main">
          Zones <span class="normal-case tracking-normal text-text-ter">survolez pour isoler</span>
        </p>
        <ol v-if="zones.length" class="flex flex-col" data-testid="heatmap-zones" @mouseleave="hoveredZone = null">
          <li v-for="zone in zones" :key="zone.zone" class="border-t border-border-base first:border-t-0">
            <button
              type="button"
              :aria-pressed="zone.pressed"
              :aria-label="`${zone.zone} : ${zone.label}`"
              class="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-l-2 py-1.5 pl-2 pr-1 text-left transition-colors duration-150 ease-snap focus-visible:outline-offset-[-2px]"
              :class="zone.active ? 'border-l-text-main bg-surface-high' : 'border-l-transparent hover:bg-surface-hover'"
              @mouseenter="hoveredZone = zone.zone"
              @focus="hoveredZone = zone.zone"
              @blur="hoveredZone = null"
              @click="toggleZone(zone.zone)"
            >
              <span class="truncate text-sm font-semibold">{{ zone.zone }}</span>
              <span class="font-mono text-xs text-text-sec" aria-hidden="true">
                <template v-if="showKills"><b class="font-medium text-ally">{{ zone.kills }}</b> K</template>
                <template v-if="showKills && showDeaths"> · </template>
                <template v-if="showDeaths"><b class="font-medium text-enemy">{{ zone.deaths }}</b> M</template>
              </span>
              <span class="ascii col-span-2 text-[11px]" aria-hidden="true"><span class="text-ally">{{ zone.killBar }}</span><span class="text-enemy">{{ zone.deathBar }}</span><span class="text-border-ascii">{{ zone.restBar }}</span></span>
            </button>
          </li>
        </ol>
        <p v-else class="font-mono text-xs text-text-ter">Aucune zone nommée pour ces positions.</p>
      </section>
    </div>
  </div>
</template>
