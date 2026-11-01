export type Cents = number
export type DateKey = string

export type Grade = 'Pre-K' | 'K' | '1st' | '2nd' | '3rd+'

export type ThemeKey =
  | 'truck' | 'unicorn' | 'tamer' | 'dino' | 'ocean' | 'jungle'
  | 'race' | 'candy' | 'space' | 'hero' | 'royal' | 'fae'

export type VerificationMode = 'kid-final' | 'kid-verify' | 'parent-approve'
export type Appearance = 'bright' | 'calm' | 'dark' | 'auto'

export interface MoneySettings {
  startAmount: Cents
  deductionDefault: Cents
  chorePayDefault: Cents
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6
  floorAtZero: true
  earnBackEnabled: boolean
  earnBackPerCorrect: Cents
}

export interface Entitlement { key: string; grantedAt: string }

export interface Chore {
  id: string
  label: string
  icon: string
  days: number[]
  pay: Cents
  active: boolean
}

export interface Routine {
  id: string
  name: string
  steps: { id: string; label: string }[]
  days: number[]
}

export interface Reason { id: string; label: string; emoji: string; amount?: Cents }

export interface Kid {
  id: string
  name: string
  grade: Grade
  theme: ThemeKey
  photo?: string
  charity?: { name: string; url?: string }
  moneyOverrides?: Partial<MoneySettings>
  chores: Chore[]
  routineIds: string[]
  archived?: boolean
  order: number
  createdAt?: string
}

export interface Family {
  id: string
  name: string
  createdAt: string
  pinHash: string
  pinSalt: string
  recoveryHash: string
  money: MoneySettings
  verification: VerificationMode
  appearance: Appearance
  reasons: Reason[]
  routines: Routine[]
  kids: Kid[]
  entitlements: Entitlement[]
}

export type JarKey = 'save' | 'spend' | 'give'

export type EventBody =
  | { type: 'chore.checked'; kidId: string; choreId: string; date: DateKey }
  | { type: 'chore.unchecked'; kidId: string; choreId: string; date: DateKey }
  | { type: 'chore.verified'; kidId: string; choreId: string; date: DateKey }
  | { type: 'chore.rejected'; kidId: string; choreId: string; date: DateKey }
  | { type: 'routine.step'; kidId: string; routineId: string; stepId: string; date: DateKey; done: boolean }
  | { type: 'deduction.logged'; kidId: string; reasonId: string; amount: Cents; date: DateKey }
  | { type: 'earnback.earned'; kidId: string; skill: string; amount: Cents; date: DateKey }
  | { type: 'week.closed'; kidId: string; weekStart: DateKey; balance: Cents; inactive?: boolean }
  | { type: 'jar.allocated'; kidId: string; jar: JarKey; amount: Cents }
  | { type: 'jar.paidOut'; kidId: string; jar: 'save' | 'spend'; amount: Cents; via: string }
  | { type: 'jar.donated'; kidId: string; amount: Cents; to: string }
  | { type: 'jar.gifted'; fromKidId: string; toKidId: string; amount: Cents }
  | { type: 'entitlement.granted'; key: string }
  | { type: 'undo'; targetEventId: string }

/**
 * `groupId` links events that were written as one action (for example the allocate and gift pair).
 * An `undo` of any event in a group must undo every event in that group.
 */
export type QBEvent = { id: string; at: string; groupId?: string } & EventBody
