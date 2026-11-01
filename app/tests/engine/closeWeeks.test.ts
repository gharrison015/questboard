import { describe, expect, it } from 'vitest'
import { currentWeekStart, dueWeekCloses, lastWeekMissedApprovals } from '../../src/engine/closeWeeks'
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
