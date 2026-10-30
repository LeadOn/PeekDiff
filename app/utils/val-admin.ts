import type { PlayerAccountDto, ValPlayerDto } from '~/lib/types'
import { AppError, errorStatusCode } from '~/lib/types/error'
import { hasRiotId, hasValorantProfile } from '~/utils/val-profile'
import { isSmurf } from '~/utils/val-smurf'

/** Where an account stands: in the crew, outside it, or archived (whatever its crew flag). */
export type AdminAccountStatus = 'crew' | 'out' | 'archived'

/** One row of the admin space's account list. */
export interface AdminAccountRow {
  id: number
  nickname: string
  fullName: string | null
  /** "Name#TAG", `null` without a complete Riot ID. */
  riotId: string | null
  riotGamesNickname: string | null
  riotGamesTagLine: string | null
  hasProfile: boolean
  status: AdminAccountStatus
  /** The account's own crew flag, whatever its archived state. */
  inCrew: boolean
  archived: boolean
  /** The main's nickname for a smurf. */
  smurfOf: string | null
  /** The main's id for a smurf. A smurf holds no smurfs of its own: the API refuses chains. */
  smurfOfId: number | null
  /** The accounts linked to this one as its smurfs. */
  smurfs: { id: number, nickname: string, inCrew: boolean }[]
  /** The account's Valorant side (card, rank), absent without a Riot ID or before its first sync. */
  val: ValPlayerDto | null
  refreshedOn: string | null
}

const STATUS_ORDER: Record<AdminAccountStatus, number> = { crew: 0, out: 1, archived: 2 }

/**
 * Joins the raw accounts (`GET /player`, every one of them) with their Valorant side
 * (`GET /val/player`, only those with a Riot ID). Crew first, then outside the crew, then archived;
 * within each, the accounts still missing a Riot ID first, since they are the ones to fix.
 */
export function buildAdminRows(accounts: PlayerAccountDto[], valAccounts: ValPlayerDto[]): AdminAccountRow[] {
  const valById = new Map(valAccounts.map(player => [player.id, player]))
  const nameById = new Map(accounts.map(account => [account.id, account.nickname]))
  const smurfsByMain = new Map<number, AdminAccountRow['smurfs']>()
  for (const account of accounts) {
    if (!isSmurf(account)) continue
    const list = smurfsByMain.get(account.primaryPlayerId!) ?? []
    list.push({ id: account.id, nickname: account.nickname, inCrew: account.inCrew })
    smurfsByMain.set(account.primaryPlayerId!, list)
  }

  return accounts
    .map((account): AdminAccountRow => {
      const val = valById.get(account.id) ?? null
      const complete = hasRiotId(account)
      return {
        id: account.id,
        nickname: account.nickname,
        fullName: account.fullName,
        riotId: complete ? `${account.riotGamesNickname}#${account.riotGamesTagLine}` : null,
        riotGamesNickname: account.riotGamesNickname,
        riotGamesTagLine: account.riotGamesTagLine,
        hasProfile: hasValorantProfile(account),
        status: account.archived ? 'archived' : account.inCrew ? 'crew' : 'out',
        inCrew: account.inCrew,
        archived: account.archived,
        smurfOf: isSmurf(account) ? nameById.get(account.primaryPlayerId!) ?? `#${account.primaryPlayerId}` : null,
        smurfOfId: isSmurf(account) ? account.primaryPlayerId : null,
        smurfs: (smurfsByMain.get(account.id) ?? []).sort((a, b) => a.nickname.localeCompare(b.nickname, 'fr', { sensitivity: 'base' })),
        val,
        refreshedOn: val?.valorantRefreshedOn ?? account.valorantRefreshedOn,
      }
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      || Number(!!a.riotId) - Number(!!b.riotId)
      || a.nickname.localeCompare(b.nickname, 'fr', { sensitivity: 'base' }))
}

/** Rows per status, and the active accounts still missing a Riot ID. */
export function countAdminRows(rows: AdminAccountRow[]) {
  return {
    crew: rows.filter(row => row.status === 'crew').length,
    out: rows.filter(row => row.status === 'out').length,
    archived: rows.filter(row => row.status === 'archived').length,
    missingRiotId: rows.filter(row => row.status !== 'archived' && !row.riotId).length,
  }
}

/** Riot match ids are uuids. */
export const isMatchId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

/** "1 smurf", "2 smurfs". */
export const smurfCount = (count: number) => `${count} smurf${count > 1 ? 's' : ''}`

/**
 * Wording for the failures every admin write shares. `fallback` covers whatever is specific to the
 * route (a 404, a 409) and is worded by the caller.
 */
export function adminErrorMessage(error: unknown, fallback: string): string {
  const code = errorStatusCode(error)
  if (code === 401) return 'Session expirée : reconnectez-vous puis recommencez.'
  if (code === 403) return 'L\'API refuse : cette action demande le rôle gameon_admin.'
  if (code === 0) return 'L\'API n\'a pas répondu.'
  if (code === 502) return 'L\'API est injoignable.'
  if (code === 504) return 'L\'API a mis plus de deux minutes à répondre.'
  return fallback
}

/** The English sentence the API answers a refusal with; only read to tell two refusals apart. */
const refusalText = (error: unknown) => (error instanceof AppError && typeof error.details === 'string' ? error.details : '')

/**
 * `POST /val/player/{id}/smurfs` refuses with two 404s and two 409s, each an English sentence. The
 * status decides; the sentence only tells the two of a kind apart, with a wording that holds for
 * both when it changes.
 */
export function linkSmurfErrorMessage(error: unknown): string {
  const code = errorStatusCode(error)
  const text = refusalText(error)
  if (code === 404) {
    if (/riot/i.test(text)) return 'Riot ne connaît pas ce Riot ID : vérifiez le nom et le tag.'
    if (/player/i.test(text)) return 'Le compte principal n\'existe plus.'
    return 'Riot ID ou compte principal introuvable.'
  }
  if (code === 409) {
    if (/already a smurf/i.test(text)) return 'Ce compte est lui-même un smurf : liez plutôt à son compte principal.'
    if (/already used/i.test(text)) return 'Ce compte Riot appartient déjà à quelqu\'un (compte qui se connecte, qui a ses propres smurfs, ou déjà lié ailleurs) : déliez-le d\'abord.'
    return 'Ce lien est refusé : le compte principal est un smurf, ou ce compte Riot appartient déjà à quelqu\'un.'
  }
  return adminErrorMessage(error, 'La liaison a échoué. Réessayez dans un instant.')
}
