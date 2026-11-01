import { describe, expect, it } from 'vitest'
import type { Grade } from '../../src/engine/types'
import { pickQuestion, SKILLS, subjectsFor } from '../../src/content/skills'
import { SPELLING } from '../../src/content/skills/second'

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const GRADES: Grade[] = ['Pre-K', 'K', '1st', '2nd', '3rd+']

describe('skills library', () => {
  it.each(GRADES)('%s yields at least 40 unique ids from 200 picks', (g) => {
    const rng = seeded(7)
    const ids = new Set<string>()
    for (let i = 0; i < 200; i++) ids.add(pickQuestion(g, new Set(), rng).id)
    expect(ids.size).toBeGreaterThanOrEqual(40)
  })

  it.each(GRADES)('%s never repeats an id in usedIds', (g) => {
    const rng = seeded(11)
    const used = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const q = pickQuestion(g, used, rng)
      expect(used.has(q.id)).toBe(false)
      used.add(q.id)
    }
  })

  it('multiple choice questions have the right option count and a valid answer', () => {
    const counts: Record<string, number> = { 'Pre-K': 3, K: 3, '1st': 4, '2nd': 4 }
    for (const g of Object.keys(counts) as Grade[]) {
      const rng = seeded(3)
      for (let i = 0; i < 300; i++) {
        const q = pickQuestion(g, new Set(), rng)
        if (q.parentConfirm) continue
        expect(q.options).toHaveLength(counts[g])
        expect(new Set(q.options).size).toBe(counts[g])
        expect(q.options?.[q.answer as number]).toBeDefined()
      }
    }
  })

  it('Pre-K has no Reading', () => {
    expect(subjectsFor('Pre-K')).not.toContain('Reading')
    expect(SKILLS['Pre-K'].some((t) => t.subject === 'Reading')).toBe(false)
  })

  it('1st has Reading with parentConfirm', () => {
    expect(subjectsFor('1st')).toContain('Reading')
    const q = SKILLS['1st'].find((t) => t.subject === 'Reading')?.make(seeded(1))
    expect(q?.parentConfirm).toBe(true)
  })

  it('3rd+ uses the second grade set', () => {
    expect(SKILLS['3rd+']).toBe(SKILLS['2nd'])
  })

  it('a subject filter only returns that subject', () => {
    const rng = seeded(5)
    for (let i = 0; i < 30; i++) expect(pickQuestion('2nd', new Set(), rng, 'Spelling').subject).toBe('Spelling')
  })

  describe.each(GRADES)('%s content checks over 200 questions', (g) => {
    const rng = seeded(21)
    const qs = Array.from({ length: 200 }, () => pickQuestion(g, new Set(), rng))
    const WORDS = new Set(SPELLING.map((x) => x.word))

    it('math answers are the true result and never negative', () => {
      let seen = 0
      for (const q of qs) {
        const m = /^What is (\d+) ([+\u2212x-]) (\d+)\?$/.exec(q.prompt)
        if (!m) continue
        seen++
        const a = Number(m[1])
        const b = Number(m[3])
        const truth = m[2] === '+' ? a + b : m[2] === 'x' ? a * b : a - b
        expect(truth).toBeGreaterThanOrEqual(0)
        expect(q.options?.[q.answer as number]).toBe(String(truth))
        for (const o of q.options ?? []) expect(Number(o)).toBeGreaterThanOrEqual(0)
      }
      if (q0(g)) expect(seen).toBeGreaterThan(0)
    })

    it('options are unique and Reading has none', () => {
      for (const q of qs) {
        if (q.parentConfirm) {
          expect(q.options).toBeUndefined()
        } else {
          expect(new Set(q.options).size).toBe(q.options?.length)
        }
      }
    })

    it('spelling answers come from the word list', () => {
      for (const q of qs.filter((x) => x.subject === 'Spelling')) {
        expect(WORDS.has(q.options?.[q.answer as number] ?? '')).toBe(true)
      }
    })

    it('2nd grade addition never regroups', () => {
      for (const q of qs) {
        const m = /^What is (\d+) \+ (\d+)\?$/.exec(q.prompt)
        if (!m || (g !== '2nd' && g !== '3rd+')) continue
        const [a, b] = [Number(m[1]), Number(m[2])]
        expect((a % 10) + (b % 10)).toBeLessThanOrEqual(9)
        expect(Math.floor(a / 10) + Math.floor(b / 10)).toBeLessThanOrEqual(9)
      }
    })
  })
})

/** Pre-K has no number sentences. */
function q0(g: Grade): boolean {
  return g !== 'Pre-K'
}
