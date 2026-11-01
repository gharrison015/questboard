export interface LockoutState {
  failures: number
  lockedUntil: number | null
}

export const MAX_FAILURES = 5
export const LOCKOUT_MS = 60000
export const PARENT_SESSION_MS = 300000

export function isLocked(s: LockoutState, now: number): boolean {
  return s.lockedUntil !== null && now < s.lockedUntil
}

export function recordFailure(s: LockoutState, now: number): LockoutState {
  const failures = s.failures + 1
  if (failures >= MAX_FAILURES) return { failures: 0, lockedUntil: now + LOCKOUT_MS }
  return { failures, lockedUntil: s.lockedUntil }
}

export function recordSuccess(): LockoutState {
  return { failures: 0, lockedUntil: null }
}

/** Every unlock must go through this; callers must persist the returned state with saveLockout. A correct PIN during lockout is ignored. */
export function tryUnlock(
  pinOk: boolean,
  state: LockoutState,
  now: number,
): { state: LockoutState; result: 'ok' | 'bad' | 'locked' } {
  if (isLocked(state, now)) return { state, result: 'locked' }
  if (pinOk) return { state: recordSuccess(), result: 'ok' }
  return { state: recordFailure(state, now), result: 'bad' }
}

export function sessionValid(unlockedAt: number | null, now: number): boolean {
  return unlockedAt !== null && now - unlockedAt < PARENT_SESSION_MS
}
