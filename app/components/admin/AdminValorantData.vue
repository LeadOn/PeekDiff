<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ValBackgroundQueueStatusDto } from '~/lib/types'
import { errorStatusCode, isAbortError } from '~/lib/types/error'
import { useGameOnVal } from '~/composables/useGameOnVal'
import { useNow } from '~/composables/useNow'
import { useValAdminQueue } from '~/composables/useValAdminQueue'
import { formatClock, timeAgo } from '~/utils/date'
import { dataMaintenanceErrorMessage, dayToIso, describeTask, isQueueActive } from '~/utils/val-admin'
import FrameHead from '~/components/ui/FrameHead.vue'

/**
 * "Données Valorant": the API's maintenance of stored Valorant data (`gameon_admin`). Backfill,
 * reimport and extras are queued upstream and answer at once with the queue, shown below and re-read
 * every 5 seconds while something runs or waits; the stats recomputation runs inline. The crew-wide
 * runs that cost the most (backfill of everyone, reimport, recomputation) take a second click.
 */
const props = defineProps<{
  signal: AbortSignal
  /** Account names by id, to say whom a queued task is for. */
  names: Record<number, string>
}>()

const emit = defineEmits<{
  /** Stored data changed upstream: the account list may show new figures. */
  (e: 'changed'): void
}>()

const client = useGameOnVal()
const queue = useValAdminQueue()
const now = useNow(5_000)

const POLL_MS = 5_000

// --- Actions ---
type Action = 'backfill' | 'reimport' | 'extras' | 'recompute'
const busy = ref<Action | null>(null)
const result = ref<{ tone: 'success' | 'error', text: string } | null>(null)
const sinceDay = ref('')
const since = computed(() => dayToIso(sinceDay.value))
const sinceLabel = computed(() => (since.value ? ` depuis le ${new Date(since.value).toLocaleDateString('fr-FR')}` : ''))

// A second click confirms the costly runs, as everywhere else in the admin space.
const armed = ref<Action | null>(null)
let armTimer: ReturnType<typeof setTimeout> | undefined
function confirmThen(action: Action, act: () => void) {
  if (armed.value === action) {
    armed.value = null
    clearTimeout(armTimer)
    act()
    return
  }
  armed.value = action
  clearTimeout(armTimer)
  armTimer = setTimeout(() => { armed.value = null }, 4000)
}
const armedLabel = (action: Action, label: string) => (armed.value === action ? 'Confirmer ?' : label)

async function run(action: Action, write: () => Promise<string>, fallback: string) {
  if (busy.value) return
  busy.value = action
  result.value = null
  try {
    result.value = { tone: 'success', text: await write() }
  } catch (e) {
    if (isAbortError(e)) return
    console.error(`[admin] ${action} failed:`, e)
    result.value = { tone: 'error', text: dataMaintenanceErrorMessage(e, fallback) }
  } finally {
    busy.value = null
  }
}

const queued = (status: ValBackgroundQueueStatusDto, what: string) => {
  queue.apply(status)
  const waiting = status.pending.length
  return `${what} mis en file${waiting ? ` (${waiting} tâche${waiting > 1 ? 's' : ''} en attente)` : ''}.`
}

const backfill = () => confirmThen('backfill', () => run('backfill', async () => queued(await client.queueValBackfill(undefined, props.signal), 'Backfill de tous les comptes'), 'Le backfill n\'a pas pu être lancé.'))

const reimport = () => confirmThen('reimport', () => run('reimport', async () => queued(
  await client.queueValReimport({ since: since.value ?? undefined }, props.signal),
  `Réimport des parties${sinceLabel.value || ' (toutes)'}`,
), 'Le réimport n\'a pas pu être lancé.'))

const extras = () => run('extras', async () => queued(await client.queueValExtras(undefined, props.signal), 'Accolades, maîtrise et Premier de tous les comptes'), 'La mise à jour n\'a pas pu être lancée.')

const recompute = () => confirmThen('recompute', () => run('recompute', async () => {
  const count = await client.recomputeValStats(since.value ?? undefined, props.signal)
  emit('changed')
  return `${count} partie${count > 1 ? 's' : ''} recalculée${count > 1 ? 's' : ''}${sinceLabel.value} à ${formatClock(Date.now())}.`
}, 'Le recalcul a échoué. Il peut dépasser deux minutes sur toute la base : essayez avec une date.'))

// --- Queue ---
const queueState = ref<'idle' | 'loading' | 'ready' | 'unavailable' | 'error'>('idle')
let pollTimer: ReturnType<typeof setTimeout> | undefined
let pollRequest: AbortController | null = null

async function refreshQueue() {
  clearTimeout(pollTimer)
  pollRequest?.abort()
  const controller = new AbortController()
  pollRequest = controller
  const abortWithPage = () => controller.abort()
  props.signal.addEventListener('abort', abortWithPage, { once: true })
  if (queueState.value !== 'ready') queueState.value = 'loading'
  try {
    await queue.refresh(controller.signal)
    queueState.value = 'ready'
  } catch (e) {
    if (isAbortError(e)) return
    if (errorStatusCode(e) === 404) {
      queueState.value = 'unavailable'
      return
    }
    console.error('[admin] Queue unavailable:', e)
    queueState.value = 'error'
  } finally {
    props.signal.removeEventListener('abort', abortWithPage)
    if (pollRequest === controller) pollRequest = null
  }
}

const active = computed(() => isQueueActive(queue.status.value))

/** Poll while the queue has work; stop as soon as it has none. A finished run may have changed figures. */
watch(() => queue.status.value, (next, previous) => {
  clearTimeout(pollTimer)
  if (isQueueActive(next)) pollTimer = setTimeout(refreshQueue, POLL_MS)
  else if (isQueueActive(previous ?? null)) emit('changed')
  if (next && queueState.value !== 'ready') queueState.value = 'ready'
})

onMounted(refreshQueue)
onBeforeUnmount(() => {
  clearTimeout(pollTimer)
  clearTimeout(armTimer)
  pollRequest?.abort()
})

const nameOf = (id: number) => props.names[id] ?? null

const running = computed(() => {
  const status = queue.status.value
  if (!status?.inProgress) return null
  return {
    text: describeTask(status.inProgress, nameOf),
    since: status.inProgressStartedOn,
  }
})
const pending = computed(() => (queue.status.value?.pending ?? []).map((task, index) => ({ key: `${task.enqueuedOn}-${index}`, text: describeTask(task, nameOf) })))
const results = computed(() => (queue.status.value?.recentResults ?? []).slice(0, 8).map((entry, index) => ({
  key: `${entry.finishedOn}-${index}`,
  failed: entry.failed,
  text: describeTask(entry.task, nameOf),
  summary: entry.summary,
  at: formatClock(entry.finishedOn),
})))
</script>

<template>
  <section class="min-w-0 border border-border-base bg-surface-base p-5">
    <FrameHead title="Données Valorant" aside="/val/admin" />
    <p class="text-pretty text-sm text-text-sec">
      Remplit et met à jour les données stockées : l'historique gardé par HenrikDev (une requête par partie, long),
      la réimportation des parties déjà en base pour remplir les nouvelles colonnes, les accolades, la maîtrise et
      Premier (aussi lancés chaque jour par l'API), et le recalcul des statistiques sans appel externe.
    </p>

    <div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div class="flex min-w-0 flex-col gap-3">
        <div class="flex flex-wrap gap-2">
          <button type="button" :disabled="!!busy" :aria-busy="busy === 'backfill'" class="admin-button" @click="backfill">
            <template v-if="busy === 'backfill'"><span aria-hidden="true" class="ascii">[■■■□□]</span> Envoi…</template>
            <template v-else><span aria-hidden="true" class="text-text-ter">[</span>{{ armedLabel('backfill', 'Backfill de l\'historique') }}<span aria-hidden="true" class="text-text-ter">]</span></template>
          </button>
          <button type="button" :disabled="!!busy" :aria-busy="busy === 'extras'" class="admin-button" @click="extras">
            <template v-if="busy === 'extras'"><span aria-hidden="true" class="ascii">[■■■□□]</span> Envoi…</template>
            <template v-else><span aria-hidden="true" class="text-text-ter">[</span>Accolades / maîtrise / Premier<span aria-hidden="true" class="text-text-ter">]</span></template>
          </button>
        </div>

        <div class="flex flex-wrap items-end gap-2 border-t border-dashed border-border-base pt-3">
          <label class="flex w-44 flex-col gap-1.5">
            <span class="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-text-ter">Depuis le (optionnel)</span>
            <input v-model="sinceDay" type="date" class="h-11 w-full border border-border-base bg-surface-sunken px-3 font-mono text-sm text-text-main transition-colors duration-150 ease-snap hover:border-border-strong focus:border-brand-red focus:outline-none">
          </label>
          <button type="button" :disabled="!!busy" :aria-busy="busy === 'reimport'" class="admin-button" @click="reimport">
            <template v-if="busy === 'reimport'"><span aria-hidden="true" class="ascii">[■■■□□]</span> Envoi…</template>
            <template v-else><span aria-hidden="true" class="text-text-ter">[</span>{{ armedLabel('reimport', since ? 'Réimporter' : 'Réimporter tout') }}<span aria-hidden="true" class="text-text-ter">]</span></template>
          </button>
          <button type="button" :disabled="!!busy" :aria-busy="busy === 'recompute'" class="admin-button" @click="recompute">
            <template v-if="busy === 'recompute'"><span aria-hidden="true" class="ascii">[■■■□□]</span> Recalcul…</template>
            <template v-else><span aria-hidden="true" class="text-text-ter">[</span>{{ armedLabel('recompute', 'Recalculer les stats') }}<span aria-hidden="true" class="text-text-ter">]</span></template>
          </button>
          <p class="basis-full text-pretty text-xs text-text-sec">
            La date borne le réimport et le recalcul ; sans elle, ils portent sur toutes les parties. Les deux demandent un second clic.
          </p>
        </div>

        <p v-if="result" role="status" class="font-mono text-xs" :class="result.tone === 'success' ? 'text-win' : 'text-brand-red'">{{ result.text }}</p>
      </div>

      <div class="min-w-0 border border-dashed border-border-strong p-3">
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <p class="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-text-main">File de l'API</p>
          <span v-if="active" class="font-mono text-[11px] text-text-ter">· actualisée toutes les 5 s</span>
          <span class="flex-1" />
          <button type="button" class="inline-flex h-8 cursor-pointer items-center px-1 font-mono text-xs uppercase tracking-[0.06em] text-text-sec transition-colors hover:text-text-main" @click="refreshQueue">
            <span aria-hidden="true" class="text-text-ter">[</span>Actualiser<span aria-hidden="true" class="text-text-ter">]</span>
          </button>
        </div>

        <p v-if="queueState === 'loading' || queueState === 'idle'" class="font-mono text-xs text-text-ter">Lecture de la file…</p>
        <p v-else-if="queueState === 'unavailable'" class="font-mono text-xs text-text-ter">// File indisponible : l'API ne connaît pas encore ces routes.</p>
        <p v-else-if="queueState === 'error'" class="font-mono text-xs text-brand-red">La file n'a pas pu être lue.</p>

        <div v-else class="flex flex-col gap-3 font-mono text-xs">
          <div>
            <p class="text-[10px] uppercase tracking-[0.08em] text-text-ter">En cours</p>
            <p v-if="running" class="mt-1 text-text-main">
              <span aria-hidden="true" class="ascii text-text-ter">[■■■□□] </span>{{ running.text }}<template v-if="running.since && now"> · {{ timeAgo(running.since, now) }}</template>
            </p>
            <p v-else class="mt-1 text-text-ter">Rien ne tourne.</p>
          </div>
          <div v-if="pending.length">
            <p class="text-[10px] uppercase tracking-[0.08em] text-text-ter">En attente · {{ pending.length }}</p>
            <ol class="mt-1 flex flex-col gap-0.5 text-text-sec">
              <li v-for="task in pending" :key="task.key"><span aria-hidden="true" class="text-text-ter">▸ </span>{{ task.text }}</li>
            </ol>
          </div>
          <div v-if="results.length">
            <p class="text-[10px] uppercase tracking-[0.08em] text-text-ter">Derniers résultats</p>
            <ol class="mt-1 flex flex-col gap-1">
              <li v-for="entry in results" :key="entry.key" class="break-words">
                <span :class="entry.failed ? 'text-brand-red' : 'text-win'">[{{ entry.failed ? 'échec' : 'ok' }}]</span>
                <span class="text-text-ter"> {{ entry.at }} </span>
                <span class="text-text-main">{{ entry.text }}</span>
                <span class="block text-text-ter" lang="en">{{ entry.summary }}</span>
              </li>
            </ol>
          </div>
          <p class="text-[11px] text-text-ter">// La file vit en mémoire de l'API : un redéploiement la vide.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.admin-button {
  @apply inline-flex h-11 cursor-pointer items-center gap-2 border border-border-strong px-4 font-mono text-[13px] font-medium uppercase tracking-[0.06em] transition-colors duration-150 ease-snap hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40;
}
</style>
