import { describe, expect, it } from 'vitest'
import {
  hashPin,
  isValidPin,
  makeRecoveryCode,
  makeSalt,
  normalizeRecoveryCode,
  verifyPin,
} from '../../src/security/pin'
import {
  PARENT_SESSION_MS,
  isLocked,
  recordFailure,
  recordSuccess,
  sessionValid,
  tryUnlock,
  type LockoutState,
} from '../../src/security/session'

const CLEAN: LockoutState = { failures: 0, lockedUntil: null }

describe('pin', () => {
  it('hashPin is deterministic and differs by salt', async () => {
    const a = await hashPin('1234', 'salt-a')
    expect(await hashPin('1234', 'salt-a')).toBe(a)
    expect(await hashPin('1234', 'salt-b')).not.toBe(a)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })
  it('verifyPin returns true for the right pin and false otherwise', async () => {
    const salt = makeSalt()
    const hash = await hashPin('4321', salt)
    expect(await verifyPin('4321', salt, hash)).toBe(true)
    expect(await verifyPin('4322', salt, hash)).toBe(false)
  })
  it('makeSalt returns 16 random bytes as base64', () => {
    const s = makeSalt()
    expect(atob(s).length).toBe(16)
    expect(makeSalt()).not.toBe(s)
  })
  it('isValidPin accepts 4 to 6 digits only', () => {
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('1234567')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
  })
  it('makeRecoveryCode is XXXX-XXXX from the safe alphabet', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(makeRecoveryCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/)
    }
  })
  it('recovery codes hash the same regardless of case and dash', async () => {
    expect(normalizeRecoveryCode('abcd-2345')).toBe('ABCD2345')
    expect(normalizeRecoveryCode('abcd 2345')).toBe('ABCD2345')
    expect(await hashPin(normalizeRecoveryCode('abcd-2345'), 's')).toBe(
      await hashPin(normalizeRecoveryCode('ABCD2345'), 's'),
    )
  })
})

describe('lockout', () => {
  it('five failures lock for 60000 ms and reset the counter', () => {
    let s = CLEAN
    for (let i = 0; i < 4; i += 1) {
      s = recordFailure(s, 1000)
      expect(isLocked(s, 1000)).toBe(false)
    }
    s = recordFailure(s, 1000)
    expect(s.lockedUntil).toBe(61000)
    expect(s.failures).toBe(0)
    expect(isLocked(s, 1000 + 59999)).toBe(true)
    expect(isLocked(s, 1000 + 60000)).toBe(false)
  })
  it('recordSuccess clears state', () => {
    expect(recordSuccess()).toEqual({ failures: 0, lockedUntil: null })
  })
  it('tryUnlock ignores a correct pin while locked and leaves state unchanged', () => {
    const locked: LockoutState = { failures: 0, lockedUntil: 61000 }
    const r = tryUnlock(true, locked, 2000)
    expect(r.result).toBe('locked')
    expect(r.state).toBe(locked)
  })
  it('tryUnlock applies success and failure when not locked', () => {
    expect(tryUnlock(true, { failures: 3, lockedUntil: null }, 0)).toEqual({
      state: { failures: 0, lockedUntil: null },
      result: 'ok',
    })
    expect(tryUnlock(false, CLEAN, 0)).toEqual({ state: { failures: 1, lockedUntil: null }, result: 'bad' })
    expect(tryUnlock(true, { failures: 0, lockedUntil: 100 }, 100).result).toBe('ok')
  })
  it('sessionValid lasts five minutes', () => {
    expect(PARENT_SESSION_MS).toBe(300000)
    expect(sessionValid(null, 5)).toBe(false)
    expect(sessionValid(1000, 1000 + 299999)).toBe(true)
    expect(sessionValid(1000, 1000 + 300000)).toBe(false)
  })
})
