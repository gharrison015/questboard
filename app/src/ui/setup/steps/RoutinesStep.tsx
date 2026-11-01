import { ROUTINE_NAMES } from '../state'
import type { StepProps } from './types'

const TEXT: Record<(typeof ROUTINE_NAMES)[number], string> = {
  Morning: 'Brush teeth, get dressed, eat breakfast.',
  Bedtime: 'Bath, PJs on, brush teeth.',
  Nighttime: 'Read a book, lights out.',
}

export function RoutinesStep({ state, set }: StepProps) {
  return (
    <>
      <h2 className="su-title">Routines</h2>
      <p className="su-lead">Routines are short step lists kids tick off. Turn on the ones you want.</p>
      <ul className="st-rows">
        {ROUTINE_NAMES.map((name) => (
          <li key={name}>
            <label className="st-check su-chore">
              <input type="checkbox" checked={state.routines[name]} onChange={(e) => set({ routines: { ...state.routines, [name]: e.target.checked } })} />
              <span className="su-chore-text">
                <span>{name}</span>
                <span className="st-hint">{TEXT[name]}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </>
  )
}
