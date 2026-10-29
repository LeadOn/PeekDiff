import type { PlayerAccountDto, ValPlayerDto } from '~/lib/types'
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
  /** The main's nickname for a smurf. */
  smurfOf: string | null
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
        smurfOf: isSmurf(account) ? nameById.get(account.primaryPlayerId!) ?? `#${account.primaryPlayerId}` : null,
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
