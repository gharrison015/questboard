import type { Family, QBEvent } from '../engine/types'

export function exportFamily(family: Family, events: QBEvent[], _recoveryCode?: null): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), family, events }, null, 2)
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

const VERIFICATION = ['kid-final', 'kid-verify', 'parent-approve']
const APPEARANCE = ['bright', 'calm', 'dark', 'auto']
const MONEY_NUMBERS = ['startAmount', 'deductionDefault', 'chorePayDefault', 'earnBackPerCorrect'] as const

/** Names the first thing wrong with a family object, in plain words, or returns null. */
function familyProblem(f: Record<string, unknown>): string | null {
  if (typeof f.recoveryHash !== 'string') return 'the recovery code is missing'
  const m = f.money
  if (!isObj(m)) return 'the money settings are missing'
  for (const key of MONEY_NUMBERS) {
    if (typeof m[key] !== 'number' || !Number.isFinite(m[key])) return `the money setting "${key}" is missing`
  }
  if (typeof m.weekStartDay !== 'number' || !Number.isInteger(m.weekStartDay) || m.weekStartDay < 0 || m.weekStartDay > 6) {
    return 'the money setting "weekStartDay" is missing or not a day from 0 to 6'
  }
  if (typeof m.earnBackEnabled !== 'boolean') return 'the money setting "earnBackEnabled" is missing'
  for (const key of ['reasons', 'routines', 'entitlements'] as const) {
    if (!Array.isArray(f[key])) return `"${key}" is missing`
  }
  if (typeof f.verification !== 'string' || !VERIFICATION.includes(f.verification)) return 'the verification setting is missing or unknown'
  if (typeof f.appearance !== 'string' || !APPEARANCE.includes(f.appearance)) return 'the appearance setting is missing or unknown'
  for (const [i, k] of (f.kids as unknown[]).entries()) {
    if (!isObj(k) || typeof k.id !== 'string' || typeof k.name !== 'string' || typeof k.theme !== 'string'
      || !Array.isArray(k.chores) || !Array.isArray(k.routineIds)) {
      return `kid ${i + 1} is missing its id, name, buddy, chores or routines`
    }
  }
  return null
}

export function parseImport(json: string): { family: Family; events: QBEvent[] } | { error: string } {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return { error: 'That file is not valid JSON. Pick a QuestBoard export file.' }
  }
  if (!isObj(data)) return { error: 'That file does not look like a QuestBoard export.' }
  if (data.version !== 1) return { error: 'This export is from a different version of QuestBoard and cannot be read.' }
  const f = data.family
  if (
    !isObj(f) ||
    typeof f.id !== 'string' ||
    typeof f.name !== 'string' ||
    typeof f.pinHash !== 'string' ||
    typeof f.pinSalt !== 'string' ||
    !Array.isArray(f.kids)
  ) {
    return { error: 'The family information in this file is missing or incomplete.' }
  }
  const problem = familyProblem(f)
  if (problem) return { error: `The family information in this file is not usable: ${problem}.` }
  if (!Array.isArray(data.events)) return { error: 'The event history in this file is missing.' }
  for (const e of data.events) {
    if (!isObj(e) || typeof e.id !== 'string' || typeof e.at !== 'string' || typeof e.type !== 'string') {
      return { error: 'Some events in this file are damaged.' }
    }
  }
  return { family: f as unknown as Family, events: data.events as QBEvent[] }
}
