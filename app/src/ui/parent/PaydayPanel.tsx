import { useState } from 'react'
import { currentWeekStart } from '../../engine/closeWeeks'
import { newId } from '../../engine/ids'
import { formatCents } from '../../engine/money'
import type { Kid, PayHandles } from '../../engine/types'
import { useJars, useWeek } from '../../state/selectors'
import { useActions, useStore } from '../../state/store'
import { Button } from '../primitives/Button'
import { Modal } from '../primitives/Modal'
import { SectionHead } from '../primitives/SectionHead'
import { useToast } from '../primitives/Toaster'

type Service = keyof PayHandles
const SERVICES: { key: Service; name: string; url(handle: string, dollars: string): string }[] = [
  { key: 'paypal', name: 'PayPal', url: (h, d) => `https://paypal.me/${h}/${d}` },
  { key: 'cashapp', name: 'Cash App', url: (h, d) => `https://cash.app/${h}/${d}` },
  { key: 'venmo', name: 'Venmo', url: (h, d) => `https://venmo.com/${h}?txn=pay&amount=${d}` },
]

/** 1250 becomes "12.5", 1200 becomes "12". */
const dollars = (c: number): string => String(c / 100)

/** Payday: unsplit coins, jar totals, an early close, payouts for Spend and Save, and Donate for Give. */
export function PaydayPanel({ kid }: { kid: Kid }) {
  const { family, now } = useStore()
  const { append } = useActions()
  const toast = useToast()
  const j = useJars(kid)
  const ws = useWeek(kid)
  const [confirm, setConfirm] = useState(false)
  if (!family) return null
  const handles = family.payHandles ?? {}
  const fail = (): void => toast.show('Could not save that. Try again.')

  const close = (): void => {
    setConfirm(false)
    append([{
      id: newId(), at: new Date().toISOString(), type: 'week.closed',
      kidId: kid.id, weekStart: currentWeekStart(family, now), balance: ws.balance,
    }])
      .then(() => toast.show(`Closed the week. ${formatCents(ws.balance)} to split.`))
      .catch(fail)
  }

  const paidOut = (jar: 'spend' | 'save', amount: number, via: Service): void => {
    append([{ id: newId(), at: new Date().toISOString(), type: 'jar.paidOut', kidId: kid.id, jar, amount, via }]).catch(fail)
  }

  const donate = (): void => {
    const charity = kid.charity
    if (!charity || j.give <= 0) return
    if (charity.url) window.open(charity.url, '_blank', 'noopener,noreferrer')
    append([{ id: newId(), at: new Date().toISOString(), type: 'jar.donated', kidId: kid.id, amount: j.give, to: charity.name }])
      .then(() => toast.show(`Recorded ${formatCents(j.give)} to ${charity.name}`))
      .catch(fail)
  }

  const payBlock = (jar: 'spend' | 'save', label: string) => {
    const amount = j[jar]
    return (
      <div className="pr-pay" role="group" aria-label={`Pay out ${label}`}>
        <p className="pr-pay-head">Pay out {label}: {formatCents(amount)}</p>
        {amount <= 0 ? (
          <p className="pr-quiet">Nothing in {label} yet.</p>
        ) : (
          SERVICES.map((s) => {
            const handle = handles[s.key]
            return handle ? (
              <a
                key={s.key}
                className="qb-btn qb-btn-quiet pr-link"
                href={s.url(encodeURIComponent(handle), dollars(amount))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => paidOut(jar, amount, s.key)}
              >
                {s.name}
              </a>
            ) : (
              <p key={s.key} className="pr-quiet">Add your {s.name} handle in Settings</p>
            )
          })
        )}
      </div>
    )
  }

  const charity = kid.charity
  return (
    <section className="pr-section" aria-label="Payday">
      <SectionHead icon="coin" title="Payday" />
      <p className="pr-line">Unsplit: <strong>{formatCents(j.unsplit)}</strong></p>
      <p className="pr-line">
        Save {formatCents(j.save)}, Spend {formatCents(j.spend)}, Give {formatCents(j.give)}
      </p>
      <Button variant="quiet" aria-disabled={ws.closed ? 'true' : undefined} onClick={ws.closed ? undefined : () => setConfirm(true)}>
        {ws.closed ? 'Week already closed' : 'Close week now'}
      </Button>
      {payBlock('spend', 'Spend')}
      {payBlock('save', 'Save')}
      <div className="pr-pay">
        <p className="pr-pay-head">Donate Give: {formatCents(j.give)}</p>
        {charity ? (
          <>
            <Button
              variant="quiet"
              aria-disabled={j.give > 0 ? undefined : 'true'}
              onClick={j.give > 0 ? donate : undefined}
            >
              {charity.url ? `Donate to ${charity.name}` : `Record donation to ${charity.name}`}
            </Button>
            {charity.url ? null : <p className="pr-quiet">Record it, then donate in your own way</p>}
          </>
        ) : (
          <p className="pr-quiet">Add a charity in Settings</p>
        )}
      </div>
      <Modal open={confirm} title="Close week" onClose={() => setConfirm(false)}>
        <h2 className="pr-modal-title">Close this week now? Payday happens early.</h2>
        <div className="pr-modal-actions">
          <Button variant="quiet" onClick={() => setConfirm(false)}>Cancel</Button>
          <Button onClick={close}>Close week</Button>
        </div>
      </Modal>
    </section>
  )
}
