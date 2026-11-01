import type { DateKey, Family, Kid, QBEvent } from './types'
import { addDays, dateKey, weekDays, weekStartKey } from './dates'
import { newId } from './ids'
import { coveredThrough, dayEvents, prepare, type Prepared } from './ledger'
import { choreDayState, openSpanState, weekState } from './week'

export function currentWeekStart(family: Family, now: Date): DateKey {
  return weekStartKey(dateKey(now), family.money.weekStartDay)
}

/** Dated chore, routine, deduction and earn-back events count as activity; jar events do not. */
function hasActivity(prep: Prepared, kid: Kid, days: DateKey[]): boolean {
  return days.some((d) => dayEvents(prep, kid.id, d).length > 0)
}

/**
 * Close events for every unclosed past span of every active kid, oldest first.
 * A kid's spans start the day after the latest closed one (Ruling 22), so a week start change
 * never re-closes history: the first span may be short and is stored with `days`.
 */
export function dueWeekCloses(family: Family, events: QBEvent[], now: Date, prep?: Prepared): QBEvent[] {
  const p = prep ?? prepare(events)
  const wsd = family.money.weekStartDay
  const current = currentWeekStart(family, now)
  const first = weekStartKey(dateKey(new Date(family.createdAt)), wsd)
  const at = now.toISOString()
  const out: QBEvent[] = []
  for (const kid of family.kids) {
    if (kid.archived) continue
    const covered = coveredThrough(kid.id, p)
    let from = covered === null ? first : addDays(covered, 1)
    while (from < current) {
      const to = addDays(weekStartKey(from, wsd), 6)
      const days = weekDays(from).filter((d) => d <= to)
      const active = hasActivity(p, kid, days)
      const balance = active ? openSpanState(family, kid, p, from, to, now).balance : 0
      out.push({
        id: newId(),
        at,
        type: 'week.closed',
        kidId: kid.id,
        weekStart: from,
        balance,
        ...(days.length < 7 ? { days: days.length } : {}),
        ...(active ? {} : { inactive: true }),
      })
      from = addDays(to, 1)
    }
  }
  return out
}

/**
 * "Close week now": any due earlier closes first, then the kid's current week (or its uncovered
 * rest). Returns nothing new for the current week when it is already closed.
 */
export function closeCurrentWeek(family: Family, kid: Kid, events: QBEvent[], now: Date): QBEvent[] {
  const due = dueWeekCloses(family, events, now)
  const all = due.length > 0 ? [...events, ...due] : events
  const p = prepare(all)
  const start = currentWeekStart(family, now)
  const ws = weekState(family, kid, all, start, now, p)
  if (ws.closed) return due
  const covered = coveredThrough(kid.id, p)
  const days = weekDays(start).filter((d) => covered === null || d > covered)
  if (days.length === 0) return due
  return [...due, {
    id: newId(),
    at: now.toISOString(),
    type: 'week.closed',
    kidId: kid.id,
    weekStart: days[0],
    balance: ws.balance,
    ...(days.length < 7 ? { days: days.length } : {}),
  }]
}

/** Chores checked last week in parent-approve mode that were never verified or rejected. */
export function lastWeekMissedApprovals(family: Family, kid: Kid, events: QBEvent[], now: Date, prep?: Prepared): number {
  if (family.verification !== 'parent-approve') return 0
  const p = prep ?? prepare(events)
  const prev = addDays(currentWeekStart(family, now), -7)
  let count = 0
  for (const date of weekDays(prev)) {
    for (const chore of kid.chores) {
      const s = choreDayState(family, kid, chore, date, events, now, p)
      if (s.checked && !s.verified && !s.rejected) count += 1
    }
  }
  return count
}

/** True when any closed week or the current week involves sub-dollar amounts. */
export function kidUsesCents(family: Family, kid: Kid, events: QBEvent[], now: Date, prep?: Prepared): boolean {
  const p = prep ?? prepare(events)
  if ((p.closes.get(kid.id) ?? []).some((c) => c.balance % 100 !== 0)) return true
  return weekState(family, kid, events, currentWeekStart(family, now), now, p).useCents
}
