import { useId, useState, type ReactNode } from 'react'
import {
  hashPin, isValidPin, makeRecoveryCode, makeSalt, normalizeRecoveryCode,
} from '../../security/pin'
import { useActions, useStore } from '../../state/store'
import { Button } from '../primitives/Button'
import { Modal } from '../primitives/Modal'
import { useSave } from './settings/fields'
import '../../styles/settings.css'

export const LOCKED = 'Too many wrong tries. Wait a minute and try again.'

interface PinFormProps {
  label: string
  /** Field shown first: the recovery code, or the current PIN. */
  first: { name: string; secret: boolean; autoComplete: string }
  action: string
  run(first: string, pin: string): Promise<string | null>
}

/** The change and reset forms share this shell. `run` returns an error message, or null on success. */
export function PinForm({ label, first, action, run }: PinFormProps) {
  const uid = useId()
  const [a, setA] = useState('')
  const [pin, setPin] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (busy) return
    if (!isValidPin(pin)) { setError('The new PIN must be 4 to 6 digits.'); return }
    if (pin !== again) { setError('The two new PINs do not match.'); return }
    setBusy(true)
    run(a, pin)
      .then((err) => {
        setError(err ?? '')
        if (!err) { setA(''); setPin(''); setAgain('') }
      })
      .finally(() => setBusy(false))
  }
  const field = (name: string, value: string, set: (v: string) => void, secret: boolean, autoComplete: string) => (
    <div className="st-field">
      <label className="st-label" htmlFor={`${uid}-${name.replace(/\s/g, '')}`}>{name}</label>
      <input
        id={`${uid}-${name.replace(/\s/g, '')}`}
        className="st-input"
        type={secret ? 'password' : 'text'}
        inputMode={secret ? 'numeric' : undefined}
        autoComplete={autoComplete}
        maxLength={secret ? 6 : undefined}
        value={value}
        onChange={(e) => { set(e.target.value); setError('') }}
      />
    </div>
  )
  return (
    <form className="st-card" role="group" aria-label={label} onSubmit={submit}>
      <h4 className="pr-sub">{label}</h4>
      {field(first.name, a, setA, first.secret, first.autoComplete)}
      {field('New PIN', pin, setPin, true, 'new-password')}
      {field('Confirm new PIN', again, setAgain, true, 'new-password')}
      {error ? <p className="st-error" role="alert">{error}</p> : null}
      <Button type="submit" className="pr-dense" disabled={busy}>{action}</Button>
    </form>
  )
}

function NewCode({ code, onDone, heading }: { code: string; onDone(): void; heading: ReactNode }) {
  const [wrote, setWrote] = useState(false)
  return (
    <>
      {heading}
      <p className="st-code" aria-label="Recovery code value">{code}</p>
      <p className="st-hint">Write this down and keep it somewhere safe. It is shown once. The old code no longer works.</p>
      <label className="st-check">
        <input type="checkbox" checked={wrote} onChange={(e) => setWrote(e.target.checked)} />
        <span>I wrote it down</span>
      </label>
      <div className="pr-modal-actions">
        <Button disabled={!wrote} onClick={onDone}>Done</Button>
      </div>
    </>
  )
}

interface RecoveryFormProps {
  /** Settings shows the new code in its own dialog; the PIN gate is already a dialog, so it shows it in place. */
  codeDisplay?: 'modal' | 'inline'
  /** Called after the new code is acknowledged. */
  onDone?(): void
}

/**
 * "Reset PIN with recovery code". Each try counts against the shared PIN lockout. On success the
 * PIN, salt and recovery code all change, and the new code is shown once. Works with no session.
 */
export function RecoveryForm({ codeDisplay = 'modal', onDone }: RecoveryFormProps) {
  const { family } = useStore()
  const { tryPin } = useActions()
  const save = useSave()
  const [newCode, setNewCode] = useState<string | null>(null)
  if (!family) return null

  const reset = async (code: string, pin: string): Promise<string | null> => {
    const r = await tryPin(async () => {
      const given = await hashPin(normalizeRecoveryCode(code), family.pinSalt)
      return family.recoveryHash !== '' && given === family.recoveryHash
    })
    if (r === 'locked') return LOCKED
    if (r === 'bad') return 'That recovery code does not match.'
    const salt = makeSalt()
    const fresh = makeRecoveryCode()
    const ok = await save({
      type: 'pin.set',
      pinHash: await hashPin(pin, salt),
      pinSalt: salt,
      recoveryHash: await hashPin(normalizeRecoveryCode(fresh), salt),
    }, 'PIN reset')
    if (!ok) return 'Could not save the new PIN.'
    setNewCode(fresh)
    return null
  }

  const done = (): void => { setNewCode(null); onDone?.() }

  if (codeDisplay === 'inline' && newCode !== null) {
    return <div className="st-card"><NewCode code={newCode} onDone={done} heading={<h3 className="pr-modal-title">New recovery code</h3>} /></div>
  }
  return (
    <>
      <PinForm label="Reset PIN with recovery code" first={{ name: 'Recovery code', secret: false, autoComplete: 'off' }} action="Reset PIN" run={reset} />
      {codeDisplay === 'modal' ? (
        <Modal open={newCode !== null} title="New recovery code" onClose={() => { /* must be acknowledged */ }}>
          {newCode !== null ? <NewCode code={newCode} onDone={done} heading={<h3 className="pr-modal-title">New recovery code</h3>} /> : null}
        </Modal>
      ) : null}
    </>
  )
}
