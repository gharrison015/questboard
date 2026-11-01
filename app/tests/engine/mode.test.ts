import { describe, expect, it } from 'vitest'
import { detectMode } from '../../src/app/mode'
import { resolveAppearance } from '../../src/app/appearance'

const at = (h: number): Date => new Date(2026, 10, 2, h, 0, 0)

describe('detectMode', () => {
  it('maps width and pointer to a mode', () => {
    expect(detectMode({ width: 393, coarse: true, hash: '', override: 'auto' })).toBe('phone')
    expect(detectMode({ width: 699, coarse: false, hash: '', override: 'auto' })).toBe('phone')
    expect(detectMode({ width: 700, coarse: false, hash: '', override: 'auto' })).toBe('tablet')
    expect(detectMode({ width: 1180, coarse: true, hash: '', override: 'auto' })).toBe('tablet')
    expect(detectMode({ width: 1279, coarse: false, hash: '', override: 'auto' })).toBe('tablet')
    expect(detectMode({ width: 1920, coarse: false, hash: '', override: 'auto' })).toBe('tv')
    expect(detectMode({ width: 1920, coarse: true, hash: '', override: 'auto' })).toBe('tablet')
  })
  it('lets the hash win, then the override', () => {
    expect(detectMode({ width: 393, coarse: true, hash: '#tv', override: 'auto' })).toBe('tv')
    expect(detectMode({ width: 1920, coarse: false, hash: '', override: 'tablet' })).toBe('tablet')
    expect(detectMode({ width: 1920, coarse: false, hash: '#tv', override: 'phone' })).toBe('tv')
  })
  it('treats #parent as a tablet-class parent entry', () => {
    expect(detectMode({ width: 1920, coarse: false, hash: '#parent', override: 'auto' })).toBe('tablet')
    expect(detectMode({ width: 393, coarse: true, hash: '#parent', override: 'auto' })).toBe('phone')
  })
})

describe('resolveAppearance', () => {
  it('auto is dark at night on TV only', () => {
    expect(resolveAppearance('auto', null, 'tv', at(20))).toBe('dark')
    expect(resolveAppearance('auto', null, 'tv', at(2))).toBe('dark')
    expect(resolveAppearance('auto', null, 'tv', at(10))).toBe('bright')
    expect(resolveAppearance('auto', null, 'phone', at(20))).toBe('bright')
  })
  it('device override wins, family setting applies otherwise', () => {
    expect(resolveAppearance('auto', 'calm', 'tv', at(20))).toBe('calm')
    expect(resolveAppearance('dark', null, 'phone', at(10))).toBe('dark')
    expect(resolveAppearance('auto', 'auto', 'tv', at(20))).toBe('dark')
  })
})
