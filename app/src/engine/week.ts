import type { Cents, Chore, DateKey, Family, Kid, QBEvent } from './types'
import { addDays, isPastMidnightOf, weekDays } from './dates'
import { anyCents, effectiveMoney } from './money'
import { closeEnd, coveredThrough, dayEvents, prepare, type Prepared, type WeekClose } from './ledger'

export { liveEvents, undoneIds } from './ledger'

export interface ChoreDayState {
  checked: boolean
  verified: boolean
  rejected: boolean
  pending: boolean
  pays: boolean
  pay: Cents
}

export interface LostItem {
  reasonId: string
  label: string
  amount: Cents
  eventId: string
}

export interface WeekState {
  weekStart: DateKey
  days: DateKey[]
  start: Cents
  pay: Cents
  earnback: Cents
  deductions: Cents
  balance: Cents
  lostByDay: Record<DateKey, { amount: Cents; items: LostItem[] }>
  payByDay: Record<DateKey, Cents>
  useCents: boolean
  closed: boolean
  closedBalance?: Cents
  /** The close event's time and inactive flag, when closed. */
  closedAt?: string
  closedInactive?: boolean
}

const ts = (e: QBEvent): number => Date.parse(e.at)

/**
 * Chore state for one day from live events (any superset of that kid's live events for the day,
 * in ledger order). The latest verify or reject for the chore and date decides, whatever the kid
 * did after it (Ruling 24); with neither, the verification mode decides.
 */
export function choreDayStateLive(
  family: Family,
  kid: Kid,
  chore: Chore,
  date: DateKey,
  live: QBEvent[],
  now: Date,
): ChoreDayState {
  let checked = false
  let decision: 'verified' | 'rejected' | undefined
  for (const e of live) {
    if (!('choreId' in e) || e.kidId !== kid.id || e.choreId !== chore.id || e.date !== date) continue
    if (e.type === 'chore.checked') checked = true
    else if (e.type === 'chore.unchecked') checked = false
    else if (e.type === 'chore.verified') decision = 'verified'
    else if (e.type === 'chore.rejected') decision = 'rejected'
  }
  const none: ChoreDayState = { checked: false, verified: false, rejected: false, pending: false, pays: false, pay: 0 }
  if (!checked) return none
  const verified = decision === 'verified'
  const rejected = decision === 'rejected'

  let pays: boolean
  if (decision) pays = verified
  else if (family.verification === 'kid-final') pays = true
  else if (family.verification === 'kid-verify') pays = isPastMidnightOf(date, now)
  else pays = false

  const pending = !pays && !rejected
  return { checked: true, verified, rejected, pending, pays, pay: pays ? chore.pay : 0 }
}

export function choreDayState(
  family: Family,
  kid: Kid,
  chore: Chore,
  date: DateKey,
  events: QBEvent[],
  now: Date,
  prep?: Prepared,
): ChoreDayState {
  return choreDayStateLive(family, kid, chore, date, dayEvents(prep ?? prepare(events), kid.id, date), now)
}

/** Start money for a span of `n` counted days: the full amount for a whole week, a share for a partial one. */
function startFor(family: Family, kid: Kid, n: number): Cents {
  const full = effectiveMoney(family, kid).startAmount
  return n >= 7 ? full : Math.round((full * n) / 7)
}

/**
 * Sums a span. `counted` are the days that belong to it, `shown` the days the board draws.
 * A closed span reads only events recorded up to the close, judged at the close time.
 */
function evaluate(
  family: Family,
  kid: Kid,
  prep: Prepared,
  weekStart: DateKey,
  shown: DateKey[],
  counted: DateKey[],
  close: WeekClose | undefined,
  now: Date,
): WeekState {
  const cutoff = close ? ts(close) : Infinity
  const at = close && cutoff < now.getTime() ? new Date(cutoff) : now
  const start = startFor(family, kid, counted.length)

  const payByDay: Record<DateKey, Cents> = {}
  const lostByDay: WeekState['lostByDay'] = {}
  let pay = 0
  let deductions = 0
  let earnRaw = 0
  const amounts: Cents[] = [start]
  for (const date of counted) {
    const all = dayEvents(prep, kid.id, date)
    const day = close ? all.filter((e) => ts(e) <= cutoff) : all
    if (day.length === 0) continue
    let dayPay = 0
    for (const chore of kid.chores) dayPay += choreDayStateLive(family, kid, chore, date, day, at).pay
    if (dayPay !== 0) { payByDay[date] = dayPay; amounts.push(dayPay) }
    pay += dayPay
    for (const e of day) {
      if (e.type === 'deduction.logged') {
        const label = family.reasons.find((r) => r.id === e.reasonId)?.label ?? 'Deduction'
        const lost = lostByDay[date] ?? { amount: 0, items: [] }
        lost.amount += e.amount
        lost.items.push({ reasonId: e.reasonId, label, amount: e.amount, eventId: e.id })
        lostByDay[date] = lost
        deductions += e.amount
        amounts.push(e.amount)
      } else if (e.type === 'earnback.earned') {
        earnRaw += e.amount
      }
    }
  }
  const earnback = Math.min(earnRaw, Math.max(0, deductions))
  amounts.push(earnback)
  const balance = Math.max(0, start + pay + earnback - deductions)

  return {
    weekStart,
    days: shown,
    start,
    pay,
    earnback,
    deductions,
    balance,
    lostByDay,
    payByDay,
    useCents: anyCents(amounts),
    closed: close !== undefined,
    ...(close ? { closedBalance: close.balance, closedAt: close.at, ...(close.inactive ? { closedInactive: true } : {}) } : {}),
  }
}

/** Days from `from` through `to`, inclusive. */
export function spanDays(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

/** Closed weeks never change, so their state is cached per family, kid, close and undo count. */
const closedCache = new WeakMap<Family, WeakMap<Kid, Map<string, WeekState>>>()

/** The state of a closed span, cached by close id. `shown` defaults to the span's own days. */
export function closedState(
  family: Family,
  kid: Kid,
  prep: Prepared,
  close: WeekClose,
  weekStart: DateKey = close.weekStart,
  shown?: DateKey[],
): WeekState {
  const counted = spanDays(close.weekStart, closeEnd(close))
  const key = `${close.id}:${prep.undoCount}:${weekStart}:${shown ? shown.length : 0}`
  let perFamily = closedCache.get(family)
  if (!perFamily) { perFamily = new WeakMap(); closedCache.set(family, perFamily) }
  let perKid = perFamily.get(kid)
  if (!perKid) { perKid = new Map(); perFamily.set(kid, perKid) }
  const hit = perKid.get(key)
  if (hit) return hit
  // The judging time is the close itself, so `now` does not matter for a closed span.
  const state = evaluate(family, kid, prep, weekStart, shown ?? counted, counted, close, new Date(ts(close)))
  perKid.set(key, state)
  return state
}

/** The live close that ends the week starting `weekStart` (a full week, or the uncovered rest of it). */
export function closeForWeek(prep: Prepared, kidId: string, weekStart: DateKey): WeekClose | undefined {
  const days = weekDays(weekStart)
  const end = days[6]
  let found: WeekClose | undefined
  for (const c of prep.closes.get(kidId) ?? []) {
    if (c.weekStart >= weekStart && c.weekStart <= end && closeEnd(c) === end) {
      if (!found || ts(c) >= ts(found)) found = c
    }
  }
  return found
}

/** The state of an unclosed span from `from` through `to`, as dueWeekCloses would close it. */
export function openSpanState(family: Family, kid: Kid, prep: Prepared, from: DateKey, to: DateKey, now: Date): WeekState {
  const counted = spanDays(from, to)
  return evaluate(family, kid, prep, from, counted, counted, undefined, now)
}

/**
 * The week that starts on `weekStart`. Closed: frozen at the close. Open: days already covered
 * by a closed span (after a week start change) are left out, and the start money shrinks to match.
 */
export function weekState(family: Family, kid: Kid, events: QBEvent[], weekStart: DateKey, now: Date, prep?: Prepared): WeekState {
  const p = prep ?? prepare(events)
  const days = weekDays(weekStart)
  const close = closeForWeek(p, kid.id, weekStart)
  if (close) return closedState(family, kid, p, close, weekStart, days)
  const covered = coveredThrough(kid.id, p)
  const counted = covered === null ? days : days.filter((d) => d > covered)
  return evaluate(family, kid, p, weekStart, days, counted, undefined, now)
}

/** What the board shows: the recorded payday amount once the week is closed, else the live balance. */
export function displayBalance(ws: WeekState): Cents {
  return ws.closed && ws.closedBalance !== undefined ? ws.closedBalance : ws.balance
}

export function mathTerms(ws: WeekState): { start: Cents; plus: Cents; minus: Cents; result: Cents } {
  return { start: ws.start, plus: ws.pay + ws.earnback, minus: ws.deductions, result: ws.balance }
}

export function lostThisWeek(ws: WeekState): Cents {
  return ws.deductions
}

export function earnBackRoom(ws: WeekState): Cents {
  return Math.max(0, ws.deductions - ws.earnback)
}
