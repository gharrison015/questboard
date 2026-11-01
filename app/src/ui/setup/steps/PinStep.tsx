import type { StepProps } from './types'

const digits = (v: string): string => v.replace(/\D/g, '').slice(0, 6)

export function PinStep({ state, set }: StepProps) {
  const mismatch = state.pinAgain.length > 0 && state.pinAgain.length >= state.pin.length && state.pinAgain !== state.pin
  return (
    <>
      <h2 className="su-title">Choose a parent PIN</h2>
      <p className="su-lead">The PIN keeps settings and money for grown-ups. Use 4 to 6 digits.</p>
      <div className="st-field">
        <label htmlFor="su-pin" className="st-label">PIN</label>
        <input
          id="su-pin"
          className="st-input su-pin"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={6}
          value={state.pin}
          onChange={(e) => set({ pin: digits(e.target.value) })}
        />
      </div>
      <div className="st-field">
        <label htmlFor="su-pin2" className="st-label">Confirm PIN</label>
        <input
          id="su-pin2"
          className="st-input su-pin"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={6}
          value={state.pinAgain}
          aria-invalid={mismatch ? true : undefined}
          onChange={(e) => set({ pinAgain: digits(e.target.value) })}
        />
      </div>
      {mismatch ? <p className="st-error" role="alert">The two PINs do not match.</p> : null}
    </>
  )
}
