import { STARTER_CHORES } from '../../../content/starterChores'
import { ChoreIcon } from '../../kid/ChoreIcon'
import { MAX_CHORES } from '../state'
import type { StepProps } from './types'

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
function daysText(days: number[]): string {
  if (days.length === 7) return 'Every day'
  return days.map((d) => DAY[d]).join(' ')
}

export function ChoresStep({ state, set }: StepProps) {
  const full = state.chores.length >= MAX_CHORES
  const toggle = (label: string): void => {
    set({ chores: state.chores.includes(label) ? state.chores.filter((l) => l !== label) : [...state.chores, label] })
  }
  return (
    <>
      <h2 className="su-title">Starter chores</h2>
      <p className="su-lead">These go on every kid&apos;s board. You can change these any time in Settings.</p>
      <ul className="st-rows" aria-label="Starter chores">
        {STARTER_CHORES.map((c) => {
          const on = state.chores.includes(c.label)
          return (
            <li key={c.label}>
              <label className="st-check su-chore">
                <input type="checkbox" checked={on} disabled={!on && full} onChange={() => toggle(c.label)} />
                <ChoreIcon name={c.icon} />
                <span className="su-chore-text">
                  <span>{c.label}</span>
                  <span className="st-hint">{daysText(c.days)}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      {full ? <p className="st-hint">The free plan allows {MAX_CHORES} chores per kid.</p> : null}
    </>
  )
}
