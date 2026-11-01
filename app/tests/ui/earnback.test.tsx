import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider, useActions, useKid, useStore, type Actions } from '../../src/state/store'
import { AppShell } from '../../src/ui/shell/AppShell'
import { InMemoryAdapter } from '../../src/storage/memory'
import { KidBoard } from '../../src/ui/kid/KidBoard'
import { ParentProvider } from '../../src/ui/parent/useParent'
import { Toaster } from '../../src/ui/primitives/Toaster'
import { ChallengeModal } from '../../src/ui/earnback/ChallengeModal'
import { hashPin } from '../../src/security/pin'
import { ev, makeFamily, nolan } from '../fixtures'

function Board() {
  const kid = useKid()
  return kid ? <KidBoard kid={kid} /> : null
}

function Direct() {
  const kid = useKid()
  return kid ? <ChallengeModal kid={kid} subject="Math" onClose={() => undefined} /> : null
}

async function mount(deduction: number, opts: { direct?: boolean; pin?: string } = {}) {
  const adapter = new InMemoryAdapter()
  const salt = 'salt'
  await adapter.saveFamily(makeFamily({
    createdAt: '2026-11-01T00:00:00.000Z',
    ...(opts.pin ? { pinSalt: salt, pinHash: await hashPin(opts.pin, salt) } : {}),
  }))
  if (deduction > 0) {
    await adapter.appendEvents([
      ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: deduction, date: '2026-11-04' }, '2026-11-04T09:00:00'),
    ])
  }
  render(<StoreProvider adapter={adapter}><ParentProvider>{opts.direct ? <Direct /> : <Board />}<Toaster /></ParentProvider></StoreProvider>)
  if (opts.direct) await screen.findByRole('dialog')
  else await screen.findByRole('navigation', { name: 'Sections' })
  return adapter
}

const earned = async (a: InMemoryAdapter) => (await a.load()).events.filter((e) => e.type === 'earnback.earned')

describe('Earn it back', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 4, 12, 0, 0))
  })
  afterEach(() => vi.useRealTimers())

  it('does not render when nothing was lost', async () => {
    await mount(0)
    expect(screen.queryByText('Earn it back')).not.toBeInTheDocument()
  })

  it('shows the panel with the room and subjects', async () => {
    await mount(300)
    expect(screen.getByText('Earn it back')).toBeInTheDocument()
    expect(screen.getByText('up to $3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reading/ })).toBeInTheDocument()
  })

  function solve(): number {
    const prompt = screen.getByText(/What is \d+ [+\u2212] \d+\?/).textContent as string
    const m = /(\d+) ([+\u2212]) (\d+)/.exec(prompt) as RegExpExecArray
    return m[2] === '+' ? Number(m[1]) + Number(m[3]) : Number(m[1]) - Number(m[3])
  }

  it('a correct option appends one earnback.earned of 100', async () => {
    const adapter = await mount(300)
    fireEvent.click(screen.getByRole('button', { name: /Math/ }))
    const dialog = screen.getByRole('dialog', { name: /Math/ })
    fireEvent.click(within(dialog).getByRole('button', { name: String(solve()) }))
    await waitFor(async () => expect(await earned(adapter)).toHaveLength(1))
    expect((await earned(adapter))[0]).toMatchObject({ kidId: nolan, skill: 'Math', amount: 100, date: '2026-11-04' })
    expect(await screen.findByText('+$1 earned back')).toBeInTheDocument()
  })

  it('caps the amount at the room left', async () => {
    const adapter = await mount(50)
    fireEvent.click(screen.getByRole('button', { name: /Math/ }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: String(solve()) }))
    await waitFor(async () => expect(await earned(adapter)).toHaveLength(1))
    expect((await earned(adapter))[0]).toMatchObject({ amount: 50 })
  })

  it('a wrong option keeps the modal open and disables it', async () => {
    const adapter = await mount(300)
    fireEvent.click(screen.getByRole('button', { name: /Math/ }))
    const dialog = screen.getByRole('dialog', { name: /Math/ })
    const answer = solve()
    const wrong = within(dialog).getAllByRole('button').find((b) => /^\d+$/.test(b.textContent ?? '') && Number(b.textContent) !== answer) as HTMLElement
    fireEvent.click(wrong)
    expect(screen.getByRole('dialog', { name: /Math/ })).toBeInTheDocument()
    expect(wrong).toBeDisabled()
    expect(screen.getByText('Try again')).toBeInTheDocument()
    expect(await earned(adapter)).toHaveLength(0)
  })

  it('Reading asks a grown-up and opens the PIN gate', async () => {
    const adapter = await mount(300)
    fireEvent.click(screen.getByRole('button', { name: /Reading/ }))
    expect(screen.getByText('A grown-up checks this one')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Grown-up: they read it' }))
    expect(await screen.findByRole('dialog', { name: 'Grown-up check' })).toBeInTheDocument()
    expect(await earned(adapter)).toHaveLength(0)
  })

  const optionButtons = (): HTMLElement[] =>
    within(screen.getByRole('dialog')).getAllByRole('button').filter((b) => /^\d+$/.test(b.textContent ?? ''))
  const promptText = (): string => screen.getByText(/What is \d+ [+\u2212] \d+\?/).textContent ?? ''

  it('subtitle spells out the grade', async () => {
    await mount(300)
    fireEvent.click(screen.getByRole('button', { name: /Math/ }))
    expect(screen.getByRole('dialog', { name: 'Math, 1st grade' })).toBeInTheDocument()
  })

  it('the third miss draws a new question and resets, and used ids persist', async () => {
    const adapter = await mount(300)
    fireEvent.click(screen.getByRole('button', { name: /Math/ }))
    const first = promptText()
    const usedKey = 'earnback-used:kid-nolan:2026-11-04'
    expect(JSON.parse(sessionStorage.getItem(usedKey) ?? '[]')).toHaveLength(1)
    for (let i = 0; i < 3; i++) {
      const answer = solve()
      const wrong = optionButtons().find((b) => !(b as HTMLButtonElement).disabled && Number(b.textContent) !== answer) as HTMLElement
      fireEvent.click(wrong)
    }
    expect(screen.getByText("Let's try a different one")).toBeInTheDocument()
    expect(promptText()).not.toBe(first)
    expect(optionButtons().every((b) => !(b as HTMLButtonElement).disabled)).toBe(true)
    expect(JSON.parse(sessionStorage.getItem(usedKey) ?? '[]')).toHaveLength(2)
    expect(await earned(adapter)).toHaveLength(0)
  })

  it('appends nothing when the room is already 0', async () => {
    const adapter = await mount(0, { direct: true })
    expect(screen.getByText('You earned it all back')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).queryAllByRole('button').filter((b) => /^\d+$/.test(b.textContent ?? ''))).toHaveLength(0)
    expect(await earned(adapter)).toHaveLength(0)
  })

  it('Reading after the PIN appends exactly one event even if clicked twice', async () => {
    const adapter = await mount(300, { pin: '1234' })
    fireEvent.click(screen.getByRole('button', { name: /Reading/ }))
    const btn = screen.getByRole('button', { name: 'Grown-up: they read it' })
    fireEvent.click(btn)
    fireEvent.click(btn)
    const gate = await screen.findByRole('dialog', { name: 'Grown-up check' })
    for (const d of '1234') fireEvent.click(within(gate).getByRole('button', { name: d }))
    fireEvent.click(within(gate).getByRole('button', { name: 'Enter' }))
    await waitFor(async () => expect(await earned(adapter)).toHaveLength(1))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Grown-up check' })).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Grown-up: they read it' }))
    expect(screen.queryByRole('dialog', { name: 'Grown-up check' })).not.toBeInTheDocument()
    expect(await earned(adapter)).toHaveLength(1)
    expect((await earned(adapter))[0]).toMatchObject({ skill: 'Reading', amount: 100 })
  })

  it('Ruling 25: a Reading confirm never opens a parent session', async () => {
    const adapter = new InMemoryAdapter()
    await adapter.saveFamily(makeFamily({ createdAt: '2026-11-01T00:00:00.000Z', pinSalt: 'salt', pinHash: await hashPin('1234', 'salt') }))
    await adapter.appendEvents([
      ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 300, date: '2026-11-04' }, '2026-11-04T09:00:00'),
    ])
    let actions!: Actions
    let view = ''
    function Probe() { actions = useActions(); view = useStore().view; return null }
    render(<StoreProvider adapter={adapter}><Probe /><AppShell /></StoreProvider>)
    await screen.findByRole('banner')
    fireEvent.click(screen.getByRole('button', { name: /Reading/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Grown-up: they read it' }))
    const gate = await screen.findByRole('dialog', { name: 'Grown-up check' })
    for (const d of '1234') fireEvent.click(within(gate).getByRole('button', { name: d }))
    fireEvent.click(within(gate).getByRole('button', { name: 'Enter' }))
    await waitFor(async () => expect(await earned(adapter)).toHaveLength(1))
    act(() => actions.enterParent())
    expect(view).toBe('kid')
    expect(screen.queryByRole('region', { name: 'Log a deduction' })).toBeNull()
  })
})
