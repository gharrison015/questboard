import { describe, it, expect } from 'vitest'
import { makeFamily, ev, nolan, TRASH } from '../fixtures'
import { choreDayState, weekState, mathTerms, lostThisWeek, earnBackRoom } from '../../src/engine/week'
import type { Family } from '../../src/engine/types'

const WS = '2026-11-01' // Sunday
const kidOf = (f: Family) => f.kids[0]
const NOW = new Date(2026, 10, 5, 12, 0, 0) // Thu noon
const AFTER = new Date(2026, 10, 6, 0, 0, 1)

function withMoney(patch: Partial<Family['money']>, verification: Family['verification'] = 'kid-final'): Family {
  const f = makeFamily()
  return { ...f, verification, money: { ...f.money, ...patch } }
}

describe('weekState', () => {
  it('(a) keep-it preset: deductions give balance, labels, no cents', () => {
    const f = withMoney({ startAmount: 2000, deductionDefault: 100, chorePayDefault: 0 })
    const events = [
      ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 100, date: '2026-11-02' }, '2026-11-02T10:00:00'),
      ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-listening', amount: 200, date: '2026-11-04' }, '2026-11-04T10:00:00'),
    ]
    const ws = weekState(f, kidOf(f), events, WS, NOW)
    expect(ws.balance).toBe(1700)
    expect(ws.deductions).toBe(300)
    expect(Object.keys(ws.lostByDay)).toHaveLength(2)
    expect(ws.lostByDay['2026-11-02'].items[0].label).toBe('Yelling')
    expect(ws.lostByDay['2026-11-04'].amount).toBe(200)
    expect(ws.useCents).toBe(false)
  })

  it('(b) both preset: kid-final paid chore pays', () => {
    const f = withMoney({}, 'kid-final')
    const events = [ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: '2026-11-05' }, '2026-11-05T09:00:00')]
    const ws = weekState(f, kidOf(f), events, WS, NOW)
    expect(ws.pay).toBe(100)
    expect(ws.payByDay['2026-11-05']).toBe(100)
    expect(ws.balance).toBe(1100)
  })

  it('(c) kid-verify: pending before midnight, pays after, rejected never pays', () => {
    const f = withMoney({}, 'kid-verify')
    const k = kidOf(f)
    const chk = ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: '2026-11-05' }, '2026-11-05T09:00:00')
    const before = choreDayState(f, k, k.chores[3], '2026-11-05', [chk], NOW)
    expect(before.pays).toBe(false)
    expect(before.pending).toBe(true)
    const after = choreDayState(f, k, k.chores[3], '2026-11-05', [chk], AFTER)
    expect(after.pays).toBe(true)
    expect(after.pay).toBe(100)
    const rej = ev({ type: 'chore.rejected', kidId: nolan, choreId: TRASH, date: '2026-11-05' }, '2026-11-05T10:00:00')
    const rejected = choreDayState(f, k, k.chores[3], '2026-11-05', [chk, rej], AFTER)
    expect(rejected.pays).toBe(false)
    expect(rejected.rejected).toBe(true)
    const ver = ev({ type: 'chore.verified', kidId: nolan, choreId: TRASH, date: '2026-11-05' }, '2026-11-05T11:00:00')
    expect(choreDayState(f, k, k.chores[3], '2026-11-05', [chk, ver], NOW).pays).toBe(true)
  })

  it('(d) parent-approve pays only with verification', () => {
    const f = withMoney({}, 'parent-approve')
    const k = kidOf(f)
    const chk = ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: '2026-11-05' }, '2026-11-05T09:00:00')
    expect(choreDayState(f, k, k.chores[3], '2026-11-05', [chk], AFTER).pays).toBe(false)
    expect(choreDayState(f, k, k.chores[3], '2026-11-05', [chk], AFTER).pending).toBe(true)
    const ver = ev({ type: 'chore.verified', kidId: nolan, choreId: TRASH, date: '2026-11-05' }, '2026-11-05T11:00:00')
    expect(choreDayState(f, k, k.chores[3], '2026-11-05', [chk, ver], NOW).pays).toBe(true)
  })

  it('(e) check, uncheck, check pays once; uncheck after check does not pay', () => {
    const f = withMoney({}, 'kid-final')
    const k = kidOf(f)
    const d = '2026-11-05'
    const c1 = ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: d }, '2026-11-05T09:00:00')
    const u = ev({ type: 'chore.unchecked', kidId: nolan, choreId: TRASH, date: d }, '2026-11-05T09:00:20')
    const c2 = ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: d }, '2026-11-05T09:00:40')
    const ws = weekState(f, k, [c1, u, c2], WS, NOW)
    expect(ws.pay).toBe(100)
    expect(choreDayState(f, k, k.chores[3], d, [c1, u, c2], NOW).pays).toBe(true)
    const off = choreDayState(f, k, k.chores[3], d, [c1, u], NOW)
    expect(off.checked).toBe(false)
    expect(off.pays).toBe(false)
  })

  it('(f) floor: balance never negative, lost still reported', () => {
    const f = withMoney({ startAmount: 0 })
    const events = [ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 300, date: '2026-11-02' }, '2026-11-02T10:00:00')]
    const ws = weekState(f, kidOf(f), events, WS, NOW)
    expect(ws.balance).toBe(0)
    expect(lostThisWeek(ws)).toBe(300)
  })

  it('(g) earn-back is capped at deductions', () => {
    const f = withMoney({ startAmount: 1000 })
    const events = [
      ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 200, date: '2026-11-02' }, '2026-11-02T10:00:00'),
      ev({ type: 'earnback.earned', kidId: nolan, skill: 'a', amount: 100, date: '2026-11-03' }, '2026-11-03T10:00:00'),
      ev({ type: 'earnback.earned', kidId: nolan, skill: 'b', amount: 100, date: '2026-11-03' }, '2026-11-03T10:01:00'),
      ev({ type: 'earnback.earned', kidId: nolan, skill: 'c', amount: 100, date: '2026-11-03' }, '2026-11-03T10:02:00'),
    ]
    const ws = weekState(f, kidOf(f), events, WS, NOW)
    expect(ws.earnback).toBe(200)
    expect(ws.balance).toBe(1000)
    expect(earnBackRoom(ws)).toBe(0)
    expect(mathTerms(ws)).toEqual({ start: 1000, plus: 200, minus: 200, result: 1000 })
  })

  it('(h) undo removes a deduction; undoing the undo restores it', () => {
    const f = withMoney({})
    const ded = ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 50, date: '2026-11-02' }, '2026-11-02T10:00:00')
    const undo = ev({ type: 'undo', targetEventId: ded.id }, '2026-11-02T10:05:00')
    const ws = weekState(f, kidOf(f), [ded, undo], WS, NOW)
    expect(ws.deductions).toBe(0)
    expect(ws.lostByDay['2026-11-02']).toBeUndefined()
    const redo = ev({ type: 'undo', targetEventId: undo.id }, '2026-11-02T10:06:00')
    expect(weekState(f, kidOf(f), [ded, undo, redo], WS, NOW).deductions).toBe(50)
  })

  it('(i) week.closed freezes closedBalance', () => {
    const f = withMoney({})
    const closed = ev({ type: 'week.closed', kidId: nolan, weekStart: WS, balance: 1000 }, '2026-11-08T00:00:01')
    const late = ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 50, date: '2026-11-06' }, '2026-11-08T09:00:00')
    const ws = weekState(f, kidOf(f), [closed, late], WS, NOW)
    expect(ws.closed).toBe(true)
    expect(ws.closedBalance).toBe(1000)
    const open = weekState(f, kidOf(f), [], WS, NOW)
    expect(open.closed).toBe(false)
    expect(open.closedBalance).toBeUndefined()
  })

  it('falls back to Deduction label and sets useCents', () => {
    const f = withMoney({})
    const events = [ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'gone', amount: 25, date: '2026-11-02' }, '2026-11-02T10:00:00')]
    const ws = weekState(f, kidOf(f), events, WS, NOW)
    expect(ws.lostByDay['2026-11-02'].items[0].label).toBe('Deduction')
    expect(ws.useCents).toBe(true)
  })

  it('latest verify or reject after the last check decides, in every mode', () => {
    const d = '2026-11-05'
    const mk = (type: 'chore.checked' | 'chore.verified' | 'chore.rejected', at: string) =>
      ev({ type, kidId: nolan, choreId: TRASH, date: d }, at)
    const pays = (mode: Family['verification'], tail: ('chore.verified' | 'chore.rejected')[]): boolean => {
      const f = withMoney({}, mode)
      const evs = [mk('chore.checked', '2026-11-05T09:00:00'), ...tail.map((t, i) => mk(t, `2026-11-05T10:0${i}:00`))]
      return choreDayState(f, kidOf(f), kidOf(f).chores[3], d, evs, NOW).pays
    }
    expect(pays('kid-verify', ['chore.rejected', 'chore.verified'])).toBe(true)
    expect(pays('kid-verify', ['chore.verified', 'chore.rejected'])).toBe(false)
    expect(pays('kid-final', ['chore.rejected'])).toBe(false)
    expect(pays('parent-approve', ['chore.rejected', 'chore.verified'])).toBe(true)
    expect(pays('parent-approve', [])).toBe(false)
  })

  it('a verification after the close does not change a closed week', () => {
    const f = withMoney({}, 'parent-approve')
    const chk = ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: '2026-11-05' }, '2026-11-05T09:00:00')
    const closed = ev({ type: 'week.closed', kidId: nolan, weekStart: WS, balance: 1000 }, '2026-11-08T00:00:01')
    const ver = ev({ type: 'chore.verified', kidId: nolan, choreId: TRASH, date: '2026-11-05' }, '2026-11-09T09:00:00')
    const ws = weekState(f, kidOf(f), [chk, closed, ver], WS, new Date(2026, 10, 10))
    expect(ws.pay).toBe(0)
    expect(ws.balance).toBe(1000)
    const t = mathTerms(ws)
    expect(t.start + t.plus - t.minus).toBe(ws.closedBalance)
  })
})
