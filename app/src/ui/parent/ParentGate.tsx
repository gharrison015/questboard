import { useEffect, useRef, useState } from 'react'
import { useActions, useStore } from '../../state/store'
import { isLocked } from '../../security/session'
import { Button } from '../primitives/Button'
import { Keypad } from '../primitives/Keypad'
import { Modal } from '../primitives/Modal'
import { useToast } from '../primitives/Toaster'
import { RecoveryForm } from './RecoveryForm'

const MAX_DIGITS = 6
const MIN_DIGITS = 4
const ERASE_COUNTDOWN = 5

export type GateMode = 'session' | 'confirm'

interface ParentGateProps {
  open: boolean
  /** 'session' starts the 5-minute parent session; 'confirm' only checks the PIN (Ruling 25). */
  mode?: GateMode
  onClose(): void
  onSuccess(): void
}

type Pane = 'pin' | 'recover' | 'erase'

/** PIN entry. Shows 4 to 6 dots, shakes on a wrong PIN, and counts down a lockout. "Forgot PIN?" leads to recovery. */
export function ParentGate({ open, mode = 'session', onClose, onSuccess }: ParentGateProps) {
  const { lockout } = useStore()
  const { unlockParent, confirmPin, eraseAll } = useActions()
  const toast = useToast()
  const [pane, setPane] = useState<Pane>('pin')
  const [typed, setTyped] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [countdown, setCountdown] = useState(ERASE_COUNTDOWN)
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [wrong, setWrong] = useState(false)
  const [busy, setBusy] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const [clock, setClock] = useState(() => Date.now())

  useEffect(() => {
    if (open) { setPin(''); setShake(false); setWrong(false); setPane('pin'); setTyped(''); setConfirming(false) }
  }, [open])

  useEffect(() => {
    if (pane !== 'erase' || !confirming) return
    setCountdown(ERASE_COUNTDOWN)
    const id = window.setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000)
    return () => window.clearInterval(id)
  }, [pane, confirming])

  useEffect(() => {
    if (!open || lockout.lockedUntil === null) return
    setClock(Date.now())
    const id = window.setInterval(() => setClock(Date.now()), 500)
    return () => window.clearInterval(id)
  }, [open, lockout.lockedUntil])

  const locked = isLocked(lockout, clock)
  const secondsLeft = locked && lockout.lockedUntil !== null ? Math.max(1, Math.ceil((lockout.lockedUntil - clock) / 1000)) : 0

  const digit = (d: string): void => {
    setShake(false)
    setWrong(false)
    setPin((p) => (p.length < MAX_DIGITS ? p + d : p))
  }
  const del = (): void => { setShake(false); setPin((p) => p.slice(0, -1)) }

  const submit = async (): Promise<void> => {
    if (pin.length < MIN_DIGITS || busy || locked) return
    setBusy(true)
    const result = await (mode === 'confirm' ? confirmPin(pin) : unlockParent(pin))
    setBusy(false)
    setPin('')
    if (result === 'ok') { onSuccess(); return }
    setClock(Date.now())
    setShake(true)
    setWrong(result === 'bad')
    // Keep focus inside the dialog so the trap and the hardware keyboard keep working.
    wrap.current?.querySelector<HTMLElement>('.qb-key')?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (/^\d$/.test(e.key)) digit(e.key)
    else if (e.key === 'Backspace') del()
    else if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') void submit()
  }

  const erase = (): void => {
    if (typed !== 'ERASE' || !confirming || countdown > 0 || isLocked(lockout, Date.now())) return
    eraseAll()
      .then(() => { onClose(); toast.show('Everything was erased') })
      .catch(() => toast.show('Could not erase. Try again.'))
  }

  const title = mode === 'confirm' ? 'Grown-up check' : 'Parent PIN'
  const dots = Math.max(MIN_DIGITS, pin.length)
  if (pane === 'recover') {
    return (
      <Modal open={open} title="Forgot PIN" onClose={onClose} className="qb-gate">
        <div className="qb-gate-recover">
          <h2 className="qb-gate-title">Forgot PIN</h2>
          <RecoveryForm codeDisplay="inline" onDone={() => setPane('pin')} />
          {locked ? (
            <button type="button" className="qb-gate-link" aria-disabled="true" style={{ opacity: 0.6 }}>
              Lost the recovery code too? Erase and start over. Try again in {secondsLeft}s
            </button>
          ) : (
            <button type="button" className="qb-gate-link" onClick={() => { setTyped(''); setConfirming(false); setPane('erase') }}>Lost the recovery code too? Erase and start over</button>
          )}
          <div className="qb-gate-actions">
            <Button variant="quiet" onClick={() => setPane('pin')}>Back to PIN</Button>
          </div>
        </div>
      </Modal>
    )
  }
  if (pane === 'erase') {
    const cancel = (): void => { setTyped(''); setConfirming(false); setPane('pin') }
    return (
      <Modal open={open} title="Erase and start over" onClose={onClose} className="qb-gate">
        <div className="qb-gate-recover">
          <h2 className="qb-gate-title">Erase and start over</h2>
          {confirming ? (
            <>
              <p className="st-hint">This deletes every chore, deduction and dollar for the whole family on this device. If you can, export a backup from Settings first.</p>
              <div className="qb-gate-actions">
                <Button variant="quiet" onClick={cancel}>Cancel</Button>
                <Button variant="danger" disabled={countdown > 0 || locked} onClick={erase}>
                  {countdown > 0 ? `Erase everything (${countdown})` : 'Erase everything'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="st-hint">This removes the family, history and settings from this device and returns to setup. It cannot be undone. Type ERASE to continue.</p>
              <input className="st-input" aria-label="Type ERASE" value={typed} autoComplete="off" onChange={(e) => setTyped(e.target.value)} />
              <div className="qb-gate-actions">
                <Button variant="quiet" onClick={cancel}>Cancel</Button>
                <Button variant="danger" disabled={typed !== 'ERASE' || locked} onClick={() => setConfirming(true)}>Continue</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    )
  }
  return (
    <Modal open={open} title={title} onClose={onClose} className={shake ? 'qb-gate shake' : 'qb-gate'}>
      <div ref={wrap} onKeyDown={onKeyDown}>
        <h2 className="qb-gate-title">{title}</h2>
        <div className="qb-dots" role="img" aria-label={`${pin.length} digits entered`}>
          {Array.from({ length: dots }, (_, i) => (
            <span key={i} className={i < pin.length ? 'qb-dot on' : 'qb-dot'} />
          ))}
        </div>
        <p className="qb-gate-msg" role="alert">
          {locked ? `Try again in ${secondsLeft}s` : wrong ? 'That PIN did not match.' : ''}
        </p>
        <Keypad onDigit={digit} onDelete={del} />
        <div className="qb-gate-actions">
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button aria-disabled={pin.length < MIN_DIGITS || busy || locked} onClick={() => void submit()}>Enter</Button>
        </div>
        <button type="button" className="qb-gate-link" onClick={() => setPane('recover')}>Forgot PIN?</button>
      </div>
    </Modal>
  )
}
