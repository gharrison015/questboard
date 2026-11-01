import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const tokens = readFileSync(resolve(__dirname, '../src/styles/tokens.css'), 'utf8')

describe('tokens.css', () => {
  it('defines buddy and appearance selectors', () => {
    expect(tokens).toContain('[data-buddy="truck"]')
    expect(tokens).toContain('[data-appearance="dark"]')
  })
})
