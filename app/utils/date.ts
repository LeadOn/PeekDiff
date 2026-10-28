/**
 * Calendar helpers for the dashboard.
 *
 * Everything is computed in Europe/Paris, explicitly: the crew is French, and a server rendering in
 * UTC would otherwise group a 00:30 game under the previous day while the browser put it under the
 * right one — a hydration mismatch and a wrong heading at once.
 */

const TIME_ZONE = 'Europe/Paris'
const DAY_MS = 86_400_000

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const clockFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

// Day keys are already Paris dates, so they are formatted back in UTC to avoid shifting them again.
const weekdayLongFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long' })
const weekdayNarrowFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'narrow' })
const shortDateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short' })
const dayMonthFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
const longDateFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1)

/** "2026-09-25": the Paris calendar day of an instant. */
export function parisDayKey(value: string | number | Date): string {
  return dayKeyFormat.format(new Date(value))
}

/** Noon UTC on the day a key names — a safe instant to format that day from. */
function keyToDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12))
}

/** Whole days from `from` to `to`, both day keys. */
export function daysBetween(from: string, to: string): number {
  return Math.round((keyToDate(to).getTime() - keyToDate(from).getTime()) / DAY_MS)
}

/** "01:12", Paris time. */
export function formatClock(value: string | number | Date): string {
  return clockFormat.format(new Date(value))
}

/** "14 sept." */
export function formatDayMonth(value: string | number | Date): string {
  return shortDateFormat.format(keyToDate(parisDayKey(value)))
}

/**
 * Heading for a group of games: `{ label: "Aujourd'hui", date: "mer. 23 sept." }`, then "Hier", then
 * the weekday ("Lundi", "21 sept.").
 */
export function dayHeading(key: string, todayKey: string): { label: string, date: string } {
  const date = keyToDate(key)
  const age = daysBetween(key, todayKey)
  if (age === 0) return { label: 'Aujourd\'hui', date: dayMonthFormat.format(date) }
  if (age === 1) return { label: 'Hier', date: dayMonthFormat.format(date) }
  return { label: capitalize(weekdayLongFormat.format(date)), date: shortDateFormat.format(date) }
}

/**
 * Heading for a day of a player's history, which reaches back months: "Aujourd'hui", "Hier", then
 * the full date with its year ("23 septembre 2026").
 */
export function longDayLabel(key: string, todayKey: string): string {
  const age = daysBetween(key, todayKey)
  if (age === 0) return 'Aujourd\'hui'
  if (age === 1) return 'Hier'
  return longDateFormat.format(keyToDate(key))
}

/** Labels the per-day charts print for a day key: `{ initial: "V", title: "Ven. 25 · aujourd'hui" }`. */
export function describeDay(key: string, todayKey: string): { initial: string, title: string, isToday: boolean } {
  const date = keyToDate(key)
  const weekday = capitalize(dayMonthFormat.format(date).split(' ')[0] ?? '')
  const isToday = key === todayKey
  return {
    initial: weekdayNarrowFormat.format(date).toUpperCase(),
    title: `${weekday} ${date.getUTCDate()}${isToday ? ' · aujourd\'hui' : ''}`,
    isToday,
  }
}

/** "19 – 25 sept.", "22 sept." for a single day, "29 sept. – 2 oct." across months. */
export function dayRange(startKey: string, endKey: string): string {
  const start = keyToDate(startKey)
  const end = keyToDate(endKey)
  if (startKey === endKey) return shortDateFormat.format(end)
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${start.getUTCDate()} – ${shortDateFormat.format(end)}`
  }
  return `${shortDateFormat.format(start)} – ${shortDateFormat.format(end)}`
}

/** "à l'instant", "il y a 4 min", "il y a 2 h", "il y a 3 j". */
export function timeAgo(value: string | number | Date, now: number): string {
  const minutes = Math.max(0, Math.floor((now - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return 'à l\'instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `il y a ${Math.floor(hours / 24)} j`
}
