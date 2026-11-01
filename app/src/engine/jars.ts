import type { Cents, JarKey, QBEvent } from './types'
import { liveEvents } from './week'

export interface Jars {
  save: Cents
  spend: Cents
  give: Cents
  unsplit: Cents
}

/** Derives a kid's jars from the ledger. Closed balances are read as recorded, never recomputed. */
export function jars(kidId: string, events: QBEvent[]): Jars {
  let closedTotal = 0
  let allocatedTotal = 0
  const j: Record<JarKey, Cents> = { save: 0, spend: 0, give: 0 }
  const take = (jar: JarKey, amount: Cents): void => {
    j[jar] = Math.max(0, j[jar] - amount)
  }
  for (const e of liveEvents(events)) {
    switch (e.type) {
      case 'week.closed':
        if (e.kidId === kidId) closedTotal += e.balance
        break
      case 'jar.allocated':
        if (e.kidId === kidId) {
          allocatedTotal += e.amount
          j[e.jar] += e.amount
        }
        break
      // The action layer must reject a gift larger than the giver's give jar.
      case 'jar.gifted':
        if (e.fromKidId === kidId) take('give', e.amount)
        if (e.toKidId === kidId) j.save += e.amount
        break
      case 'jar.paidOut':
        if (e.kidId === kidId) take(e.jar, e.amount)
        break
      case 'jar.donated':
        if (e.kidId === kidId) take('give', e.amount)
        break
      default:
        break
    }
  }
  return { ...j, unsplit: Math.max(0, closedTotal - allocatedTotal) }
}

/** 25 cents while the unsplit amount has a sub-dollar part, otherwise a dollar. */
export function allocationStep(j: Jars): Cents {
  return j.unsplit % 100 === 0 ? 100 : 25
}

export function canAllocate(j: Jars, amount: Cents): boolean {
  return amount > 0 && amount <= j.unsplit
}
