import type { ValRankHistoryGranularity, ValStatsPeriod } from '~/lib/types'

/**
 * The profile's period switch. One value drives the performance recap (`period` on
 * `GET /val/player/{id}`) and the rank progression (`granularity` + `days` on `.../rank`), so the
 * tiles and the curve always describe the same window.
 */
export type ProfilePeriod = '7j' | '30j' | '3m' | 'all'

export interface ProfilePeriodOption {
  value: ProfilePeriod
  label: string
  /** Spelled out, for sentences and `aria-label`s: "sur 30 jours". */
  phrase: string
  api: ValStatsPeriod
  granularity: ValRankHistoryGranularity
  /** `undefined` lets the API reach back to the first snapshot. */
  days: number | undefined
}

export const PROFILE_PERIODS: ProfilePeriodOption[] = [
  { value: '7j', label: '7 j', phrase: 'sur 7 jours', api: 'Week', granularity: 'Day', days: 7 },
  { value: '30j', label: '30 j', phrase: 'sur 30 jours', api: 'Month', granularity: 'Day', days: 30 },
  { value: '3m', label: '3 mois', phrase: 'sur 3 mois', api: 'ThreeMonths', granularity: 'Week', days: 90 },
  { value: 'all', label: 'Tout', phrase: 'depuis le début', api: 'AllTime', granularity: 'Month', days: undefined },
]

export const DEFAULT_PROFILE_PERIOD: ProfilePeriod = '30j'

export function profilePeriod(value: ProfilePeriod): ProfilePeriodOption {
  return PROFILE_PERIODS.find(option => option.value === value) ?? PROFILE_PERIODS[1]!
}

/** Reads `?period=` back, falling back to the default for anything it does not know. */
export function parseProfilePeriod(value: unknown): ProfilePeriod {
  return PROFILE_PERIODS.some(option => option.value === value) ? value as ProfilePeriod : DEFAULT_PROFILE_PERIOD
}

/**
 * The records page's period switch (`period` on `GET /val/stats/global`). Same labels as the profile,
 * plus the six months the records endpoint also serves.
 */
export type RecordsPeriod = '7j' | '30j' | '3m' | '6m' | 'all'

export interface RecordsPeriodOption {
  value: RecordsPeriod
  label: string
  /** Spelled out, for sentences: "sur 30 jours". */
  phrase: string
  /** For the subtitle: "30 derniers jours". */
  window: string
  api: ValStatsPeriod
}

export const RECORDS_PERIODS: RecordsPeriodOption[] = [
  { value: '7j', label: '7 j', phrase: 'sur 7 jours', window: '7 derniers jours', api: 'Week' },
  { value: '30j', label: '30 j', phrase: 'sur 30 jours', window: '30 derniers jours', api: 'Month' },
  { value: '3m', label: '3 mois', phrase: 'sur 3 mois', window: '3 derniers mois', api: 'ThreeMonths' },
  { value: '6m', label: '6 mois', phrase: 'sur 6 mois', window: '6 derniers mois', api: 'SixMonths' },
  { value: 'all', label: 'Tout', phrase: 'depuis le début', window: 'Depuis le début', api: 'AllTime' },
]

/** The home page's records window, so following its link changes nothing but the filters on offer. */
export const DEFAULT_RECORDS_PERIOD: RecordsPeriod = '30j'

export function recordsPeriod(value: RecordsPeriod): RecordsPeriodOption {
  return RECORDS_PERIODS.find(option => option.value === value) ?? RECORDS_PERIODS[1]!
}

/** Reads `?period=` back, falling back to the default for anything it does not know. */
export function parseRecordsPeriod(value: unknown): RecordsPeriod {
  return RECORDS_PERIODS.some(option => option.value === value) ? value as RecordsPeriod : DEFAULT_RECORDS_PERIOD
}
