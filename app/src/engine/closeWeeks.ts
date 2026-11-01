import type { DateKey, Family, Kid, QBEvent } from './types'
import { addDays, dateKey, weekDays, weekStartKey } from './dates'
import { newId } from './ids'
import { choreDayState, liveEvents, weekState } from './week'

export function currentWeekStart(family: Family, now: Date): DateKey {
  return weekStartKey(dateKey(now), family.money.weekStartDay)
}

/** Dated chore, routine, deduction and earn-back events count as activity; jar events do not. */
function activityDate(e: QBEvent): DateKey | undefined {
  switch (e.type) {
    case 'chore.checked':
    case 'chore.unchecked':
    case 'chore.verified':
    case 'chore.rejected':
    case 'routine.step':
    case 'deduction.logged':
    case 'earnback.earned':
      return e.date
    default:
      return undefined
  }
}

function belongsToKid(e: QBEvent, kidId: string): boolean {
  return 'kidId' in e && e.kidId === kidId
}

function hasActivity(kid: Kid, live: QBEvent[], days: DateKey[]): boolean {
  const inWeek = new Set(days)
  return live.some((e) => {
    if (!belongsToKid(e, kid.id)) return false
    const d = activityDate(e)
    return d !== undefined && inWeek.has(d)
  })
}

/** Close events for every unclosed past week of every active kid, oldest first. */
export function dueWeekCloses(family: Family, events: QBEvent[], now: Date): QBEvent[] {
  const live = liveEvents(events)
  const current = currentWeekStart(family, now)
  const first = weekStartKey(dateKey(new Date(family.createdAt)), family.money.weekStartDay)
  const out: QBEvent[] = []
  for (const kid of family.kids) {
    if (kid.archived) continue
    const closedWeeks = new Set(
      live.filter((e) => e.type === 'week.closed' && e.kidId === kid.id).map((e) => (e.type === 'week.closed' ? e.weekStart : '')),
    )
    for (let ws = first; ws < current; ws = addDays(ws, 7)) {
      if (closedWeeks.has(ws)) continue
      const active = hasActivity(kid, live, weekDays(ws))
      const balance = active ? weekState(family, kid, events, ws, now).balance : 0
      out.push({
        id: newId(),
        at: now.toISOString(),
        type: 'week.closed',
        kidId: kid.id,
        weekStart: ws,
        balance,
        ...(active ? {} : { inactive: true }),
      })
    }
  }
  return out
}

/** Chores checked last week in parent-approve mode that were never verified or rejected. */
export function lastWeekMissedApprovals(family: Family, kid: Kid, events: QBEvent[], now: Date): number {
  if (family.verification !== 'parent-approve') return 0
  const prev = addDays(currentWeekStart(family, now), -7)
  let count = 0
  for (const date of weekDays(prev)) {
    for (const chore of kid.chores) {
      const s = choreDayState(family, kid, chore, date, events, now)
      if (s.checked && !s.verified && !s.rejected) count += 1
    }
  }
  return count
}

/** True when any closed week or the current week involves sub-dollar amounts. */
export function kidUsesCents(family: Family, kid: Kid, events: QBEvent[], now: Date): boolean {
  const anyClosed = liveEvents(events).some(
    (e) => e.type === 'week.closed' && e.kidId === kid.id && e.balance % 100 !== 0,
  )
  if (anyClosed) return true
  return weekState(family, kid, events, currentWeekStart(family, now), now).useCents
}
