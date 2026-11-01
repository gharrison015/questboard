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
function liveEvents(events: QBEvent[]): QBEvent[] {
  const sorted = byTime(events)
  const undone = new Set<string>()
  for (let i = sorted.length - 1; i >= 0; i--) {
    const e = sorted[i]
    if (e.type === 'undo' && !undone.has(e.id)) undone.add(e.targetEventId)
  }
  return sorted.filter((e) => e.type !== 'undo' && !undone.has(e.id))
}

function choreDayStateLive(
  family: Family,
  kid: Kid,
  chore: Chore,
  date: DateKey,
  live: QBEvent[],
  now: Date,
): ChoreDayState {
  let lastCheck: QBEvent | undefined
  for (const e of live) {
    if (
      (e.type === 'chore.checked' || e.type === 'chore.unchecked') &&
      e.kidId === kid.id && e.choreId === chore.id && e.date === date
    ) lastCheck = e
  }
  const none: ChoreDayState = { checked: false, verified: false, rejected: false, pending: false, pays: false, pay: 0 }
  if (!lastCheck || lastCheck.type !== 'chore.checked') return none

  const after = ts(lastCheck)
  const matches = (e: QBEvent, type: 'chore.verified' | 'chore.rejected'): boolean =>
    e.type === type && e.kidId === kid.id && e.choreId === chore.id && e.date === date && ts(e) >= after && e.id !== lastCheck?.id
  const verified = live.some((e) => matches(e, 'chore.verified'))
  const rejected = live.some((e) => matches(e, 'chore.rejected'))

  let pays: boolean
  if (rejected) pays = false
  else if (family.verification === 'kid-final') pays = true
  else if (family.verification === 'kid-verify') pays = verified || isPastMidnightOf(date, now)
  else pays = verified

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
  const live = liveEvents(events)
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
      amounts.push(e.amount)
    }
  }
  const earnback = Math.min(earnRaw, Math.max(0, deductions))
  const balance = Math.max(0, start + pay + earnback - deductions)

  let closedBalance: Cents | undefined
  for (const e of live) {
    if (e.type === 'week.closed' && e.kidId === kid.id && e.weekStart === weekStart) closedBalance = e.balance
  }

  // anyCents flags nonzero values, so pass the sub-dollar remainders.
  const useCents = anyCents(amounts.map((v) => v % 100))

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
