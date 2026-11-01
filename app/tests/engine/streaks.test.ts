import { describe, expect, it } from 'vitest'
import { badges, BADGES, type BadgeCtx } from '../../src/content/badges'
import { bestStreak, perfectDay, streak, unverified, weekStatesFor } from '../../src/engine/streaks'
import { jars } from '../../src/engine/jars'
import type { Family, QBEvent } from '../../src/engine/types'
import { ev, makeFamily, nolan, TRASH } from '../fixtures'

const at = (d: number, h = 12): string => new Date(2026, 9, d, h).toISOString()
const dk = (d: number): string => `2026-10-${String(d).padStart(2, '0')}`
const CHORES = ['chore-bed', 'chore-toys', 'chore-plate', TRASH, 'chore-hamper']

function perfect(d: number): QBEvent[] {
  return CHORES.map((c) => ev({ type: 'chore.checked', kidId: nolan, choreId: c, date: dk(d) }, at(d)))
}

function ctxFor(family: Family, events: QBEvent[], now: Date): BadgeCtx {
  const kid = family.kids[0]
  return { family, kid, events, now, jars: jars(kid.id, events), weeks: weekStatesFor(family, kid, events, now) }
}

const earned = (ctx: BadgeCtx, id: string): string | null =>
  badges(ctx).find((b) => b.def.id === id)?.earnedAt ?? null

const now = new Date(2026, 9, 8, 10)

describe('streaks', () => {
  const family = makeFamily()
  const kid = family.kids[0]
  const three = [...perfect(5), ...perfect(6), ...perfect(7)]

  it('counts three consecutive perfect days ending yesterday', () => {
    expect(perfectDay(family, kid, three, dk(6), now)).toBe(true)
    expect(streak(family, kid, three, dk(8), now)).toBe(3)
  })

  it('a deduction on day 2 breaks the streak to 1', () => {
    const events = [...three, ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 50, date: dk(6) }, at(6, 15))]
    expect(perfectDay(family, kid, events, dk(6), now)).toBe(false)
    expect(streak(family, kid, events, dk(8), now)).toBe(1)
  })

  it('ignores undone events', () => {
    const ded = ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 50, date: dk(6) }, at(6, 15))
    const undo = ev({ type: 'undo', targetEventId: ded.id }, at(6, 16))
    expect(streak(family, kid, [...three, ded, undo], dk(8), now)).toBe(3)
  })

  it('a day with nothing due is not perfect', () => {
    const makenna = family.kids[1]
    expect(perfectDay(family, makenna, [], dk(6), now)).toBe(false)
  })

  it('requires routine steps done', () => {
    const fam = makeFamily({
      routines: [{ id: 'r1', name: 'Morning', steps: [{ id: 's1', label: 'Teeth' }], days: [0, 1, 2, 3, 4, 5, 6] }],
    })
    fam.kids[0].routineIds = ['r1']
    expect(perfectDay(fam, fam.kids[0], perfect(5), dk(5), now)).toBe(false)
    const step = ev({ type: 'routine.step', kidId: nolan, routineId: 'r1', stepId: 's1', date: dk(5), done: true }, at(5, 8))
    expect(perfectDay(fam, fam.kids[0], [...perfect(5), step], dk(5), now)).toBe(true)
    const off = ev({ type: 'routine.step', kidId: nolan, routineId: 'r1', stepId: 's1', date: dk(5), done: false }, at(5, 9))
    expect(perfectDay(fam, fam.kids[0], [...perfect(5), step, off], dk(5), now)).toBe(false)
  })

  it('weekStatesFor covers the first week through the current week', () => {
    const weeks = weekStatesFor(family, kid, [], now)
    expect(weeks.length).toBe(2) // week of Sep 27 (created Sep 30 or Oct 1) and week of Oct 4
    expect(weeks[weeks.length - 1].weekStart).toBe('2026-10-04')
  })
})

describe('badges', () => {
  const family = makeFamily()

  it('has the ten ids in order', () => {
    expect(BADGES.map((b) => b.id)).toEqual([
      'first-perfect', 'streak-3', 'streak-7', 'first-give', 'save-25', 'save-50', 'save-100',
      'first-full-week', 'first-paid-chore', 'earnback-10',
    ])
  })

  it('earns first-perfect and streak-3 but not streak-7', () => {
    const ctx = ctxFor(family, [...perfect(5), ...perfect(6), ...perfect(7)], now)
    expect(earned(ctx, 'first-perfect')).toBe(dk(5))
    expect(earned(ctx, 'streak-3')).toBe(dk(7))
    expect(earned(ctx, 'streak-7')).toBeNull()
  })

  it('save-25 earns at the crossing event', () => {
    const a = ev({ type: 'jar.allocated', kidId: nolan, jar: 'save', amount: 2500 }, at(6))
    const ctx = ctxFor(family, [a], now)
    expect(earned(ctx, 'save-25')).toBe(a.at)
    expect(earned(ctx, 'save-50')).toBeNull()
  })

  it('save-25 crossing across several events returns the third', () => {
    const evs = [1000, 1000, 600].map((amount, i) =>
      ev({ type: 'jar.allocated', kidId: nolan, jar: 'save', amount }, at(5 + i)))
    expect(earned(ctxFor(family, evs.slice(0, 2), now), 'save-25')).toBeNull()
    expect(earned(ctxFor(family, evs, now), 'save-25')).toBe(evs[2].at)
  })

  it('performance smoke: 400 days of events', () => {
    const fam = makeFamily({ createdAt: new Date(2025, 8, 1).toISOString() })
    const today = new Date(2026, 9, 8, 10)
    const evs: QBEvent[] = []
    for (let i = 0; i < 400; i++) {
      const d = new Date(2025, 8, 4 + i, 12)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      for (const c of CHORES) evs.push(ev({ type: 'chore.checked', kidId: nolan, choreId: c, date: key }, d.toISOString()))
      if (i % 8 === 0) evs.push(ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 50, date: key }, d.toISOString()))
    }
    const t0 = performance.now()
    const ctx = ctxFor(fam, evs, today)
    badges(ctx)
    streak(fam, fam.kids[0], evs, '2026-10-08', today)
    expect(performance.now() - t0).toBeLessThan(1000)
  })

  it('first-give from allocation or gift', () => {
    const g = ev({ type: 'jar.allocated', kidId: nolan, jar: 'give', amount: 100 }, at(6))
    expect(earned(ctxFor(family, [g], now), 'first-give')).toBe(g.at)
    const gift = ev({ type: 'jar.gifted', fromKidId: nolan, toKidId: 'kid-makenna', amount: 100 }, at(7))
    expect(earned(ctxFor(family, [gift], now), 'first-give')).toBe(gift.at)
  })

  it('first-full-week when closed balance is start plus pay', () => {
    const later = new Date(2026, 9, 12, 10)
    const check = ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: dk(5) }, at(5))
    const close = ev({ type: 'week.closed', kidId: nolan, weekStart: dk(4), balance: 1100 }, at(11))
    const ctx = ctxFor(family, [check, close], later)
    expect(earned(ctx, 'first-full-week')).toBe(close.at)
    expect(earned(ctx, 'first-paid-chore')).toBe(dk(5))
    const lost = ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 50, date: dk(6) }, at(6))
    const close2 = ev({ type: 'week.closed', kidId: nolan, weekStart: dk(4), balance: 1050 }, at(11))
    expect(earned(ctxFor(family, [check, lost, close2], later), 'first-full-week')).toBeNull()
  })

  it('earnback-10 on the tenth earn-back', () => {
    const evs = Array.from({ length: 10 }, (_, i) =>
      ev({ type: 'earnback.earned', kidId: nolan, skill: 's', amount: 10, date: dk(5) }, at(5, 8 + i)))
    expect(earned(ctxFor(family, evs.slice(0, 9), now), 'earnback-10')).toBeNull()
    expect(earned(ctxFor(family, evs, now), 'earnback-10')).toBe(evs[9].at)
  })
})

describe('unverified', () => {
  const check = ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: dk(8) }, at(8, 9))

  it('lists a checked paid chore in kid-verify before midnight, drops it after verify', () => {
    const family = makeFamily()
    const kid = family.kids[0]
    expect(unverified(family, kid, [check], now)).toEqual([{ choreId: TRASH, date: dk(8) }])
    const v = ev({ type: 'chore.verified', kidId: nolan, choreId: TRASH, date: dk(8) }, at(8, 10))
    expect(unverified(family, kid, [check, v], now)).toEqual([])
    expect(unverified(family, kid, [check], new Date(2026, 9, 9, 1))).toEqual([])
  })

  it('kid-final returns nothing, parent-approve keeps it, rejected leaves', () => {
    const fin = makeFamily({ verification: 'kid-final' })
    expect(unverified(fin, fin.kids[0], [check], now)).toEqual([])
    const pa = makeFamily({ verification: 'parent-approve' })
    const later = new Date(2026, 9, 10, 1)
    expect(unverified(pa, pa.kids[0], [check], later)).toEqual([{ choreId: TRASH, date: dk(8) }])
    const rej = ev({ type: 'chore.rejected', kidId: nolan, choreId: TRASH, date: dk(8) }, at(9))
    expect(unverified(pa, pa.kids[0], [check, rej], later)).toEqual([])
  })
})

describe('bestStreak', () => {
  it('finds the longest run even after a break', () => {
    const family = makeFamily()
    const kid = family.kids[0]
    const events = [...perfect(1), ...perfect(2), ...perfect(3), ...perfect(5), ...perfect(6)]
    expect(bestStreak(family, kid, events, new Date(2026, 9, 8, 10))).toBe(3)
    expect(bestStreak(family, kid, [], new Date(2026, 9, 8, 10))).toBe(0)
  })
})
