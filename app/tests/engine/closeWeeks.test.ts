import { describe, expect, it } from 'vitest'
import { closeCurrentWeek, currentWeekStart, dueWeekCloses, lastWeekMissedApprovals } from '../../src/engine/closeWeeks'
import { dateKey } from '../../src/engine/dates'
import { jars } from '../../src/engine/jars'
import { weekState } from '../../src/engine/week'
import { ev, makeFamily, nolan, TRASH } from '../fixtures'

describe('closeWeeks', () => {
  const family = makeFamily({ createdAt: new Date(2026, 9, 5, 12).toISOString() })
  const now = new Date(2026, 10, 1, 9)

  it('currentWeekStart uses the family week start day', () => {
    expect(currentWeekStart(family, now)).toBe('2026-11-01')
    expect(currentWeekStart(family, new Date(2026, 9, 31, 9))).toBe('2026-10-25')
  })

  it('Review Focus 3: closes every missed week, oldest first, inactive at zero', () => {
    const out = dueWeekCloses(family, [], now)
    const mine = out.filter((e) => e.type === 'week.closed' && e.kidId === nolan)
    expect(mine.map((e) => (e.type === 'week.closed' ? e.weekStart : ''))).toEqual([
      '2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25',
    ])
    for (const e of mine) {
      if (e.type === 'week.closed') {
        expect(e.balance).toBe(0)
        expect(e.inactive).toBe(true)
      }
    }
    expect(dueWeekCloses(family, [...out], now)).toEqual([])
  })

  it('active week closes with weekState balance and no inactive flag', () => {
    const events = [ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: '2026-10-06' }, new Date(2026, 9, 6, 17).toISOString())]
    const out = dueWeekCloses(family, events, now)
    const first = out.find((e) => e.type === 'week.closed' && e.kidId === nolan && e.weekStart === '2026-10-04')
    expect(first).toMatchObject({ balance: 1100 })
    expect(first && 'inactive' in first ? first.inactive : undefined).toBeUndefined()
  })

  it('does not mutate inputs and skips archived kids', () => {
    const f = makeFamily({ createdAt: family.createdAt })
    f.kids[1].archived = true
    const events: never[] = []
    const out = dueWeekCloses(f, events, now)
    expect(events).toEqual([])
    expect(out.every((e) => e.type === 'week.closed' && e.kidId === nolan)).toBe(true)
  })

  it('lastWeekMissedApprovals counts unverified checks in parent-approve mode', () => {
    const f = makeFamily({ verification: 'parent-approve' })
    const events = [
      ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: '2026-10-27' }, new Date(2026, 9, 27, 17).toISOString()),
      ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: '2026-10-28' }, new Date(2026, 9, 28, 17).toISOString()),
      ev({ type: 'chore.verified', kidId: nolan, choreId: TRASH, date: '2026-10-28' }, new Date(2026, 9, 29, 8).toISOString()),
    ]
    expect(lastWeekMissedApprovals(f, f.kids[0], events, now)).toBe(1)
    expect(lastWeekMissedApprovals(makeFamily(), f.kids[0], events, now)).toBe(0)
  })

  it('jar-only weeks still close inactive at zero', () => {
    const events = [ev({ type: 'jar.allocated', kidId: nolan, jar: 'save', amount: 100 }, new Date(2026, 9, 7, 10).toISOString())]
    const out = dueWeekCloses(family, events, now)
    const w = out.find((e) => e.type === 'week.closed' && e.kidId === nolan && e.weekStart === '2026-10-04')
    expect(w).toMatchObject({ balance: 0, inactive: true })
  })

  it('at 00:30 Sunday the week starting 10-25 closes and 11-01 does not', () => {
    const early = new Date(2026, 10, 1, 0, 30)
    const weeks = dueWeekCloses(family, [], early).flatMap((e) => (e.type === 'week.closed' && e.kidId === nolan ? [e.weekStart] : []))
    expect(weeks).toContain('2026-10-25')
    expect(weeks).not.toContain('2026-11-01')
  })
})

describe('Ruling 22: a week start change never re-closes history', () => {
  const ALL = [0, 1, 2, 3, 4, 5, 6]
  const base = makeFamily({ createdAt: new Date(2026, 9, 5, 9).toISOString(), verification: 'kid-final' })
  const family = { ...base, kids: [{ ...base.kids[0], chores: [{ id: 'c', label: 'c', icon: 's', days: ALL, pay: 100, active: true }] }] }
  const kid = family.kids[0]
  const checks = Array.from({ length: 29 }, (_, i) => {
    const d = new Date(2026, 9, 5 + i, 18)
    return ev({ type: 'chore.checked', kidId: nolan, choreId: 'c', date: dateKey(d) }, d.toISOString())
  })

  it('closes four Sunday weeks, then after a switch to Monday closes only the one-day gap', () => {
    const first = dueWeekCloses(family, checks, new Date(2026, 10, 2, 9))
    expect(first.map((e) => (e.type === 'week.closed' ? e.weekStart : ''))).toEqual(['2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25'])
    const all = [...checks, ...first]
    expect(jars(nolan, all).unsplit).toBe(6700)

    const monday = { ...family, money: { ...family.money, weekStartDay: 1 as const } }
    const tue = new Date(2026, 10, 3, 9)
    const second = dueWeekCloses(monday, all, tue)
    expect(second).toHaveLength(1)
    const gap = second[0]
    expect(gap).toMatchObject({ type: 'week.closed', weekStart: '2026-11-01', days: 1 })
    // One day: a seventh of the start money (round(1000 / 7) = 143) plus that day's chore.
    const gapBalance = gap.type === 'week.closed' ? gap.balance : NaN
    expect(gapBalance).toBe(143 + 100)
    expect(jars(nolan, [...all, ...second]).unsplit).toBe(6700 + gapBalance)
    expect(dueWeekCloses(monday, [...all, ...second], tue)).toEqual([])

    // The open Monday week ignores nothing it owns and never sees the closed Sunday.
    const open = weekState(monday, kid, [...all, ...second], '2026-11-02', tue)
    expect(open.closed).toBe(false)
    expect(open.start).toBe(1000)
    expect(open.pay).toBe(100) // Mon 11-02 only (11-01 belongs to the closed span)
  })

  it('switching to a later start leaves covered days out of the open week', () => {
    const monday = { ...family, money: { ...family.money, weekStartDay: 1 as const } }
    // Monday weeks closed through Sun 11-01; then the family switches back to Sunday.
    const closes = dueWeekCloses(monday, checks, new Date(2026, 10, 2, 9))
    const all = [...checks, ...closes]
    const sunday = { ...family }
    const tue = new Date(2026, 10, 3, 9)
    expect(dueWeekCloses(sunday, all, tue)).toEqual([])
    const open = weekState(sunday, kid, all, '2026-11-01', tue)
    expect(open.payByDay['2026-11-01']).toBeUndefined()
    expect(open.start).toBe(Math.round((1000 * 6) / 7))
    // Close now takes the uncovered six days as one short span.
    const now = closeCurrentWeek(sunday, kid, all, tue)
    expect(now).toHaveLength(1)
    expect(now[0]).toMatchObject({ weekStart: '2026-11-02', days: 6, balance: open.balance })
    expect(weekState(sunday, kid, [...all, ...now], '2026-11-01', tue).closed).toBe(true)
  })
})

describe('closeCurrentWeek (I1)', () => {
  it('appends due earlier closes before closing the current week', () => {
    const family = makeFamily({ createdAt: new Date(2026, 9, 20, 9).toISOString() })
    const kid = family.kids[0]
    const now = new Date(2026, 10, 3, 9)
    const out = closeCurrentWeek(family, kid, [], now)
    const mine = out.flatMap((e) => (e.type === 'week.closed' && e.kidId === nolan ? [e.weekStart] : []))
    expect(mine).toEqual(['2026-10-18', '2026-10-25', '2026-11-01'])
    expect(closeCurrentWeek(family, kid, out, now)).toEqual([])
  })
})
