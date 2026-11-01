import { addDays, dateKey, parseKey, weekStartKey } from '../engine/dates'
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
      chore('Make your bed', 'bed'), chore('Feed the dog', 'dog'),
      chore('Put toys away', 'toys', [1, 3, 4]), chore('Homework folder', 'homework', [1, 2, 3, 4]),
      chore('Take out trash', 'trash', ALL_DAYS, 100),
    ],
  }
  const makenna: Omit<Kid, 'id' | 'order'> = {
    name: 'Makenna', grade: 'Pre-K', theme: 'unicorn', routineIds,
    charity: { name: 'Ronald McDonald House' },
    chores: [
      chore('Put shoes away', 'shoes'), chore('Help set table', 'table', [1, 2, 3, 4, 5]),
      chore('Tidy bedroom', 'broom', [0, 3, 6]), chore('Water the plants', 'plant'),
      chore('Pick up books', 'book'),
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
  // Nolan: bed, dog and the paid trash chore are checked today; the rest stay open.
  for (const c of [nKid.chores[0], nKid.chores[1], nKid.chores[4]]) {
    events.push({ id: newId(), at, type: 'chore.checked', kidId: nKid.id, choreId: c.id, date: today })
  }
  events.push({ id: newId(), at, type: 'chore.checked', kidId: mKid.id, choreId: mKid.chores[0].id, date: today })
  // Two deductions this week, never in the future: today and the day before (or the week start).
  const weekStart = weekStartKey(today, base.money.weekStartDay)
  const before = addDays(today, -1) < weekStart ? weekStart : addDays(today, -1)
  const reason = (label: string) => family.reasons.find((r) => r.label === label) ?? family.reasons[0]
  events.push(
    { id: newId(), at, type: 'deduction.logged', kidId: nKid.id, reasonId: reason('Not listening').id, amount: 100, date: before },
    { id: newId(), at, type: 'deduction.logged', kidId: nKid.id, reasonId: reason('Yelling').id, amount: 50, date: today },
  )
  return { family, events }
}
