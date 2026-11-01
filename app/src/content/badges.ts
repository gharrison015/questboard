import type { DateKey, Family, Kid, QBEvent } from '../engine/types'
import type { Jars } from '../engine/jars'
import { choreDayStateLive, type WeekState } from '../engine/week'
import { dateKey } from '../engine/dates'
import { dayEvents, prepare, type Prepared } from '../engine/ledger'
import { perfectDayKeys, streakReachedOn } from '../engine/streaks'

export interface BadgeCtx {
  family: Family
  kid: Kid
  events: QBEvent[]
  now: Date
  jars: Jars
  weeks: WeekState[]
  /** Perfect day keys, computed once by badges() when absent. */
  perfectDays?: DateKey[]
  /** The prepared ledger, built once by badges() when absent. */
  prep?: Prepared
}

const prepOf = (ctx: BadgeCtx): Prepared => ctx.prep ?? prepare(ctx.events)

export interface BadgeDef {
  id: string
  name: string
  rule: string
  emoji: string
  test(ctx: BadgeCtx): string | null
}

function firstLive(ctx: BadgeCtx, pick: (e: QBEvent) => boolean): string | null {
  const hit = prepOf(ctx).live.find(pick)
  return hit ? hit.at : null
}

function streakBadge(n: number) {
  return (ctx: BadgeCtx): string | null =>
    streakReachedOn(ctx.perfectDays ?? perfectDayKeys(ctx.family, ctx.kid, ctx.events, ctx.now, prepOf(ctx)), n)
}

/** The `at` of the live event after which the Save jar first held at least `cents`. */
function saveReached(ctx: BadgeCtx, cents: number): string | null {
  let save = 0
  for (const e of prepOf(ctx).live) {
    if (e.type === 'jar.allocated' && e.kidId === ctx.kid.id && e.jar === 'save') save += e.amount
    else if (e.type === 'jar.gifted' && e.toKidId === ctx.kid.id) save += e.amount
    else if (e.type === 'jar.paidOut' && e.kidId === ctx.kid.id && e.jar === 'save') save = Math.max(0, save - e.amount)
    else continue
    if (save >= cents) return e.at
  }
  return null
}

function firstFullWeek(ctx: BadgeCtx): string | null {
  for (const ws of ctx.weeks) {
    if (!ws.closed || ws.closedBalance !== ws.start + ws.pay) continue
    if (ws.closedAt && !ws.closedInactive) return ws.closedAt
  }
  return null
}

function firstPaidChore(ctx: BadgeCtx): string | null {
  const prep = prepOf(ctx)
  const today = dateKey(ctx.now)
  for (const ws of ctx.weeks) {
    for (const date of ws.days) {
      if (date > today) break
      for (const chore of ctx.kid.chores) {
        if (chore.pay > 0 && choreDayStateLive(ctx.family, ctx.kid, chore, date, dayEvents(prep, ctx.kid.id, date), ctx.now).pays) return date as DateKey
      }
    }
  }
  return null
}

export const BADGES: BadgeDef[] = [
  { id: 'first-perfect', name: 'Perfect Day', emoji: '🌟', rule: 'Finish every chore and routine step in one day with nothing lost',
    test: streakBadge(1) },
  { id: 'streak-3', name: 'Three in a Row', emoji: '🔥', rule: 'Have a perfect day 3 days in a row', test: streakBadge(3) },
  { id: 'streak-7', name: 'Seven in a Row', emoji: '🏆', rule: 'Have a perfect day 7 days in a row', test: streakBadge(7) },
  { id: 'first-give', name: 'Big Heart', emoji: '💝', rule: 'Put money in your Give jar or give some to someone',
    test: (ctx) => firstLive(ctx, (e) =>
      (e.type === 'jar.allocated' && e.kidId === ctx.kid.id && e.jar === 'give') ||
      (e.type === 'jar.gifted' && e.fromKidId === ctx.kid.id)) },
  { id: 'save-25', name: 'Saver', emoji: '🐷', rule: 'Get $25 in your Save jar', test: (ctx) => saveReached(ctx, 2500) },
  { id: 'save-50', name: 'Super Saver', emoji: '💰', rule: 'Get $50 in your Save jar', test: (ctx) => saveReached(ctx, 5000) },
  { id: 'save-100', name: 'Savings Star', emoji: '💎', rule: 'Get $100 in your Save jar', test: (ctx) => saveReached(ctx, 10000) },
  { id: 'first-full-week', name: 'Full Week', emoji: '📅', rule: 'Keep all your starting money for a whole week',
    test: firstFullWeek },
  { id: 'first-paid-chore', name: 'First Paycheck', emoji: '💵', rule: 'Get paid for a chore', test: firstPaidChore },
  { id: 'earnback-10', name: 'Comeback Kid', emoji: '💪', rule: 'Earn back lost money 10 times',
    test: (ctx) => {
      const hits = prepOf(ctx).live.filter((e) => e.type === 'earnback.earned' && e.kidId === ctx.kid.id)
      return hits.length >= 10 ? hits[9].at : null
    } },
]

export function badges(ctx: BadgeCtx): { def: BadgeDef; earnedAt: string | null }[] {
  const prep = prepOf(ctx)
  const full: BadgeCtx = { ...ctx, prep, perfectDays: ctx.perfectDays ?? perfectDayKeys(ctx.family, ctx.kid, ctx.events, ctx.now, prep) }
  return BADGES.map((def) => ({ def, earnedAt: def.test(full) }))
}
