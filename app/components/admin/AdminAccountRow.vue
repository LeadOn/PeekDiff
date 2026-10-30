<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { errorStatusCode, isAbortError } from '~/lib/types/error'
import { useGameOnVal } from '~/composables/useGameOnVal'
import type { AdminAccountRow } from '~/utils/val-admin'
import { adminErrorMessage, linkSmurfErrorMessage, smurfCount } from '~/utils/val-admin'
import { timeAgo } from '~/utils/date'
import { isRankedTier, tierInfo } from '~/utils/val-tier'
import ValPlayerCard from '~/components/val/ValPlayerCard.vue'
import ValRankEmblem from '~/components/val/ValRankEmblem.vue'

/**
 * One account of the admin space: who it is, its Riot ID and status, its rank and last sync, a Riot
 * re-sync, and a "Gérer" panel with what the API lets an admin change on it (`gameon_admin`): its Riot
 * ID, crew membership, archiving and smurf links. Every write tells the page, which re-reads the whole
 * list: one write can move several accounts (a main leaving the crew takes its smurfs along).
 */
const props = defineProps<{
  row: AdminAccountRow
  /** The clock for "il y a…", 0 before mount. */
  now: number
  signal: AbortSignal
}>()

const emit = defineEmits<{
  /** Accounts changed upstream: re-read the list. `message` is said once, in the page's live region. */
  (e: 'changed', message: string): void
}>()

const client = useGameOnVal()

const STATUS_LABELS = { crew: 'Crew', out: 'Hors crew', archived: 'Archivé' } as const

const rank = computed(() => {
  const current = props.row.val?.valorantCurrentRank
  return current && isRankedTier(current.tierId) ? { tierId: current.tierId, label: tierInfo(current.tierId).label, iconUrl: current.smallIconUrl } : null
})
const synced = computed(() => (props.row.refreshedOn && props.now ? `Synchro ${timeAgo(props.row.refreshedOn, props.now)}` : null))

/** One write at a time per row: every button is disabled while one runs, so nothing is sent twice. */
type BusyAction = 'sync' | 'riot' | 'crew' | 'archive' | 'link' | `unlink-${number}`
const busy = ref<BusyAction | null>(null)
const error = ref<string | null>(null)

/**
 * Runs one write, then tells the page what it did. A failure stays on the row; `describe` words it
 * from the status, the shared failures (session, role, outage) aside.
 */
async function run(action: BusyAction, write: () => Promise<string>, describe: (e: unknown) => string) {
  if (busy.value) return
  busy.value = action
  error.value = null
  disarm()
  try {
    emit('changed', await write())
  } catch (e) {
    if (isAbortError(e)) return
    console.error(`[admin] ${action} failed on account ${props.row.id}:`, e)
    error.value = describe(e)
  } finally {
    busy.value = null
  }
}

/** Re-reads the account from Riot: profile, rank and its last 10 games. */
function sync() {
  if (!props.row.riotId) return
  run('sync', async () => {
    await client.refreshValPlayer(props.row.id, props.signal)
    return `${props.row.nickname} synchronisé depuis Riot.`
  }, () => 'La synchronisation a échoué : Riot ne retrouve peut-être pas ce Riot ID.')
}

// --- Confirmation: leaving the crew, archiving and unlinking take a second click ---
const armed = ref<string | null>(null)
let armTimer: ReturnType<typeof setTimeout> | undefined

function disarm() {
  armed.value = null
  clearTimeout(armTimer)
}

/** First click arms the button for four seconds, the second one acts. */
function confirmThen(key: string, act: () => void) {
  if (armed.value === key) {
    act()
    return
  }
  armed.value = key
  clearTimeout(armTimer)
  armTimer = setTimeout(() => { armed.value = null }, 4000)
}

onBeforeUnmount(() => clearTimeout(armTimer))

// --- Management panel ---
const managing = ref(false)
const gameName = ref('')
const tagLine = ref('')
const smurfName = ref('')
const smurfTag = ref('')
const gameNameInput = ref<HTMLInputElement | null>(null)

const cleanTag = (value: string) => value.trim().replace(/^#/, '')
const canSaveRiotId = computed(() => !busy.value && gameName.value.trim() !== '' && cleanTag(tagLine.value) !== ''
  && (gameName.value.trim() !== props.row.riotGamesNickname || cleanTag(tagLine.value) !== props.row.riotGamesTagLine))
const canLink = computed(() => !busy.value && smurfName.value.trim() !== '' && cleanTag(smurfTag.value) !== '')

async function toggleManaging() {
  if (managing.value) {
    managing.value = false
    disarm()
    return
  }
  gameName.value = props.row.riotGamesNickname ?? ''
  tagLine.value = props.row.riotGamesTagLine ?? ''
  smurfName.value = ''
  smurfTag.value = ''
  error.value = null
  managing.value = true
  await nextTick()
  gameNameInput.value?.focus()
}

function saveRiotId() {
  if (!canSaveRiotId.value) return
  const name = gameName.value.trim()
  const tag = cleanTag(tagLine.value)
  run('riot', async () => {
    await client.updateValRiotId(props.row.id, name, tag, props.signal)
    return `Riot ID de ${props.row.nickname} : ${name}#${tag}.`
  }, e => (errorStatusCode(e) === 409
    // Decided on the status: the body is an English sentence.
    ? 'Ce Riot ID est déjà utilisé par un autre compte. Rien n\'a été enregistré.'
    : adminErrorMessage(e, 'Le Riot ID n\'a pas pu être enregistré.')))
}

function setCrew(inCrew: boolean) {
  run('crew', async () => {
    const result = await client.setValCrewMembership(props.row.id, inCrew, props.signal)
    if (!inCrew) {
      const dragged = result.affectedSmurfAccounts
      return `${props.row.nickname} retiré du crew${dragged ? `, avec ${dragged > 1 ? 'ses' : 'son'} ${smurfCount(dragged)}` : ''}.`
    }
    const left = props.row.smurfs.filter(smurf => !smurf.inCrew).length
    return `${props.row.nickname} ajouté au crew.${left ? ` ${left > 1 ? 'Ses' : 'Son'} ${smurfCount(left)} ${left > 1 ? 'restent' : 'reste'} hors crew.` : ''}`
  }, e => (errorStatusCode(e) === 404 ? 'Ce compte n\'existe plus.' : adminErrorMessage(e, 'Le changement de crew a échoué.')))
}

function setArchived(archived: boolean) {
  run('archive', async () => {
    await client.setPlayerArchived(props.row.id, archived, props.signal)
    return `${props.row.nickname} ${archived ? 'archivé' : 'désarchivé'}.`
  }, e => (errorStatusCode(e) === 404 ? 'Ce compte n\'existe plus.' : adminErrorMessage(e, 'L\'archivage a échoué.')))
}

function linkSmurf() {
  if (!canLink.value) return
  const name = smurfName.value.trim()
  const tag = cleanTag(smurfTag.value)
  run('link', async () => {
    const result = await client.linkValSmurf(props.row.id, name, tag, props.signal)
    smurfName.value = ''
    smurfTag.value = ''
    const games = result.backfilledParticipations
    return `${name}#${tag} lié comme smurf de ${props.row.nickname}${result.smurfAccount.inCrew ? '' : ' (hors crew)'} · ${games} partie${games > 1 ? 's' : ''} rattachée${games > 1 ? 's' : ''}.`
  }, linkSmurfErrorMessage)
}

function unlinkSmurf(smurf: { id: number, nickname: string }) {
  run(`unlink-${smurf.id}`, async () => {
    await client.unlinkValSmurf(smurf.id, props.signal)
    return `${smurf.nickname} n'est plus un smurf : le compte et son historique sont conservés.`
  }, e => (errorStatusCode(e) === 404 ? 'Ce smurf n\'existe plus.' : adminErrorMessage(e, 'Le compte n\'a pas pu être délié.')))
}

const armedLabel = (key: string, label: string) => (armed.value === key ? 'Confirmer ?' : label)
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
          <span v-if="row.smurfs.length" class="badge">{{ smurfCount(row.smurfs.length) }}</span>
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
        <button type="button" :disabled="!!busy && !managing" :aria-expanded="managing" class="row-action" @click="toggleManaging">
          <span aria-hidden="true" class="text-text-ter">[</span>Gérer<span aria-hidden="true" class="text-text-ter">]</span>
        </button>
        <NuxtLink v-if="row.hasProfile" :to="`/player/${row.id}`" :aria-label="`Profil de ${row.nickname}`" class="row-action">
          <span aria-hidden="true" class="text-text-ter">[</span>Profil<span aria-hidden="true" class="text-text-ter">]</span>
        </NuxtLink>
      </div>
    </div>

    <div v-if="managing" class="mb-3 flex flex-col gap-4 border border-dashed border-border-strong p-3 md:ml-11">
      <form class="flex flex-wrap items-end gap-2" novalidate @submit.prevent="saveRiotId">
        <p class="panel-label basis-full">Riot ID</p>
        <label class="flex min-w-0 flex-1 basis-40 flex-col gap-1.5">
          <span class="field-label">Nom de jeu</span>
          <input ref="gameNameInput" v-model="gameName" type="text" autocomplete="off" spellcheck="false" class="field-input">
        </label>
        <label class="flex w-28 flex-col gap-1.5">
          <span class="field-label">Tag</span>
          <input v-model="tagLine" type="text" autocomplete="off" spellcheck="false" class="field-input font-mono uppercase">
        </label>
        <button type="submit" :disabled="!canSaveRiotId" :aria-busy="busy === 'riot'" class="row-action h-10 border border-border-strong">
          <template v-if="busy === 'riot'"><span aria-hidden="true" class="ascii">[■■□]</span> Enregistrement…</template>
          <template v-else><span aria-hidden="true" class="text-text-ter">[</span>Enregistrer<span aria-hidden="true" class="text-text-ter">]</span></template>
        </button>
        <p class="basis-full text-pretty text-xs text-text-sec">
          Le compte est ensuite resynchronisé depuis Riot : rang, carte et 10 dernières parties.
        </p>
      </form>

      <div class="flex flex-wrap items-center gap-2 border-t border-dashed border-border-base pt-3">
        <p class="panel-label basis-full">Statut</p>
        <button
          type="button"
          :disabled="!!busy"
          :aria-busy="busy === 'crew'"
          class="row-action border border-border-strong"
          @click="row.inCrew ? confirmThen('crew', () => setCrew(false)) : setCrew(true)"
        >
          <template v-if="busy === 'crew'"><span aria-hidden="true" class="ascii">[■■□]</span> Crew…</template>
          <template v-else><span aria-hidden="true" class="text-text-ter">[</span>{{ row.inCrew ? armedLabel('crew', 'Retirer du crew') : 'Ajouter au crew' }}<span aria-hidden="true" class="text-text-ter">]</span></template>
        </button>
        <button
          type="button"
          :disabled="!!busy"
          :aria-busy="busy === 'archive'"
          class="row-action border border-border-strong"
          @click="row.archived ? setArchived(false) : confirmThen('archive', () => setArchived(true))"
        >
          <template v-if="busy === 'archive'"><span aria-hidden="true" class="ascii">[■■□]</span> Archivage…</template>
          <template v-else><span aria-hidden="true" class="text-text-ter">[</span>{{ row.archived ? 'Désarchiver' : armedLabel('archive', 'Archiver') }}<span aria-hidden="true" class="text-text-ter">]</span></template>
        </button>
        <p v-if="row.inCrew && row.smurfs.length" class="basis-full text-pretty text-xs text-text-sec">
          Retirer ce compte du crew en retire aussi ses smurfs ; l'y remettre ne les remet pas.
        </p>
      </div>

      <div class="flex flex-col gap-2 border-t border-dashed border-border-base pt-3">
        <p class="panel-label">Smurfs</p>
        <p v-if="row.smurfOfId !== null" class="flex flex-wrap items-center gap-2 text-sm">
          Smurf de {{ row.smurfOf }}.
          <button
            type="button"
            :disabled="!!busy"
            :aria-busy="busy === `unlink-${row.id}`"
            class="row-action border border-border-strong"
            @click="confirmThen(`unlink-${row.id}`, () => unlinkSmurf({ id: row.id, nickname: row.nickname }))"
          >
            <template v-if="busy === `unlink-${row.id}`"><span aria-hidden="true" class="ascii">[■■□]</span> Déliaison…</template>
            <template v-else><span aria-hidden="true" class="text-text-ter">[</span>{{ armedLabel(`unlink-${row.id}`, 'Délier') }}<span aria-hidden="true" class="text-text-ter">]</span></template>
          </button>
        </p>
        <template v-else>
          <ul v-if="row.smurfs.length" class="flex flex-col gap-1">
            <li v-for="smurf in row.smurfs" :key="smurf.id" class="flex flex-wrap items-center gap-2 text-sm">
              <span class="min-w-0 truncate">{{ smurf.nickname }}</span>
              <span class="font-mono text-xs text-text-ter">#{{ smurf.id }}<template v-if="!smurf.inCrew"> · hors crew</template></span>
              <button
                type="button"
                :disabled="!!busy"
                :aria-busy="busy === `unlink-${smurf.id}`"
                :aria-label="armed === `unlink-${smurf.id}` ? `Confirmer : délier ${smurf.nickname}` : `Délier ${smurf.nickname}`"
                class="row-action"
                @click="confirmThen(`unlink-${smurf.id}`, () => unlinkSmurf(smurf))"
              >
                <template v-if="busy === `unlink-${smurf.id}`"><span aria-hidden="true" class="ascii">[■■□]</span> Déliaison…</template>
                <template v-else><span aria-hidden="true" class="text-text-ter">[</span>{{ armedLabel(`unlink-${smurf.id}`, 'Délier') }}<span aria-hidden="true" class="text-text-ter">]</span></template>
              </button>
            </li>
          </ul>
          <form class="flex flex-wrap items-end gap-2" novalidate @submit.prevent="linkSmurf">
            <label class="flex min-w-0 flex-1 basis-40 flex-col gap-1.5">
              <span class="field-label">Nom de jeu du smurf</span>
              <input v-model="smurfName" type="text" autocomplete="off" spellcheck="false" :disabled="busy === 'link'" class="field-input">
            </label>
            <label class="flex w-28 flex-col gap-1.5">
              <span class="field-label">Tag</span>
              <input v-model="smurfTag" type="text" autocomplete="off" spellcheck="false" :disabled="busy === 'link'" class="field-input font-mono uppercase">
            </label>
            <button type="submit" :disabled="!canLink" :aria-busy="busy === 'link'" class="row-action h-10 border border-border-strong">
              <template v-if="busy === 'link'"><span aria-hidden="true" class="ascii">[■■□]</span> Liaison…</template>
              <template v-else><span aria-hidden="true" class="text-text-ter">[</span>Lier un smurf<span aria-hidden="true" class="text-text-ter">]</span></template>
            </button>
            <p class="basis-full text-pretty text-xs text-text-sec">
              Un compte inconnu est créé hors crew, ses parties déjà en base lui sont rattachées, puis il est
              synchronisé depuis HenrikDev : jusqu'à une minute.
            </p>
          </form>
        </template>
      </div>

      <p class="border-t border-dashed border-border-base pt-3 font-mono text-[11px] text-text-ter">
        // Crew, archivage et smurfs sont communs à PeekDiff et JungleDiff : les changer ici les change aussi là-bas.
      </p>
    </div>

    <p v-if="error" role="alert" class="mb-3 font-mono text-xs text-brand-red md:ml-11">{{ error }}</p>
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

.panel-label {
  @apply font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-text-main;
}

.field-label {
  @apply font-mono text-[11px] uppercase tracking-[0.08em] text-text-ter;
}

.field-input {
  @apply h-10 w-full min-w-0 border border-border-base bg-surface-sunken px-3 text-sm text-text-main transition-colors duration-150 ease-snap hover:border-border-strong focus:border-brand-red focus:outline-none focus-visible:outline-none disabled:opacity-60;
}
</style>
