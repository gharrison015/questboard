import { formatCents, MONEY_PRESETS } from '../../../engine/money'
import type { PresetKey } from '../state'
import type { StepProps } from './types'

const CARDS: { key: PresetKey; title: string; text: string }[] = [
  { key: 'keep', title: 'Keep it', text: 'Kids start with money and lose some when they misbehave. Chores pay nothing.' },
  { key: 'earn', title: 'Earn it', text: 'Kids start at zero and earn money for chores. Nothing is taken away.' },
  { key: 'both', title: 'Both', text: 'Kids start with some money, earn for chores and lose some for misbehavior.' },
]

export function MoneyStep({ state, set }: StepProps) {
  return (
    <>
      <h2 className="su-title">How should money work?</h2>
      <p className="su-lead">Pick a style. You can change the amounts later in Settings.</p>
      <div className="st-body" role="radiogroup" aria-label="Money style">
        {CARDS.map((c) => {
          const p = MONEY_PRESETS[c.key]
          return (
            <label key={c.key} className="st-radio" data-on={state.preset === c.key}>
              <input type="radio" name="preset" checked={state.preset === c.key} onChange={() => set({ preset: c.key })} />
              <span className="st-radio-text">
                <span className="st-radio-title">{c.title}</span>
                <span className="st-hint">{c.text}</span>
                <span className="st-hint">
                  Start {formatCents(p.startAmount)}. Deduction {formatCents(p.deductionDefault)}. Pay per chore {formatCents(p.chorePayDefault)}.
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </>
  )
}
