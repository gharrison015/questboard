// Checks WCAG contrast for all 36 appearance by buddy combinations in tokens.css.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../src/styles/tokens.css'), 'utf8')

const blocks = []
for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
  const sel = m[1].trim()
  const attrs = Object.fromEntries([...sel.matchAll(/\[data-(\w+)="([^"]+)"\]/g)].map((a) => [a[1], a[2]]))
  const decls = Object.fromEntries([...m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((d) => [d[1], d[2].trim()]))
  blocks.push({ attrs, decls })
}

const appearances = ['bright', 'calm', 'dark']
const buddies = [...new Set(blocks.map((b) => b.attrs.buddy).filter(Boolean))]

const toRgb = (hex) => {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}
const resolveColor = (v) => {
  const mix = v.match(/^color-mix\(in oklab,\s*(#\w{6})\s+(\d+)%,\s*(#\w{6})\)$/)
  if (mix) {
    const p = Number(mix[2]) / 100
    const a = toRgb(mix[1])
    const b = toRgb(mix[3])
    return a.map((c, i) => c * p + b[i] * (1 - p)) // sRGB approximation of the oklab mix
  }
  if (/^#[0-9a-f]{6}$/i.test(v)) return toRgb(v)
  throw new Error(`Unsupported color value: ${v}`)
}
const lum = ([r, g, b]) => {
  const f = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const pairs = [
  ['--ink', '--bg'], ['--ink', '--card'],
  ['--ink-2', '--bg'], ['--ink-2', '--card'],
  ['--ink-3', '--bg'], ['--ink-3', '--card'],
  ['--ink', '--card-2'], ['--ink', '--bg-wash'],
  ...['--good', '--warn', '--bad', '--save', '--spend', '--give'].flatMap((c) => [[c, '--bg'], [c, '--card']]),
  ['--accent-ink', '--accent'],
]
const MIN = 4.5

let combos = 0
const failures = []
for (const appearance of appearances) {
  for (const buddy of buddies) {
    combos++
    const vars = {}
    for (const b of blocks) {
      const ok = (!b.attrs.appearance || b.attrs.appearance === appearance) && (!b.attrs.buddy || b.attrs.buddy === buddy)
      if (ok && (b.attrs.appearance || b.attrs.buddy)) Object.assign(vars, b.decls)
    }
    for (const [fg, bg] of pairs) {
      if (!vars[fg] || !vars[bg]) {
        failures.push({ appearance, buddy, pair: `${fg} on ${bg}`, ratio: 'missing' })
        continue
      }
      const r = ratio(resolveColor(vars[fg]), resolveColor(vars[bg]))
      if (r < MIN) failures.push({ appearance, buddy, pair: `${fg} on ${bg}`, ratio: r.toFixed(2) })
    }
  }
}

console.log(`${combos} combinations, ${failures.length} failures`)
if (failures.length) {
  console.table(failures)
  process.exit(1)
}
