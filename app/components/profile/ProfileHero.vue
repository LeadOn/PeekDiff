<script setup lang="ts">
import { computed } from 'vue'
import type { ValPlayerDto, ValPremierTeamDto } from '~/lib/types'
import { playerDisplayName, playerPeak } from '~/utils/val-ladder'
import { AGENT_ROLES, agentIdFromUrl, agentImageUrl, hexColor, rankIconUrl, valorantCdnUrl } from '~/utils/val-assets'
import { agentRole } from '~/utils/val-agents'
import { familyBaseTier, familyLabel, isRankedTier, tierColor, tierInfo } from '~/utils/val-tier'
import { parsePrestige, premierRoleLabel, protectionStatusLabel } from '~/utils/val-labels'
import { timeAgo } from '~/utils/date'
import { formatSigned } from '~/utils/number'
import { RESULT_LABELS } from '~/utils/val-match'
import { useNow } from '~/composables/useNow'
import { isSmurf } from '~/utils/val-smurf'
import ValRankEmblem from '~/components/val/ValRankEmblem.vue'

/**
 * "Héros profil" of the design system (§7): the player card `wideart` under the night veil, the main
 * agent's full portrait on the right, the name in display caps, the current and peak ranks. It stays
 * `night` in both themes.
 */
const props = defineProps<{
  player: ValPlayerDto
  /** The main account's name for a smurf, once the crew list has resolved it. */
  mainName: string | null
  isMe: boolean
  /** The sync action is offered to every visitor, once the account has a Valorant PUUID. */
  canSync: boolean
  syncing: boolean
  /** The player's Premier team, read after mount from `valorantPremierTeamId`; `null` until then or when unknown. */
  premier: ValPremierTeamDto | null
}>()

const emit = defineEmits<{
  (e: 'sync'): void
}>()

// "Synchro il y a 4 min" depends on the reader's clock: printed after mount only.
const now = useNow()

const name = computed(() => playerDisplayName(props.player))

const riotId = computed(() => {
  const parts = [props.player.riotGamesTagLine ? `${name.value}#${props.player.riotGamesTagLine}` : name.value]
  if (props.player.valorantAccountLevel) parts.push(`niveau ${props.player.valorantAccountLevel}`)
  if (props.player.valorantRegion) parts.push(props.player.valorantRegion.toUpperCase())
  return parts.join(' · ')
})

const bannerStyle = computed(() => (props.player.valorantPlayerCardWideUrl
  ? { backgroundImage: `url('${props.player.valorantPlayerCardWideUrl}')` }
  : {}))

/** The main agent's full body, derived from the icon URL the API sends for it. */
const portraitUrl = computed(() => agentImageUrl(agentIdFromUrl(props.player.mainAgentIconUrl), 'portrait'))

/** "Jett · Duelliste": the main agent, with its role when the role table knows it. */
const mainAgentLabel = computed(() => {
  const name = props.player.mainAgentName
  if (!name) return null
  const role = agentRole({ iconUrl: props.player.mainAgentIconUrl, name })
  return role ? `${name} · ${AGENT_ROLES[role].label}` : name
})

const current = computed(() => {
  const rank = props.player.valorantCurrentRank
  if (!rank || !isRankedTier(rank.tierId)) return null
  return {
    tierId: rank.tierId,
    label: tierInfo(rank.tierId).label,
    rr: rank.rankedRating,
    iconUrl: rank.largeIconUrl ?? rankIconUrl(rank.tierId, 'large'),
    act: rank.seasonShort,
  }
})

const peak = computed(() => playerPeak(props.player))

const weekDelta = computed(() => props.player.rrChange7DaysValorant ?? null)

/** Ranked results newest first, as the API sends them. */
const form = computed(() => (props.player.recentFormValorant ?? []).map(win => (win ? 'V' : 'D') as 'V' | 'D'))

const smurfs = computed(() => props.player.smurfAccounts ?? [])
const smurf = computed(() => isSmurf(props.player))

// --- Fields added by the API on 2026-11: each one shows only when it is known ---

/** The Premier badge: the team's name and tag once `GET /val/premier/{id}` answered, the role meanwhile. */
const premierBadge = computed(() => {
  if (!props.player.valorantPremierTeamId) return null
  const team = props.premier
  const name = team?.name ? `${team.name}${team.tag ? `#${team.tag}` : ''}` : 'Équipe Premier'
  return {
    name,
    role: premierRoleLabel(props.player.valorantPremierRole),
    // HenrikDev serves the team icon from a host the CSP refuses: the team colour stands in for it.
    imageUrl: valorantCdnUrl(team?.imageUrl),
    color: hexColor(team?.primaryColor),
    division: team?.division ?? null,
  }
})

/** Derank protection: only on a protected tier, with the shields left when the API knows them. */
const protection = computed(() => {
  if (props.player.valorantIsAtRankProtectedTier !== true) return null
  const shields = props.player.valorantRankProtectionShields
  const status = protectionStatusLabel(props.player.valorantRankProtectionStatus)
  const count = shields == null ? null : `${shields} bouclier${shields > 1 ? 's' : ''}`
  return {
    text: count ?? 'Protégé',
    title: ['Protection de rang : une défaite ne fait pas descendre de division', count, status].filter(Boolean).join(' · '),
  }
})

const leaderboardRank = computed(() => {
  const rank = props.player.valorantLeaderboardRank
  return rank != null && rank > 0 ? rank : null
})

/** Acts finished in each rank family, over the account's lifetime. */
const prestige = computed(() => parsePrestige(props.player.valorantLifetimePrestigeJson).map(entry => ({
  ...entry,
  tierId: familyBaseTier(entry.family),
  label: `${entry.count} acte${entry.count > 1 ? 's' : ''} fini${entry.count > 1 ? 's' : ''} en ${familyLabel(entry.family)}`,
  color: tierColor(entry.family),
})))

const hasBadges = computed(() => !!premierBadge.value || !!protection.value || leaderboardRank.value !== null || prestige.value.length > 0)

const syncedLabel = computed(() => {
  if (!props.player.valorantRefreshedOn) return 'Jamais synchronisé'
  return now.value ? `Synchro ${timeAgo(props.player.valorantRefreshedOn, now.value)}` : 'Synchro'
})
</script>

<template>
  <section aria-labelledby="profile-name" class="notch-2 relative isolate overflow-hidden bg-night px-5 pb-6 pt-7 text-on-night md:min-h-[320px] md:px-8 md:pb-8">
    <div aria-hidden="true" class="absolute inset-0 -z-20 bg-cover bg-center grayscale-[0.35] contrast-[1.05]" :style="bannerStyle" />
    <!-- Player cards range from near-black to saturated daylight art: a flat veil under the gradient
         keeps the ranks legible over the brightest ones. -->
    <div aria-hidden="true" class="absolute inset-0 -z-20 bg-night/50" />
    <div aria-hidden="true" class="scanlines bg-scrim-night absolute inset-0 -z-10" />
    <img
      v-if="portraitUrl"
      :src="portraitUrl"
      alt=""
      width="2048"
      height="1860"
      class="pointer-events-none absolute -bottom-[42%] -right-10 -z-10 hidden h-[175%] w-auto max-w-none [mask-image:linear-gradient(90deg,transparent_10%,black_55%)] md:block"
    >

    <p class="font-mono text-[11px] uppercase tracking-[0.08em] text-on-night-red">
      // Profil<template v-if="mainAgentLabel"> · {{ mainAgentLabel }}</template>
    </p>

    <div class="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
      <h1 id="profile-name" class="min-w-0 break-words font-display text-[56px] font-black uppercase leading-[0.85] md:text-[88px]">{{ name }}</h1>
      <ClientOnly>
        <span v-if="isMe" class="mb-1.5 bg-brand-red-fill px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase text-white">Vous</span>
      </ClientOnly>
    </div>
    <p class="mt-2 font-mono text-[13px] text-on-night-2">{{ riotId }}</p>

    <div v-if="smurf || smurfs.length" class="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
      <template v-if="smurf">
        <span class="border border-on-night/25 px-1.5 text-[10px] uppercase">Smurf</span>
        <NuxtLink
          v-if="player.primaryPlayerId"
          :to="`/player/${player.primaryPlayerId}`"
          class="text-on-night-2 underline decoration-on-night/30 underline-offset-4 transition-colors hover:text-on-night"
        >Compte secondaire de {{ mainName ?? 'son compte principal' }}</NuxtLink>
      </template>
      <template v-else>
        <span class="text-on-night-2">Comptes secondaires :</span>
        <NuxtLink
          v-for="account in smurfs"
          :key="account.id"
          :to="`/player/${account.id}`"
          class="underline decoration-on-night/30 underline-offset-4 transition-colors hover:text-on-night-red"
        >{{ playerDisplayName(account) }}</NuxtLink>
      </template>
    </div>

    <div aria-hidden="true" class="mt-5 h-0.5 max-w-48 origin-left animate-wipe bg-on-night-red" />

    <div class="mt-5 flex flex-wrap items-end gap-x-8 gap-y-5">
      <div class="flex items-center gap-3">
        <ValRankEmblem :tier-id="current?.tierId ?? 0" :src="current?.iconUrl" size="large" alt="" class="size-14 shrink-0" :class="current ? '' : 'opacity-50'" />
        <div>
          <span class="block font-mono text-[11px] uppercase tracking-[0.08em] text-on-night-2">Rang actuel<template v-if="current?.act"> · {{ current.act }}</template></span>
          <b class="block font-display text-2xl font-extrabold uppercase leading-none">{{ current?.label ?? 'Non classé' }}</b>
          <span v-if="current" class="mt-1 block font-mono text-xs text-on-night-2">
            {{ current.rr }} RR<template v-if="weekDelta !== null">
              · <span :class="weekDelta > 0 ? 'text-on-night-win' : weekDelta < 0 ? 'text-on-night-loss' : ''">{{ formatSigned(weekDelta) }}</span> en 7 j</template>
          </span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <ValRankEmblem :tier-id="peak?.tierId ?? 0" :src="peak?.iconUrl" size="large" alt="" class="size-14 shrink-0" :class="peak ? '' : 'opacity-50'" />
        <div>
          <span class="block font-mono text-[11px] uppercase tracking-[0.08em] text-on-night-2">Pic de rang<template v-if="peak?.season"> · {{ peak.season }}</template></span>
          <b class="block font-display text-2xl font-extrabold uppercase leading-none">{{ peak?.label ?? 'Inconnu' }}</b>
          <span v-if="peak?.rr" class="mt-1 block font-mono text-xs text-on-night-2">{{ peak.rr }} RR</span>
        </div>
      </div>

      <div v-if="form.length">
        <span class="block font-mono text-[11px] uppercase tracking-[0.08em] text-on-night-2">Forme · classées</span>
        <ol class="mt-1.5 flex gap-1" aria-label="Dernières parties classées, la plus récente en premier">
          <li
            v-for="(result, index) in form"
            :key="index"
            :title="RESULT_LABELS[result]"
            class="grid size-6 place-items-center font-mono text-xs font-bold"
            :class="result === 'V' ? 'bg-on-night-win/15 text-on-night-win' : 'bg-on-night-loss/15 text-on-night-loss'"
          >
            <span aria-hidden="true">{{ result }}</span><span class="sr-only">{{ RESULT_LABELS[result] }}</span>
          </li>
        </ol>
      </div>
    </div>

    <ul v-if="hasBadges" class="mt-5 flex flex-wrap items-center gap-2 font-mono text-xs" aria-label="Distinctions du compte">
      <li v-if="premierBadge" class="flex h-8 items-center gap-2 border border-on-night/25 bg-night/60 pl-1 pr-2.5">
        <img v-if="premierBadge.imageUrl" :src="premierBadge.imageUrl" alt="" width="24" height="24" class="size-6 object-contain">
        <span v-else aria-hidden="true" class="grid size-6 place-items-center text-on-night-2" :style="premierBadge.color ? { color: premierBadge.color } : undefined">◆</span>
        <span class="text-[10px] uppercase tracking-[0.08em] text-on-night-2">Premier</span>
        <b class="font-medium">{{ premierBadge.name }}</b>
        <span v-if="premierBadge.role" class="text-on-night-2">· {{ premierBadge.role }}</span>
        <span v-if="premierBadge.division !== null" class="text-on-night-2">· div. {{ premierBadge.division }}</span>
      </li>
      <li v-if="protection" :title="protection.title" class="flex h-8 items-center gap-1.5 border border-on-night/25 bg-night/60 px-2.5">
        <span aria-hidden="true" class="text-on-night-win">◈</span>
        <span>{{ protection.text }}</span>
        <span class="sr-only">{{ protection.title }}</span>
      </li>
      <li v-if="leaderboardRank !== null" class="flex h-8 items-center gap-1.5 border border-on-night/25 bg-night/60 px-2.5">
        <span class="text-[10px] uppercase tracking-[0.08em] text-on-night-2">Leaderboard</span>
        <b class="font-medium">#{{ leaderboardRank.toLocaleString('fr-FR') }}</b>
      </li>
      <li v-if="prestige.length" class="flex h-8 items-center gap-2 border border-on-night/25 bg-night/60 pl-2.5 pr-1.5">
        <span class="text-[10px] uppercase tracking-[0.08em] text-on-night-2">Prestige</span>
        <ul class="flex items-center gap-1">
          <li
            v-for="entry in prestige"
            :key="entry.family"
            :title="entry.label"
            class="flex h-6 items-center gap-0.5 border-b-2 pr-1"
            :style="{ borderBottomColor: entry.color }"
          >
            <ValRankEmblem :tier-id="entry.tierId" alt="" class="size-5" />
            <span aria-hidden="true">×{{ entry.count }}</span>
            <span class="sr-only">{{ entry.label }}</span>
          </li>
        </ul>
      </li>
    </ul>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <ClientOnly>
        <button
          v-if="canSync"
          type="button"
          :disabled="syncing"
          :aria-busy="syncing"
          class="notch focus-visible:outline-offset-[-4px] focus-visible:outline-white inline-flex h-11 cursor-pointer items-center gap-2 bg-brand-red-fill pl-5 pr-7 text-sm font-semibold uppercase tracking-[0.08em] text-white transition-[background-color,box-shadow] duration-150 ease-snap hover:bg-brand-red-hover hover:shadow-glow-red disabled:cursor-wait disabled:opacity-70"
          @click="emit('sync')"
        >
          <template v-if="syncing"><span aria-hidden="true" class="ascii">[■■■□□]</span> Synchro…</template>
          <template v-else>Synchroniser <span aria-hidden="true">▸</span></template>
        </button>
      </ClientOnly>
      <span class="font-mono text-xs text-on-night-2">{{ syncedLabel }}</span>
    </div>
  </section>
</template>
