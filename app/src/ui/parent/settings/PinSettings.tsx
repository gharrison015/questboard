import { useId, useState } from 'react'
import {
  hashPin, isValidPin, makeRecoveryCode, makeSalt, normalizeRecoveryCode, verifyPin,
} from '../../../security/pin'
import { useStore } from '../../../state/store'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { useSave } from './fields'

interface PinFormProps {
  label: string
  /** Field shown first: the recovery code, or the current PIN. */
  first: { name: string; secret: boolean }
  action: string
  run(first: string, pin: string): Promise<string | null>
}

/** Two near-identical forms share this shell. `run` returns an error message, or null on success. */
function PinForm({ label, first, action, run }: PinFormProps) {
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
  const field = (name: string, value: string, set: (v: string) => void, secret: boolean, numeric = false) => (
    <div className="st-field">
      <label className="st-label" htmlFor={`${uid}-${name.replace(/\s/g, '')}`}>{name}</label>
      <input
        id={`${uid}-${name.replace(/\s/g, '')}`}
        className={secret ? 'st-input st-secret' : 'st-input'}
        type="text"
        inputMode={numeric ? 'numeric' : undefined}
        autoComplete="off"
        maxLength={numeric ? 6 : undefined}
        value={value}
        onChange={(e) => { set(e.target.value); setError('') }}
        onBlur={(e) => set(e.target.value)}
      />
    </div>
  )
  return (
    <form className="st-card" role="group" aria-label={label} onSubmit={submit}>
      <h4 className="pr-sub">{label}</h4>
      {field(first.name, a, setA, first.secret)}
      {field('New PIN', pin, setPin, true, true)}
      {field('Confirm new PIN', again, setAgain, true, true)}
      {error ? <p className="st-error" role="alert">{error}</p> : null}
      <Button type="submit" className="pr-dense" disabled={busy}>{action}</Button>
    </form>
  )
}

export function PinSettings() {
  const { family } = useStore()
  const save = useSave()
  const [newCode, setNewCode] = useState<string | null>(null)
  const [wrote, setWrote] = useState(false)
  if (!family) return null

  const change = async (current: string, pin: string): Promise<string | null> => {
    if (!(await verifyPin(current, family.pinSalt, family.pinHash))) return 'That is not the current PIN.'
    // The salt stays, so the recovery code on file keeps working.
    const pinHash = await hashPin(pin, family.pinSalt)
    const ok = await save({ type: 'pin.set', pinHash, pinSalt: family.pinSalt, recoveryHash: family.recoveryHash }, 'PIN changed')
    return ok ? null : 'Could not save the new PIN.'
  }

  const reset = async (code: string, pin: string): Promise<string | null> => {
    const given = await hashPin(normalizeRecoveryCode(code), family.pinSalt)
    if (!family.recoveryHash || given !== family.recoveryHash) return 'That recovery code does not match.'
    const salt = makeSalt()
    const fresh = makeRecoveryCode()
    const ok = await save({
      type: 'pin.set',
      pinHash: await hashPin(pin, salt),
      pinSalt: salt,
      recoveryHash: await hashPin(normalizeRecoveryCode(fresh), salt),
    }, 'PIN reset')
    if (!ok) return 'Could not save the new PIN.'
    setWrote(false)
    setNewCode(fresh)
    return null
  }

  return (
    <div className="st-body">
      <PinForm label="Change PIN" first={{ name: 'Current PIN', secret: true }} action="Change PIN" run={change} />
      <PinForm label="Reset PIN with recovery code" first={{ name: 'Recovery code', secret: false }} action="Reset PIN" run={reset} />
      <p className="st-hint">The recovery code is the only way back in if the PIN is forgotten. If the code is lost too, the only choice is to erase everything and start over.</p>

      <Modal open={newCode !== null} title="New recovery code" onClose={() => { /* must be acknowledged */ }}>
        <h3 className="pr-modal-title">New recovery code</h3>
        <p className="st-code" aria-label="Recovery code value">{newCode}</p>
        <p className="st-hint">Write this down and keep it somewhere safe. It is shown once. The old code no longer works.</p>
        <label className="st-check">
          <input type="checkbox" checked={wrote} onChange={(e) => setWrote(e.target.checked)} />
          <span>I wrote it down</span>
        </label>
        <div className="pr-modal-actions">
          <Button disabled={!wrote} onClick={() => setNewCode(null)}>Done</Button>
        </div>
      </Modal>
    </div>
  )
}
