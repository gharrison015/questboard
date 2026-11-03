import { describe, expect, it } from 'vitest'
import { COMPARE_SET, deviceById, DEVICES, fitScale, GROUPS, screenFor } from '../../src/devlab/devices'

describe('device lab catalog', () => {
  it('has unique ids and every group filled', () => {
    expect(new Set(DEVICES.map((d) => d.id)).size).toBe(DEVICES.length)
    for (const g of GROUPS) expect(DEVICES.some((d) => d.group === g)).toBe(true)
    for (const id of COMPARE_SET) expect(deviceById(id).id).toBe(id)
  })

  it('falls back to the first device for an unknown id', () => {
    expect(deviceById('nope')).toBe(DEVICES[0])
    expect(deviceById(null)).toBe(DEVICES[0])
  })

  it('swaps width, height and insets when sideways', () => {
    const d = deviceById('iphone-17-pro')
    expect(screenFor(d, false)).toEqual({ width: 402, height: 874, insets: d.portraitInsets })
    expect(screenFor(d, true)).toEqual({ width: 874, height: 402, insets: d.landscapeInsets })
  })

  it('fits a frame into the space without ever enlarging it', () => {
    expect(fitScale(500, 1000, 250, 2000)).toBe(0.5)
    expect(fitScale(500, 1000, 2000, 500)).toBe(0.5)
    expect(fitScale(100, 100, 1000, 1000)).toBe(1)
    expect(fitScale(0, 100, 10, 10)).toBe(1)
  })
})
