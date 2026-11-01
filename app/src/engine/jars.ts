import type { Cents, JarKey, QBEvent } from './types'
import { prepare, type Prepared } from './ledger'

export interface Jars {
  save: Cents
  spend: Cents
  give: Cents
  unsplit: Cents
}

/**
 * Jars from a list of live events in ledger order. Only the latest live close per week counts
 * (Ruling 23a), so a close, an undo, a second close and a redo never pay the same week twice.
 * Nothing is clamped: a broken rule shows up as a negative instead of vanishing.
 */
export function jarsFromLive(kidId: string, live: Iterable<QBEvent>): Jars {
  const closes = new Map<string, Cents>()
  let allocatedTotal = 0
  const j: Record<JarKey, Cents> = { save: 0, spend: 0, give: 0 }
  for (const e of live) {
    switch (e.type) {
      case 'week.closed':
        if (e.kidId === kidId) closes.set(e.weekStart, e.balance)
        break
      case 'jar.allocated':
        if (e.kidId === kidId) {
          allocatedTotal += e.amount
          j[e.jar] += e.amount
        }
        break
      case 'jar.gifted':
        if (e.fromKidId === kidId) j.give -= e.amount
        if (e.toKidId === kidId) j.save += e.amount
        break
      case 'jar.paidOut':
        if (e.kidId === kidId) j[e.jar] -= e.amount
        break
      case 'jar.donated':
        if (e.kidId === kidId) j.give -= e.amount
        break
      default:
        break
    }
  }
  let closedTotal = 0
  for (const v of closes.values()) closedTotal += v
  return { ...j, unsplit: closedTotal - allocatedTotal }
}

/** Derives a kid's jars from the ledger. Closed balances are read as recorded, never recomputed. */
export function jars(kidId: string, events: QBEvent[], prep?: Prepared): Jars {
  return jarsFromLive(kidId, (prep ?? prepare(events)).live)
}

/** 25 cents while the unsplit amount has a sub-dollar part, otherwise a dollar. */
export function allocationStep(j: Jars): Cents {
  return j.unsplit % 100 === 0 ? 100 : 25
}

export function canAllocate(j: Jars, amount: Cents): boolean {
  return amount > 0 && amount <= j.unsplit
}
