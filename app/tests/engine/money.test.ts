import { describe, it, expect } from 'vitest'
import { formatCents, parseDollars, anyCents, MONEY_PRESETS, presetFor, effectiveMoney } from '../../src/engine/money'
import type { Family, Kid, MoneySettings } from '../../src/engine/types'

const both: MoneySettings = {
  ...MONEY_PRESETS.both,
  weekStartDay: 0,
  floorAtZero: true,
  earnBackEnabled: true,
  earnBackPerCorrect: 100,
}

describe('formatCents', () => {
  it('renders whole dollars without decimals', () => {
    expect(formatCents(0)).toBe('$0')
    expect(formatCents(2000)).toBe('$20')
  })
  it('renders cents when present', () => {
    expect(formatCents(1050)).toBe('$10.50')
    expect(formatCents(1850)).toBe('$18.50')
  })
  it('always shows two decimals with cents: true', () => {
    expect(formatCents(2000, { cents: true })).toBe('$20.00')
  })
  it('renders negatives', () => {
    expect(formatCents(-50)).toBe('-$0.50')
    expect(formatCents(-200)).toBe('-$2')
  })
})

describe('parseDollars', () => {
  it('parses plain and decimal input', () => {
    expect(parseDollars('20')).toBe(2000)
    expect(parseDollars('0.25')).toBe(25)
    expect(parseDollars('$1,000.5')).toBe(100050)
  })
  it('rejects junk and negatives', () => {
    expect(parseDollars('abc')).toBeNull()
    expect(parseDollars('')).toBeNull()
    expect(parseDollars('1.234')).toBeNull()
    expect(parseDollars('-5')).toBeNull()
    expect(parseDollars('1.2.3')).toBeNull()
  })
})

describe('anyCents', () => {
  it('detects sub-dollar parts', () => {
    expect(anyCents([0, 0])).toBe(false)
    expect(anyCents([0, 5])).toBe(true)
    expect(anyCents([2000, 100])).toBe(false)
    expect(anyCents([2000, 50])).toBe(true)
    expect(anyCents([])).toBe(false)
  })
})

describe('presets', () => {
  it('has the three presets', () => {
    expect(MONEY_PRESETS.keep).toEqual({ startAmount: 2000, deductionDefault: 100, chorePayDefault: 0 })
    expect(MONEY_PRESETS.earn).toEqual({ startAmount: 0, deductionDefault: 0, chorePayDefault: 100 })
    expect(MONEY_PRESETS.both).toEqual({ startAmount: 1000, deductionDefault: 50, chorePayDefault: 100 })
  })
  it('presetFor identifies presets and custom', () => {
    expect(presetFor(both)).toBe('both')
    expect(presetFor({ ...both, ...MONEY_PRESETS.keep })).toBe('keep')
    expect(presetFor({ ...both, ...MONEY_PRESETS.earn })).toBe('earn')
    expect(presetFor({ ...both, startAmount: 1000, deductionDefault: 25, chorePayDefault: 100 })).toBe('custom')
  })
})

describe('effectiveMoney', () => {
  const kid = (o?: Partial<MoneySettings>) => ({ id: 'k', moneyOverrides: o }) as Kid
  const family = { money: both } as Family
  it('returns family money when no overrides', () => {
    expect(effectiveMoney(family, kid())).toEqual(both)
  })
  it('applies kid overrides', () => {
    expect(effectiveMoney(family, kid({ startAmount: 500 })).startAmount).toBe(500)
    expect(effectiveMoney(family, kid({ startAmount: 500 })).deductionDefault).toBe(50)
  })
})
