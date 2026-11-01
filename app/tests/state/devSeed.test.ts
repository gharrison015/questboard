import { describe, expect, it } from 'vitest'
import { seedDemoFamily } from '../../src/state/devSeed'
import { badges } from '../../src/content/badges'
import { jars } from '../../src/engine/jars'
import { weekStatesFor } from '../../src/engine/streaks'
import { verifyPin } from '../../src/security/pin'

describe('seedDemoFamily', () => {
  it('builds Nolan and Makenna with a working PIN 1234', async () => {
    const { family, events } = await seedDemoFamily()
    expect(family.kids.map((k) => [k.name, k.theme, k.chores.length])).toEqual([['Nolan', 'truck', 5], ['Makenna', 'unicorn', 5]])
    expect(family.kids.every((k) => k.routineIds.length === 3)).toBe(true)
    expect(await verifyPin('1234', family.pinSalt, family.pinHash)).toBe(true)
    expect(events.filter((e) => e.type === 'deduction.logged')).toHaveLength(2)
  })

  it('gives Nolan two earned badges without changing the jar amounts', async () => {
    const now = new Date()
    const { family, events } = await seedDemoFamily(now)
    const kid = family.kids[0]
    const earned = badges({ family, kid, events, now, jars: jars(kid.id, events), weeks: weekStatesFor(family, kid, events, now) })
      .filter((b) => b.earnedAt).map((b) => b.def.id)
    expect(earned).toEqual(expect.arrayContaining(['first-give', 'first-paid-chore']))
    const closed = events.filter((e) => e.type === 'week.closed' && e.kidId === kid.id).reduce((n, e) => n + (e.type === 'week.closed' ? e.balance : 0), 0)
    const alloc = events.filter((e) => e.type === 'jar.allocated' && e.kidId === kid.id).reduce((n, e) => n + (e.type === 'jar.allocated' ? e.amount : 0), 0)
    expect(closed - alloc).toBe(1200)
  })
})
