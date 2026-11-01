import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../../src/state/store'
import { AppShell } from '../../src/ui/shell/AppShell'
import { InMemoryAdapter } from '../../src/storage/memory'
import { hashPin, verifyPin } from '../../src/security/pin'
import { parseImport } from '../../src/storage/exportImport'
import { makeFamily, nolan } from '../fixtures'
import type { Chore, Family } from '../../src/engine/types'

const NOW = new Date(2026, 10, 4, 12, 0, 0)

async function mount(opts: { family?: Partial<Family> } = {}) {
  const adapter = new InMemoryAdapter()
  const salt = 'salt'
  await adapter.saveFamily(makeFamily({
    createdAt: '2026-11-01T00:00:00.000Z',
    pinSalt: salt,
    pinHash: await hashPin('1234', salt),
    recoveryHash: await hashPin('ABCDEFGH', salt),
    ...opts.family,
  }))
  render(<StoreProvider adapter={adapter}><AppShell /></StoreProvider>)
  await screen.findByRole('banner')
  fireEvent.click(screen.getByRole('button', { name: 'Parent view' }))
  await screen.findByRole('dialog')
  for (const d of '1234') fireEvent.click(screen.getByRole('button', { name: d }))
  fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
  await screen.findByRole('region', { name: 'Log a deduction' })
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
  await screen.findByRole('region', { name: 'Settings' })
  return { adapter }
}

const family = async (a: InMemoryAdapter): Promise<Family> => (await a.load()).family as Family
const typeInto = (name: string | RegExp, value: string, scope: HTMLElement = document.body): void => {
  const input = within(scope).getByRole('textbox', { name })
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

describe('settings', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('Keep it sets the money preset', async () => {
    const { adapter } = await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }))
    await waitFor(async () => expect((await family(adapter)).money).toMatchObject({ startAmount: 2000, deductionDefault: 100, chorePayDefault: 0 }))
  })

  it('typing 0.25 into Deduction stores 25 cents', async () => {
    const { adapter } = await mount()
    typeInto('Deduction', '0.25')
    await waitFor(async () => expect((await family(adapter)).money.deductionDefault).toBe(25))
  })

  it('accepts .5 as 50 cents and rejects junk without changing the value', async () => {
    const { adapter } = await mount()
    typeInto('Pay per new chore', '.5')
    await waitFor(async () => expect((await family(adapter)).money.chorePayDefault).toBe(50))
    typeInto('Pay per new chore', 'abc')
    expect(await screen.findByText(/Enter an amount like 1.50/)).toBeInTheDocument()
    expect((await family(adapter)).money.chorePayDefault).toBe(50)
    expect(screen.getByRole('textbox', { name: 'Pay per new chore' })).toHaveValue('$0.50')
  })

  it('shows the unlock prompt for an 11th active chore and does not save', async () => {
    const chores: Chore[] = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`, label: `Chore ${i}`, icon: 'star', days: [0, 1, 2, 3, 4, 5, 6], pay: 0, active: true,
    }))
    const base = makeFamily()
    const { adapter } = await mount({ family: { kids: base.kids.map((k) => (k.id === nolan ? { ...k, chores } : k)) } })
    expect(screen.getByText('10 of 10 active')).toBeInTheDocument()
    const saveSpy = vi.spyOn(adapter, 'saveFamily')
    fireEvent.click(screen.getByRole('button', { name: 'Add chore' }))
    expect(await screen.findByText(/free limit/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Unlock unlimited chores/ }).length).toBeGreaterThan(0)
    expect(saveSpy).not.toHaveBeenCalled()
    expect((await family(adapter)).kids.find((k) => k.id === nolan)!.chores).toHaveLength(10)
  })

  it('adds a chore under the limit and the unlock grants chores-unlimited', async () => {
    const { adapter } = await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Add chore' }))
    await waitFor(async () => expect((await family(adapter)).kids.find((k) => k.id === nolan)!.chores).toHaveLength(6))
  })

  it('Export downloads JSON that parseImport accepts', async () => {
    const { adapter } = await mount()
    let blob: Blob | undefined
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: (b: Blob) => { blob = b; return 'blob:x' } })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Export family' }))
    await waitFor(() => expect(blob).toBeDefined())
    expect(click).toHaveBeenCalled()
    const text = await new Promise<string>((res) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.readAsText(blob!)
    })
    const parsed = parseImport(text)
    expect('error' in parsed).toBe(false)
    if (!('error' in parsed)) expect(parsed.family.id).toBe((await family(adapter)).id)
  })

  it('resets the PIN with the right recovery code and shows a new code', async () => {
    const { adapter } = await mount()
    const group = screen.getByRole('group', { name: 'Reset PIN with recovery code' })
    typeInto('Recovery code', 'abcd-efgh', group)
    typeInto('New PIN', '5678', group)
    typeInto('Confirm new PIN', '5678', group)
    fireEvent.click(within(group).getByRole('button', { name: 'Reset PIN' }))
    const dlg = await screen.findByRole('dialog', { name: 'New recovery code' })
    const done = within(dlg).getByRole('button', { name: 'Done' })
    expect(done).toBeDisabled()
    fireEvent.click(within(dlg).getByRole('checkbox', { name: 'I wrote it down' }))
    expect(done).toBeEnabled()
    const f = await family(adapter)
    expect(await verifyPin('5678', f.pinSalt, f.pinHash)).toBe(true)
    expect(f.recoveryHash).not.toBe(await hashPin('ABCDEFGH', 'salt'))
  })

  it('refuses a wrong recovery code', async () => {
    const { adapter } = await mount()
    const before = await family(adapter)
    const group = screen.getByRole('group', { name: 'Reset PIN with recovery code' })
    typeInto('Recovery code', 'WRONG-CODE', group)
    typeInto('New PIN', '5678', group)
    typeInto('Confirm new PIN', '5678', group)
    fireEvent.click(within(group).getByRole('button', { name: 'Reset PIN' }))
    expect(await within(group).findByText('That recovery code does not match.')).toBeInTheDocument()
    expect((await family(adapter)).pinHash).toBe(before.pinHash)
  })

  it('saves a pay handle without the leading $', async () => {
    const { adapter } = await mount()
    typeInto('Cash App', '$cash')
    await waitFor(async () => expect((await family(adapter)).payHandles?.cashapp).toBe('cash'))
  })

  it('clears a kid money override by sending null', async () => {
    const base = makeFamily()
    const { adapter } = await mount({
      family: { kids: base.kids.map((k) => (k.id === nolan ? { ...k, moneyOverrides: { startAmount: 500 } } : k)) },
    })
    const toggle = screen.getByRole('checkbox', { name: 'Own money rules for Nolan' })
    expect(toggle).toBeChecked()
    fireEvent.click(toggle)
    await waitFor(async () => {
      const k = (await family(adapter)).kids.find((x) => x.id === nolan)!
      expect('moneyOverrides' in k).toBe(false)
    })
  })

  it('removes a kid photo', async () => {
    const base = makeFamily()
    const { adapter } = await mount({
      family: { kids: base.kids.map((k) => (k.id === nolan ? { ...k, photo: 'data:image/jpeg;base64,AAAA' } : k)) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }))
    await waitFor(async () => expect((await family(adapter)).kids.find((k) => k.id === nolan)!.photo).toBeUndefined())
  })
})
