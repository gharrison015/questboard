import type { Grade } from '../../engine/types'
import { FIRST } from './first'
import { K } from './k'
import { PREK } from './prek'
import { SECOND } from './second'
import type { Question, SkillTemplate, Subject } from './types'

export type { Question, SkillTemplate, Subject } from './types'

export const SKILLS: Record<Grade, SkillTemplate[]> = {
  'Pre-K': PREK,
  K,
  '1st': FIRST,
  '2nd': SECOND,
  '3rd+': SECOND,
}

/** Subjects a grade offers, in template order, once each. */
export function subjectsFor(grade: Grade): Subject[] {
  return [...new Set(SKILLS[grade].map((t) => t.subject))]
}

const TRIES = 300

/**
 * A question whose id is not in `usedIds`. With a `subject`, only that subject's templates are used.
 * If every try collides (a tiny subject that is used up) the last one is returned so the kid is never stuck.
 */
export function pickQuestion(grade: Grade, usedIds: Set<string>, rng: () => number, subject?: Subject): Question {
  const all = SKILLS[grade]
  const templates = subject ? all.filter((t) => t.subject === subject) : all
  const pool = templates.length > 0 ? templates : all
  let q = pool[Math.floor(rng() * pool.length)].make(rng)
  for (let i = 1; i < TRIES && usedIds.has(q.id); i++) {
    q = pool[Math.floor(rng() * pool.length)].make(rng)
  }
  return q
}
