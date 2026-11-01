import { useEffect, useState } from 'react'
import { useActions, useStore } from '../../state/store'
import { isLocked } from '../../security/session'
import { Button } from '../primitives/Button'
import { Keypad } from '../primitives/Keypad'
import { Modal } from '../primitives/Modal'

const MAX_DIGITS = 6
const MIN_DIGITS = 4

interface ParentGateProps {
  open: boolean
  onClose(): void
  onSuccess(): void
}

/** PIN entry. Shows 4 to 6 dots, shakes on a wrong PIN, and counts down a lockout. */
export function ParentGate({ open, onClose, onSuccess }: ParentGateProps) {
  const { lockout } = useStore()
  const { unlockParent } = useActions()
  const [pin, setPin] = useState('')
  const [shake, setShake] = useState(false)
  const [wrong, setWrong] = useState(false)
  const [busy, setBusy] = useState(false)
  const [clock, setClock] = useState(() => Date.now())

  useEffect(() => {
    if (open) { setPin(''); setShake(false); setWrong(false) }
  }, [open])

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
    const result = await unlockParent(pin)
    setBusy(false)
    setPin('')
    if (result === 'ok') { onSuccess(); return }
    setClock(Date.now())
    setShake(true)
    setWrong(result === 'bad')
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (/^\d$/.test(e.key)) digit(e.key)
    else if (e.key === 'Backspace') del()
    else if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') void submit()
  }

  const dots = Math.max(MIN_DIGITS, pin.length)
  return (
    <Modal open={open} title="Parent PIN" onClose={onClose} className={shake ? 'qb-gate shake' : 'qb-gate'}>
      <div onKeyDown={onKeyDown}>
        <h2 className="qb-gate-title">Parent PIN</h2>
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
          <Button disabled={pin.length < MIN_DIGITS || busy || locked} onClick={() => void submit()}>Enter</Button>
        </div>
      </div>
    </Modal>
  )
}
