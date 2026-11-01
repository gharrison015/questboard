import { useRef, useState } from 'react'
import { closeCurrentWeek, currentWeekStart } from '../../engine/closeWeeks'
import { addDays } from '../../engine/dates'
import { closeEnd } from '../../engine/ledger'
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
  { key: 'cashapp', name: 'Cash App', url: (h, d) => `https://cash.app/$${h}/${d}` },
  { key: 'venmo', name: 'Venmo', url: (h, d) => `https://venmo.com/${h}?txn=pay&amount=${d}` },
]

/** The URL when it parses as https, otherwise null. Other schemes (javascript:, http:) are never opened. */
export function httpsUrl(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw.trim())
    return u.protocol === 'https:' ? u.href : null
  } catch {
    return null
  }
}

/** 1250 becomes "12.50", 1200 becomes "12". */
const dollars = (c: number): string => (c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2))

/** Payday: unsplit coins, jar totals, an early close, payouts for Spend and Save, and Donate for Give. */
export function PaydayPanel({ kid }: { kid: Kid }) {
  const { family, events, now } = useStore()
  const { append } = useActions()
  const toast = useToast()
  const j = useJars(kid)
  const ws = useWeek(kid)
  const [confirm, setConfirm] = useState(false)
  // One money action at a time: a double tap must record once.
  const payBusy = useRef(false)
  const closeBusy = useRef(false)
  const [paying, setPaying] = useState(false)
  if (!family) return null
  const handles = family.payHandles ?? {}
  const fail = (): void => toast.show('Could not save that. Try again.')

  const close = (): void => {
    setConfirm(false)
    if (closeBusy.current) return
    closeBusy.current = true
    // Earlier weeks that are due close first, so "Close week now" never skips one (I1).
    const out = closeCurrentWeek(family, kid, events, new Date())
    const mine = out.find((e) => e.type === 'week.closed' && e.kidId === kid.id && closeEnd(e) === addDays(currentWeekStart(family, now), 6))
    const balance = mine && mine.type === 'week.closed' ? mine.balance : 0
    append(out)
      .then(() => toast.show(`Closed the week. ${formatCents(balance)} to split.`))
      .catch(fail)
      .finally(() => { closeBusy.current = false })
  }

  const guarded = (run: () => Promise<void>): void => {
    payBusy.current = true
    setPaying(true)
    run().finally(() => { payBusy.current = false; setPaying(false) })
  }

  const paidOut = (jar: 'spend' | 'save', amount: number, via: Service): void => {
    guarded(() => append([{ id: newId(), at: new Date().toISOString(), type: 'jar.paidOut', kidId: kid.id, jar, amount, via }]).catch(fail))
  }

  const donate = (e: React.MouseEvent): void => {
    const charity = kid.charity
    // The link opens the charity page on its own; this only records the donation once.
    if (!charity || j.give <= 0 || payBusy.current) { e.preventDefault(); return }
    guarded(() => append([{ id: newId(), at: new Date().toISOString(), type: 'jar.donated', kidId: kid.id, amount: j.give, to: charity.name }])
      .then(() => toast.show(`Recorded ${formatCents(j.give)} to ${charity.name}`))
      .catch(fail))
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
                aria-disabled={paying ? 'true' : undefined}
                onClick={(e) => {
                  // A second tap while the first is saving must not record or open again.
                  if (payBusy.current) { e.preventDefault(); return }
                  paidOut(jar, amount, s.key)
                }}
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
  const donateUrl = httpsUrl(charity?.url)
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
            {donateUrl ? (
              <a
                className="qb-btn qb-btn-quiet pr-link"
                href={donateUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={j.give > 0 && !paying ? undefined : 'true'}
                onClick={donate}
              >
                Donate to {charity.name}
              </a>
            ) : (
              <Button
                variant="quiet"
                aria-disabled={j.give > 0 && !paying ? undefined : 'true'}
                onClick={j.give > 0 ? donate : undefined}
              >
                Record donation to {charity.name}
              </Button>
            )}
            {donateUrl ? null : <p className="pr-quiet">{charity.url ? 'That donation link is not a secure https link, so it is not opened. ' : ''}Record it, then donate in your own way</p>}
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
