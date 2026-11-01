import type { StepProps } from './types'

export function CodeStep({ state, set }: StepProps) {
  return (
    <>
      <h2 className="su-title">Your recovery code</h2>
      <p className="st-code su-code" aria-label="Recovery code value">{state.code}</p>
      <p className="su-lead">Write this down. It is the only way to reset your PIN.</p>
      <label className="st-check">
        <input type="checkbox" checked={state.wrote} onChange={(e) => set({ wrote: e.target.checked })} />
        <span>I wrote it down</span>
      </label>
    </>
  )
}
