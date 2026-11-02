import { MONEY_PRESETS, formatCents, presetFor } from '../../../engine/money'
import type { MoneySettings as Money } from '../../../engine/types'
import type { WeekState } from '../../../engine/week'
import { useStore } from '../../../state/store'
import { mathLineText } from '../../kid/MathLine'
import { MoneyInput, useSave } from './fields'

const PRESETS = [['keep', 'Keep it'], ['earn', 'Earn it'], ['both', 'Both']] as const
const PRESET_NOTE: Record<string, string> = {
  keep: 'Kids start each week with money and lose some for misbehavior.',
  earn: 'Kids start at zero and earn money by finishing chores.',
  both: 'Kids start with some money, earn more from chores, and lose some for misbehavior.',
  custom: 'Your own mix of starting money, deductions and chore pay.',
}
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** A sample week built from the current settings: start, one $4 paid chore, one default deduction. */
function sampleWeek(m: Money): WeekState {
  const pay = 400
  const deductions = m.deductionDefault
  return {
    weekStart: '', days: [], start: m.startAmount, pay, earnback: 0, deductions,
    balance: Math.max(0, m.startAmount + pay - deductions),
    lostByDay: {}, payByDay: {}, addedByDay: {}, useCents: false, closed: false,
  }
}

export function MoneySettings() {
  const { family } = useStore()
  const save = useSave()
  if (!family) return null
  const m = family.money
  const preset = presetFor(m)
  const set = (patch: Partial<Money>): void => { void save({ type: 'money.set', money: { ...m, ...patch } }) }

  return (
    <div className="st-body">
      <div className="st-chips" role="group" aria-label="Money style">
        {PRESETS.map(([key, label]) => (
          <button key={key} type="button" className="st-chip" aria-pressed={preset === key} onClick={() => set(MONEY_PRESETS[key])}>
            {label}
          </button>
        ))}
        <button type="button" className="st-chip" aria-pressed={preset === 'custom'} onClick={() => document.getElementById('st-money-start')?.focus()}>
          Custom
        </button>
      </div>
      <p className="st-hint">{PRESET_NOTE[preset]}</p>

      <div className="st-grid">
        <MoneyInput label="Start amount" hint="What a kid has at the start of each week." value={m.startAmount} onCommit={(c) => set({ startAmount: c ?? 0 })} />
        <MoneyInput label="Deduction" hint="Default amount lost for one misbehavior." value={m.deductionDefault} onCommit={(c) => set({ deductionDefault: c ?? 0 })} />
        <MoneyInput label="Pay per new chore" hint="Starting pay when you add a chore." value={m.chorePayDefault} onCommit={(c) => set({ chorePayDefault: c ?? 0 })} />
      </div>

      <div className="st-field">
        <label htmlFor="st-weekstart" className="st-label">Week starts on</label>
        <select
          id="st-weekstart"
          className="st-input"
          value={m.weekStartDay}
          onChange={(e) => set({ weekStartDay: Number(e.target.value) as Money['weekStartDay'] })}
        >
          {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
      </div>

      <label className="st-check">
        <input type="checkbox" checked={m.earnBackEnabled} onChange={(e) => set({ earnBackEnabled: e.target.checked })} />
        <span>Let kids earn money back with skill practice</span>
      </label>
      {m.earnBackEnabled ? (
        <MoneyInput label="Earned back per correct answer" value={m.earnBackPerCorrect} onCommit={(c) => set({ earnBackPerCorrect: c ?? 0 })} />
      ) : null}

      <p className="st-example" aria-label="Example week">
        <span className="st-label">Example week</span>
        <span>{mathLineText(sampleWeek(m))}</span>
        <span className="st-hint">With one {formatCents(400)} chore done and one deduction.</span>
      </p>
    </div>
  )
}
