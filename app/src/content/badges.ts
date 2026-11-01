import type { DateKey, Family, Kid, QBEvent } from '../engine/types'
import type { Jars } from '../engine/jars'
import { jars as jarsOf } from '../engine/jars'
import { choreDayState, liveEvents, type WeekState } from '../engine/week'
import { dateKey } from '../engine/dates'
import { perfectDayKeys, streakReachedOn } from '../engine/streaks'

export interface BadgeCtx {
  family: Family
  kid: Kid
  events: QBEvent[]
  now: Date
  jars: Jars
  weeks: WeekState[]
}

export interface BadgeDef {
  id: string
  name: string
  rule: string
  emoji: string
  test(ctx: BadgeCtx): string | null
}

function firstLive(ctx: BadgeCtx, pick: (e: QBEvent) => boolean): string | null {
  const hit = liveEvents(ctx.events).find(pick)
  return hit ? hit.at : null
}

function streakBadge(n: number) {
  return (ctx: BadgeCtx): string | null =>
    streakReachedOn(perfectDayKeys(ctx.family, ctx.kid, ctx.events, ctx.now), n)
}

/** The `at` of the live event after which the Save jar first held at least `cents`. */
function saveReached(ctx: BadgeCtx, cents: number): string | null {
  const live = liveEvents(ctx.events)
  for (let i = 0; i < live.length; i++) {
    const e = live[i]
    const moves =
      (e.type === 'jar.allocated' && e.kidId === ctx.kid.id && e.jar === 'save') ||
      (e.type === 'jar.gifted' && e.toKidId === ctx.kid.id)
    if (moves && jarsOf(ctx.kid.id, live.slice(0, i + 1)).save >= cents) return e.at
  }
  return null
}

function firstFullWeek(ctx: BadgeCtx): string | null {
  const live = liveEvents(ctx.events)
  for (const ws of ctx.weeks) {
    if (!ws.closed || ws.closedBalance !== ws.start + ws.pay) continue
    let close: Extract<QBEvent, { type: 'week.closed' }> | undefined
    for (const e of live) {
      if (e.type === 'week.closed' && e.kidId === ctx.kid.id && e.weekStart === ws.weekStart) close = e
    }
    if (close && !close.inactive) return close.at
  }
  return null
}

function firstPaidChore(ctx: BadgeCtx): string | null {
  const live = liveEvents(ctx.events)
  const today = dateKey(ctx.now)
  for (const ws of ctx.weeks) {
    for (const date of ws.days) {
      if (date > today) break
      for (const chore of ctx.kid.chores) {
        if (chore.pay > 0 && choreDayState(ctx.family, ctx.kid, chore, date, live, ctx.now).pays) return date as DateKey
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
      const hits = liveEvents(ctx.events).filter((e) => e.type === 'earnback.earned' && e.kidId === ctx.kid.id)
      return hits.length >= 10 ? hits[9].at : null
    } },
]

export function badges(ctx: BadgeCtx): { def: BadgeDef; earnedAt: string | null }[] {
  return BADGES.map((def) => ({ def, earnedAt: def.test(ctx) }))
}
