import { choice, int, nearNumbers, pick, reading, shuffle, withOptions } from './helpers'
import type { SkillTemplate } from './types'

const G = '1st'
export const FIRST_WORDS = ['jump', 'play', 'stop', 'help', 'look', 'come', 'here', 'said', 'with', 'this']
export const FIRST_SENTENCES = [
  'The big dog can run fast.',
  'I see a red bird in the tree.',
  'We like to play in the park.',
  'My mom said to come here.',
  'Can you help me look for my hat?',
  'The cat sat on the warm mat.',
  'Stop and look at the little frog.',
  'I jump with my best friend.',
  'This is a good day to play.',
  'The sun is up and we go out.',
  'Dad will help me make a cake.',
  'Look at the fish in the pond.',
]

export const FIRST: SkillTemplate[] = [
  {
    subject: 'Math',
    make(rng) {
      const a = int(rng, 1, 19)
      const b = int(rng, 1, 20 - a)
      const sum = a + b
      return choice(G, 'Math', 0, `${a}+${b}`, `What is ${a} + ${b}?`, withOptions(rng, String(sum), nearNumbers(rng, sum, 3, { min: 0, max: 20 }), 4))
    },
  },
  {
    subject: 'Math',
    make(rng) {
      const a = int(rng, 2, 20)
      const b = int(rng, 1, a - 1)
      const diff = a - b
      return choice(G, 'Math', 1, `${a}-${b}`, `What is ${a} − ${b}?`, withOptions(rng, String(diff), nearNumbers(rng, diff, 3, { min: 0, max: 20 }), 4))
    },
  },
  {
    subject: 'Sight Words',
    make(rng) {
      const target = pick(rng, FIRST_WORDS)
      const others = shuffle(rng, FIRST_WORDS.filter((w) => w !== target)).slice(0, 3)
      return choice(G, 'Sight Words', 2, [target, ...others].join('-'), `Find the word "${target}".`, withOptions(rng, target, others, 4))
    },
  },
  {
    subject: 'Reading',
    make(rng) {
      const i = int(rng, 0, FIRST_SENTENCES.length - 1)
      return reading(G, 3, i, FIRST_SENTENCES[i])
    },
  },
]
