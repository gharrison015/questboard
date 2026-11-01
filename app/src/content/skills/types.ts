export type Subject = 'Counting' | 'Shapes' | 'Colors' | 'Math' | 'Sight Words' | 'Spelling' | 'Reading'

export interface Question {
  id: string
  subject: Subject
  prompt: string
  options?: string[]
  /** Index into `options` of the right answer. */
  answer?: number
  /** A grown-up confirms the answer instead of the app. */
  parentConfirm?: boolean
}

export interface SkillTemplate {
  subject: Subject
  make(rng: () => number): Question
}
