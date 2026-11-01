import { newId } from '../../engine/ids'
import type { Kid, QBEvent } from '../../engine/types'
import { useActions, useStore } from '../../state/store'
import { Button } from '../primitives/Button'
import { SectionHead } from '../primitives/SectionHead'
import { useToast } from '../primitives/Toaster'
import { activityRows, redoTargets, undoTargets } from './eventLabels'

/** This week's events for the kid, newest first, with Undo and Redo. Closed weeks are never listed. */
export function ThisWeek({ kid }: { kid: Kid }) {
  const { family, events, now } = useStore()
  const { append } = useActions()
  const toast = useToast()
  if (!family) return null
  const rows = activityRows(family, kid, events, now)

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
              {!r.undoable ? null : r.undone ? (
                <Button className="pr-dense" variant="quiet" aria-label={`Redo ${r.label}`} onClick={() => appendUndos(redoTargets(events, r.ids))}>Redo</Button>
              ) : (
                <Button className="pr-dense" variant="quiet" aria-label={`Undo ${r.label}`} onClick={() => appendUndos(undoTargets(events, r.ids))}>Undo</Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
