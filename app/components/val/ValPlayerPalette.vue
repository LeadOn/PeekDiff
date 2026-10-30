<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { navigateTo, useRoute } from '#app'
import type { ValPlayerDto } from '~/lib/types'
import { useValStore } from '~/stores/val'
import { useAuthStore } from '~/stores/auth'
import { usePlayerStore } from '~/stores/player'
import { useSearchPalette } from '~/composables/useSearchPalette'
import { isAbortError } from '~/lib/types/error'
import { buildLadder } from '~/utils/val-ladder'
import type { LadderEntry } from '~/utils/val-ladder'
import { filterPlayersByName, normalizeSearchText } from '~/utils/val-search'
import ValPlayerCard from '~/components/val/ValPlayerCard.vue'
import ValRankEmblem from '~/components/val/ValRankEmblem.vue'

/**
 * The crew search ("palette de recherche", design system §7 and ASCII motif 7), opened from the
 * header, the mobile bar, ⌘K / Ctrl K or "/". Candidates are matched locally against the crew list
 * (`useValStore().players`, smurfs included), loaded on first opening when the page did not need it.
 */

type PaletteItem =
  | { kind: 'player', key: string, href: string, entry: LadderEntry }
  | { kind: 'action', key: string, href: string, label: string }

const { isOpen, open, close, toggle } = useSearchPalette()
const store = useValStore()
const authStore = useAuthStore()
const playerStore = usePlayerStore()
const route = useRoute()

const query = ref('')
const activeIndex = ref(0)
const input = ref<HTMLInputElement | null>(null)
const isLoading = ref(false)
const loadFailed = ref(false)
let loadRequest: AbortController | null = null
/** The element that had focus before opening, given it back on close. */
let returnFocus: HTMLElement | null = null

/** Ladder order — best rank first, then the unranked — with each entry's card, tier and smurf flag. */
const ordered = computed(() => {
  const ladder = buildLadder(store.players, true)
  const entries = new Map([...ladder.ranked, ...ladder.unranked].map(entry => [entry.id, entry]))
  const byId = new Map(store.players.map(player => [player.id, player]))
  return [...entries.keys()].flatMap((id) => {
    const player = byId.get(id)
    const entry = entries.get(id)
    return player && entry ? [{ player, entry }] : []
  })
})

const matchingEntries = computed(() => {
  const players: ValPlayerDto[] = ordered.value.map(item => item.player)
  const entryOf = new Map(ordered.value.map(item => [item.player.id, item.entry]))
  return filterPlayersByName(players, query.value).flatMap((player) => {
    const entry = entryOf.get(player.id)
    return entry ? [entry] : []
  })
})

const matchingActions = computed(() => {
  const actions: { key: string, label: string, href: string }[] = [
    { key: 'crew', label: 'Classement du crew', href: '/' },
    { key: 'records', label: 'Records du crew', href: '/stats' },
  ]
  if (playerStore.hasProfile) actions.push({ key: 'me', label: 'Mon profil', href: playerStore.profilePath })
  if (authStore.isAuthenticated) actions.push({ key: 'settings', label: 'Paramètres du compte', href: '/settings' })
  if (authStore.isAdmin) actions.push({ key: 'admin', label: 'Administration', href: '/admin' })
  const needle = normalizeSearchText(query.value)
  return needle ? actions.filter(action => normalizeSearchText(action.label).includes(needle)) : actions
})

const items = computed<PaletteItem[]>(() => [
  ...matchingEntries.value.map(entry => ({ kind: 'player' as const, key: `player-${entry.id}`, href: `/player/${entry.id}`, entry })),
  ...matchingActions.value.map(action => ({ kind: 'action' as const, ...action })),
])

const playerItems = computed(() => items.value.filter((item): item is Extract<PaletteItem, { kind: 'player' }> => item.kind === 'player'))
const actionItems = computed(() => items.value.filter((item): item is Extract<PaletteItem, { kind: 'action' }> => item.kind === 'action'))

const countLabel = computed(() => {
  const count = playerItems.value.length
  return `${count} joueur${count > 1 ? 's' : ''}`
})

const optionId = (index: number) => `search-palette-option-${index}`
const isMe = (entry: LadderEntry) => playerStore.currentPlayer?.id === entry.id

/**
 * Reuses whatever list the store holds: opened on the home page with "Sans Valorant" on, the palette
 * finds the same players the ladder shows. Otherwise, members with Valorant data only.
 */
const loadPlayers = async () => {
  if (store.players.length > 0) return
  loadRequest?.abort()
  loadRequest = new AbortController()
  isLoading.value = true
  loadFailed.value = false
  try {
    await store.fetchPlayers(false, loadRequest.signal)
  } catch (error) {
    if (!isAbortError(error)) {
      console.error('[palette] Liste du crew indisponible :', error)
      loadFailed.value = true
    }
  } finally {
    isLoading.value = false
  }
}

watch(isOpen, async (opened) => {
  if (!import.meta.client) return
  document.body.style.overflow = opened ? 'hidden' : ''
  if (!opened) {
    loadRequest?.abort()
    returnFocus?.focus()
    returnFocus = null
    return
  }
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  query.value = ''
  activeIndex.value = 0
  await nextTick()
  input.value?.focus()
  loadPlayers()
})

watch(query, () => { activeIndex.value = 0 })

// Any navigation — a picked result, or the browser's back button — dismisses the palette.
watch(() => route.fullPath, () => close())

const moveActive = (step: number) => {
  const count = items.value.length
  activeIndex.value = count ? (activeIndex.value + step + count) % count : 0
}

const runActive = async () => {
  const item = items.value[activeIndex.value]
  if (!item) return
  close()
  await navigateTo(item.href)
}

const onInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1) }
  else if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1) }
  else if (event.key === 'Enter') { event.preventDefault(); runActive() }
  // A combobox keeps the focus in its input: options are reached with the arrows, so Tab must not
  // walk out of the modal into the page underneath.
  else if (event.key === 'Tab') event.preventDefault()
}

const isTyping = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

const onGlobalKeydown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    toggle()
    return
  }
  if (!isOpen.value && event.key === '/' && !isTyping(event.target)) {
    event.preventDefault()
    open()
    return
  }
  if (isOpen.value && event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  loadRequest?.abort()
  document.body.style.overflow = ''
})
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[100] grid items-start justify-items-center bg-night/70 px-4 pb-4 pt-[calc(12vh+env(safe-area-inset-top,0px))]"
    @click.self="close()"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chercher un joueur du crew"
      class="w-full max-w-[480px] animate-enter overflow-hidden border border-border-strong bg-surface-base shadow-float"
    >
      <div class="flex h-14 items-center gap-2.5 border-b border-border-base bg-surface-sunken px-4">
        <span aria-hidden="true" class="ascii text-sm text-text-ter">&gt;_</span>
        <input
          ref="input"
          v-model="query"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="search-palette-list"
          aria-autocomplete="list"
          :aria-activedescendant="items.length ? optionId(activeIndex) : undefined"
          aria-label="Pseudo ou Riot ID"
          placeholder="chercher un joueur"
          autocomplete="off"
          spellcheck="false"
          class="h-full min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-[15px] text-text-main caret-brand-red outline-none placeholder:text-text-ter focus-visible:outline-none"
          @keydown="onInputKeydown"
        >
        <button
          type="button"
          class="inline-flex h-7 shrink-0 cursor-pointer items-center border border-border-base px-1.5 font-mono text-[11px] uppercase text-text-sec transition-colors hover:text-text-main"
          @click="close()"
        >Échap</button>
      </div>

      <div id="search-palette-list" role="listbox" aria-label="Joueurs trouvés" class="max-h-[min(360px,62vh)] overflow-y-auto p-1.5">
        <NuxtLink
          v-for="(item, index) in playerItems"
          :id="optionId(index)"
          :key="item.key"
          :to="item.href"
          role="option"
          :aria-selected="activeIndex === index"
          class="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-l-2 px-2.5 py-2"
          :class="activeIndex === index ? 'border-l-brand-red bg-surface-hover' : 'border-l-transparent'"
          @mousemove="activeIndex = index"
          @click="close()"
        >
          <ValPlayerCard :src="item.entry.cardSmall" :name="item.entry.name" class="size-8" />
          <span class="min-w-0">
            <span class="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
              <b class="truncate text-sm font-semibold">{{ item.entry.name }}</b>
              <span v-if="isMe(item.entry)" class="shrink-0 bg-brand-red-fill px-1.5 font-mono text-[10px] font-bold uppercase text-white">Vous</span>
              <span v-if="item.entry.smurf" class="shrink-0 border border-border-strong px-1 font-mono text-[10px] uppercase">Smurf</span>
            </span>
            <span v-if="item.entry.tag" class="block font-mono text-[11px] text-text-ter">{{ item.entry.tag }}</span>
          </span>
          <span class="flex items-center gap-1.5 font-mono text-[11px] text-text-sec">
            <span class="hidden sm:inline">{{ item.entry.tierLabel }}</span>
            <ValRankEmblem :tier-id="item.entry.rank?.tierId ?? 0" :src="item.entry.emblemUrl" :alt="item.entry.tierLabel" class="size-6" :class="item.entry.rank ? '' : 'opacity-40'" />
          </span>
        </NuxtLink>

        <p v-if="isLoading && playerItems.length === 0" class="px-2.5 py-3.5 font-mono text-xs text-text-ter">Chargement du crew…</p>
        <p v-else-if="loadFailed" class="px-2.5 py-3.5 font-mono text-xs text-text-sec">Impossible de charger la liste du crew.</p>
        <p v-else-if="playerItems.length === 0" class="px-2.5 py-3.5 font-mono text-xs text-text-ter">Personne dans le crew ne porte ce nom.</p>

        <div v-if="actionItems.length > 0" class="mx-2 my-1.5 border-t border-dashed border-border-strong" />
        <NuxtLink
          v-for="(item, offset) in actionItems"
          :id="optionId(playerItems.length + offset)"
          :key="item.key"
          :to="item.href"
          role="option"
          :aria-selected="activeIndex === playerItems.length + offset"
          class="flex items-center gap-2 border-l-2 px-2.5 py-2 font-mono text-xs uppercase tracking-[0.06em]"
          :class="activeIndex === playerItems.length + offset ? 'border-l-brand-red bg-surface-hover text-text-main' : 'border-l-transparent text-text-sec'"
          @mousemove="activeIndex = playerItems.length + offset"
          @click="close()"
        >
          <span aria-hidden="true" class="text-text-ter">▸</span>{{ item.label }}
        </NuxtLink>
      </div>

      <div class="flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-border-base px-4 py-2 font-mono text-[11px] text-text-ter">
        <span>↑↓ naviguer</span><span>↵ ouvrir</span><span>Échap fermer</span>
        <span class="ml-auto text-text-sec">{{ countLabel }}</span>
      </div>
    </div>
  </div>
</template>
