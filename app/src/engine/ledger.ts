import type { DateKey, QBEvent } from './types'

export type WeekClose = Extract<QBEvent, { type: 'week.closed' }>

/**
 * Everything the derivations need from one ledger version, built once and shared.
 * `days` holds each kid's live dated events per date in time order, so a derivation
 * reads one day's events instead of scanning the whole ledger per chore and day.
 */
export interface Prepared {
  /** Every event, undos included, in ledger order (time, then insertion). */
  sorted: QBEvent[]
  /** Position of each event id in `sorted`. */
  pos: Map<string, number>
  /** Ids hidden by an effective undo. */
  undone: Set<string>
  /** Non-undo events not hidden by an undo, in ledger order. */
  live: QBEvent[]
  liveIds: Set<string>
  /** kidId, then date, then that day's live dated events in ledger order. */
  days: Map<string, Map<DateKey, QBEvent[]>>
  /** One live close per kid and weekStart (the latest by time), sorted by weekStart. */
  closes: Map<string, WeekClose[]>
  /** Number of undo events, part of the cache key for closed weeks. */
  undoCount: number
}

const ts = (e: QBEvent): number => Date.parse(e.at)

function byTime(events: QBEvent[]): QBEvent[] {
  return events
    .map((e, i) => ({ e, i, t: ts(e) }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map((x) => x.e)
}

function undoneFromSorted(sorted: QBEvent[]): Set<string> {
  const undone = new Set<string>()
  for (let i = sorted.length - 1; i >= 0; i--) {
    const e = sorted[i]
    if (e.type === 'undo' && !undone.has(e.id)) undone.add(e.targetEventId)
  }
  return undone
}

/** The last day a close covers: weekStart plus its day count, minus one. */
export function closeEnd(c: WeekClose): DateKey {
  const [y, m, d] = c.weekStart.split('-').map(Number)
  const end = new Date(y, m - 1, d + (c.days ?? 7) - 1)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`
}

function build(events: QBEvent[]): Prepared {
  const sorted = byTime(events)
  const pos = new Map<string, number>()
  sorted.forEach((e, i) => pos.set(e.id, i))
  const undone = undoneFromSorted(sorted)
  const live: QBEvent[] = []
  const liveIds = new Set<string>()
  const days = new Map<string, Map<DateKey, QBEvent[]>>()
  const latest = new Map<string, Map<DateKey, WeekClose>>()
  let undoCount = 0
  for (const e of sorted) {
    if (e.type === 'undo') { undoCount += 1; continue }
    if (undone.has(e.id)) continue
    live.push(e)
    liveIds.add(e.id)
    if (e.type === 'week.closed') {
      const perKid = latest.get(e.kidId) ?? new Map<DateKey, WeekClose>()
      perKid.set(e.weekStart, e)
      latest.set(e.kidId, perKid)
    } else if ('kidId' in e && 'date' in e) {
      const perKid = days.get(e.kidId) ?? new Map<DateKey, QBEvent[]>()
      const list = perKid.get(e.date)
      if (list) list.push(e)
      else perKid.set(e.date, [e])
      days.set(e.kidId, perKid)
    }
  }
  const closes = new Map<string, WeekClose[]>()
  for (const [kidId, perKid] of latest) {
    closes.set(kidId, [...perKid.values()].sort((a, b) => (a.weekStart < b.weekStart ? -1 : a.weekStart > b.weekStart ? 1 : 0)))
  }
  return { sorted, pos, undone, live, liveIds, days, closes, undoCount }
}

const cache = new WeakMap<QBEvent[], { key: string; prep: Prepared }>()

const keyOf = (events: QBEvent[]): string =>
  `${events.length}:${events[0]?.id ?? ''}:${events[events.length - 1]?.id ?? ''}`

/**
 * The prepared index for a ledger array. Cached per array, and rebuilt when the array was
 * changed in place (length or end ids differ), so callers may call it freely.
 */
export function prepare(events: QBEvent[]): Prepared {
  const key = keyOf(events)
  const hit = cache.get(events)
  if (hit && hit.key === key) return hit.prep
  const prep = build(events)
  cache.set(events, { key, prep })
  return prep
}

/** Ids that an effective undo points at. An undo that was itself undone does not count. */
export function undoneIds(events: QBEvent[]): Set<string> {
  return prepare(events).undone
}

/** Drops every event that is the target of an undo which is itself not undone. Shared, do not mutate. */
export function liveEvents(events: QBEvent[]): QBEvent[] {
  return prepare(events).live
}

/** The latest day covered by any live close for the kid, or null when nothing has closed. */
export function coveredThrough(kidId: string, prep: Prepared): DateKey | null {
  let max: DateKey | null = null
  for (const c of prep.closes.get(kidId) ?? []) {
    const end = closeEnd(c)
    if (max === null || end > max) max = end
  }
  return max
}

/** The kid's live events dated `date`, in ledger order. */
export function dayEvents(prep: Prepared, kidId: string, date: DateKey): QBEvent[] {
  return prep.days.get(kidId)?.get(date) ?? []
}
