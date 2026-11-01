import { choice, int, nearNumbers, pick, shuffle, withOptions } from './helpers'
import type { SkillTemplate } from './types'

const G = 'K'
const THINGS = ['🍎', '🐶', '⭐', '🚗', '🐟', '🎈']
export const K_WORDS = ['the', 'and', 'you', 'see', 'go', 'we', 'my', 'like', 'to', 'a']

export const K: SkillTemplate[] = [
  {
    subject: 'Counting',
    make(rng) {
      const t = int(rng, 0, THINGS.length - 1)
      const n = int(rng, 1, 10)
      return choice(G, 'Counting', 0, `${t}-${n}`, `How many?\n${THINGS[t].repeat(n)}`, withOptions(rng, String(n), nearNumbers(rng, n, 2, { min: 1, max: 10, steps: [1, 2] }), 3))
    },
  },
  {
    subject: 'Math',
    make(rng) {
      const a = int(rng, 1, 9)
      const b = int(rng, 1, 10 - a)
      const sum = a + b
      return choice(G, 'Math', 1, `${a}+${b}`, `What is ${a} + ${b}?`, withOptions(rng, String(sum), nearNumbers(rng, sum, 2, { min: 0, max: 10, steps: [1, 2] }), 3))
    },
  },
  {
    subject: 'Sight Words',
    make(rng) {
      const target = pick(rng, K_WORDS)
      const others = shuffle(rng, K_WORDS.filter((w) => w !== target)).slice(0, 2)
      return choice(G, 'Sight Words', 2, [target, ...others].join('-'), `Find the word "${target}".`, withOptions(rng, target, others, 3))
    },
  },
]
