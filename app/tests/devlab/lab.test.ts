import { afterEach, describe, expect, it } from 'vitest'
import { isLab, labFold, labTouch } from '../../src/app/lab'

function at(search: string): void {
  window.history.replaceState(null, '', `/questboard/${search}`)
}

describe('lab sandbox flags', () => {
  afterEach(() => at(''))

  it('is off for the real app', () => {
    at('')
    expect(isLab()).toBe(false)
    at('?touch=1&fold=1')
    expect(labTouch()).toBe(false)
    expect(labFold()).toBe(false)
  })

  it('turns on with ?lab=1 and reads touch and fold only then', () => {
    at('?lab=1&touch=1&fold=1')
    expect(isLab()).toBe(true)
    expect(labTouch()).toBe(true)
    expect(labFold()).toBe(true)
  })
})
