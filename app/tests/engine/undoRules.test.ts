import { describe, expect, it } from 'vitest'
import type { QBEvent } from '../../src/engine/types'
import { activityRows } from '../../src/ui/parent/eventLabels'
import { makeFamily, makenna, nolan } from '../fixtures'

const f = makeFamily({ createdAt: new Date(2026, 9, 5, 9).toISOString() })
const kid = f.kids[0]
const sis = f.kids[1]
const now = new Date(2026, 10, 3, 12)
const t = (m: number): string => new Date(2026, 10, 3, 9, m).toISOString()
const close: QBEvent = { id: 'C', at: t(0), type: 'week.closed', kidId: nolan, weekStart: '2026-10-25', balance: 1000 }
const row = (events: QBEvent[], id: string, who = kid) => activityRows(f, who, events, now).find((r) => r.ids.includes(id))

describe('Ruling 23b: a split or gift that was drawn on cannot be undone', () => {
  it('hides Undo on a Spend split after a Spend payout, keeps it on an untouched Save split', () => {
    const events: QBEvent[] = [
      close,
      { id: 'A', at: t(1), type: 'jar.allocated', kidId: nolan, jar: 'spend', amount: 500 },
      { id: 'S', at: t(2), type: 'jar.allocated', kidId: nolan, jar: 'save', amount: 300 },
      { id: 'P', at: t(3), type: 'jar.paidOut', kidId: nolan, jar: 'spend', amount: 500, via: 'cashapp' },
    ]
    expect(row(events, 'A')?.undoable).toBe(false)
    expect(row(events, 'S')?.undoable).toBe(true)
    // The payout itself can still be undone: it only puts money back.
    expect(row(events, 'P')?.undoable).toBe(true)
  })

  it('hides Undo on a Give split after a donation, and on a gift after the sibling paid out Save', () => {
    const give: QBEvent[] = [
      close,
      { id: 'G', at: t(1), type: 'jar.allocated', kidId: nolan, jar: 'give', amount: 400 },
      { id: 'D', at: t(2), type: 'jar.donated', kidId: nolan, amount: 400, to: 'Shelter' },
    ]
    expect(row(give, 'G')?.undoable).toBe(false)

    const gift: QBEvent[] = [
      close,
      { id: 'GA', at: t(1), type: 'jar.allocated', kidId: nolan, jar: 'give', amount: 400, groupId: 'g' },
      { id: 'GG', at: t(1), type: 'jar.gifted', fromKidId: nolan, toKidId: makenna, amount: 400, groupId: 'g' },
    ]
    expect(row(gift, 'GG')?.undoable).toBe(true)
    const spent = [...gift, { id: 'SP', at: t(2), type: 'jar.paidOut', kidId: makenna, jar: 'save', amount: 400, via: 'cashapp' } as QBEvent]
    expect(row(spent, 'GG')?.undoable).toBe(false)
    expect(row(spent, 'GG', sis)?.undoable).toBe(false)
  })
})

describe('Ruling 23c: Redo is hidden when it would leave a jar negative', () => {
  it('a redone split that no longer fits in unsplit is refused; one that fits is offered', () => {
    const events: QBEvent[] = [
      close,
      { id: 'A', at: t(1), type: 'jar.allocated', kidId: nolan, jar: 'spend', amount: 600 },
      { id: 'U', at: t(2), type: 'undo', targetEventId: 'A' },
      { id: 'B', at: t(3), type: 'jar.allocated', kidId: nolan, jar: 'save', amount: 700 },
    ]
    expect(row(events, 'A')).toMatchObject({ undone: true, redoable: false })
    const fits: QBEvent[] = [...events.slice(0, 3), { id: 'B', at: t(3), type: 'jar.allocated', kidId: nolan, jar: 'save', amount: 300 }]
    expect(row(fits, 'A')).toMatchObject({ undone: true, redoable: true })
  })

  it('a redone payout after the jar was paid out again is refused', () => {
    const events: QBEvent[] = [
      close,
      { id: 'A', at: t(1), type: 'jar.allocated', kidId: nolan, jar: 'spend', amount: 500 },
      { id: 'P1', at: t(2), type: 'jar.paidOut', kidId: nolan, jar: 'spend', amount: 500, via: 'cashapp' },
      { id: 'U', at: t(3), type: 'undo', targetEventId: 'P1' },
      { id: 'P2', at: t(4), type: 'jar.paidOut', kidId: nolan, jar: 'spend', amount: 500, via: 'cashapp' },
    ]
    expect(row(events, 'P1')).toMatchObject({ undone: true, redoable: false })
  })
})
