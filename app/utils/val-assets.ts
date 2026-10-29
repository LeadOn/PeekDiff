import { isValidTier } from '~/utils/val-tier'

/*
 * Valorant game assets, served by media.valorant-api.com — the CDN GameOn-API already builds its
 * URLs on (`ValorantPlayerCard*Url`, `ValorantPeakRankIconUrl`, `ValorantRankHistory.*IconUrl`).
 *
 * Prefer the URL the API sends when it sends one; these builders cover what it does not expose
 * (agents, roles, maps, rank triangles) and keep its rules where it does (valid tiers, empty card).
 * Every builder returns null when the id cannot produce an image: render the ASCII fallback then.
 */

const MEDIA = 'https://media.valorant-api.com'

/** The competitive tiers table GameOn-API pins (`CompetitiveTiersTableUuid`). */
export const COMPETITIVE_TIERS_TABLE = '03621f52-342b-cf4e-4f86-9350a49c6d04'

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000'

/** Rank emblem: `small` (chips, ladder rows, ≤ 32px) or `large` (rank cards, peak rank). Both 256px. */
export function rankIconUrl(tierId: number | null | undefined, size: 'small' | 'large' = 'small'): string | null {
  return isValidTier(tierId) ? `${MEDIA}/competitivetiers/${COMPETITIVE_TIERS_TABLE}/${tierId}/${size}icon.png` : null
}

/** Promotion / demotion triangle shown beside an RR change that crossed a division. */
export function rankTriangleUrl(tierId: number | null | undefined, direction: 'up' | 'down'): string | null {
  return isValidTier(tierId) && tierId !== 0
    ? `${MEDIA}/competitivetiers/${COMPETITIVE_TIERS_TABLE}/${tierId}/ranktriangle${direction}icon.png`
    : null
}

/** Player card: `small` 128×128 avatar, `wide` 452×128 banner, `large` 268×640 portrait. */
export function playerCardUrl(cardId: string | null | undefined, variant: 'small' | 'wide' | 'large'): string | null {
  return cardId && cardId !== EMPTY_GUID ? `${MEDIA}/playercards/${cardId}/${variant}art.png` : null
}

const AGENT_FILES = {
  icon: 'displayicon', // 1024×1024 square head — avatars, feed rows, scoreboards
  portrait: 'fullportrait', // 2048×1860 transparent full body — heroes only
  killfeed: 'killfeedportrait', // 128×64 — kill feed lines
  background: 'background', // 700×1024 agent's name art — never on its own, behind the portrait
  minimap: 'minimapportrait', // minimap marker
} as const

export function agentImageUrl(agentId: string | null | undefined, variant: keyof typeof AGENT_FILES = 'icon'): string | null {
  return agentId ? `${MEDIA}/agents/${agentId}/${AGENT_FILES[variant]}.png` : null
}

/**
 * The agent uuid inside a URL the API built on the CDN (`MainAgentIconUrl`, `AgentIconUrl`), so the
 * other variants of the same agent can be derived: `/agents/{uuid}/displayicon.png` → `{uuid}`.
 */
export function agentIdFromUrl(url: string | null | undefined): string | null {
  return url?.match(/\/agents\/([0-9a-f-]{36})\//i)?.[1] ?? null
}

export type AgentRole = 'duelist' | 'initiator' | 'controller' | 'sentinel'

/** Role uuid, French label and icon (128px white glyph; tint it with the `role-*` token via a mask). */
export const AGENT_ROLES: Record<AgentRole, { id: string, label: string, iconUrl: string }> = {
  duelist: { id: 'dbe8757e-9e92-4ed4-b39f-9dfc589691d4', label: 'Duelliste', iconUrl: `${MEDIA}/agents/roles/dbe8757e-9e92-4ed4-b39f-9dfc589691d4/displayicon.png` },
  initiator: { id: '1b47567f-8f7b-444b-aae3-b0c634622d10', label: 'Initiateur', iconUrl: `${MEDIA}/agents/roles/1b47567f-8f7b-444b-aae3-b0c634622d10/displayicon.png` },
  controller: { id: '4ee40330-ecdd-4f2f-98a8-eb1243428373', label: 'Contrôleur', iconUrl: `${MEDIA}/agents/roles/4ee40330-ecdd-4f2f-98a8-eb1243428373/displayicon.png` },
  sentinel: { id: '5fc02f99-4091-4486-a531-98459a3e95e9', label: 'Sentinelle', iconUrl: `${MEDIA}/agents/roles/5fc02f99-4091-4486-a531-98459a3e95e9/displayicon.png` },
}

const MAP_FILES = {
  minimap: 'displayicon', // 1024×1024 top-down layout — match page minimap
  banner: 'listviewicon', // 456×100 strip — match cards
  tall: 'listviewicontall', // 1920×1080 — map stats tiles
  splash: 'splash', // 1920×1080 loading art — match hero, under the night scrim
  stylized: 'stylizedbackgroundimage', // 2560×1440 painted art — empty states, large backdrops
} as const

/**
 * Competitive maps by their game path. `ValorantRankHistory.MapId` may hold the path rather than
 * the uuid; `resolveMap` accepts either. Pool as of patch 11 — refresh from `GET /v1/maps`.
 */
export const COMPETITIVE_MAPS: Record<string, { id: string, name: string }> = {
  '/Game/Maps/Ascent/Ascent': { id: '7eaecc1b-4337-bbf6-6ab9-04b8f06b3319', name: 'Ascent' },
  '/Game/Maps/Bonsai/Bonsai': { id: 'd960549e-485c-e861-8d71-aa9d1aed12a2', name: 'Split' },
  '/Game/Maps/Canyon/Canyon': { id: 'b529448b-4d60-346e-e89e-00a4c527a405', name: 'Fracture' },
  '/Game/Maps/Duality/Duality': { id: '2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba', name: 'Bind' },
  '/Game/Maps/Foxtrot/Foxtrot': { id: '2fb9a4fd-47b8-4e7d-a969-74b4046ebd53', name: 'Breeze' },
  '/Game/Maps/Infinity/Infinity': { id: '224b0a95-48b9-f703-1bd8-67aca101a61f', name: 'Abyss' },
  '/Game/Maps/Jam/Jam': { id: '2fe4ed3a-450a-948b-6d6b-e89a78e680a9', name: 'Lotus' },
  '/Game/Maps/Juliett/Juliett': { id: '92584fbe-486a-b1b2-9faa-39b0f486b498', name: 'Sunset' },
  '/Game/Maps/Pitt/Pitt': { id: 'fd267378-4d1d-484f-ff52-77821ed10dc2', name: 'Pearl' },
  '/Game/Maps/Plummet/Plummet': { id: '756da597-416b-c0f2-f47b-afbdf28670bc', name: 'Summit' },
  '/Game/Maps/Port/Port': { id: 'e2ad5c54-4114-a870-9641-8ea21279579a', name: 'Icebox' },
  '/Game/Maps/Rook/Rook': { id: '1c18ab1f-420d-0d8b-71d0-77ad3c439115', name: 'Corrode' },
  '/Game/Maps/Triad/Triad': { id: '2bee0dc9-4ffe-519b-1cbd-7fbe763a6047', name: 'Haven' },
}

/** A map uuid from either a uuid or a game path; null for an unknown path. */
export function resolveMap(mapId: string | null | undefined): string | null {
  if (!mapId) return null
  return mapId.startsWith('/Game/') ? COMPETITIVE_MAPS[mapId]?.id ?? null : mapId
}

export function mapImageUrl(mapId: string | null | undefined, variant: keyof typeof MAP_FILES = 'banner'): string | null {
  const id = resolveMap(mapId)
  return id ? `${MEDIA}/maps/${id}/${MAP_FILES[variant]}.png` : null
}
