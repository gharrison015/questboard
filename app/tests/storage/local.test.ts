import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { LocalAdapter } from '../../src/storage/local'
import { InMemoryAdapter } from '../../src/storage/memory'
import { DEFAULT_DEVICE, EMPTY_LOCKOUT, type StorageAdapter } from '../../src/storage/adapter'
import { exportFamily, parseImport } from '../../src/storage/exportImport'
import { hashPin, makeSalt, normalizeRecoveryCode } from '../../src/security/pin'
import type { QBEvent } from '../../src/engine/types'
import { ev, makeFamily, nolan } from '../fixtures'

function events(): QBEvent[] {
  return [
    ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 50, date: '2026-10-02' }, '2026-10-02T10:00:00.000Z'),
    ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 50, date: '2026-10-01' }, '2026-10-01T10:00:00.000Z'),
    ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 50, date: '2026-10-03' }, '2026-10-03T10:00:00.000Z'),
  ]
}

function contract(name: string, make: () => StorageAdapter) {
  describe(name, () => {
    let a: StorageAdapter
    beforeEach(() => {
      a = make()
    })
    it('loads empty defaults', async () => {
      const r = await a.load()
      expect(r.family).toBeNull()
      expect(r.events).toEqual([])
      expect(r.lockout).toEqual(EMPTY_LOCKOUT)
      expect(r.device).toEqual(DEFAULT_DEVICE)
    })
    it('round-trips family, 3 events sorted by at, lockout, device; wipe empties', async () => {
      const fam = makeFamily()
      const evs = events()
      await a.saveFamily(fam)
      await a.appendEvents(evs)
      await a.appendEvents([evs[0]])
      await a.saveLockout({ failures: 2, lockedUntil: null })
      await a.saveDevice({ modeOverride: 'tv', appearanceOverride: 'dark' })
      const r = await a.load()
      expect(r.family).toEqual(fam)
      expect(r.events).toHaveLength(3)
      expect(r.events.map((e) => e.at)).toEqual([...evs.map((e) => e.at)].sort())
      expect(r.lockout.failures).toBe(2)
      expect(r.device.modeOverride).toBe('tv')
      await a.wipe()
      const w = await a.load()
      expect(w.family).toBeNull()
      expect(w.events).toEqual([])
      expect(w.lockout).toEqual(EMPTY_LOCKOUT)
    })
  })
}

let n = 0
contract('LocalAdapter', () => {
  n += 1
  return new LocalAdapter(`questboard-test-${n}`)
})
contract('InMemoryAdapter', () => new InMemoryAdapter())

describe('export and import', () => {
  it('never contains the plaintext PIN or recovery code, and hashes are 64-char hex', async () => {
    const pin = '482916'
    const code = 'QWER-7TYU'
    const salt = makeSalt()
    const fam = makeFamily({
      pinSalt: salt,
      pinHash: await hashPin(pin, salt),
      recoveryHash: await hashPin(normalizeRecoveryCode(code), salt),
    })
    const json = exportFamily(fam, events())
    expect(json).not.toContain(pin)
    expect(json).not.toContain(code)
    expect(json).not.toContain(normalizeRecoveryCode(code))
    const out = JSON.parse(json) as { family: { pinHash: string; recoveryHash: string } }
    expect(out.family.pinHash).toMatch(/^[0-9a-f]{64}$/)
    expect(out.family.recoveryHash).toMatch(/^[0-9a-f]{64}$/)
  })
  it('round-trips through parseImport', () => {
    const fam = makeFamily()
    const evs = events()
    const json = exportFamily(fam, evs)
    const parsed = JSON.parse(json) as { version: number; exportedAt: string }
    expect(parsed.version).toBe(1)
    expect(typeof parsed.exportedAt).toBe('string')
    const r = parseImport(json)
    expect('error' in r).toBe(false)
    if (!('error' in r)) {
      expect(r.family.id).toBe(fam.id)
      expect(r.events).toHaveLength(3)
    }
  })
  it('rejects version 2, missing events, bad json, bad family', () => {
    const fam = makeFamily()
    expect(parseImport(JSON.stringify({ version: 2, family: fam, events: [] }))).toHaveProperty('error')
    expect(parseImport(JSON.stringify({ version: 1, family: fam }))).toHaveProperty('error')
    expect(parseImport('not json')).toHaveProperty('error')
    expect(parseImport(JSON.stringify({ version: 1, family: { id: 'x' }, events: [] }))).toHaveProperty('error')
    expect(parseImport(JSON.stringify({ version: 1, family: fam, events: [{ id: 1 }] }))).toHaveProperty('error')
  })
})
