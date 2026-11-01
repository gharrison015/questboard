import type { Cents, Family, Kid, MoneySettings } from './types'

export function formatCents(c: Cents, opts?: { cents?: boolean }): string {
  const sign = c < 0 ? '-' : ''
  const abs = Math.abs(Math.round(c))
  const dollars = Math.floor(abs / 100)
  const rem = abs % 100
  if (opts?.cents || rem !== 0) {
    return `${sign}$${dollars}.${String(rem).padStart(2, '0')}`
  }
  return `${sign}$${dollars}`
}

const DOLLARS = /^\$?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/

export function parseDollars(input: string): Cents | null {
  const m = DOLLARS.exec(input.trim())
  if (!m) return null
  const whole = Number(m[1].replace(/,/g, ''))
  const frac = m[2] ? Number(m[2].padEnd(2, '0')) : 0
  return whole * 100 + frac
}

export function anyCents(values: Cents[]): boolean {
  return values.some((v) => v !== 0)
}

type PresetKey = 'keep' | 'earn' | 'both'

export const MONEY_PRESETS: Record<PresetKey, Pick<MoneySettings, 'startAmount' | 'deductionDefault' | 'chorePayDefault'>> = {
  keep: { startAmount: 2000, deductionDefault: 100, chorePayDefault: 0 },
  earn: { startAmount: 0, deductionDefault: 0, chorePayDefault: 100 },
  both: { startAmount: 1000, deductionDefault: 50, chorePayDefault: 100 },
}

export function presetFor(m: MoneySettings): PresetKey | 'custom' {
  for (const key of ['keep', 'earn', 'both'] as const) {
    const p = MONEY_PRESETS[key]
    if (
      m.startAmount === p.startAmount &&
      m.deductionDefault === p.deductionDefault &&
      m.chorePayDefault === p.chorePayDefault
    ) {
      return key
    }
  }
  return 'custom'
}

export function effectiveMoney(family: Family, kid: Kid): MoneySettings {
  return { ...family.money, ...kid.moneyOverrides }
}
