import type { Question, Subject } from './types'

export type Rng = () => number

/** Whole number from lo to hi, both included. */
export function int(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1))
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Puts the right answer among `count - 1` wrong ones, in a random order. */
export function withOptions(
  rng: Rng,
  correct: string,
  wrong: readonly string[],
  count: number,
): { options: string[]; answer: number } {
  const wrongs = [...new Set(wrong)].filter((w) => w !== correct).slice(0, count - 1)
  const options = shuffle(rng, [correct, ...wrongs])
  return { options, answer: options.indexOf(correct) }
}

/** Near misses for a number answer: next to it first, then a little further out. */
export function nearNumbers(rng: Rng, correct: number, count: number, opts: { min?: number; max?: number; steps?: number[] } = {}): string[] {
  const min = opts.min ?? 0
  const steps = opts.steps ?? [1, 2, 3, 4, 5]
  const pool: number[] = []
  for (const s of steps) {
    pool.push(correct - s, correct + s)
  }
  const ok = pool.filter((n) => n >= min && (opts.max === undefined || n <= opts.max) && n !== correct)
  // Closest first, with the order inside each distance shuffled.
  const near = ok.slice(0, 6)
  const far = ok.slice(6)
  return [...shuffle(rng, near), ...far].slice(0, count).map(String)
}

export function choice(
  grade: string,
  subject: Subject,
  templateIndex: number,
  variant: string,
  prompt: string,
  built: { options: string[]; answer: number },
): Question {
  return { id: `${grade}:${subject}:${templateIndex}:${variant}`, subject, prompt, options: built.options, answer: built.answer }
}

export function reading(grade: string, templateIndex: number, variant: number, sentence: string): Question {
  return { id: `${grade}:Reading:${templateIndex}:${variant}`, subject: 'Reading', prompt: sentence, parentConfirm: true }
}
