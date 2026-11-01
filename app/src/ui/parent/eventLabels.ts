import { dateKey, dayLabel } from '../../engine/dates'
import { formatCents } from '../../engine/money'
import type { Prepared } from '../../engine/ledger'
import { ruleRows } from '../../engine/undoRules'
import type { Family, Kid, QBEvent } from '../../engine/types'

export { redoTargets, undoTargets } from '../../engine/undoRules'

const VIA: Record<string, string> = { paypal: 'PayPal', cashapp: 'Cash App', venmo: 'Venmo' }
const JAR: Record<string, string> = { save: 'Save', spend: 'Spend', give: 'Give' }

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s)

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
  /** Undo may be shown (live row, current week, nothing drew on it since, no jar would go negative). */
  undoable: boolean
  /** Redo may be shown (undone row whose return would leave every jar whole). */
  redoable: boolean
  /** A week close shown as "Closed" instead of an Undo button. */
  closedNote: boolean
  /** Undoing this row reopens the week, so the parent confirms first. */
  reopen: boolean
}

/**
 * The kid's events for the current week, newest first, with grouped events merged into one row.
 * The allow-rules live in engine/undoRules so tests use the same ones.
 */
export function activityRows(family: Family, kid: Kid, events: QBEvent[], now: Date, prep?: Prepared): ActivityRow[] {
  const today = dateKey(now)
  const out: ActivityRow[] = []
  for (const r of ruleRows(family, kid, events, now, prep)) {
    const label = eventLabel(r.lead, family, kid, today)
    if (!label) continue
    out.push({
      key: r.lead.id, label, ids: r.ids, undone: r.undone,
      undoable: r.undoable, redoable: r.redoable, closedNote: r.closedNote, reopen: r.reopen,
    })
  }
  return out
}
