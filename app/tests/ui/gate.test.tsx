import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../../src/state/store'
import { AppShell } from '../../src/ui/shell/AppShell'
import { InMemoryAdapter } from '../../src/storage/memory'
import { hashPin, normalizeRecoveryCode, verifyPin } from '../../src/security/pin'
import type { Family, QBEvent } from '../../src/engine/types'
import { ev, makeFamily, nolan, TRASH } from '../fixtures'

const salt = 'salt'

async function seed(adapter: InMemoryAdapter, patch: Partial<Family> = {}, events: QBEvent[] = []) {
  await adapter.saveFamily(makeFamily({
    createdAt: '2026-11-01T00:00:00.000Z', pinSalt: salt,
    pinHash: await hashPin('1234', salt), recoveryHash: await hashPin('ABCDEFGH', salt), ...patch,
  }))
  if (events.length) await adapter.appendEvents(events)
}

async function mount(patch: Partial<Family> = {}, events: QBEvent[] = []) {
  const adapter = new InMemoryAdapter()
  await seed(adapter, patch, events)
  render(<StoreProvider adapter={adapter}><AppShell /></StoreProvider>)
  await screen.findByRole('banner')
  return adapter
}

const fill = (label: string, value: string, scope: HTMLElement = document.body): void => {
  fireEvent.change(within(scope).getByLabelText(label), { target: { value } })
}

async function openRecovery() {
  fireEvent.click(screen.getByRole('button', { name: 'Parent view' }))
  await screen.findByRole('dialog', { name: 'Parent PIN' })
  fireEvent.click(screen.getByRole('button', { name: 'Forgot PIN?' }))
  return screen.findByRole('dialog', { name: 'Forgot PIN' })
}

async function enterPin(pin: string) {
  const gate = await screen.findByRole('dialog', { name: 'Parent PIN' })
  for (const d of pin) fireEvent.click(within(gate).getByRole('button', { name: d }))
  fireEvent.click(within(gate).getByRole('button', { name: 'Enter' }))
}

describe('Ruling 26: forgotten PIN from the gate, with no session', () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear() })

  it('a wrong recovery code fails and counts toward the shared lockout', async () => {
    const adapter = await mount()
    const dlg = await openRecovery()
    const group = within(dlg).getByRole('group', { name: 'Reset PIN with recovery code' })
    fill('Recovery code', 'WRONG-CODE', group)
    fill('New PIN', '5678', group)
    fill('Confirm new PIN', '5678', group)
    fireEvent.click(within(group).getByRole('button', { name: 'Reset PIN' }))
    expect(await within(group).findByText('That recovery code does not match.')).toBeInTheDocument()
    expect((await adapter.load()).lockout.failures).toBe(1)
    expect((await adapter.load()).family?.pinHash).toBe(await hashPin('1234', salt))
  })

  it('the right code sets a new PIN, shows the new code once, and leaves no session open', async () => {
    const adapter = await mount()
    const dlg = await openRecovery()
    const group = within(dlg).getByRole('group', { name: 'Reset PIN with recovery code' })
    fill('Recovery code', 'abcd-efgh', group)
    fill('New PIN', '5678', group)
    fill('Confirm new PIN', '5678', group)
    fireEvent.click(within(group).getByRole('button', { name: 'Reset PIN' }))
    const code = (await within(dlg).findByLabelText('Recovery code value')).textContent ?? ''
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    const f = (await adapter.load()).family as Family
    expect(await verifyPin('5678', f.pinSalt, f.pinHash)).toBe(true)
    expect(await verifyPin(normalizeRecoveryCode(code), f.pinSalt, f.recoveryHash)).toBe(true)
    // Recovery does not unlock the parent view by itself.
    expect(screen.queryByRole('region', { name: 'Log a deduction' })).toBeNull()
    fireEvent.click(within(dlg).getByRole('checkbox', { name: 'I wrote it down' }))
    fireEvent.click(within(dlg).getByRole('button', { name: 'Done' }))
    expect(screen.queryByLabelText('Recovery code value')).toBeNull()
    await enterPin('5678')
    expect(await screen.findByRole('region', { name: 'Log a deduction' })).toBeInTheDocument()
  })

  it('Erase and start over needs ERASE, a second confirm and a countdown, then lands on the setup wizard', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const adapter = await mount()
      const dlg = await openRecovery()
      fireEvent.click(within(dlg).getByRole('button', { name: /Erase and start over/ }))
      const erase = await screen.findByRole('dialog', { name: 'Erase and start over' })
      const cont = within(erase).getByRole('button', { name: 'Continue' })
      expect(cont).toBeDisabled()
      fill('Type ERASE', 'erase', erase)
      expect(cont).toBeDisabled()
      fill('Type ERASE', 'ERASE', erase)
      fireEvent.click(cont)
      expect(erase).toHaveTextContent('This deletes every chore, deduction and dollar for the whole family on this device.')
      const btn = within(erase).getByRole('button', { name: 'Erase everything (5)' })
      expect(btn).toBeDisabled()
      fireEvent.click(btn)
      expect((await adapter.load()).family).not.toBeNull()
      await act(async () => { await vi.advanceTimersByTimeAsync(4_100) })
      expect(within(erase).getByRole('button', { name: /Erase everything \(1\)/ })).toBeDisabled()
      await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })
      const final = within(erase).getByRole('button', { name: 'Erase everything' })
      expect(final).toBeEnabled()
      fireEvent.click(final)
      expect(await screen.findByRole('heading', { name: 'Welcome to QuestBoard' })).toBeInTheDocument()
      const loaded = await adapter.load()
      expect(loaded.family).toBeNull()
      expect(loaded.events).toHaveLength(0)
    } finally { vi.useRealTimers() }
  })

  it('Cancel on the confirm step returns to the PIN', async () => {
    await mount()
    const dlg = await openRecovery()
    fireEvent.click(within(dlg).getByRole('button', { name: /Erase and start over/ }))
    const erase = await screen.findByRole('dialog', { name: 'Erase and start over' })
    fill('Type ERASE', 'ERASE', erase)
    fireEvent.click(within(erase).getByRole('button', { name: 'Continue' }))
    fireEvent.click(within(erase).getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByRole('dialog', { name: 'Parent PIN' })).toBeInTheDocument()
  })

  it('Erase is disabled while the shared lockout is active', async () => {
    const adapter = await mount()
    await adapter.saveLockout({ failures: 0, lockedUntil: Date.now() + 60_000 })
    cleanup()
    render(<StoreProvider adapter={adapter}><AppShell /></StoreProvider>)
    await screen.findByRole('banner')
    const dlg = await openRecovery()
    const link = within(dlg).getByRole('button', { name: /Erase and start over/ })
    expect(link).toHaveAttribute('aria-disabled', 'true')
    expect(link).toHaveTextContent(/Try again in \d+s/)
    fireEvent.click(link)
    expect(screen.queryByRole('dialog', { name: 'Erase and start over' })).toBeNull()
    expect((await adapter.load()).family).not.toBeNull()
  })

  it('erasing leaves no parent session', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const adapter = await mount()
      const dlg = await openRecovery()
      fireEvent.click(within(dlg).getByRole('button', { name: /Erase and start over/ }))
      const erase = await screen.findByRole('dialog', { name: 'Erase and start over' })
      fill('Type ERASE', 'ERASE', erase)
      fireEvent.click(within(erase).getByRole('button', { name: 'Continue' }))
      await act(async () => { await vi.advanceTimersByTimeAsync(5_100) })
      fireEvent.click(within(erase).getByRole('button', { name: 'Erase everything' }))
      await screen.findByRole('heading', { name: 'Welcome to QuestBoard' })
      expect(screen.queryByRole('region', { name: 'Log a deduction' })).toBeNull()
      expect((await adapter.load()).family).toBeNull()
    } finally { vi.useRealTimers() }
  })

  it('the Forgot PIN link is a 48px target', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Parent view' }))
    await screen.findByRole('dialog', { name: 'Parent PIN' })
    expect(screen.getByRole('button', { name: 'Forgot PIN?' })).toHaveClass('qb-gate-link')
  })
})

describe('store timers', () => {
  afterEach(() => vi.useRealTimers())

  it('the parent session locks at exactly five minutes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 10, 4, 12, 0, 30))
    await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Parent view' }))
    await enterPin('1234')
    await screen.findByRole('region', { name: 'Log a deduction' })
    await act(async () => { await vi.advanceTimersByTimeAsync(299_000) })
    expect(screen.getByRole('region', { name: 'Log a deduction' })).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(1_100) })
    // 5:00 after the unlock, before the next minute tick at 12:06:30.
    expect(screen.queryByRole('region', { name: 'Log a deduction' })).toBeNull()
  })

  it('I1: crossing a week boundary closes the finished week while the app stays open', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 10, 7, 23, 59, 30)) // Saturday night, week of 11-01
    const adapter = await mount({ createdAt: new Date(2026, 10, 1, 8).toISOString() }, [
      ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: '2026-11-03' }, new Date(2026, 10, 3, 9).toISOString()),
    ])
    const closes = async () => (await adapter.load()).events.filter((e) => e.type === 'week.closed' && e.kidId === nolan)
    expect(await closes()).toHaveLength(0)
    await act(async () => { await vi.advanceTimersByTimeAsync(61_000) })
    await waitFor(async () => expect(await closes()).toHaveLength(1))
    expect((await closes())[0]).toMatchObject({ weekStart: '2026-11-01', balance: 1100 })
    // Another tick in the same week appends nothing more.
    await act(async () => { await vi.advanceTimersByTimeAsync(61_000) })
    expect(await closes()).toHaveLength(1)
  })
})

describe('I6: another tab', () => {
  class FakeChannel {
    static all: FakeChannel[] = []
    onmessage: ((ev: MessageEvent) => void) | null = null
    posted: unknown[] = []
    constructor(public name: string) { FakeChannel.all.push(this) }
    postMessage(m: unknown): void { this.posted.push(m) }
    close(): void { /* nothing */ }
  }
  beforeEach(() => { FakeChannel.all = []; vi.stubGlobal('BroadcastChannel', FakeChannel) })
  afterEach(() => vi.unstubAllGlobals())

  it('posts after an append and reloads the ledger when the other tab posts', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 4, 12))
    const adapter = await mount()
    const ch = FakeChannel.all.find((c) => c.name === 'qb')
    expect(ch).toBeDefined()
    // A check from this tab announces itself.
    fireEvent.click(screen.getByRole('button', { name: /Take out trash/ }))
    await waitFor(() => expect(ch?.posted.length).toBeGreaterThan(0))
    // The other tab logged a deduction straight to storage, then posted.
    await adapter.appendEvents([ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 100, date: '2026-11-04' }, new Date(2026, 10, 4, 11).toISOString())])
    expect(screen.getByLabelText('Balance $10')).toBeInTheDocument()
    await act(async () => { ch?.onmessage?.(new MessageEvent('message', { data: { type: 'changed' } })) })
    await waitFor(() => expect(screen.getByLabelText('Balance $9')).toBeInTheDocument())
    vi.useRealTimers()
  })
})

describe('load failure', () => {
  it('shows an error screen with Try again, which retries the load', async () => {
    const adapter = new InMemoryAdapter()
    await seed(adapter)
    const real = adapter.load.bind(adapter)
    let fail = true
    adapter.load = async () => { if (fail) throw new Error('blocked'); return real() }
    render(<StoreProvider adapter={adapter}><AppShell /></StoreProvider>)
    expect(await screen.findByRole('alert')).toHaveTextContent('could not open its saved data')
    fail = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('banner')).toBeInTheDocument()
  })
})
