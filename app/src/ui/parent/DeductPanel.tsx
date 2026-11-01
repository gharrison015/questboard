import { dateKey } from '../../engine/dates'
import { newId } from '../../engine/ids'
import { formatCents, effectiveMoney } from '../../engine/money'
import type { Kid, QBEvent, Reason } from '../../engine/types'
import { useActions, useStore } from '../../state/store'
import { SectionHead } from '../primitives/SectionHead'
import { useToast } from '../primitives/Toaster'
import { useParent } from './useParent'

/** Reason chips, three across. A tap logs the deduction for today and offers an undo. */
export function DeductPanel({ kid }: { kid: Kid }) {
  const { family } = useStore()
  const { append } = useActions()
  const toast = useToast()
  const parent = useParent()
  if (!family) return null
  const fallback = effectiveMoney(family, kid).deductionDefault

  const log = (reason: Reason): void => {
    const amount = reason.amount ?? fallback
    if (amount <= 0) return
    const at = new Date()
    const logged: QBEvent = {
      id: newId(), at: at.toISOString(), type: 'deduction.logged',
      kidId: kid.id, reasonId: reason.id, amount, date: dateKey(at),
    }
    append([logged])
      .then(() => {
        toast.show(`${kid.name} lost ${formatCents(amount)}, ${reason.label}`, 6000, {
          label: 'Undo',
          onClick: () => {
            // The toast can outlive the PIN session, so check it at click time.
            if (!parent.isValid()) { toast.show('Unlock to undo'); return }
            append([{ id: newId(), at: new Date().toISOString(), type: 'undo', targetEventId: logged.id }])
              .catch(() => toast.show('Could not undo that. Try again.'))
          },
        })
      })
      .catch(() => toast.show('Could not save that. Try again.'))
  }

  return (
    <section className="pr-section" aria-label="Log a deduction">
      <SectionHead icon="minus" title="Log a deduction" />
      <div className="pr-reasons">
        {family.reasons.map((r) => {
          const amount = r.amount ?? fallback
          return (
            <button
              key={r.id}
              type="button"
              className="pr-reason"
              aria-disabled={amount > 0 ? undefined : 'true'}
              onClick={amount > 0 ? () => log(r) : undefined}
            >
              <span className="pr-emoji" aria-hidden="true">{r.emoji}</span>
              <span className="pr-reason-label">{r.label}</span>
              <span className="pr-reason-amt">{formatCents(amount)}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
