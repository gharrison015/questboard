import { describe, it, expect } from 'vitest'
import { dateKey, parseKey, addDays, weekStartKey, weekDays, isPastMidnightOf, dayLabel, dayFull } from '../../src/engine/dates'
import { newId } from '../../src/engine/ids'

describe('dates', () => {
  it('round trips a key through local midnight', () => {
    const d = parseKey('2026-11-05')
    expect(d.getHours()).toBe(0)
    expect(dateKey(d)).toBe('2026-11-05')
  })
  it('uses local time for keys', () => {
    expect(dateKey(new Date(2026, 10, 5, 23, 59, 59))).toBe('2026-11-05')
    expect(dateKey(new Date(2026, 0, 1, 0, 0, 1))).toBe('2026-01-01')
  })
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31')
  })
  it('finds the week start', () => {
    expect(weekStartKey('2026-11-05', 0)).toBe('2026-11-01')
    expect(weekStartKey('2026-11-05', 1)).toBe('2026-11-02')
    expect(weekStartKey('2026-11-01', 1)).toBe('2026-10-26')
    expect(weekStartKey('2026-11-01', 0)).toBe('2026-11-01')
  })
  it('lists 7 consecutive days', () => {
    const days = weekDays('2026-11-01')
    expect(days).toHaveLength(7)
    expect(days[0]).toBe('2026-11-01')
    expect(days[6]).toBe('2026-11-07')
  })
  it('knows when a day is past midnight', () => {
    expect(isPastMidnightOf('2026-11-05', new Date('2026-11-06T00:00:01'))).toBe(true)
    expect(isPastMidnightOf('2026-11-05', new Date('2026-11-05T23:59:59'))).toBe(false)
    expect(isPastMidnightOf('2026-11-05', new Date('2026-11-06T00:00:00'))).toBe(true)
  })
  it('labels days', () => {
    expect(dayLabel('2026-11-01')).toBe('Sun')
    expect(dayFull('2026-11-05')).toBe('Thursday')
  })
})

describe('newId', () => {
  it('makes unique 26 character ULIDs', () => {
    const a = newId()
    expect(a).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
    expect(newId()).not.toBe(a)
  })
})
