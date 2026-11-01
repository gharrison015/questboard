import { useState } from 'react'
import { newId } from '../../engine/ids'
import type { Kid, QBEvent } from '../../engine/types'
import { useActions, useStore } from '../../state/store'
import { useDerived } from '../../state/derived'
import { Button } from '../primitives/Button'
import { Modal } from '../primitives/Modal'
import { SectionHead } from '../primitives/SectionHead'
import { useToast } from '../primitives/Toaster'
import { activityRows, redoTargets, undoTargets, type ActivityRow } from './eventLabels'

/** This week's events for the kid, newest first, with Undo and Redo. Closed weeks are never listed. */
export function ThisWeek({ kid }: { kid: Kid }) {
  const { family, events, now } = useStore()
  const prep = useDerived()
  const { append } = useActions()
  const toast = useToast()
  const [reopen, setReopen] = useState<ActivityRow | null>(null)
  if (!family) return null
  const rows = activityRows(family, kid, events, now, prep)

  const appendUndos = (targets: string[]): void => {
    if (targets.length === 0) return
    const at = new Date().toISOString()
    const out: QBEvent[] = targets.map((targetEventId) => ({ id: newId(), at, type: 'undo', targetEventId }))
    append(out).catch(() => toast.show('Could not save that. Try again.'))
  }

  return (
    <section className="pr-section" aria-label="This week">
      <SectionHead icon="undo" title="This week" />
      {rows.length === 0 ? (
        <p className="pr-quiet">Nothing logged yet this week.</p>
      ) : (
        <ul className="pr-list" aria-label="Activity">
          {rows.map((r) => (
            <li key={r.key} className="pr-row" data-undone={r.undone ? 'true' : undefined}>
              <span className={r.undone ? 'pr-row-main pr-struck' : 'pr-row-main'}>{r.label}</span>
              {r.closedNote ? <span className="pr-tile-state">Closed</span> : r.undone ? (r.redoable ? (
                <Button className="pr-dense" variant="quiet" aria-label={`Redo ${r.label}`} onClick={() => appendUndos(redoTargets(events, r.ids))}>Redo</Button>
              ) : null) : r.undoable ? (
                <Button className="pr-dense" variant="quiet" aria-label={`Undo ${r.label}`} onClick={() => (r.reopen ? setReopen(r) : appendUndos(undoTargets(events, r.ids)))}>Undo</Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Modal open={reopen !== null} title="Reopen week" onClose={() => setReopen(null)}>
        <h2 className="pr-modal-title">Reopen this week? The payday coins go back.</h2>
        <div className="pr-modal-actions">
          <Button variant="quiet" onClick={() => setReopen(null)}>Cancel</Button>
          <Button onClick={() => { if (reopen) appendUndos(undoTargets(events, reopen.ids)); setReopen(null) }}>Reopen week</Button>
        </div>
      </Modal>
    </section>
  )
}
