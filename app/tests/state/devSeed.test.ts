import { describe, expect, it } from 'vitest'
import { seedDemoFamily } from '../../src/state/devSeed'
import { verifyPin } from '../../src/security/pin'

describe('seedDemoFamily', () => {
  it('builds Nolan and Makenna with a working PIN 1234', async () => {
    const { family, events } = await seedDemoFamily()
    expect(family.kids.map((k) => [k.name, k.theme, k.chores.length])).toEqual([['Nolan', 'truck', 5], ['Makenna', 'unicorn', 5]])
    expect(family.kids.every((k) => k.routineIds.length === 3)).toBe(true)
    expect(await verifyPin('1234', family.pinSalt, family.pinHash)).toBe(true)
    expect(events.filter((e) => e.type === 'deduction.logged')).toHaveLength(2)
  })
})
