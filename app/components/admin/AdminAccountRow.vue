<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { isAbortError } from '~/lib/types/error'
import { useGameOnVal } from '~/composables/useGameOnVal'
import type { AdminAccountRow } from '~/utils/val-admin'
import { timeAgo } from '~/utils/date'
import { isRankedTier, tierInfo } from '~/utils/val-tier'
import ValPlayerCard from '~/components/val/ValPlayerCard.vue'
import ValRankEmblem from '~/components/val/ValRankEmblem.vue'

/**
 * One account of the admin space: who it is, its Riot ID and status, its rank and last sync, and the
 * two actions the Valorant API offers on it — a Riot re-sync and a new Riot ID (`gameon_admin`), both
 * calling the API from here and telling the page once something changed.
 */
const props = defineProps<{
  row: AdminAccountRow
  /** The clock for "il y a…", 0 before mount. */
  now: number
  signal: AbortSignal
}>()

const emit = defineEmits<{
  /** The account changed upstream: re-read the list. `message` is said once, in the page's live region. */
  (e: 'changed', message: string): void
}>()

const client = useGameOnVal()

const STATUS_LABELS = { crew: 'Crew', out: 'Hors crew', archived: 'Archivé' } as const

const rank = computed(() => {
  const current = props.row.val?.valorantCurrentRank
  return current && isRankedTier(current.tierId) ? { tierId: current.tierId, label: tierInfo(current.tierId).label, iconUrl: current.smallIconUrl } : null
})
const synced = computed(() => (props.row.refreshedOn && props.now ? `Synchro ${timeAgo(props.row.refreshedOn, props.now)}` : null))

const busy = ref<'sync' | 'save' | null>(null)
const error = ref<string | null>(null)

/** Re-reads the account from Riot: profile, rank and its last 10 games. */
async function sync() {
  if (busy.value || !props.row.riotId) return
  busy.value = 'sync'
  error.value = null
  try {
    await client.refreshValPlayer(props.row.id, props.signal)
    emit('changed', `${props.row.nickname} synchronisé depuis Riot.`)
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[admin] Account sync failed:', e)
    error.value = 'La synchronisation a échoué : Riot ne retrouve peut-être pas ce Riot ID.'
  } finally {
    busy.value = null
  }
}

// --- Riot ID ---
const editing = ref(false)
const gameName = ref('')
const tagLine = ref('')
const gameNameInput = ref<HTMLInputElement | null>(null)

const cleanTag = computed(() => tagLine.value.trim().replace(/^#/, ''))
const canSave = computed(() => !busy.value && gameName.value.trim() !== '' && cleanTag.value !== ''
  && (gameName.value.trim() !== props.row.riotGamesNickname || cleanTag.value !== props.row.riotGamesTagLine))

async function startEditing() {
  gameName.value = props.row.riotGamesNickname ?? ''
  tagLine.value = props.row.riotGamesTagLine ?? ''
  error.value = null
  editing.value = true
  await nextTick()
  gameNameInput.value?.focus()
}

async function saveRiotId() {
  if (!canSave.value) return
  busy.value = 'save'
  error.value = null
  const name = gameName.value.trim()
  const tag = cleanTag.value
  try {
    const updated = await client.updateValRiotId(props.row.id, name, tag, props.signal)
    // The API answers 200 with the account unchanged when another account already holds that Riot ID.
    const applied = updated.riotGamesNickname?.toLowerCase() === name.toLowerCase()
      && updated.riotGamesTagLine?.toLowerCase() === tag.toLowerCase()
    if (!applied) {
      error.value = `${name}#${tag} appartient déjà à un autre compte.`
      return
    }
    editing.value = false
    emit('changed', `Riot ID de ${props.row.nickname} : ${name}#${tag}.`)
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[admin] Riot ID update failed:', e)
    error.value = 'Le Riot ID n\'a pas pu être enregistré.'
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <li class="border-t border-border-base first:border-t-0" :class="row.status === 'archived' ? 'opacity-70' : ''">
    <div class="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 py-3 md:grid-cols-[32px_minmax(0,1fr)_160px_auto]">
      <ValPlayerCard :src="row.val?.valorantPlayerCardSmallUrl" :name="row.nickname" class="size-8" />

      <div class="min-w-0">
        <p class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span class="truncate text-sm font-semibold">{{ row.nickname }}</span>
          <span v-if="row.fullName" class="truncate text-xs text-text-ter">{{ row.fullName }}</span>
          <span v-if="row.status !== 'crew'" class="badge">{{ STATUS_LABELS[row.status] }}</span>
          <span v-if="row.smurfOf" class="badge">Smurf de {{ row.smurfOf }}</span>
        </p>
        <p class="mt-0.5 truncate font-mono text-xs">
          <span v-if="row.riotId" class="text-text-sec">{{ row.riotId }}</span>
          <span v-else class="text-brand-red">// sans Riot ID</span>
          <span class="text-text-ter"> · #{{ row.id }}</span>
        </p>
      </div>

      <div class="col-start-2 flex min-w-0 flex-wrap items-center gap-x-2 font-mono text-[11px] text-text-sec md:col-start-auto md:flex-col md:items-start">
        <span class="flex min-w-0 items-center gap-2">
          <template v-if="rank">
            <ValRankEmblem :tier-id="rank.tierId" :src="rank.iconUrl" :alt="''" class="size-5 shrink-0" />
            <span class="truncate">{{ rank.label }}</span>
          </template>
          <span v-else class="text-text-ter">Non classé</span>
        </span>
        <span v-if="synced" class="truncate text-text-ter">{{ synced }}</span>
      </div>

      <div class="col-start-2 flex flex-wrap items-center gap-1 md:col-start-auto md:w-[336px] md:flex-nowrap md:justify-end">
        <button
          type="button"
          :disabled="!!busy || !row.riotId"
          :aria-busy="busy === 'sync'"
          :title="row.riotId ? 'Relire ce compte depuis Riot' : 'Renseignez d\'abord un Riot ID'"
          class="row-action"
          @click="sync"
        >
          <template v-if="busy === 'sync'"><span aria-hidden="true" class="ascii">[■■□]</span> Synchro…</template>
          <template v-else><span aria-hidden="true" class="text-text-ter">[</span>Synchroniser<span aria-hidden="true" class="text-text-ter">]</span></template>
        </button>
        <button type="button" :disabled="!!busy" :aria-expanded="editing" class="row-action" @click="editing ? (editing = false) : startEditing()">
          <span aria-hidden="true" class="text-text-ter">[</span>Riot ID<span aria-hidden="true" class="text-text-ter">]</span>
        </button>
        <NuxtLink v-if="row.hasProfile" :to="`/player/${row.id}`" :aria-label="`Profil de ${row.nickname}`" class="row-action">
          <span aria-hidden="true" class="text-text-ter">[</span>Profil<span aria-hidden="true" class="text-text-ter">]</span>
        </NuxtLink>
      </div>
    </div>

    <form v-if="editing" class="mb-3 ml-11 flex flex-wrap items-end gap-2 border border-dashed border-border-strong p-3" novalidate @submit.prevent="saveRiotId">
      <label class="flex min-w-0 flex-1 basis-40 flex-col gap-1.5">
        <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">Nom de jeu</span>
        <input ref="gameNameInput" v-model="gameName" type="text" autocomplete="off" spellcheck="false" class="field-input">
      </label>
      <label class="flex w-28 flex-col gap-1.5">
        <span class="font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter">Tag</span>
        <input v-model="tagLine" type="text" autocomplete="off" spellcheck="false" class="field-input font-mono uppercase">
      </label>
      <button type="submit" :disabled="!canSave" :aria-busy="busy === 'save'" class="row-action h-10 border border-border-strong">
        <template v-if="busy === 'save'"><span aria-hidden="true" class="ascii">[■■□]</span> Enregistrement…</template>
        <template v-else><span aria-hidden="true" class="text-text-ter">[</span>Enregistrer<span aria-hidden="true" class="text-text-ter">]</span></template>
      </button>
      <button type="button" class="row-action h-10" @click="editing = false">
        <span aria-hidden="true" class="text-text-ter">[</span>Annuler<span aria-hidden="true" class="text-text-ter">]</span>
      </button>
      <p class="basis-full text-pretty text-xs text-text-sec">
        Le compte est ensuite resynchronisé depuis Riot : rang, carte et 10 dernières parties.
      </p>
    </form>

    <p v-if="error" role="alert" class="mb-3 ml-11 font-mono text-xs text-brand-red">{{ error }}</p>
  </li>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.badge {
  @apply border border-border-strong px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.06em] text-text-sec;
}

.row-action {
  @apply inline-flex h-8 cursor-pointer items-center gap-1 px-2 font-mono text-xs font-medium uppercase tracking-[0.06em] text-text-sec transition-colors duration-150 ease-snap hover:text-text-main disabled:cursor-not-allowed disabled:opacity-40;
}

.field-input {
  @apply h-10 w-full min-w-0 border border-border-base bg-surface-sunken px-3 text-sm text-text-main transition-colors duration-150 ease-snap hover:border-border-strong focus:border-brand-red focus:outline-none focus-visible:outline-none;
}
</style>
