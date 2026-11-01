import { choice, int, nearNumbers, pick, reading, shuffle, withOptions } from './helpers'
import type { Rng } from './helpers'
import type { SkillTemplate } from './types'

const G = '2nd'

export const SPELLING: { word: string; clue: string }[] = [
  { word: 'friend', clue: 'Someone you like to play with.' },
  { word: 'because', clue: 'The word you use to give a reason.' },
  { word: 'people', clue: 'More than one person.' },
  { word: 'school', clue: 'Where you go to learn.' },
  { word: 'water', clue: 'You drink it when you are thirsty.' },
  { word: 'house', clue: 'A place where a family lives.' },
  { word: 'mother', clue: 'Another word for mom.' },
  { word: 'again', clue: 'One more time.' },
  { word: 'every', clue: 'Each one of them.' },
  { word: 'would', clue: 'I ___ like some juice.' },
  { word: 'light', clue: 'A lamp gives off this.' },
  { word: 'happy', clue: 'How you feel when you smile.' },
  { word: 'around', clue: 'Going in a circle.' },
  { word: 'before', clue: 'The opposite of after.' },
  { word: 'animal', clue: 'A dog or a cat is one.' },
  { word: 'family', clue: 'Your mom, your dad, and you.' },
]

export const SECOND_SENTENCES = [
  'My brother and I ride our bikes to the park after school.',
  'The little puppy looked under the porch for his red ball.',
  'We went to the lake and saw three ducks swimming by.',
  'When the rain stopped, a bright rainbow came out in the sky.',
  'Grandma bakes warm bread on Sunday and we eat it with jam.',
  'The farmer gave water to the cows before the sun went down.',
  'I like to read a book under the big tree behind our house.',
  'Our class made a garden and planted seeds in the soft dirt.',
  'After supper we played a game and then it was time for bed.',
  'The tractor went slowly across the field and the dust rose up.',
]

const VOWELS = ['a', 'e', 'i', 'o', 'u']

/** Plausible misspellings: swapped letters, a dropped or doubled letter, a changed vowel. */
export function misspellings(word: string): string[] {
  const out = new Set<string>()
  for (let i = 0; i < word.length - 1; i++) {
    out.add(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2))
  }
  for (let i = 1; i < word.length; i++) {
    out.add(word.slice(0, i) + word.slice(i + 1))
    out.add(word.slice(0, i) + word[i] + word.slice(i))
  }
  for (let i = 0; i < word.length; i++) {
    if (!VOWELS.includes(word[i])) continue
    for (const v of VOWELS) if (v !== word[i]) out.add(word.slice(0, i) + v + word.slice(i + 1))
  }
  out.delete(word)
  return [...out]
}

function spellOptions(rng: Rng, word: string): { options: string[]; answer: number } {
  return withOptions(rng, word, shuffle(rng, misspellings(word)), 4)
}

export const SECOND: SkillTemplate[] = [
  {
    subject: 'Math',
    make(rng) {
      // Tens and ones both add up with nothing to carry.
      const tensA = int(rng, 1, 8)
      const tensB = int(rng, 1, 9 - tensA)
      const onesA = int(rng, 0, 8)
      const onesB = int(rng, 0, 9 - onesA)
      const a = tensA * 10 + onesA
      const b = tensB * 10 + onesB
      const sum = a + b
      return choice(G, 'Math', 0, `${a}+${b}`, `What is ${a} + ${b}?`, withOptions(rng, String(sum), nearNumbers(rng, sum, 3, { min: 0, max: 99, steps: [1, 2, 10] }), 4))
    },
  },
  {
    subject: 'Math',
    make(rng) {
      const a = int(rng, 11, 50)
      const b = int(rng, 1, a - 1)
      const diff = a - b
      return choice(G, 'Math', 1, `${a}-${b}`, `What is ${a} - ${b}?`, withOptions(rng, String(diff), nearNumbers(rng, diff, 3, { min: 0, max: 50, steps: [1, 2, 10] }), 4))
    },
  },
  {
    subject: 'Math',
    make(rng) {
      const f = pick(rng, [2, 5])
      const n = int(rng, 1, 10)
      const product = f * n
      return choice(G, 'Math', 2, `${f}x${n}`, `What is ${f} x ${n}?`, withOptions(rng, String(product), nearNumbers(rng, product, 3, { min: 0, steps: [f, 1, 2 * f] }), 4))
    },
  },
  {
    subject: 'Spelling',
    make(rng) {
      const s = pick(rng, SPELLING)
      return choice(G, 'Spelling', 3, s.word, `Which spelling is right?\n${s.clue}`, spellOptions(rng, s.word))
    },
  },
  {
    subject: 'Reading',
    make(rng) {
      const i = int(rng, 0, SECOND_SENTENCES.length - 1)
      return reading(G, 4, i, SECOND_SENTENCES[i])
    },
  },
]
