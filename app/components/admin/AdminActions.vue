<script setup lang="ts">
import { computed, ref } from 'vue'
import { errorStatusCode, isAbortError } from '~/lib/types/error'
import { useGameOnVal } from '~/composables/useGameOnVal'
import { formatClock } from '~/utils/date'
import { isMatchId } from '~/utils/val-admin'
import FrameHead from '~/components/ui/FrameHead.vue'

/**
 * The admin space's crew-wide actions: re-read every rank from Riot, and import one game from
 * HenrikDev by its id. Both are slow upstream calls; each button stays busy until its answer.
 */
const props = defineProps<{
  /** The admin session's signal: leaving the page cancels whatever is in flight. */
  signal: AbortSignal
}>()

const emit = defineEmits<{
  /** Something the account list shows changed upstream: re-read it. */
  (e: 'changed'): void
}>()

const client = useGameOnVal()

/** HenrikDev regions. Empty lets the API use the stored region, else "eu". */
const REGIONS = [
  { value: '', label: 'Auto' },
  { value: 'eu', label: 'EU' },
  { value: 'na', label: 'NA' },
  { value: 'ap', label: 'AP' },
  { value: 'kr', label: 'KR' },
  { value: 'latam', label: 'LATAM' },
  { value: 'br', label: 'BR' },
]

// --- Every rank ---
const ranksBusy = ref(false)
const ranksResult = ref<{ tone: 'success' | 'error', text: string } | null>(null)

async function refreshRanks() {
  if (ranksBusy.value) return
  ranksBusy.value = true
  ranksResult.value = null
  try {
    await client.refreshAllValRanks(props.signal)
    ranksResult.value = { tone: 'success', text: `Rangs rafraîchis à ${formatClock(Date.now())}.` }
    emit('changed')
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[admin] Rank refresh failed:', e)
    ranksResult.value = { tone: 'error', text: 'Le rafraîchissement des rangs a échoué. Réessayez dans un instant.' }
  } finally {
    ranksBusy.value = false
  }
}

// --- One game ---
const matchInput = ref('')
const region = ref('')
const importBusy = ref(false)
const importResult = ref<{ tone: 'success' | 'error', text: string, href?: string } | null>(null)

const matchId = computed(() => matchInput.value.trim().toLowerCase())
const canImport = computed(() => isMatchId(matchId.value) && !importBusy.value)

async function importMatch() {
  if (!canImport.value) return
  importBusy.value = true
  importResult.value = null
  const id = matchId.value
  try {
    const game = await client.importValMatch(id, region.value || undefined, props.signal)
    importResult.value = {
      tone: 'success',
      text: `Partie importée${game.mapName ? ` : ${game.mapName}` : ''}.`,
      href: `/match/${id}`,
    }
    matchInput.value = ''
    emit('changed')
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[admin] Match import failed:', e)
    importResult.value = {
      tone: 'error',
      text: errorStatusCode(e) === 404
        ? 'HenrikDev ne connaît pas cette partie dans cette région.'
        : 'L\'import a échoué. Réessayez dans un instant.',
    }
  } finally {
    importBusy.value = false
  }
}
</script>

<template>
  <div class="grid items-start gap-4 md:grid-cols-2">
    <section class="min-w-0 border border-border-base bg-surface-base p-5">
      <FrameHead title="Rangs du crew" aside="PATCH /val/player/ranks" />
      <p class="text-pretty text-sm text-text-sec">
        Relit le profil et le rang de chaque membre du crew depuis Riot, comme la tâche planifiée de l'API.
        Compte une minute pour tout le crew.
      </p>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          :disabled="ranksBusy"
          :aria-busy="ranksBusy"
          class="admin-button"
          @click="refreshRanks"
        >
          <template v-if="ranksBusy"><span aria-hidden="true" class="ascii">[■■■□□]</span> Synchro…</template>
          <template v-else><span aria-hidden="true" class="text-text-ter">[</span>Rafraîchir tous les rangs<span aria-hidden="true" class="text-text-ter">]</span></template>
        </button>
        <p v-if="ranksResult" role="status" class="font-mono text-xs" :class="ranksResult.tone === 'success' ? 'text-win' : 'text-brand-red'">
          {{ ranksResult.text }}
        </p>
      </div>
    </section>

    <section class="min-w-0 border border-border-base bg-surface-base p-5">
      <FrameHead title="Importer une partie" aside="HenrikDev" />
      <form class="flex flex-col gap-3" novalidate @submit.prevent="importMatch">
        <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
          <label class="field">
            <span class="field-label">Identifiant de la partie</span>
            <input
              v-model="matchInput"
              type="text"
              inputmode="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="089e84c4-bb73-4207-91d5-8aa057ac010b"
              :aria-invalid="matchInput.trim() !== '' && !isMatchId(matchId)"
              class="field-input font-mono"
            >
          </label>
          <label class="field">
            <span class="field-label">Région</span>
            <select v-model="region" class="field-input font-mono uppercase">
              <option v-for="option in REGIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
        </div>
        <p v-if="matchInput.trim() !== '' && !isMatchId(matchId)" class="font-mono text-xs text-text-sec">
          Un identifiant de partie Riot est un uuid (8-4-4-4-12 caractères hexadécimaux).
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <button type="submit" :disabled="!canImport" :aria-busy="importBusy" class="admin-button">
            <template v-if="importBusy"><span aria-hidden="true" class="ascii">[■■■□□]</span> Import…</template>
            <template v-else><span aria-hidden="true" class="text-text-ter">[</span>Importer<span aria-hidden="true" class="text-text-ter">]</span></template>
          </button>
          <p v-if="importResult" role="status" class="flex flex-wrap items-center gap-2 font-mono text-xs" :class="importResult.tone === 'success' ? 'text-win' : 'text-brand-red'">
            {{ importResult.text }}
            <NuxtLink v-if="importResult.href" :to="importResult.href" class="uppercase tracking-[0.06em] text-text-main hover:text-brand-red">
              <span aria-hidden="true" class="text-text-ter">[</span>Ouvrir<span aria-hidden="true" class="text-text-ter">]</span>
            </NuxtLink>
          </p>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.field {
  @apply flex min-w-0 flex-col gap-2;
}

.field-label {
  @apply font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-text-ter;
}

.field-input {
  @apply h-11 w-full min-w-0 border border-border-base bg-surface-sunken px-3 text-sm text-text-main transition-colors duration-150 ease-snap placeholder:text-text-ter hover:border-border-strong focus:border-brand-red focus:outline-none focus-visible:outline-none;
}

.admin-button {
  @apply inline-flex h-11 cursor-pointer items-center gap-2 border border-border-strong px-4 font-mono text-[13px] font-medium uppercase tracking-[0.06em] transition-colors duration-150 ease-snap hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40;
}
</style>
