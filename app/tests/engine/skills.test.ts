import { describe, expect, it } from 'vitest'
import type { Grade } from '../../src/engine/types'
import { pickQuestion, SKILLS, subjectsFor } from '../../src/content/skills'

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
})
