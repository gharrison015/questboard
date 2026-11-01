import { currentWeekStart } from '../../engine/closeWeeks'
import { dateKey, dayLabel, weekDays } from '../../engine/dates'
import { formatCents } from '../../engine/money'
import { liveEvents, undoneIds } from '../../engine/week'
import type { Family, Kid, QBEvent } from '../../engine/types'

const VIA: Record<string, string> = { paypal: 'PayPal', cashapp: 'Cash App', venmo: 'Venmo' }
const JAR: Record<string, string> = { save: 'Save', spend: 'Spend', give: 'Give' }

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** The kid an event is about, as seen from `kidId`. Gifts show for both kids. */
function involves(e: QBEvent, kidId: string): boolean {
  if (e.type === 'jar.gifted') return e.fromKidId === kidId || e.toKidId === kidId
  return 'kidId' in e && e.kidId === kidId
}

/** Plain-language label for one event, from the point of view of `kid`. Undo events have none. */
export function eventLabel(e: QBEvent, family: Family, kid: Kid, today: string): string | null {
  const chore = (id: string): string => kid.chores.find((c) => c.id === id)?.label ?? 'a chore'
  const when = (date: string): string => (date === today ? '' : `, ${dayLabel(date)}`)
  const money = formatCents
  switch (e.type) {
    case 'chore.checked': return `Checked ${chore(e.choreId)}${when(e.date)}`
    case 'chore.unchecked': return `Unchecked ${chore(e.choreId)}${when(e.date)}`
    case 'chore.verified': return `Verified ${chore(e.choreId)}${when(e.date)}`
    case 'chore.rejected': return `Rejected ${chore(e.choreId)}${when(e.date)}`
    case 'routine.step': {
      const routine = family.routines.find((r) => r.id === e.routineId)
      const step = routine?.steps.find((s) => s.id === e.stepId)?.label ?? 'a routine step'
      return `${e.done ? 'Did' : 'Unmarked'} ${step}${when(e.date)}`
    }
    case 'deduction.logged': {
      const reason = family.reasons.find((r) => r.id === e.reasonId)?.label ?? 'Deduction'
      return `Lost ${money(e.amount)}, ${reason}${when(e.date)}`
    }
    case 'earnback.earned': return `Earned back ${money(e.amount)}, ${cap(e.skill)}${when(e.date)}`
    case 'week.closed': return `Payday: ${money(e.balance)} to split`
    case 'jar.allocated':
      return e.jar === 'save' ? `Saved ${money(e.amount)}` : `Moved ${money(e.amount)} to ${JAR[e.jar]}`
    case 'jar.gifted': {
      if (e.fromKidId === kid.id) {
        const to = family.kids.find((k) => k.id === e.toKidId)?.name ?? 'a sibling'
        return `Gave ${money(e.amount)} to ${to}`
      }
      const from = family.kids.find((k) => k.id === e.fromKidId)?.name ?? 'a sibling'
      return `Got ${money(e.amount)} from ${from}`
    }
    case 'jar.paidOut': return `Paid out ${money(e.amount)} from ${JAR[e.jar]} (${VIA[e.via] ?? e.via})`
    case 'jar.donated': return `Donated ${money(e.amount)} to ${e.to}`
    case 'entitlement.granted': return null
    case 'undo': return null
    default: {
      const _never: never = e
      return _never
    }
  }
}

export interface ActivityRow {
  /** First event of the row, used as the React key. */
  key: string
  label: string
  /** Every non-undo event the row stands for: the whole group when events share a groupId. */
  ids: string[]
  undone: boolean
  /** False for events outside the current open week (frozen). */
  undoable: boolean
}

/**
 * The kid's events for the current week, newest first, with grouped events merged into one row.
 * Undone rows stay in the list so they can be redone.
 */
export function activityRows(family: Family, kid: Kid, events: QBEvent[], now: Date): ActivityRow[] {
  const today = dateKey(now)
  const start = currentWeekStart(family, now)
  const days = new Set(weekDays(start))
  const undone = undoneIds(events)
  const dayOf = (e: QBEvent): string => ('date' in e ? e.date : dateKey(new Date(e.at)))

  const byGroup = new Map<string, QBEvent[]>()
  for (const e of events) if (e.groupId) byGroup.set(e.groupId, [...(byGroup.get(e.groupId) ?? []), e])

  const ordered = events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => Date.parse(b.e.at) - Date.parse(a.e.at) || b.i - a.i)
    .map((x) => x.e)

  const rows: ActivityRow[] = []
  const seenGroups = new Set<string>()
  for (const e of ordered) {
    if (e.type === 'undo' || !involves(e, kid.id) || !days.has(dayOf(e))) continue
    if (e.type === 'week.closed' && e.inactive) continue
    if (e.groupId) {
      if (seenGroups.has(e.groupId)) continue
      seenGroups.add(e.groupId)
    }
    const members = (e.groupId ? byGroup.get(e.groupId) : undefined) ?? [e]
    // The gift event names the row ("Gave $2 to Makenna"); otherwise the newest member does.
    const lead = members.find((m) => m.type === 'jar.gifted' && involves(m, kid.id)) ?? e
    const label = eventLabel(lead, family, kid, today)
    if (!label) continue
    const closedEarlier = members.some((m) => m.type === 'week.closed' && m.weekStart !== start)
    rows.push({
      key: lead.id,
      label,
      ids: members.map((m) => m.id),
      undone: members.every((m) => undone.has(m.id)),
      undoable: !closedEarlier,
    })
  }
  return rows
}

/** The undo events that append to undo a row: one per live member. */
export function undoTargets(events: QBEvent[], ids: string[]): string[] {
  const live = new Set(liveEvents(events).map((e) => e.id))
  return ids.filter((id) => live.has(id))
}

/** The effective undo events that currently hide a row's members, so a Redo can undo them. */
export function redoTargets(events: QBEvent[], ids: string[]): string[] {
  const undone = undoneIds(events)
  const set = new Set(ids)
  return events.filter((e) => e.type === 'undo' && set.has(e.targetEventId) && !undone.has(e.id)).map((e) => e.id)
}
