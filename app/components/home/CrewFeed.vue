<script setup lang="ts">
import { computed } from 'vue'
import type { ValGameDto } from '~/lib/types'
import { participantName, resolvePerspective } from '~/utils/val-game'
import { queueLabel, RESULT_LABELS } from '~/utils/val-match'
import type { GameResult } from '~/utils/val-match'
import { mapImageUrl } from '~/utils/val-assets'
import { timeAgo } from '~/utils/date'
import { useNow } from '~/composables/useNow'
import FrameHead from '~/components/ui/FrameHead.vue'
import ValAgentIcon from '~/components/val/ValAgentIcon.vue'

/**
 * The crew's latest games (`GET /val/match/last`), each once, told from the side with the most crew
 * members: result, score, map and the crew members who played it. Each line opens the match page.
 */
const props = defineProps<{
  games: ValGameDto[]
}>()

// Relative times depend on the reader's clock and `/` is served from a shared SWR cache: they only
// appear after mount (`useNow` is 0 until then).
const now = useNow()

const lines = computed(() => props.games.map((game) => {
  const perspective = resolvePerspective(game, null)
  const crew = game.valorantGameParticipants.filter(entry => entry.playerId !== null && entry.teamId === perspective.allyTeamId)
  const allies = game.valorantGameTeams.find(team => team.teamId === perspective.allyTeamId)
  let result: GameResult = allies?.won ? 'V' : 'D'
  if (game.isRemake) result = 'R'
  else if (!game.winningTeamId) result = 'N'

  return {
    matchId: game.matchId,
    // A game with a single crew member opens from that member's side, like their profile does.
    href: crew.length === 1 ? `/match/${game.matchId}?player=${crew[0]!.playerId}` : `/match/${game.matchId}`,
    result,
    score: `${allies?.roundsWon ?? 0}–${allies?.roundsLost ?? 0}`,
    map: game.mapName ?? 'Carte inconnue',
    bannerUrl: game.mapListViewIconUrl ?? mapImageUrl(game.mapId),
    queue: queueLabel(game.queueId, game.queueName),
    startedAt: game.gameStart,
    crew: crew.map(entry => ({ id: entry.id, agent: entry.agentName ?? 'Agent inconnu', iconUrl: entry.agentIconUrl })),
    crewNames: crew.map(participantName).join(', '),
  }
}))

const resultClass = (result: GameResult) => ({
  V: 'bg-win-soft text-win',
  D: 'bg-loss-soft text-loss',
  N: 'bg-surface-high text-text-sec',
  R: 'bg-surface-high text-text-ter',
}[result])
</script>

<template>
  <section class="border border-border-base bg-surface-base p-4">
    <FrameHead title="Dernières parties" aside="du crew" as="h2" />
    <ul v-if="lines.length" class="flex flex-col gap-1.5">
      <li
        v-for="line in lines"
        :key="line.matchId"
        class="group relative isolate overflow-hidden border border-border-base px-3 py-2.5 transition-colors duration-150 ease-snap hover:border-border-strong"
      >
        <div
          v-if="line.bannerUrl"
          aria-hidden="true"
          class="absolute inset-0 -z-10 bg-cover bg-center grayscale-[0.35]"
          :style="{ backgroundImage: `url('${line.bannerUrl}')` }"
        />
        <div aria-hidden="true" class="absolute inset-0 -z-10 bg-linear-to-r from-surface-base from-40% to-surface-base/70" />

        <div class="flex items-center gap-2.5">
          <span :title="RESULT_LABELS[line.result]" class="grid size-6 shrink-0 place-items-center font-mono text-xs font-bold" :class="resultClass(line.result)">
            <span aria-hidden="true">{{ line.result }}</span><span class="sr-only">{{ RESULT_LABELS[line.result] }}</span>
          </span>
          <span class="font-display text-xl font-extrabold leading-none">{{ line.score }}</span>
          <NuxtLink :to="line.href" class="min-w-0 truncate text-sm font-semibold uppercase tracking-[0.04em] after:absolute after:inset-0 after:content-[''] group-hover:text-brand-red">
            {{ line.map }}<span class="sr-only">, détail de la partie</span>
          </NuxtLink>
        </div>
        <div class="mt-1.5 flex items-center gap-2">
          <span class="flex shrink-0 -space-x-1">
            <ValAgentIcon v-for="member in line.crew" :key="member.id" :src="member.iconUrl" :name="member.agent" class="size-5 border border-surface-base" />
          </span>
          <span class="min-w-0 truncate text-xs text-text-sec">{{ line.crewNames }}</span>
        </div>
        <p class="mt-1 truncate font-mono text-[11px] uppercase tracking-[0.04em] text-text-ter">
          {{ line.queue }}<ClientOnly><template v-if="now"> · {{ timeAgo(line.startedAt, now) }}</template></ClientOnly>
        </p>
      </li>
    </ul>
    <p v-else class="font-mono text-xs text-text-ter">Aucune partie enregistrée pour le moment.</p>
  </section>
</template>
