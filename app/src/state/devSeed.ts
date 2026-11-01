import { dateKey, parseKey, weekStartKey } from '../engine/dates'
import { newId } from '../engine/ids'
import { newFamily } from '../engine/reducer'
import type { Chore, Family, Kid, QBEvent } from '../engine/types'
import { hashPin, makeSalt } from '../security/pin'

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

function chore(label: string, icon: string, days: number[] = ALL_DAYS, pay = 0): Chore {
  return { id: newId(), label, icon, days, pay, active: true }
}

/**
 * Demo family for `?demo=1`: Nolan (1st, truck) and Makenna (Pre-K, unicorn), five chores each,
 * all three routines assigned, a few checks and two deductions this week. The PIN is 1234.
 * Async because the PIN is hashed with SubtleCrypto.
 */
export async function seedDemoFamily(now: Date = new Date()): Promise<{ family: Family; events: QBEvent[] }> {
  const base = newFamily('The Harrisons')
  const today = dateKey(now)
  const pinSalt = makeSalt()
  const recoverySalt = makeSalt()
  const routineIds = base.routines.map((r) => r.id)

  const nolan: Omit<Kid, 'id' | 'order'> = {
    name: 'Nolan', grade: '1st', theme: 'truck', routineIds,
    charity: { name: 'Berks County Animal Rescue' },
    chores: [
      chore('Make your bed', 'star'), chore('Feed the dog', 'star'),
      chore('Put toys away', 'star', [1, 3, 4]), chore('Homework folder', 'star', [1, 2, 3, 4]),
      chore('Clear your plate', 'star'),
    ],
  }
  const makenna: Omit<Kid, 'id' | 'order'> = {
    name: 'Makenna', grade: 'Pre-K', theme: 'unicorn', routineIds,
    charity: { name: 'Ronald McDonald House' },
    chores: [
      chore('Put shoes away', 'star'), chore('Help set table', 'star', [1, 2, 3, 4, 5]),
      chore('Tidy bedroom', 'star', [0, 3, 6]), chore('Water the plants', 'star'),
      chore('Pick up books', 'star'),
    ],
  }

  const family: Family = {
    ...base,
    createdAt: parseKey(weekStartKey(today, base.money.weekStartDay)).toISOString(),
    pinSalt,
    pinHash: await hashPin('1234', pinSalt),
    recoveryHash: await hashPin('DEMO-CODE', recoverySalt),
    kids: [nolan, makenna].map((k, order) => ({ ...k, id: newId(), order })),
  }

  const at = now.toISOString()
  const events: QBEvent[] = []
  const [nKid, mKid] = family.kids
  for (const c of nKid.chores.slice(0, 2)) {
    events.push({ id: newId(), at, type: 'chore.checked', kidId: nKid.id, choreId: c.id, date: today })
  }
  events.push({ id: newId(), at, type: 'chore.checked', kidId: mKid.id, choreId: mKid.chores[0].id, date: today })
  const yelling = family.reasons.find((r) => r.label === 'Yelling') ?? family.reasons[0]
  const notListening = family.reasons[0]
  events.push(
    { id: newId(), at, type: 'deduction.logged', kidId: nKid.id, reasonId: yelling.id, amount: family.money.deductionDefault, date: today },
    { id: newId(), at, type: 'deduction.logged', kidId: nKid.id, reasonId: notListening.id, amount: family.money.deductionDefault, date: today },
  )
  return { family, events }
}
