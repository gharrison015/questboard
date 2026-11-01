import type { DateKey, Family, Kid, QBEvent } from './types'
import { addDays, dateKey, parseKey, weekDays, weekStartKey } from './dates'
import { coveredThrough, dayEvents, prepare, type Prepared } from './ledger'
import { choreDayStateLive, closedState, openSpanState, weekState, type WeekState } from './week'

const SCAN_CAP = 400

/** Groups the kid's live dated events by date, keeping time order, so each day reads only its own events. */
export function dayBuckets(kid: Kid, live: QBEvent[]): Map<DateKey, QBEvent[]> {
  const map = new Map<DateKey, QBEvent[]>()
  for (const e of live) {
    if (!('kidId' in e) || e.kidId !== kid.id || !('date' in e)) continue
    const list = map.get(e.date)
    if (list) list.push(e)
    else map.set(e.date, [e])
  }
  return map
}

function isPerfect(family: Family, kid: Kid, prep: Prepared, date: DateKey, now: Date): boolean {
  const day = dayEvents(prep, kid.id, date)
  const dow = parseKey(date).getDay()
  if (day.some((e) => e.type === 'deduction.logged')) return false

  let due = 0
  for (const chore of kid.chores) {
    if (!chore.active || !chore.days.includes(dow)) continue
    due += 1
    if (!choreDayStateLive(family, kid, chore, date, day, now).checked) return false
  }

  for (const routineId of kid.routineIds) {
    const routine = family.routines.find((r) => r.id === routineId)
    if (!routine || !routine.days.includes(dow)) continue
    for (const step of routine.steps) {
      due += 1
      let done = false
      for (const e of day) {
        if (e.type === 'routine.step' && e.routineId === routine.id && e.stepId === step.id) done = e.done
      }
      if (!done) return false
    }
  }
  // Nothing due and nothing done is not a perfect day.
  return due > 0
}

/** Every chore due, every routine step done, no deductions that day. Undone events are ignored. */
export function perfectDay(family: Family, kid: Kid, events: QBEvent[], date: DateKey, now: Date, prep?: Prepared): boolean {
  return isPerfect(family, kid, prep ?? prepare(events), date, now)
}

/** Consecutive perfect days ending today, or yesterday when today is not (yet) perfect. */
export function streak(family: Family, kid: Kid, events: QBEvent[], today: DateKey, now: Date, prep?: Prepared): number {
  const p = prep ?? prepare(events)
  let day = isPerfect(family, kid, p, today, now) ? today : addDays(today, -1)
  let count = 0
  while (count < SCAN_CAP && isPerfect(family, kid, p, day, now)) {
    count += 1
    day = addDays(day, -1)
  }
  return count
}

/** Perfect days per prepared ledger, family, kid and date, so badges and best streak share one scan. */
const perfectCache = new WeakMap<Prepared, WeakMap<Family, WeakMap<Kid, Map<DateKey, DateKey[]>>>>()

/** Perfect days from the family's first day through today, oldest first, scanning at most 400 days back. */
export function perfectDayKeys(family: Family, kid: Kid, events: QBEvent[], now: Date, prep?: Prepared): DateKey[] {
  const p = prep ?? prepare(events)
  const today = dateKey(now)
  let byFamily = perfectCache.get(p)
  if (!byFamily) { byFamily = new WeakMap(); perfectCache.set(p, byFamily) }
  let byKid = byFamily.get(family)
  if (!byKid) { byKid = new WeakMap(); byFamily.set(family, byKid) }
  let byDate = byKid.get(kid)
  if (!byDate) { byDate = new Map(); byKid.set(kid, byDate) }
  const hit = byDate.get(today)
  if (hit) return hit

  const first = dateKey(new Date(family.createdAt))
  const out: DateKey[] = []
  let day = first
  const limit = addDays(today, -SCAN_CAP)
  if (day < limit) day = limit
  for (; day <= today; day = addDays(day, 1)) {
    if (isPerfect(family, kid, p, day, now)) out.push(day)
  }
  byDate.set(today, out)
  return out
}

/** The longest run of consecutive perfect days from the family's first day through today. */
export function bestStreak(family: Family, kid: Kid, events: QBEvent[], now: Date, prep?: Prepared): number {
  let best = 0
  let run = 0
  let prev: DateKey | null = null
  for (const d of perfectDayKeys(family, kid, events, now, prep)) {
    run = prev !== null && d === addDays(prev, 1) ? run + 1 : 1
    if (run > best) best = run
    prev = d
  }
  return best
}

/** The date on which a run of n consecutive perfect days was first reached, or null. */
export function streakReachedOn(perfectDays: DateKey[], n: number): DateKey | null {
  let run = 0
  for (let i = 0; i < perfectDays.length; i++) {
    run = i > 0 && perfectDays[i] === addDays(perfectDays[i - 1], 1) ? run + 1 : 1
    if (run >= n) return perfectDays[i]
  }
  return null
}

/**
 * Every span from the family's first week through the current week, oldest first: each closed
 * span as it was closed, then the unclosed spans after the latest close, ending with the open week.
 */
export function weekStatesFor(family: Family, kid: Kid, events: QBEvent[], now: Date, prep?: Prepared): WeekState[] {
  const p = prep ?? prepare(events)
  const wsd = family.money.weekStartDay
  const last = weekStartKey(dateKey(now), wsd)
  const out: WeekState[] = (p.closes.get(kid.id) ?? []).map((c) => closedState(family, kid, p, c))
  const covered = coveredThrough(kid.id, p)
  let from = covered === null ? weekStartKey(dateKey(new Date(family.createdAt)), wsd) : addDays(covered, 1)
  while (from <= addDays(last, 6)) {
    const boundary = weekStartKey(from, wsd)
    if (boundary === last) {
      out.push(weekState(family, kid, events, last, now, p))
      break
    }
    const to = addDays(boundary, 6)
    out.push(openSpanState(family, kid, p, from, to, now))
    from = addDays(to, 1)
  }
  return out
}

/** Checked paid chores this week that still await verification or approval (not rejected). */
export function unverified(
  family: Family,
  kid: Kid,
  events: QBEvent[],
  now: Date,
  prep?: Prepared,
): { choreId: string; date: DateKey }[] {
  if (family.verification === 'kid-final') return []
  const p = prep ?? prepare(events)
  const start = weekStartKey(dateKey(now), family.money.weekStartDay)
  const out: { choreId: string; date: DateKey }[] = []
  for (const date of weekDays(start)) {
    for (const chore of kid.chores) {
      if (chore.pay <= 0) continue
      const s = choreDayStateLive(family, kid, chore, date, dayEvents(p, kid.id, date), now)
      if (s.checked && !s.pays && !s.rejected) out.push({ choreId: chore.id, date })
    }
  }
  return out
}
