import { choice, int, pick, shuffle, withOptions } from './helpers'
import type { SkillTemplate } from './types'

const G = 'Pre-K'
const THINGS = ['🍎', '🐶', '⭐', '🚗', '🐟', '🎈']
const SHAPES: { name: string; emoji: string }[] = [
  { name: 'circle', emoji: '🔴' },
  { name: 'square', emoji: '🟦' },
  { name: 'triangle', emoji: '🔺' },
  { name: 'star', emoji: '⭐' },
  { name: 'heart', emoji: '❤️' },
]
const COLORS: { name: string; emoji: string }[] = [
  { name: 'red', emoji: '🟥' },
  { name: 'blue', emoji: '🟦' },
  { name: 'green', emoji: '🟩' },
  { name: 'yellow', emoji: '🟨' },
  { name: 'orange', emoji: '🟧' },
  { name: 'purple', emoji: '🟪' },
]

export const PREK: SkillTemplate[] = [
  {
    subject: 'Counting',
    make(rng) {
      const t = int(rng, 0, THINGS.length - 1)
      const n = int(rng, 1, 5)
      const wrong = [n - 1, n + 1, n + 2, n - 2].filter((x) => x >= 1).map(String)
      return choice(G, 'Counting', 0, `${t}-${n}`, `How many?\n${THINGS[t].repeat(n)}`, withOptions(rng, String(n), wrong, 3))
    },
  },
  {
    subject: 'Shapes',
    make(rng) {
      const target = pick(rng, SHAPES)
      const others = shuffle(rng, SHAPES.filter((s) => s !== target)).slice(0, 2)
      const variant = [target, ...others].map((s) => s.name).join('-')
      return choice(G, 'Shapes', 1, variant, `Find the ${target.name}.`, withOptions(rng, target.emoji, others.map((s) => s.emoji), 3))
    },
  },
  {
    subject: 'Colors',
    make(rng) {
      const target = pick(rng, COLORS)
      const others = shuffle(rng, COLORS.filter((c) => c !== target)).slice(0, 2)
      const variant = [target, ...others].map((c) => c.name).join('-')
      return choice(G, 'Colors', 2, variant, `What color is this?\n${target.emoji}`, withOptions(rng, target.name, others.map((c) => c.name), 3))
    },
  },
]
