import { useLayoutEffect, useState } from 'react'
import { isValidPin, makeRecoveryCode } from '../../security/pin'
import { useActions } from '../../state/store'
import { Button } from '../primitives/Button'
import { initialState, buildFamily, type WizardState } from './state'
import { ChoresStep } from './steps/ChoresStep'
import { CodeStep } from './steps/CodeStep'
import { DoneStep } from './steps/DoneStep'
import { KidsStep } from './steps/KidsStep'
import { MoneyStep } from './steps/MoneyStep'
import { PinStep, pinMismatch } from './steps/PinStep'
import { RoutinesStep } from './steps/RoutinesStep'
import { WelcomeStep } from './steps/WelcomeStep'
import '../../styles/settings.css'
import '../../styles/setup.css'

const SCREENS = ['welcome', 'pin', 'code', 'kids', 'money', 'chores', 'routines', 'done'] as const
type Screen = (typeof SCREENS)[number]
/** Seven steps for the dots: the PIN and its recovery code count as one. */
const DOTS = 7
const dotFor = (i: number): number => (i >= 2 ? i - 1 : i)

function valid(screen: Screen, s: WizardState): boolean {
  switch (screen) {
    case 'welcome': return s.familyName.trim() !== ''
    case 'pin': return isValidPin(s.pin) && !pinMismatch(s.pin, s.pinAgain)
    case 'code': return s.wrote
    case 'kids': return s.kids.length > 0 && s.kids.every((k) => k.name.trim() !== '')
    default: return true
  }
}

export function SetupWizard() {
  const { createFamily } = useActions()
  const [s, setS] = useState<WizardState>(initialState)
  const [i, setI] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const screen = SCREENS[i]
  const set = (patch: Partial<WizardState>): void => setS((prev) => ({ ...prev, ...patch }))

  // Until a kid is chosen the buddy tint stays on the default; then it follows the first kid.
  const tint = s.kids[0]?.name.trim() ? s.kids[0].theme : 'truck'
  useLayoutEffect(() => { document.documentElement.dataset.buddy = tint }, [tint])

  const next = (): void => {
    if (screen === 'pin') setS((prev) => ({ ...prev, code: makeRecoveryCode(), wrote: false }))
    setI(i + 1)
  }
  const finish = (): void => {
    setBusy(true)
    setError('')
    buildFamily(s)
      .then((f) => createFamily(f))
      .catch(() => { setError('Could not save your setup. Try again.'); setBusy(false) })
  }

  const props = { state: s, set }
  return (
    <div className="su-page">
      <div className="su-card" role="region" aria-label="Setup">
        <ol className="su-dots" aria-label={`Step ${dotFor(i) + 1} of ${DOTS}`}>
          {Array.from({ length: DOTS }, (_, d) => (
            <li key={d} className="su-dot" data-state={d < dotFor(i) ? 'done' : d === dotFor(i) ? 'now' : 'todo'} />
          ))}
        </ol>
        <div className="su-body">
          {screen === 'welcome' ? <WelcomeStep {...props} /> : null}
          {screen === 'pin' ? <PinStep {...props} /> : null}
          {screen === 'code' ? <CodeStep {...props} /> : null}
          {screen === 'kids' ? <KidsStep {...props} /> : null}
          {screen === 'money' ? <MoneyStep {...props} /> : null}
          {screen === 'chores' ? <ChoresStep {...props} /> : null}
          {screen === 'routines' ? <RoutinesStep {...props} /> : null}
          {screen === 'done' ? <DoneStep {...props} /> : null}
          {error ? <p className="st-error" role="alert">{error}</p> : null}
        </div>
        <div className="su-foot">
          {i > 0 ? <Button variant="quiet" disabled={busy} onClick={() => setI(i - 1)}>Back</Button> : <span />}
          {screen === 'done'
            ? <Button size="lg" disabled={busy} onClick={finish}>Open the board</Button>
            : <Button disabled={!valid(screen, s)} onClick={next}>Next</Button>}
        </div>
      </div>
    </div>
  )
}
