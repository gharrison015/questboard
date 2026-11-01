import type { Cents, Chore, DateKey, Family, Kid, QBEvent } from './types'
import { isPastMidnightOf, weekDays } from './dates'
import { anyCents, effectiveMoney } from './money'

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
}

const ts = (e: QBEvent): number => Date.parse(e.at)

function byTime(events: QBEvent[]): QBEvent[] {
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => ts(a.e) - ts(b.e) || a.i - b.i)
    .map((x) => x.e)
}

/** Drops every event that is the target of an undo which is itself not undone. */
export function liveEvents(events: QBEvent[]): QBEvent[] {
  const sorted = byTime(events)
  const undone = new Set<string>()
  for (let i = sorted.length - 1; i >= 0; i--) {
    const e = sorted[i]
    if (e.type === 'undo' && !undone.has(e.id)) undone.add(e.targetEventId)
  }
  return sorted.filter((e) => e.type !== 'undo' && !undone.has(e.id))
}

/** Same as choreDayState but trusts that `live` is already filtered and sorted by liveEvents. */
export function choreDayStateLive(
  family: Family,
  kid: Kid,
  chore: Chore,
  date: DateKey,
  live: QBEvent[],
  now: Date,
): ChoreDayState {
  let lastIdx = -1
  for (let i = 0; i < live.length; i++) {
    const e = live[i]
    if (
      (e.type === 'chore.checked' || e.type === 'chore.unchecked') &&
      e.kidId === kid.id && e.choreId === chore.id && e.date === date
    ) lastIdx = i
  }
  const none: ChoreDayState = { checked: false, verified: false, rejected: false, pending: false, pays: false, pay: 0 }
  if (lastIdx < 0 || live[lastIdx].type !== 'chore.checked') return none

  // The latest verify or reject after the last check decides; sort position breaks timestamp ties.
  let decision: 'verified' | 'rejected' | undefined
  for (let i = lastIdx + 1; i < live.length; i++) {
    const e = live[i]
    if (e.type !== 'chore.verified' && e.type !== 'chore.rejected') continue
    if (e.kidId !== kid.id || e.choreId !== chore.id || e.date !== date) continue
    decision = e.type === 'chore.verified' ? 'verified' : 'rejected'
  }
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
): ChoreDayState {
  return choreDayStateLive(family, kid, chore, date, liveEvents(events), now)
}

export function weekState(family: Family, kid: Kid, events: QBEvent[], weekStart: DateKey, now: Date): WeekState {
  const all = liveEvents(events)
  let closeEvent: Extract<QBEvent, { type: 'week.closed' }> | undefined
  for (const e of all) {
    if (e.type === 'week.closed' && e.kidId === kid.id && e.weekStart === weekStart) closeEvent = e
  }
  // A closed week is frozen: nothing recorded after the close changes the live fields.
  const live = closeEvent ? all.filter((e) => ts(e) <= ts(closeEvent)) : all
  const days = weekDays(weekStart)
  const inWeek = new Set(days)
  const start = effectiveMoney(family, kid).startAmount

  const payByDay: Record<DateKey, Cents> = {}
  let pay = 0
  for (const date of days) {
    let dayPay = 0
    for (const chore of kid.chores) {
      dayPay += choreDayStateLive(family, kid, chore, date, live, now).pay
    }
    if (dayPay !== 0) payByDay[date] = dayPay
    pay += dayPay
  }

  const lostByDay: WeekState['lostByDay'] = {}
  let deductions = 0
  let earnRaw = 0
  const amounts: Cents[] = [start, ...Object.values(payByDay)]
  for (const e of live) {
    if (e.type === 'deduction.logged' && e.kidId === kid.id && inWeek.has(e.date)) {
      const label = family.reasons.find((r) => r.id === e.reasonId)?.label ?? 'Deduction'
      const day = lostByDay[e.date] ?? { amount: 0, items: [] }
      day.amount += e.amount
      day.items.push({ reasonId: e.reasonId, label, amount: e.amount, eventId: e.id })
      lostByDay[e.date] = day
      deductions += e.amount
      amounts.push(e.amount)
    } else if (e.type === 'earnback.earned' && e.kidId === kid.id && inWeek.has(e.date)) {
      earnRaw += e.amount
    }
  }
  const earnback = Math.min(earnRaw, Math.max(0, deductions))
  amounts.push(earnback)
  const balance = Math.max(0, start + pay + earnback - deductions)

  const closedBalance = closeEvent?.balance

  const useCents = anyCents(amounts)

  return {
    weekStart,
    days,
    start,
    pay,
    earnback,
    deductions,
    balance,
    lostByDay,
    payByDay,
    useCents,
    closed: closedBalance !== undefined,
    ...(closedBalance !== undefined ? { closedBalance } : {}),
  }
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
