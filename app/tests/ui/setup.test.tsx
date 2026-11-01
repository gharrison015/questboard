import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { StoreProvider } from '../../src/state/store'
import { AppShell } from '../../src/ui/shell/AppShell'
import { InMemoryAdapter } from '../../src/storage/memory'
import { verifyPin, normalizeRecoveryCode } from '../../src/security/pin'
import type { Family } from '../../src/engine/types'

async function mount() {
  const adapter = new InMemoryAdapter()
  render(<StoreProvider adapter={adapter}><AppShell /></StoreProvider>)
  await screen.findByRole('heading', { name: 'Welcome to QuestBoard' })
  return { adapter }
}
const next = (): void => fireEvent.click(screen.getByRole('button', { name: 'Next' }))
const type = (label: string | RegExp, value: string): void => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}
async function toPinDone(pin = '1234') {
  type('Family name', 'The Tests')
  next()
  type('PIN', pin)
  type('Confirm PIN', pin)
  next()
  await screen.findByRole('heading', { name: 'Your recovery code' })
}
function passCode(): string {
  const code = screen.getByLabelText('Recovery code value').textContent ?? ''
  fireEvent.click(screen.getByRole('checkbox', { name: 'I wrote it down' }))
  next()
  return code
}
const family = async (a: InMemoryAdapter): Promise<Family> => (await a.load()).family as Family

describe('setup wizard', () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear() })

  it('completes with two kids and defaults', async () => {
    const { adapter } = await mount()
    await toPinDone()
    const code = passCode()
    type('Name of kid 1', 'Nolan')
    fireEvent.click(screen.getByRole('button', { name: 'Add another kid' }))
    type('Name of kid 2', 'Makenna')
    fireEvent.click(screen.getAllByRole('button', { name: 'Unicorn' })[1])
    next()
    next() // money, Both by default
    next() // chores
    next() // routines
    await screen.findByRole('heading', { name: "You're set up" })
    fireEvent.click(screen.getByRole('button', { name: 'Open the board' }))
    await waitFor(async () => expect((await family(adapter))?.kids).toHaveLength(2))
    const f = await family(adapter)
    expect(f.name).toBe('The Tests')
    expect(f.verification).toBe('kid-verify')
    expect(f.pinHash).not.toBe('')
    expect(await verifyPin('1234', f.pinSalt, f.pinHash)).toBe(true)
    expect(f.recoveryHash).not.toBe('')
    expect(await verifyPin(normalizeRecoveryCode(code), f.pinSalt, f.recoveryHash)).toBe(true)
    expect(f.money).toMatchObject({ startAmount: 1000, deductionDefault: 50, chorePayDefault: 100 })
    for (const k of f.kids) {
      expect(k.chores.filter((c) => c.active)).toHaveLength(5)
      expect(k.routineIds).toHaveLength(3)
    }
    expect(f.kids[1].theme).toBe('unicorn')
    expect(f.routines.find((r) => r.name === 'Nighttime')?.days).toEqual([])
    expect(f.routines.find((r) => r.name === 'Morning')?.days).toHaveLength(7)
    await screen.findByRole('banner')
  })

  it('blocks Next on the recovery code until it is acknowledged', async () => {
    await mount()
    await toPinDone()
    const btn = screen.getByRole('button', { name: 'Next' })
    expect(btn).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'I wrote it down' }))
    expect(btn).toBeEnabled()
  })

  it('shows an inline error when the PIN confirmation differs', async () => {
    await mount()
    type('Family name', 'The Tests')
    next()
    type('PIN', '1234')
    type('Confirm PIN', '1235')
    expect(screen.getByRole('alert')).toHaveTextContent('The two PINs do not match.')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('shows the limit copy at two kids', async () => {
    await mount()
    await toPinDone()
    passCode()
    fireEvent.click(screen.getByRole('button', { name: 'Add another kid' }))
    expect(screen.getByText('Two kids are free. More are available in the Shop after setup.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add another kid' })).toBeNull()
  })

  it('Earn it stores 0, 0, 100 and Take out trash pays', async () => {
    const { adapter } = await mount()
    await toPinDone()
    passCode()
    type('Name of kid 1', 'Nolan')
    next()
    fireEvent.click(screen.getByRole('radio', { name: /Earn it/ }))
    next()
    fireEvent.click(screen.getByRole('checkbox', { name: /Take out trash/ }))
    next()
    next()
    fireEvent.click(await screen.findByRole('button', { name: 'Open the board' }))
    await waitFor(async () => expect((await family(adapter))?.kids).toHaveLength(1))
    const f = await family(adapter)
    expect(f.money).toMatchObject({ startAmount: 0, deductionDefault: 0, chorePayDefault: 100 })
    const pays = Object.fromEntries(f.kids[0].chores.map((c) => [c.label, c.pay]))
    expect(pays['Take out trash']).toBe(100)
    expect(pays['Make your bed']).toBe(0)
  })

  it('needs a complete, matching confirmation before the PIN is accepted', async () => {
    await mount()
    type('Family name', 'The Tests')
    next()
    const btn = screen.getByRole('button', { name: 'Next' })
    type('PIN', '1234')
    expect(btn).toBeDisabled()
    expect(screen.queryByRole('alert')).toBeNull()
    type('Confirm PIN', '123')
    expect(btn).toBeDisabled()
    type('Confirm PIN', '1234')
    expect(btn).toBeEnabled()
  })

  it('disables unticked chores at the cap of 10', async () => {
    await mount()
    await toPinDone()
    passCode()
    type('Name of kid 1', 'Nolan')
    next()
    next()
    for (const n of [/Homework folder/, /Take out trash/, /Set the table/, /Water the plants/, /Help with laundry/]) {
      fireEvent.click(screen.getByRole('checkbox', { name: n }))
    }
    expect(screen.getByRole('checkbox', { name: /Tidy your room/ })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /Read 20 minutes/ })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /Make your bed/ })).toBeEnabled()
  })

  it('regenerates the recovery code and resets the checkbox after Back to the PIN', async () => {
    await mount()
    await toPinDone()
    const first = screen.getByLabelText('Recovery code value').textContent
    fireEvent.click(screen.getByRole('checkbox', { name: 'I wrote it down' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    next()
    expect(screen.getByLabelText('Recovery code value').textContent).not.toBe(first)
    expect(screen.getByRole('checkbox', { name: 'I wrote it down' })).not.toBeChecked()
  })
})
