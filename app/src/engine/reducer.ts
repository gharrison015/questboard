import { MONEY_PRESETS } from './money'
import { choreLimit, kidLimit, ownsTheme } from './entitlements'
import { newId } from './ids'
import type {
  Appearance, Chore, Family, Kid, MoneySettings, Reason, Routine, VerificationMode,
} from './types'

export class LimitError extends Error {
  constructor(public limit: 'kids' | 'chores' | 'theme') {
    super(`Limit reached: ${limit}`)
    this.name = 'LimitError'
  }
}

export type FamilyAction =
  | { type: 'kid.add'; kid: Omit<Kid, 'id' | 'order'> }
  | { type: 'kid.update'; id: string; patch: Partial<Kid> }
  | { type: 'kid.archive'; id: string }
  | { type: 'kid.reorder'; ids: string[] }
  | { type: 'chore.add'; kidId: string; chore: Omit<Chore, 'id'> }
  | { type: 'chore.update'; kidId: string; id: string; patch: Partial<Chore> }
  | { type: 'chore.remove'; kidId: string; id: string }
  | { type: 'routine.add'; routine: Omit<Routine, 'id'> }
  | { type: 'routine.update'; id: string; patch: Partial<Routine> }
  | { type: 'routine.remove'; id: string }
  | { type: 'reason.set'; reasons: Reason[] }
  | { type: 'money.set'; money: MoneySettings }
  | { type: 'money.kidOverride'; kidId: string; overrides: Partial<MoneySettings> | null }
  | { type: 'verification.set'; mode: VerificationMode }
  | { type: 'appearance.set'; appearance: Appearance }
  | { type: 'entitlement.grant'; key: string }
  | { type: 'pin.set'; pinHash: string; pinSalt: string; recoveryHash: string }

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

function routine(name: string, labels: string[]): Routine {
  return { id: newId(), name, days: ALL_DAYS, steps: labels.map((label) => ({ id: newId(), label })) }
}

export function newFamily(name: string): Family {
  const seed: [string, string][] = [
    ['Not listening', '\u{1F649}'], ['Mean to a sibling', '\u{1F620}'], ['Yelling', '\u{1F4E2}'],
    ["Didn't share", '\u{1F6AB}'], ['Tantrum', '\u{1F624}'], ["Wouldn't get ready", '⏰'],
  ]
  return {
    id: newId(),
    name,
    createdAt: new Date().toISOString(),
    pinHash: '',
    pinSalt: '',
    recoveryHash: '',
    money: { ...MONEY_PRESETS.both, weekStartDay: 0, floorAtZero: true, earnBackEnabled: true, earnBackPerCorrect: 100 },
    verification: 'kid-verify',
    appearance: 'bright',
    reasons: seed.map(([label, emoji]) => ({ id: newId(), label, emoji })),
    routines: [
      routine('Morning', ['Brush teeth', 'Get dressed', 'Eat breakfast']),
      routine('Bedtime', ['Bath', 'PJs on', 'Brush teeth']),
      routine('Nighttime', ['Read a book', 'Lights out']),
    ],
    kids: [],
    entitlements: [],
  }
}

const mapKid = (f: Family, id: string, fn: (k: Kid) => Kid): Family => ({
  ...f,
  kids: f.kids.map((k) => (k.id === id ? fn(k) : k)),
})

const activeCount = (chores: Chore[], exceptId?: string): number =>
  chores.filter((c) => c.active && c.id !== exceptId).length

export function applyFamilyAction(f: Family, a: FamilyAction): Family {
  switch (a.type) {
    case 'kid.add': {
      if (f.kids.filter((k) => !k.archived).length >= kidLimit(f)) throw new LimitError('kids')
      if (!ownsTheme(f, a.kid.theme)) throw new LimitError('theme')
      const order = f.kids.reduce((m, k) => Math.max(m, k.order), -1) + 1
      const kid: Kid = { ...a.kid, id: newId(), order, archived: false, createdAt: new Date().toISOString() }
      return { ...f, kids: [...f.kids, kid] }
    }
    case 'kid.update': {
      if (a.patch.theme !== undefined && !ownsTheme(f, a.patch.theme)) throw new LimitError('theme')
      return mapKid(f, a.id, (k) => ({ ...k, ...a.patch, id: k.id }))
    }
    case 'kid.archive':
      return mapKid(f, a.id, (k) => ({ ...k, archived: true }))
    case 'kid.reorder':
      return { ...f, kids: f.kids.map((k) => ({ ...k, order: a.ids.indexOf(k.id) >= 0 ? a.ids.indexOf(k.id) : k.order })) }
    case 'chore.add':
      return mapKid(f, a.kidId, (k) => {
        if (a.chore.active && activeCount(k.chores) >= choreLimit(f, k.id)) throw new LimitError('chores')
        return { ...k, chores: [...k.chores, { ...a.chore, id: newId() }] }
      })
    case 'chore.update':
      return mapKid(f, a.kidId, (k) => {
        if (a.patch.active === true && activeCount(k.chores, a.id) >= choreLimit(f, k.id)) throw new LimitError('chores')
        return { ...k, chores: k.chores.map((c) => (c.id === a.id ? { ...c, ...a.patch, id: c.id } : c)) }
      })
    case 'chore.remove':
      return mapKid(f, a.kidId, (k) => ({ ...k, chores: k.chores.filter((c) => c.id !== a.id) }))
    case 'routine.add':
      return { ...f, routines: [...f.routines, { ...a.routine, id: newId() }] }
    case 'routine.update':
      return { ...f, routines: f.routines.map((r) => (r.id === a.id ? { ...r, ...a.patch, id: r.id } : r)) }
    case 'routine.remove':
      return {
        ...f,
        routines: f.routines.filter((r) => r.id !== a.id),
        kids: f.kids.map((k) => ({ ...k, routineIds: k.routineIds.filter((id) => id !== a.id) })),
      }
    case 'reason.set':
      return { ...f, reasons: a.reasons }
    case 'money.set':
      return { ...f, money: a.money }
    case 'money.kidOverride':
      return mapKid(f, a.kidId, (k) => {
        const { moneyOverrides: _drop, ...rest } = k
        return a.overrides === null ? rest : { ...rest, moneyOverrides: a.overrides }
      })
    case 'verification.set':
      return { ...f, verification: a.mode }
    case 'appearance.set':
      return { ...f, appearance: a.appearance }
    case 'entitlement.grant':
      if (f.entitlements.some((e) => e.key === a.key)) return f
      return { ...f, entitlements: [...f.entitlements, { key: a.key, grantedAt: new Date().toISOString() }] }
    case 'pin.set':
      return { ...f, pinHash: a.pinHash, pinSalt: a.pinSalt, recoveryHash: a.recoveryHash }
    default: {
      const _never: never = a
      return _never
    }
  }
}
