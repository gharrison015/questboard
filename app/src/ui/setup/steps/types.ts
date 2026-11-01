import type { WizardState } from '../state'

export interface StepProps {
  state: WizardState
  set(patch: Partial<WizardState>): void
}
