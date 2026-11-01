import type { StepProps } from './types'

export function WelcomeStep({ state, set }: StepProps) {
  return (
    <>
      <h2 className="su-title">Welcome to QuestBoard</h2>
      <p className="su-lead">Chores, routines and pocket money in one place. Setup takes a few minutes. First, what should we call your family?</p>
      <div className="st-field">
        <label htmlFor="su-family" className="st-label">Family name</label>
        <input
          id="su-family"
          className="st-input"
          value={state.familyName}
          maxLength={40}
          autoComplete="off"
          placeholder="The Harrisons"
          onChange={(e) => set({ familyName: e.target.value })}
        />
      </div>
      <p className="st-hint">Version {import.meta.env.VITE_APP_VERSION ?? 'dev'}</p>
    </>
  )
}
