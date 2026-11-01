import { useRef } from 'react'
import { dayFull } from '../../engine/dates'
import { newId } from '../../engine/ids'
import type { DateKey, Kid, QBEvent } from '../../engine/types'
import { useUnverified } from '../../state/selectors'
import { useActions } from '../../state/store'
import { Button } from '../primitives/Button'
import { SectionHead } from '../primitives/SectionHead'
import { useToast } from '../primitives/Toaster'

type Item = { choreId: string; date: DateKey }

/** Checked chores waiting on a parent. Hidden when there is nothing to verify. */
export function VerifyPanel({ kid }: { kid: Kid }) {
  const rows = useUnverified(kid)
  const { append } = useActions()
  const toast = useToast()
  const busy = useRef(false)
  if (rows.length === 0) return null

  const decide = (items: Item[], type: 'chore.verified' | 'chore.rejected'): void => {
    if (busy.current) return
    busy.current = true
    const at = new Date().toISOString()
    const out: QBEvent[] = items.map((i) => ({ id: newId(), at, type, kidId: kid.id, choreId: i.choreId, date: i.date }))
    append(out)
      .catch(() => toast.show('Could not save that. Try again.'))
      .finally(() => { busy.current = false })
  }

  return (
    <section className="pr-section" aria-label="Verify">
      <SectionHead icon="shield" title="Verify" meta={String(rows.length)} />
      <ul className="pr-list">
        {rows.map((r) => {
          const label = kid.chores.find((c) => c.id === r.choreId)?.label ?? 'Chore'
          return (
            <li key={`${r.choreId}:${r.date}`} className="pr-row">
              <span className="pr-row-text">
                <span className="pr-row-main">{label}</span>
                <span className="pr-row-sub">{dayFull(r.date)}</span>
              </span>
              <Button className="pr-dense" aria-label={`Verify ${label}`} onClick={() => decide([r], 'chore.verified')}>Verify</Button>
              <Button className="pr-dense" variant="quiet" aria-label={`Reject ${label}`} onClick={() => decide([r], 'chore.rejected')}>Reject</Button>
            </li>
          )
        })}
      </ul>
      <Button variant="quiet" onClick={() => decide(rows, 'chore.verified')}>Verify all</Button>
    </section>
  )
}
