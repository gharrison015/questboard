import type { DateKey } from './types'

const pad = (n: number): string => String(n).padStart(2, '0')

export function dateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseKey(k: DateKey): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(k: DateKey, n: number): DateKey {
  const d = parseKey(k)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

export function weekStartKey(k: DateKey, weekStartDay: number): DateKey {
  const dow = parseKey(k).getDay()
  const back = (dow - weekStartDay + 7) % 7
  return addDays(k, -back)
}

export function weekDays(start: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function isPastMidnightOf(k: DateKey, now: Date): boolean {
  return now.getTime() >= parseKey(addDays(k, 1)).getTime()
}

const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export function dayLabel(k: DateKey): (typeof SHORT)[number] {
  return SHORT[parseKey(k).getDay()]
}

export function dayFull(k: DateKey): (typeof FULL)[number] {
  return FULL[parseKey(k).getDay()]
}
