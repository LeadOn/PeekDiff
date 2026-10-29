<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRuntimeConfig } from '#app'
import type { PlayerAccountDto, ValPlayerDto } from '~/lib/types'
import { isAbortError } from '~/lib/types/error'
import { useGameOnVal } from '~/composables/useGameOnVal'
import { useNow } from '~/composables/useNow'
import { useAuthStore } from '~/stores/auth'
import { usePlayerStore } from '~/stores/player'
import { useValStore } from '~/stores/val'
import { buildAdminRows, countAdminRows } from '~/utils/val-admin'
import type { AdminAccountStatus } from '~/utils/val-admin'
import { ADMIN_ROLE } from '#shared/utils/admin-access'
import SectionIndex from '~/components/ui/SectionIndex.vue'
import SegmentSwitch from '~/components/ui/SegmentSwitch.vue'
import AdminActions from '~/components/admin/AdminActions.vue'
import AdminAccountRow from '~/components/admin/AdminAccountRow.vue'

/**
 * The admin space: crew-wide actions, then every GameOn account with its Riot ID, status, rank and
 * last sync. Reserved to signed-in `gameon_admin` holders — enforced by `auth.global.ts` on the server
 * and on the client; the GameOn API checks the role again on the routes it reserves.
 */
definePageMeta({
  auth: true,
  admin: true,
})

const config = useRuntimeConfig()
const client = useGameOnVal()
const authStore = useAuthStore()
const playerStore = usePlayerStore()
const valStore = useValStore()
const now = useNow()

/** Cancelled when the page is left, so no late answer writes into it afterwards. */
const session = new AbortController()
let listRequest: AbortController | null = null

const accounts = ref<PlayerAccountDto[]>([])
const valAccounts = ref<ValPlayerDto[]>([])
const loadStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')
const notice = ref<string | null>(null)
let noticeTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Every account, active and archived (`GET /player` serves one `archived` value at a time), with the
 * Valorant side of those that have a Riot ID. Read after mount: the page is per-user and the proxy
 * needs the session. `silent` keeps the current list on screen while it reloads.
 */
async function loadAccounts({ silent = false } = {}) {
  listRequest?.abort()
  const controller = new AbortController()
  listRequest = controller
  const abortWithSession = () => controller.abort()
  session.signal.addEventListener('abort', abortWithSession, { once: true })

  if (!silent || accounts.value.length === 0) loadStatus.value = 'pending'
  try {
    const [active, archived, valActive, valArchived] = await Promise.all([
      client.getPlayerAccounts(false, controller.signal),
      client.getPlayerAccounts(true, controller.signal),
      client.getValAccounts(false, controller.signal),
      client.getValAccounts(true, controller.signal),
    ])
    accounts.value = [...active, ...archived]
    valAccounts.value = [...valActive, ...valArchived]
    loadStatus.value = 'success'
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[admin] Account list unavailable:', e)
    if (silent && accounts.value.length > 0) {
      say('La liste des comptes n\'a pas pu être relue.')
      return
    }
    loadStatus.value = 'error'
  } finally {
    session.signal.removeEventListener('abort', abortWithSession)
    if (listRequest === controller) listRequest = null
  }
}

onMounted(() => loadAccounts())
onBeforeUnmount(() => {
  session.abort()
  clearTimeout(noticeTimer)
})

function say(message: string) {
  notice.value = message
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = null }, 5000)
}

/** An action changed accounts upstream: say so, re-read the list, and let the crew pages re-read too. */
function onChanged(message?: string) {
  if (message) say(message)
  valStore.invalidateDashboard()
  if (playerStore.currentPlayer) playerStore.fetchCurrentPlayer(true, session.signal)
  loadAccounts({ silent: true })
}

const rows = computed(() => buildAdminRows(accounts.value, valAccounts.value))
const counts = computed(() => countAdminRows(rows.value))

const status = ref<AdminAccountStatus>('crew')
const statusOptions = computed(() => [
  { value: 'crew' as const, label: `Crew · ${counts.value.crew}` },
  { value: 'out' as const, label: `Hors crew · ${counts.value.out}` },
  { value: 'archived' as const, label: `Archivés · ${counts.value.archived}` },
])
const visibleRows = computed(() => rows.value.filter(row => row.status === status.value))

const signedInAs = computed(() => playerStore.currentPlayer?.nickname || authStore.displayName || '—')

useSeoMeta({
  title: 'Administration',
  description: 'Espace d\'administration de PeekDiff.',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div>
    <SectionIndex index="01" label="Administration" />
    <div class="mb-8 mt-3">
      <h1 class="font-display text-[40px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] md:text-5xl">Administration</h1>
      <p class="mt-2 font-mono text-[13px] text-text-sec">
        <ClientOnly>
          Connecté en tant que {{ signedInAs }}
          <template #fallback>Connecté</template>
        </ClientOnly>
        · {{ ADMIN_ROLE }} · v{{ config.public.appVersion }}
      </p>
    </div>

    <section aria-labelledby="admin-actions-title">
      <h2 id="admin-actions-title" class="sr-only">Actions</h2>
      <AdminActions :signal="session.signal" @changed="onChanged()" />
    </section>

    <section aria-labelledby="admin-accounts-title" class="mt-12">
      <SectionIndex index="02" label="Comptes" />
      <div class="mb-5 mt-3 flex flex-wrap items-end justify-between gap-x-5 gap-y-3.5">
        <div class="min-w-0">
          <h2 id="admin-accounts-title" class="font-display text-[40px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] md:text-5xl">Comptes</h2>
          <p class="mt-2 font-mono text-[13px] text-text-sec">
            <template v-if="loadStatus === 'success'">
              {{ rows.length }} comptes<template v-if="counts.missingRiotId"> · <span class="text-text-main">{{ counts.missingRiotId }} sans Riot ID</span></template>
            </template>
            <template v-else>Tous les comptes GameOn, crew ou non, smurfs compris.</template>
          </p>
        </div>
        <SegmentSwitch v-model="status" :options="statusOptions" label="Statut des comptes" />
      </div>

      <p v-if="notice" role="status" class="mb-3 border border-border-strong bg-surface-high px-4 py-2.5 font-mono text-xs text-text-main">
        <span aria-hidden="true" class="text-text-ter">[ok] </span>{{ notice }}
      </p>

      <div v-if="loadStatus === 'pending' || loadStatus === 'idle'" aria-busy="true" aria-label="Chargement des comptes" class="flex animate-pulse flex-col gap-2">
        <div v-for="index in 6" :key="index" class="h-14 border border-border-base bg-surface-base" />
      </div>

      <div v-else-if="loadStatus === 'error'" class="ticks flex flex-wrap items-center gap-5 border border-brand-red/40 bg-surface-base p-6">
        <pre aria-hidden="true" class="ascii text-sm text-border-ascii">  │
──<span class="text-brand-red">┼</span>──
  │</pre>
        <div class="min-w-60 flex-1">
          <h3 class="font-display text-3xl font-black uppercase leading-none">L'API ne répond pas</h3>
          <p class="mt-2 text-pretty text-sm text-text-sec">Impossible de charger les comptes. Le serveur semble indisponible pour le moment.</p>
        </div>
        <button
          type="button"
          class="inline-flex h-11 cursor-pointer items-center gap-2 border border-border-strong px-4 font-mono text-[13px] font-medium uppercase tracking-[0.06em] transition-colors duration-150 ease-snap hover:bg-surface-hover"
          @click="loadAccounts()"
        >
          <span aria-hidden="true" class="text-text-ter">[</span>Réessayer<span aria-hidden="true" class="text-text-ter">]</span>
        </button>
      </div>

      <ul v-else-if="visibleRows.length" class="border border-border-base bg-surface-base px-4">
        <AdminAccountRow
          v-for="row in visibleRows"
          :key="row.id"
          :row="row"
          :now="now"
          :signal="session.signal"
          @changed="onChanged"
        />
      </ul>
      <p v-else class="ticks border border-border-base bg-surface-base p-6 text-sm text-text-sec">Aucun compte dans cette catégorie.</p>
    </section>
  </div>
</template>
