import type { DateKey, Family, Kid, QBEvent } from './types'
import { addDays, dateKey, parseKey, weekDays, weekStartKey } from './dates'
import { choreDayState, liveEvents, weekState, type WeekState } from './week'

const SCAN_CAP = 400

function isPerfect(family: Family, kid: Kid, live: QBEvent[], date: DateKey, now: Date): boolean {
  const dow = parseKey(date).getDay()
  if (live.some((e) => e.type === 'deduction.logged' && e.kidId === kid.id && e.date === date)) return false

  let due = 0
  for (const chore of kid.chores) {
    if (!chore.active || !chore.days.includes(dow)) continue
    due += 1
    if (!choreDayState(family, kid, chore, date, live, now).checked) return false
  }

  for (const routineId of kid.routineIds) {
    const routine = family.routines.find((r) => r.id === routineId)
    if (!routine || !routine.days.includes(dow)) continue
    for (const step of routine.steps) {
      due += 1
      let done = false
      for (const e of live) {
        if (
          e.type === 'routine.step' && e.kidId === kid.id && e.routineId === routine.id &&
          e.stepId === step.id && e.date === date
        ) done = e.done
      }
      if (!done) return false
    }
  }
  // Nothing due and nothing done is not a perfect day.
  return due > 0
}

/** Every chore due, every routine step done, no deductions that day. Undone events are ignored. */
export function perfectDay(family: Family, kid: Kid, events: QBEvent[], date: DateKey, now: Date): boolean {
  return isPerfect(family, kid, liveEvents(events), date, now)
}

/** Consecutive perfect days ending today, or yesterday when today is not (yet) perfect. */
export function streak(family: Family, kid: Kid, events: QBEvent[], today: DateKey, now: Date): number {
  const live = liveEvents(events)
  let day = isPerfect(family, kid, live, today, now) ? today : addDays(today, -1)
  let count = 0
  while (count < SCAN_CAP && isPerfect(family, kid, live, day, now)) {
    count += 1
    day = addDays(day, -1)
  }
  return count
}

/** Perfect days from the family's first day through today, oldest first, scanning at most 400 days back. */
export function perfectDayKeys(family: Family, kid: Kid, events: QBEvent[], now: Date): DateKey[] {
  const live = liveEvents(events)
  const today = dateKey(now)
  const first = dateKey(new Date(family.createdAt))
  const out: DateKey[] = []
  let day = first
  const limit = addDays(today, -SCAN_CAP)
  if (day < limit) day = limit
  for (; day <= today; day = addDays(day, 1)) {
    if (isPerfect(family, kid, live, day, now)) out.push(day)
  }
  return out
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

/** WeekState for every week from the family's first week through the current week, oldest first. */
export function weekStatesFor(family: Family, kid: Kid, events: QBEvent[], now: Date): WeekState[] {
  const wsd = family.money.weekStartDay
  const last = weekStartKey(dateKey(now), wsd)
  const out: WeekState[] = []
  for (
    let start = weekStartKey(dateKey(new Date(family.createdAt)), wsd), i = 0;
    start <= last && i < 100;
    start = addDays(start, 7), i++
  ) {
    out.push(weekState(family, kid, events, start, now))
  }
  return out
}

/** Checked paid chores this week that still await verification or approval (not rejected). */
export function unverified(
  family: Family,
  kid: Kid,
  events: QBEvent[],
  now: Date,
): { choreId: string; date: DateKey }[] {
  if (family.verification === 'kid-final') return []
  const live = liveEvents(events)
  const start = weekStartKey(dateKey(now), family.money.weekStartDay)
  const out: { choreId: string; date: DateKey }[] = []
  for (const date of weekDays(start)) {
    for (const chore of kid.chores) {
      if (chore.pay <= 0) continue
      const s = choreDayState(family, kid, chore, date, live, now)
      if (s.checked && !s.pays && !s.rejected) out.push({ choreId: chore.id, date })
    }
  }
  return out
}
