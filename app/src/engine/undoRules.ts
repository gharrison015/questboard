import type { Family, Kid, QBEvent } from './types'
import { currentWeekStart } from './closeWeeks'
import { dateKey, weekDays } from './dates'
import { jarsFromLive, type Jars } from './jars'
import { closeEnd, prepare, type Prepared } from './ledger'

/**
 * Which rows of the parent's "This week" list may be undone or redone. Pure, so the UI and the
 * conservation test share one set of rules.
 *
 * - Only events in the current open week are listed (Ruling 7).
 * - A close is frozen once its week is past or money moved after it (Ruling 14).
 * - A split or gift is frozen once a later payout, donation or gift drew on that jar (Ruling 23b).
 * - Undo and Redo are both refused when the result would leave any jar negative (Ruling 23c).
 */
export interface RuleRow {
  /** The event that names the row: the gift in a group, otherwise the newest member. */
  lead: QBEvent
  /** Every non-undo event the row stands for: the whole group when events share a groupId. */
  ids: string[]
  undone: boolean
  /** Undo may be offered (the row is live). */
  undoable: boolean
  /** Redo may be offered (the row is undone). */
  redoable: boolean
  /** A frozen week close, shown as "Closed" instead of a button. */
  closedNote: boolean
  /** Undoing this row reopens the week, so the parent confirms first. */
  reopen: boolean
}

const MONEY = new Set<QBEvent['type']>(['jar.allocated', 'jar.gifted', 'jar.paidOut', 'jar.donated'])
const JAR_KEYS: (keyof Jars)[] = ['save', 'spend', 'give', 'unsplit']

/** True when the event is about `kidId`. Gifts are about both kids. */
export function involves(e: QBEvent, kidId: string): boolean {
  if (e.type === 'jar.gifted') return e.fromKidId === kidId || e.toKidId === kidId
  return 'kidId' in e && e.kidId === kidId
}

function kidsOf(members: QBEvent[]): string[] {
  const out = new Set<string>()
  for (const m of members) {
    if (m.type === 'jar.gifted') { out.add(m.fromKidId); out.add(m.toKidId) } else if ('kidId' in m) out.add(m.kidId)
  }
  return [...out]
}

/** Live events in ledger order with `drop` removed and `add` put back at their places. */
function* simulated(prep: Prepared, drop: Set<string>, add: Set<string>): Generator<QBEvent> {
  for (const e of prep.sorted) {
    if (e.type === 'undo') continue
    if ((prep.liveIds.has(e.id) && !drop.has(e.id)) || add.has(e.id)) yield e
  }
}

/** False when the change would push one of the kids' jars below zero (or further below it). */
function jarsStayWhole(prep: Prepared, kids: string[], drop: Set<string>, add: Set<string>): boolean {
  for (const kidId of kids) {
    const before = jarsFromLive(kidId, prep.live)
    const after = jarsFromLive(kidId, simulated(prep, drop, add))
    for (const k of JAR_KEYS) if (after[k] < 0 && after[k] < before[k]) return false
  }
  return true
}

/** True when a live event after `after` (outside `group`) drew on a jar that one of the members filled. */
function drawnAfter(prep: Prepared, members: QBEvent[], after: number, group: Set<string>): boolean {
  const draws = (e: QBEvent): boolean => {
    for (const m of members) {
      if (m.type === 'jar.allocated') {
        if (e.type === 'jar.paidOut' && e.kidId === m.kidId && e.jar === m.jar) return true
        if (m.jar === 'give' && e.type === 'jar.donated' && e.kidId === m.kidId) return true
        if (m.jar === 'give' && e.type === 'jar.gifted' && e.fromKidId === m.kidId) return true
      } else if (m.type === 'jar.gifted') {
        if (e.type === 'jar.paidOut' && e.kidId === m.toKidId && e.jar === 'save') return true
        if (e.type === 'jar.donated' && e.kidId === m.fromKidId) return true
        if (e.type === 'jar.gifted' && e.fromKidId === m.fromKidId) return true
      }
    }
    return false
  }
  for (let i = after + 1; i < prep.sorted.length; i++) {
    const e = prep.sorted[i]
    if (group.has(e.id) || !prep.liveIds.has(e.id)) continue
    if (draws(e)) return true
  }
  return false
}

/**
 * The kid's events for the current week, newest first, with grouped events merged into one row.
 * Undone rows stay in the list so they can be redone.
 */
export function ruleRows(family: Family, kid: Kid, events: QBEvent[], now: Date, prep?: Prepared): RuleRow[] {
  const p = prep ?? prepare(events)
  const start = currentWeekStart(family, now)
  const days = new Set(weekDays(start))
  const weekEnd = weekDays(start)[6]
  const dayOf = (e: QBEvent): string => ('date' in e ? e.date : dateKey(new Date(e.at)))
  const posOf = (id: string): number => p.pos.get(id) ?? -1

  const byGroup = new Map<string, QBEvent[]>()
  for (const e of p.sorted) if (e.groupId && e.type !== 'undo') byGroup.set(e.groupId, [...(byGroup.get(e.groupId) ?? []), e])

  const moneyMovedAfter = (closeId: string): boolean => {
    const at = posOf(closeId)
    for (let i = at + 1; i < p.sorted.length; i++) {
      const m = p.sorted[i]
      if (MONEY.has(m.type) && !p.undone.has(m.id) && involves(m, kid.id)) return true
    }
    return false
  }

  const rows: RuleRow[] = []
  const seenGroups = new Set<string>()
  for (let i = p.sorted.length - 1; i >= 0; i--) {
    const e = p.sorted[i]
    if (e.type === 'undo' || e.type === 'entitlement.granted' || !involves(e, kid.id) || !days.has(dayOf(e))) continue
    if (e.type === 'week.closed' && e.inactive) continue
    if (e.groupId) {
      if (seenGroups.has(e.groupId)) continue
      seenGroups.add(e.groupId)
    }
    const members = (e.groupId ? byGroup.get(e.groupId) : undefined) ?? [e]
    const lead = members.find((m) => m.type === 'jar.gifted' && involves(m, kid.id)) ?? e
    const ids = members.map((m) => m.id)
    const undone = members.every((m) => p.undone.has(m.id))
    const close = members.find((m): m is Extract<QBEvent, { type: 'week.closed' }> => m.type === 'week.closed')
    const frozen = !!close && (closeEnd(close) !== weekEnd || moneyMovedAfter(close.id))
    const idSet = new Set(ids)
    const last = Math.max(...ids.map(posOf))
    const touchesJars = members.some((m) => MONEY.has(m.type) || m.type === 'week.closed')
    const kids = kidsOf(members)

    let undoable = false
    let redoable = false
    if (!frozen) {
      if (!undone) {
        const liveMembers = new Set(ids.filter((id) => p.liveIds.has(id)))
        undoable = !(members.some((m) => m.type === 'jar.allocated' || m.type === 'jar.gifted') && drawnAfter(p, members, last, idSet))
          && (!touchesJars || jarsStayWhole(p, kids, liveMembers, new Set()))
      } else {
        redoable = !touchesJars || jarsStayWhole(p, kids, new Set(), idSet)
      }
    }
    rows.push({ lead, ids, undone, undoable, redoable, closedNote: frozen, reopen: !!close && !frozen })
  }
  return rows
}

/** The undo events that append to undo a row: one per live member. */
export function undoTargets(events: QBEvent[], ids: string[], prep?: Prepared): string[] {
  const live = (prep ?? prepare(events)).liveIds
  return ids.filter((id) => live.has(id))
}

/** The effective undo events that currently hide a row's members, so a Redo can undo them. */
export function redoTargets(events: QBEvent[], ids: string[], prep?: Prepared): string[] {
  const p = prep ?? prepare(events)
  const set = new Set(ids)
  return p.sorted.filter((e) => e.type === 'undo' && set.has(e.targetEventId) && !p.undone.has(e.id)).map((e) => e.id)
}
