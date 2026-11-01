import { describe, expect, it } from 'vitest'
import { closeCurrentWeek, currentWeekStart, dueWeekCloses } from '../../src/engine/closeWeeks'
import { dateKey } from '../../src/engine/dates'
import { canAllocate, jars } from '../../src/engine/jars'
import { liveEvents } from '../../src/engine/ledger'
import { unverified } from '../../src/engine/streaks'
import type { Family, JarKey, Kid, QBEvent } from '../../src/engine/types'
import { redoTargets, ruleRows, undoTargets } from '../../src/engine/undoRules'
import { choreDayState, weekState } from '../../src/engine/week'
import { makeFamily, makenna, nolan } from '../fixtures'

/** Small seeded generator, so a failure replays exactly. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ACTIONS = ['check', 'verify', 'deduct', 'close', 'allocate', 'gift', 'payout', 'donate', 'undo', 'redo'] as const
type Action = (typeof ACTIONS)[number]

/** Money in and out of a kid, counted straight from the live ledger, independent of jars(). */
function ledgerTotals(kidId: string, events: QBEvent[]) {
  const closes = new Map<string, number>()
  let giftsIn = 0, giftsOut = 0, paidOut = 0, donated = 0
  for (const e of liveEvents(events)) {
    if (e.type === 'week.closed' && e.kidId === kidId) closes.set(e.weekStart, e.balance)
    else if (e.type === 'jar.gifted' && e.toKidId === kidId) giftsIn += e.amount
    else if (e.type === 'jar.gifted' && e.fromKidId === kidId) giftsOut += e.amount
    else if (e.type === 'jar.paidOut' && e.kidId === kidId) paidOut += e.amount
    else if (e.type === 'jar.donated' && e.kidId === kidId) donated += e.amount
  }
  const closed = [...closes.values()].reduce((a, b) => a + b, 0)
  return { closed, giftsIn, giftsOut, paidOut, donated }
}

function family(): Family {
  const f = makeFamily({ createdAt: new Date(2026, 9, 18, 8).toISOString(), verification: 'kid-verify' })
  const sis = f.kids[1]
  return {
    ...f,
    kids: [f.kids[0], { ...sis, chores: [{ id: 'chore-feed', label: 'Feed the cat', icon: 'star', days: [0, 1, 2, 3, 4, 5, 6], pay: 75, active: true }] }],
  }
}

function run(seed: number, steps: number): { applied: Record<Action, number> } {
  const rand = mulberry32(seed)
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]
  const f = family()
  let now = new Date(2026, 10, 1, 8)
  let events: QBEvent[] = dueWeekCloses(f, [], now)
  const applied = Object.fromEntries(ACTIONS.map((a) => [a, 0])) as Record<Action, number>
  let n = 0
  const id = (): string => `s${seed}-${++n}`
  const stamp = (): string => now.toISOString()

  const check = (step: number, action: Action): void => {
    for (const kidId of [nolan, makenna]) {
      const j = jars(kidId, events)
      const t = ledgerTotals(kidId, events)
      const where = `seed ${seed}, step ${step} (${action}), kid ${kidId}`
      expect(t.closed + t.giftsIn - t.giftsOut, where).toBe(j.unsplit + j.save + j.spend + j.give + t.paidOut + t.donated)
      for (const k of ['save', 'spend', 'give', 'unsplit'] as const) expect(j[k], `${where}, ${k}`).toBeGreaterThanOrEqual(0)
    }
  }

  for (let step = 0; step < steps; step++) {
    // The clock moves between 10 minutes and a day and a half; crossing a boundary closes due weeks (I1).
    const before = currentWeekStart(f, now)
    now = new Date(now.getTime() + Math.floor(rand() * 36 * 60) * 60_000 + 600_000)
    if (currentWeekStart(f, now) !== before) events = [...events, ...dueWeekCloses(f, events, now)]

    const kid: Kid = pick(f.kids)
    const sib = f.kids.find((k) => k.id !== kid.id) as Kid
    const today = dateKey(now)
    const ws = weekState(f, kid, events, currentWeekStart(f, now), now)
    const j = jars(kid.id, events)
    const action = pick(ACTIONS)
    let out: QBEvent[] = []

    switch (action) {
      case 'check': {
        const chore = pick(kid.chores)
        const s = choreDayState(f, kid, chore, today, events, now)
        if (!s.verified && !s.rejected) out = [{ id: id(), at: stamp(), type: s.checked ? 'chore.unchecked' : 'chore.checked', kidId: kid.id, choreId: chore.id, date: today }]
        break
      }
      case 'verify': {
        const list = unverified(f, kid, events, now)
        if (list.length > 0) {
          const item = pick(list)
          out = [{ id: id(), at: stamp(), type: rand() < 0.7 ? 'chore.verified' : 'chore.rejected', kidId: kid.id, choreId: item.choreId, date: item.date }]
        }
        break
      }
      case 'deduct':
        if (!ws.closed) out = [{ id: id(), at: stamp(), type: 'deduction.logged', kidId: kid.id, reasonId: 'r-yelling', amount: pick([25, 50, 100]), date: today }]
        break
      case 'close':
        out = closeCurrentWeek(f, kid, events, now)
        break
      case 'allocate': {
        const amount = Math.max(1, Math.floor(rand() * j.unsplit) + 1)
        const jar: JarKey = pick(['save', 'spend', 'give'] as const)
        if (canAllocate(j, amount)) out = [{ id: id(), at: stamp(), type: 'jar.allocated', kidId: kid.id, jar, amount }]
        break
      }
      case 'gift': {
        const amount = Math.max(1, Math.floor(rand() * j.unsplit) + 1)
        if (canAllocate(j, amount)) {
          const groupId = id()
          out = [
            { id: id(), at: stamp(), type: 'jar.allocated', kidId: kid.id, jar: 'give', amount, groupId },
            { id: id(), at: stamp(), type: 'jar.gifted', fromKidId: kid.id, toKidId: sib.id, amount, groupId },
          ]
        }
        break
      }
      case 'payout': {
        const jar = pick(['save', 'spend'] as const)
        if (j[jar] > 0) out = [{ id: id(), at: stamp(), type: 'jar.paidOut', kidId: kid.id, jar, amount: j[jar], via: 'cashapp' }]
        break
      }
      case 'donate':
        if (j.give > 0) out = [{ id: id(), at: stamp(), type: 'jar.donated', kidId: kid.id, amount: j.give, to: 'Shelter' }]
        break
      case 'undo': {
        const rows = ruleRows(f, kid, events, now).filter((r) => !r.undone && r.undoable)
        if (rows.length > 0) out = undoTargets(events, pick(rows).ids).map((targetEventId) => ({ id: id(), at: stamp(), type: 'undo', targetEventId }))
        break
      }
      case 'redo': {
        const rows = ruleRows(f, kid, events, now).filter((r) => r.undone && r.redoable)
        if (rows.length > 0) out = redoTargets(events, pick(rows).ids).map((targetEventId) => ({ id: id(), at: stamp(), type: 'undo', targetEventId }))
        break
      }
    }
    if (out.length > 0) {
      applied[action] += 1
      events = [...events, ...out]
    }
    check(step, action)
  }
  return { applied }
}

describe('money conservation under the UI allow-rules (Ruling 23e)', () => {
  it('holds for 200 random actions across 25 seeds, with no negative jar', () => {
    const totals = Object.fromEntries(ACTIONS.map((a) => [a, 0])) as Record<Action, number>
    for (let seed = 1; seed <= 25; seed++) {
      const { applied } = run(seed, 200)
      for (const a of ACTIONS) totals[a] += applied[a]
    }
    // Every kind of action really happened, so the property is not passing on an idle ledger.
    for (const a of ACTIONS) expect(totals[a], a).toBeGreaterThan(0)
  })

  it('reproduces the reviewer cases: undo of a split after payout and a redo of a re-closed week are refused', () => {
    const f = family()
    const kid = f.kids[0]
    const now = new Date(2026, 10, 3, 12)
    const t = (m: number): string => new Date(2026, 10, 3, 9, m).toISOString()
    const a: QBEvent[] = [
      { id: 'C', at: t(0), type: 'week.closed', kidId: nolan, weekStart: '2026-10-25', balance: 500 },
      { id: 'A', at: t(1), type: 'jar.allocated', kidId: nolan, jar: 'spend', amount: 500 },
      { id: 'P', at: t(2), type: 'jar.paidOut', kidId: nolan, jar: 'spend', amount: 500, via: 'cashapp' },
    ]
    expect(ruleRows(f, kid, a, now).find((r) => r.ids.includes('A'))?.undoable).toBe(false)

    const b: QBEvent[] = [
      { id: 'C1', at: t(0), type: 'week.closed', kidId: nolan, weekStart: '2026-11-01', balance: 1000 },
      { id: 'U1', at: t(1), type: 'undo', targetEventId: 'C1' },
      { id: 'C2', at: t(2), type: 'week.closed', kidId: nolan, weekStart: '2026-11-01', balance: 1000 },
      { id: 'X', at: t(3), type: 'jar.allocated', kidId: nolan, jar: 'save', amount: 1000 },
    ]
    const redo = [...b, ...redoTargets(b, ['C1']).map((x, i): QBEvent => ({ id: `R${i}`, at: t(4), type: 'undo', targetEventId: x }))]
    expect(jars(nolan, redo).unsplit).toBe(0)
  })
})
