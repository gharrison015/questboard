import type { Chore, EventBody, Family, QBEvent, Reason } from '../src/engine/types'

export const nolan = 'kid-nolan'
export const makenna = 'kid-makenna'
export const TRASH = 'chore-trash'

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

export const REASONS: Reason[] = [
  { id: 'r-yelling', label: 'Yelling', emoji: '1' },
  { id: 'r-listening', label: 'Not listening', emoji: '2' },
  { id: 'r-hitting', label: 'Hitting', emoji: '3' },
]

function chore(id: string, label: string, pay: number): Chore {
  return { id, label, icon: 'star', days: ALL_DAYS, pay, active: true }
}

let counter = 0

export function ev(body: EventBody, at: string): QBEvent {
  counter += 1
  return { id: `e${counter}`, at, ...body }
}

export function makeFamily(overrides: Partial<Family> = {}): Family {
  return {
    id: 'fam-1',
    name: 'Test family',
    createdAt: '2026-10-01T00:00:00.000Z',
    pinHash: '',
    pinSalt: '',
    money: {
      startAmount: 1000,
      deductionDefault: 50,
      chorePayDefault: 100,
      weekStartDay: 0,
      floorAtZero: true,
      earnBackEnabled: true,
      earnBackPerCorrect: 100,
    },
    verification: 'kid-verify',
    appearance: 'auto',
    reasons: REASONS,
    routines: [],
    kids: [
      {
        id: nolan,
        name: 'Nolan',
        grade: '1st',
        theme: 'truck',
        chores: [
          chore('chore-bed', 'Make your bed', 0),
          chore('chore-toys', 'Put toys away', 0),
          chore('chore-plate', 'Clear your plate', 0),
          chore(TRASH, 'Take out trash', 100),
          chore('chore-hamper', 'Put clothes in hamper', 0),
        ],
        routineIds: [],
        order: 0,
      },
      {
        id: makenna,
        name: 'Makenna',
        grade: 'Pre-K',
        theme: 'unicorn',
        chores: [],
        routineIds: [],
        order: 1,
      },
    ],
    entitlements: [],
    ...overrides,
  }
}
