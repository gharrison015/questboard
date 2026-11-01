import { hashPin, verifyPin } from '../../../security/pin'
import { useActions, useStore } from '../../../state/store'
import { LOCKED, PinForm, RecoveryForm } from '../RecoveryForm'
import { useSave } from './fields'

export function PinSettings() {
  const { family } = useStore()
  const { tryPin } = useActions()
  const save = useSave()
  if (!family) return null

  const change = async (current: string, pin: string): Promise<string | null> => {
    const r = await tryPin(() => verifyPin(current, family.pinSalt, family.pinHash))
    if (r === 'locked') return LOCKED
    if (r === 'bad') return 'That is not the current PIN.'
    // The salt stays, so the recovery code on file keeps working.
    const pinHash = await hashPin(pin, family.pinSalt)
    const ok = await save({ type: 'pin.set', pinHash, pinSalt: family.pinSalt, recoveryHash: family.recoveryHash }, 'PIN changed')
    return ok ? null : 'Could not save the new PIN.'
  }

  return (
    <div className="st-body">
      <PinForm label="Change PIN" first={{ name: 'Current PIN', secret: true, autoComplete: 'current-password' }} action="Change PIN" run={change} />
      <RecoveryForm />
      <p className="st-hint">The recovery code is the only way back in if the PIN is forgotten. If the code is lost too, the only choice is to erase everything and start over.</p>
    </div>
  )
}
