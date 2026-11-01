import { describe, expect, it } from 'vitest'
import { allocationStep, canAllocate, jars } from '../../src/engine/jars'
import { ev, makeFamily, makenna, nolan } from '../fixtures'
import { weekState } from '../../src/engine/week'
import { kidUsesCents } from '../../src/engine/closeWeeks'

const closed = (kidId: string, balance: number, weekStart = '2026-10-04') =>
  ev({ type: 'week.closed', kidId, weekStart, balance }, '2026-10-11T08:00:00.000Z')

describe('jars', () => {
  it('splits a closed balance into jars', () => {
    const events = [
      closed(nolan, 1700),
      ev({ type: 'jar.allocated', kidId: nolan, jar: 'save', amount: 500 }, '2026-10-11T09:00:00.000Z'),
      ev({ type: 'jar.allocated', kidId: nolan, jar: 'spend', amount: 200 }, '2026-10-11T09:01:00.000Z'),
    ]
    expect(jars(nolan, events)).toEqual({ save: 500, spend: 200, give: 0, unsplit: 1000 })
  })

  it('gifts move give to the receiver save', () => {
    const events = [
      closed(nolan, 1000),
      closed(makenna, 0),
      ev({ type: 'jar.allocated', kidId: nolan, jar: 'give', amount: 400 }, '2026-10-11T09:00:00.000Z'),
      ev({ type: 'jar.gifted', fromKidId: nolan, toKidId: makenna, amount: 300 }, '2026-10-11T09:05:00.000Z'),
    ]
    expect(jars(nolan, events).give).toBe(100)
    expect(jars(makenna, events).save).toBe(300)
  })

  it('payouts and donations reduce jars, clamped at zero', () => {
    const events = [
      closed(nolan, 1000),
      ev({ type: 'jar.allocated', kidId: nolan, jar: 'save', amount: 500 }, '2026-10-11T09:00:00.000Z'),
      ev({ type: 'jar.allocated', kidId: nolan, jar: 'give', amount: 200 }, '2026-10-11T09:01:00.000Z'),
      ev({ type: 'jar.paidOut', kidId: nolan, jar: 'save', amount: 200, via: 'cash' }, '2026-10-11T09:02:00.000Z'),
      ev({ type: 'jar.donated', kidId: nolan, amount: 500, to: 'x' }, '2026-10-11T09:03:00.000Z'),
    ]
    const j = jars(nolan, events)
    expect(j.save).toBe(300)
    expect(j.give).toBe(0)
  })

  it('respects undo and undo of undo', () => {
    const alloc = ev({ type: 'jar.allocated', kidId: nolan, jar: 'save', amount: 500 }, '2026-10-11T09:00:00.000Z')
    const undo = ev({ type: 'undo', targetEventId: alloc.id }, '2026-10-11T09:01:00.000Z')
    const redo = ev({ type: 'undo', targetEventId: undo.id }, '2026-10-11T09:02:00.000Z')
    expect(jars(nolan, [closed(nolan, 1000), alloc, undo]).unsplit).toBe(1000)
    expect(jars(nolan, [closed(nolan, 1000), alloc, undo, redo]).unsplit).toBe(500)
  })

  it('allocation step and canAllocate', () => {
    const j = { save: 0, spend: 0, give: 0, unsplit: 300 }
    expect(allocationStep(j)).toBe(100)
    expect(allocationStep({ ...j, unsplit: 325 })).toBe(25)
    expect(canAllocate(j, 300)).toBe(true)
    expect(canAllocate(j, 325)).toBe(false)
    expect(canAllocate(j, 0)).toBe(false)
  })

  it('kidUsesCents is true when any closed balance has cents', () => {
    const f = makeFamily()
    const now = new Date(2026, 10, 1, 9)
    const kid = f.kids[0]
    expect(kidUsesCents(f, kid, [closed(nolan, 1000)], now)).toBe(false)
    expect(kidUsesCents(f, kid, [closed(nolan, 1025)], now)).toBe(true)
  })

  it('Review Focus 2: changing startAmount after a close leaves unsplit unchanged', () => {
    const f = makeFamily()
    const now = new Date(2026, 10, 1, 9)
    const events = [closed(nolan, 1700, '2026-10-25')]
    const f2 = makeFamily({ money: { ...f.money, startAmount: 2000 } })
    expect(jars(nolan, events).unsplit).toBe(1700)
    expect(weekState(f2, f2.kids[0], events, '2026-11-01', now).start).toBe(2000)
    expect(jars(nolan, events).unsplit).toBe(1700)
  })
})
