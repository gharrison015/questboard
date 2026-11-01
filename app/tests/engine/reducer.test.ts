import { describe, expect, it } from 'vitest'
import { applyFamilyAction, newFamily, LimitError } from '../../src/engine/reducer'
import { kidLimit, choreLimit, ownsTheme, hasPro } from '../../src/engine/entitlements'
import { jars } from '../../src/engine/jars'
import { ev, makeFamily, makenna, nolan } from '../fixtures'
import type { Chore, Family } from '../../src/engine/types'

const newKid = (name: string, theme: 'truck' | 'dino' = 'dino') => ({
  name, grade: 'K' as const, theme, chores: [], routineIds: [],
})
const grant = (f: Family, key: string): Family => applyFamilyAction(f, { type: 'entitlement.grant', key })
const choreBody = (label: string, active = true): Omit<Chore, 'id'> => ({
  label, icon: 'star', days: [1], pay: 0, active,
})

describe('kids', () => {
  it('third kid throws LimitError(kids), kid-slot:3 allows it', () => {
    const f = makeFamily()
    expect(() => applyFamilyAction(f, { type: 'kid.add', kid: newKid('C') })).toThrow(LimitError)
    try { applyFamilyAction(f, { type: 'kid.add', kid: newKid('C') }) } catch (e) {
      expect((e as LimitError).limit).toBe('kids')
    }
    const g = applyFamilyAction(grant(f, 'kid-slot:3'), { type: 'kid.add', kid: newKid('C') })
    expect(g.kids).toHaveLength(3)
    expect(g.kids[2].order).toBe(2)
    expect(g.kids[2].archived).toBe(false)
    expect(g.kids[2].id).toBeTruthy()
    expect(g.kids[2].createdAt).toBeTruthy()
    expect(f.kids).toHaveLength(2)
  })

  it('archived kids do not count toward the limit', () => {
    const f = applyFamilyAction(makeFamily(), { type: 'kid.archive', id: makenna })
    expect(applyFamilyAction(f, { type: 'kid.add', kid: newKid('C') }).kids).toHaveLength(3)
  })

  it('kid.update to an unowned theme throws, owned or pro passes', () => {
    const f = makeFamily()
    expect(() => applyFamilyAction(f, { type: 'kid.update', id: nolan, patch: { theme: 'ocean' } })).toThrow(LimitError)
    expect(applyFamilyAction(f, { type: 'kid.update', id: nolan, patch: { theme: 'dino' } }).kids[0].theme).toBe('dino')
    const g = grant(f, 'theme:ocean')
    expect(applyFamilyAction(g, { type: 'kid.update', id: nolan, patch: { theme: 'ocean' } }).kids[0].theme).toBe('ocean')
    const p = grant(f, 'pro')
    expect(applyFamilyAction(p, { type: 'kid.update', id: nolan, patch: { theme: 'space' } }).kids[0].theme).toBe('space')
  })

  it('kid.update ignores id, chores, archived and order at runtime', () => {
    const f = makeFamily()
    const bad = { id: 'x', chores: [], archived: true, order: 9, name: 'Z' } as never
    const k = applyFamilyAction(f, { type: 'kid.update', id: nolan, patch: bad }).kids[0]
    expect(k.id).toBe(nolan)
    expect(k.chores).toHaveLength(5)
    expect(k.archived).toBeUndefined()
    expect(k.order).toBe(0)
    expect(k.name).toBe('Z')
  })

  it('kid.unarchive respects the kid limit', () => {
    let f = applyFamilyAction(makeFamily(), { type: 'kid.archive', id: makenna })
    f = applyFamilyAction(f, { type: 'kid.add', kid: newKid('C') })
    expect(() => applyFamilyAction(f, { type: 'kid.unarchive', id: makenna })).toThrow(LimitError)
    const g = applyFamilyAction(grant(f, 'kid-slot:3'), { type: 'kid.unarchive', id: makenna })
    expect(g.kids.find((k) => k.id === makenna)?.archived).toBe(false)
  })

  it('reorder keeps unlisted (archived) kids after listed ones, ignores bad ids', () => {
    let f = applyFamilyAction(makeFamily(), { type: 'kid.archive', id: nolan })
    f = applyFamilyAction(f, { type: 'kid.add', kid: newKid('C') })
    const c = f.kids[2].id
    const g = applyFamilyAction(f, { type: 'kid.reorder', ids: [c, 'nope', c, makenna] })
    const ord = (id: string) => g.kids.find((k) => k.id === id)?.order
    expect([ord(c), ord(makenna), ord(nolan)]).toEqual([0, 1, 2])
  })

  it('reorder sets order by position', () => {
    const f = applyFamilyAction(makeFamily(), { type: 'kid.reorder', ids: [makenna, nolan] })
    expect(f.kids.find((k) => k.id === makenna)?.order).toBe(0)
    expect(f.kids.find((k) => k.id === nolan)?.order).toBe(1)
  })

  it('Review Focus 5: archiving Nolan keeps him and keeps the gift in Makenna save', () => {
    const events = [ev({ type: 'jar.gifted', fromKidId: nolan, toKidId: makenna, amount: 300 }, '2026-10-05T12:00:00.000Z')]
    const before = jars(makenna, events).save
    const f = applyFamilyAction(makeFamily(), { type: 'kid.archive', id: nolan })
    expect(f.kids.find((k) => k.id === nolan)?.archived).toBe(true)
    expect(f.kids).toHaveLength(2)
    expect(jars(makenna, events).save).toBe(before)
    expect(jars(makenna, events).save).toBeGreaterThanOrEqual(300)
  })
})

describe('chores', () => {
  it('11th active chore throws, inactive does not count, chores-unlimited lifts', () => {
    let f = makeFamily()
    for (let i = 0; i < 5; i++) f = applyFamilyAction(f, { type: 'chore.add', kidId: nolan, chore: choreBody(`c${i}`) })
    expect(f.kids[0].chores).toHaveLength(10)
    expect(() => applyFamilyAction(f, { type: 'chore.add', kidId: nolan, chore: choreBody('x') })).toThrow(LimitError)
    const g = applyFamilyAction(f, { type: 'chore.add', kidId: nolan, chore: choreBody('off', false) })
    expect(g.kids[0].chores).toHaveLength(11)
    const id = g.kids[0].chores[10].id
    expect(() => applyFamilyAction(g, { type: 'chore.update', kidId: nolan, id, patch: { active: true } })).toThrow(LimitError)
    const h = grant(g, 'chores-unlimited')
    expect(applyFamilyAction(h, { type: 'chore.update', kidId: nolan, id, patch: { active: true } }).kids[0].chores[10].active).toBe(true)
    expect(choreLimit(h, nolan)).toBe(Infinity)
  })

  it('remove deletes the chore', () => {
    const f = applyFamilyAction(makeFamily(), { type: 'chore.remove', kidId: nolan, id: 'chore-bed' })
    expect(f.kids[0].chores.some((c) => c.id === 'chore-bed')).toBe(false)
  })
})

describe('settings', () => {
  it('routine remove strips routineIds', () => {
    let f = applyFamilyAction(makeFamily(), { type: 'routine.add', routine: { name: 'R', steps: [], days: [1] } })
    const rid = f.routines[0].id
    f = applyFamilyAction(f, { type: 'kid.update', id: nolan, patch: { routineIds: [rid] } })
    f = applyFamilyAction(f, { type: 'routine.remove', id: rid })
    expect(f.routines).toHaveLength(0)
    expect(f.kids[0].routineIds).toEqual([])
  })

  it('money.kidOverride sets and clears', () => {
    let f = applyFamilyAction(makeFamily(), { type: 'money.kidOverride', kidId: nolan, overrides: { startAmount: 5 } })
    expect(f.kids[0].moneyOverrides).toEqual({ startAmount: 5 })
    f = applyFamilyAction(f, { type: 'money.kidOverride', kidId: nolan, overrides: null })
    expect(f.kids[0].moneyOverrides).toBeUndefined()
  })

  it('pin.set, grant is idempotent, input never mutated', () => {
    const f = makeFamily()
    const snap = JSON.stringify(f)
    const g = applyFamilyAction(f, { type: 'pin.set', pinHash: 'h', pinSalt: 's', recoveryHash: 'r' })
    expect([g.pinHash, g.pinSalt, g.recoveryHash]).toEqual(['h', 's', 'r'])
    const p = grant(grant(g, 'pro'), 'pro')
    expect(p.entitlements.filter((e) => e.key === 'pro')).toHaveLength(1)
    expect(hasPro(p)).toBe(true)
    expect(JSON.stringify(f)).toBe(snap)
  })
})

describe('newFamily and entitlements', () => {
  it('seeds defaults', () => {
    const f = newFamily('Harrison')
    expect(f.reasons.map((r) => r.label)).toEqual(['Not listening', 'Mean to a sibling', 'Yelling', "Didn't share", 'Tantrum', "Wouldn't get ready"])
    expect(f.routines.map((r) => r.name)).toEqual(['Morning', 'Bedtime', 'Nighttime'])
    expect(f.routines[2].steps.map((s) => s.label)).toEqual(['Read a book', 'Lights out'])
    expect(f.money).toEqual({
      startAmount: 1000, deductionDefault: 50, chorePayDefault: 100, weekStartDay: 0,
      floorAtZero: true, earnBackEnabled: true, earnBackPerCorrect: 100,
    })
    expect(f.reasons).toHaveLength(6)
    expect(f.reasons.every((r) => r.id && r.emoji)).toBe(true)
    expect(f.routines[0].steps.map((s) => s.label)).toEqual(['Brush teeth', 'Get dressed', 'Eat breakfast'])
    expect(f.routines[1].steps.map((s) => s.label)).toEqual(['Bath', 'PJs on', 'Brush teeth'])
    expect(f.routines[0].days).not.toBe(f.routines[1].days)
    expect(f.verification).toBe('kid-verify')
    expect(f.appearance).toBe('bright')
    expect(f.kids).toEqual([])
    expect(f.pinHash).toBe('')
  })
  it('limits', () => {
    const f = makeFamily()
    expect(kidLimit(f)).toBe(2)
    expect(kidLimit(grant(f, 'kid-slot:3'))).toBe(3)
    expect(kidLimit(grant(f, 'pro'))).toBe(Infinity)
    expect(ownsTheme(f, 'truck')).toBe(true)
    expect(ownsTheme(f, 'ocean')).toBe(false)
  })
})
