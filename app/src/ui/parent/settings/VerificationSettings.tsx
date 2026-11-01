import type { VerificationMode } from '../../../engine/types'
import { useStore } from '../../../state/store'
import { useSave } from './fields'

const MODES: { key: VerificationMode; title: string; text: string }[] = [
  { key: 'kid-verify', title: 'Kid checks, parent can verify', text: 'A check counts for the checklist. Paid chores pay when you verify, or at midnight if you do not touch them.' },
  { key: 'kid-final', title: 'Kid checks, final', text: 'Pay posts the moment a kid checks the chore.' },
  { key: 'parent-approve', title: 'Parent approves each', text: 'A check waits for your approval, and pay posts only when you approve it.' },
]

export function VerificationSettings() {
  const { family } = useStore()
  const save = useSave()
  if (!family) return null
  return (
    <div className="st-body" role="radiogroup" aria-label="Verification">
      {MODES.map((m) => (
        <label key={m.key} className="st-radio" data-on={family.verification === m.key}>
          <input
            type="radio"
            name="verification"
            checked={family.verification === m.key}
            onChange={() => { void save({ type: 'verification.set', mode: m.key }) }}
          />
          <span className="st-radio-text">
            <span className="st-radio-title">{m.title}</span>
            <span className="st-hint">{m.text}</span>
          </span>
        </label>
      ))}
    </div>
  )
}
