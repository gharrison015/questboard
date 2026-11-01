import { describe, expect, it } from 'vitest'
import { badges } from '../../src/content/badges'
import { dueWeekCloses } from '../../src/engine/closeWeeks'
import { dateKey } from '../../src/engine/dates'
import { jars } from '../../src/engine/jars'
import { prepare } from '../../src/engine/ledger'
import { weekStatesFor } from '../../src/engine/streaks'
import type { Family, Kid, QBEvent } from '../../src/engine/types'

/** The reviewer's bench scenario: 5 kids, 400 days, 5 chores and a 6-step routine each, 22.4k events. */
function scenario(): { family: Family; events: QBEvent[]; now: Date } {
  const ALL = [0, 1, 2, 3, 4, 5, 6]
  const routine = { id: 'r1', name: 'Morning', steps: [1, 2, 3, 4, 5, 6].map((i) => ({ id: `s${i}`, label: `s${i}` })), days: ALL }
  const kids: Kid[] = [0, 1, 2, 3, 4].map((k) => ({
    id: `k${k}`, name: `K${k}`, grade: '1st', theme: 'truck', order: k, routineIds: ['r1'],
    chores: [0, 1, 2, 3, 4].map((c) => ({ id: `c${c}`, label: 'c', icon: 'star', days: ALL, pay: c === 0 ? 100 : 0, active: true })),
  }))
  const family: Family = {
    id: 'f', name: 'F', createdAt: new Date(2025, 8, 1).toISOString(), pinHash: '', pinSalt: '', recoveryHash: '',
    money: { startAmount: 1000, deductionDefault: 50, chorePayDefault: 100, weekStartDay: 0, floorAtZero: true, earnBackEnabled: true, earnBackPerCorrect: 100 },
    verification: 'kid-verify', appearance: 'auto', reasons: [{ id: 'y', label: 'Y', emoji: 'x' }], routines: [routine], kids, entitlements: [],
  }
  let n = 0
  const id = (): string => `e${(++n).toString().padStart(8, '0')}`
  const events: QBEvent[] = []
  for (let i = 0; i < 400; i++) {
    const d = new Date(2025, 8, 1 + i, 12)
    const date = dateKey(d)
    for (const k of kids) {
      for (const c of k.chores) events.push({ id: id(), at: new Date(d.getTime() + n).toISOString(), type: 'chore.checked', kidId: k.id, choreId: c.id, date })
      for (const s of routine.steps) events.push({ id: id(), at: new Date(d.getTime() + n).toISOString(), type: 'routine.step', kidId: k.id, routineId: 'r1', stepId: s.id, date, done: true })
      if (i % 5 === 0) events.push({ id: id(), at: new Date(d.getTime() + n).toISOString(), type: 'deduction.logged', kidId: k.id, reasonId: 'y', amount: 50, date })
    }
  }
  return { family, events, now: new Date(2025, 8, 400, 15) }
}

const time = (fn: () => unknown): number => {
  const t0 = performance.now()
  fn()
  return performance.now() - t0
}

describe('derivation speed at family scale (Ruling 28)', () => {
  it('closes, week history and badges stay well under 300 ms per kid', () => {
    const { family, events, now } = scenario()
    expect(events.length).toBe(22400)
    let closes: QBEvent[] = []
    const closeMs = time(() => { closes = dueWeekCloses(family, events, now) })
    expect(closes.length).toBe(285)
    const all = [...events, ...closes]
    const results: string[] = [`dueWeekCloses ${closeMs.toFixed(0)}ms`]
    for (const kid of family.kids) {
      // A fresh array each time, so the prepare cost is inside the measurement.
      const copy = [...all]
      const weeksMs = time(() => weekStatesFor(family, kid, copy, now))
      const prep = prepare(copy)
      const badgeMs = time(() => badges({ family, kid, events: copy, now, prep, jars: jars(kid.id, copy, prep), weeks: weekStatesFor(family, kid, copy, now, prep) }))
      results.push(`${kid.id} weekStatesFor ${weeksMs.toFixed(0)}ms badges ${badgeMs.toFixed(0)}ms`)
      expect(weeksMs, results.join('; ')).toBeLessThan(300)
      expect(badgeMs, results.join('; ')).toBeLessThan(300)
    }
    expect(closeMs, results.join('; ')).toBeLessThan(3000)
    console.info(results.join('\n'))
  })
})
