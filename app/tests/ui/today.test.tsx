import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider, useKid } from '../../src/state/store'
import { InMemoryAdapter } from '../../src/storage/memory'
import { KidBoard } from '../../src/ui/kid/KidBoard'
import { mathLineText } from '../../src/ui/kid/MathLine'
import { Toaster } from '../../src/ui/primitives/Toaster'
import type { WeekState } from '../../src/engine/week'
import { makeFamily, nolan, TRASH } from '../fixtures'

function ws(patch: Partial<WeekState>): WeekState {
  return {
    weekStart: '2026-11-01', days: [], start: 0, pay: 0, earnback: 0, deductions: 0, balance: 0,
    lostByDay: {}, payByDay: {}, useCents: false, closed: false, ...patch,
  }
}

describe('mathLineText', () => {
  it('keep: start minus lost', () => {
    expect(mathLineText(ws({ start: 2000, deductions: 150, balance: 1850, useCents: true }))).toBe('$20 − $1.50 = $18.50')
  })
  it('earn: zero start and pay', () => {
    expect(mathLineText(ws({ pay: 800, balance: 800 }))).toBe('$0 + $8 = $8')
  })
  it('both: start plus pay minus lost', () => {
    expect(mathLineText(ws({ start: 1000, pay: 400, deductions: 50, balance: 1350, useCents: true }))).toBe('$10 + $4 − $0.50 = $13.50')
  })
})

function Board() {
  const kid = useKid()
  return kid ? <KidBoard kid={kid} /> : null
}

async function mount() {
  const adapter = new InMemoryAdapter()
  await adapter.saveFamily(makeFamily())
  render(<StoreProvider adapter={adapter}><Board /><Toaster /></StoreProvider>)
  await screen.findByRole('navigation', { name: 'Sections' })
  return adapter
}

describe('Today tab', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 4, 12, 0, 0)) // Wednesday
  })
  afterEach(() => vi.useRealTimers())

  it('appends chore.checked then chore.unchecked for today', async () => {
    const adapter = await mount()
    const row = screen.getByRole('button', { name: /Make your bed/ })
    fireEvent.click(row)
    await waitFor(async () => expect((await adapter.load()).events.filter((e) => e.type === 'chore.checked')).toHaveLength(1))
    const checked = (await adapter.load()).events.find((e) => e.type === 'chore.checked')
    expect(checked).toMatchObject({ kidId: nolan, choreId: 'chore-bed', date: '2026-11-04' })
    expect(await screen.findByText('Nice work! Make your bed')).toBeInTheDocument()

    fireEvent.click(row)
    await waitFor(async () => expect((await adapter.load()).events.filter((e) => e.type === 'chore.unchecked')).toHaveLength(1))
  })

  it('shows the pay chip only on paid chores', async () => {
    await mount()
    expect(screen.getByRole('button', { name: /Take out trash/ })).toHaveTextContent('+$1')
    expect(screen.getByRole('button', { name: /Make your bed/ })).not.toHaveTextContent('+$')
  })

  it('does not let a kid toggle yesterday', async () => {
    const adapter = await mount()
    fireEvent.click(screen.getByRole('button', { name: /^Tue/ }))
    const row = await screen.findByRole('button', { name: /Make your bed/ })
    expect(row).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(row)
    await new Promise((r) => setTimeout(r, 20))
    expect((await adapter.load()).events.filter((e) => e.type === 'chore.checked')).toHaveLength(0)
  })

  it('renders the four tabs and switches', async () => {
    await mount()
    for (const t of ['Today', 'Week', 'Jars', 'Badges']) expect(screen.getByRole('button', { name: t })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Week' }))
    expect(screen.getByRole('list', { name: 'Days of the week' })).toBeInTheDocument()
  })

  it('celebrates a perfect day once and remembers it', async () => {
    await mount()
    for (const name of [/Make your bed/, /Put toys away/, /Clear your plate/, /Take out trash/, /Put clothes in hamper/]) {
      fireEvent.click(screen.getByRole('button', { name }))
    }
    expect(await screen.findByText('Perfect day, Nolan!')).toBeInTheDocument()
    expect(sessionStorage.getItem(`celebrated:${nolan}:2026-11-04`)).not.toBeNull()
    fireEvent.click(screen.getByRole('dialog', { name: 'Perfect day' }))
    expect(screen.queryByText('Perfect day, Nolan!')).toBeNull()
    const bed = () => screen.getByRole('button', { name: /Make your bed/ })
    fireEvent.click(bed())
    await waitFor(() => expect(bed()).toHaveAttribute('data-state', 'empty'))
    fireEvent.click(bed())
    await waitFor(() => expect(bed()).toHaveAttribute('data-state', 'done'))
    expect(screen.queryByText('Perfect day, Nolan!')).toBeNull()
  })

  it('double tap writes checked then unchecked, never two checks', async () => {
    const adapter = await mount()
    const row = screen.getByRole('button', { name: /Make your bed/ })
    fireEvent.click(row)
    fireEvent.click(row)
    await waitFor(async () => expect((await adapter.load()).events.filter((e) => e.type.startsWith('chore.')).length).toBe(2))
    const types = (await adapter.load()).events.filter((e) => e.type.startsWith('chore.')).map((e) => e.type)
    expect(types).toEqual(['chore.checked', 'chore.unchecked'])
  })

  it('shows a paid chore as pending until it is verified', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: /Take out trash/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /Take out trash/ })).toHaveAttribute('data-state', 'pending'))
    expect(document.querySelector('.kb-box[data-state="pending"]')).not.toBeNull()
  })

  it('locks a verified chore', async () => {
    const adapter = new InMemoryAdapter()
    await adapter.saveFamily(makeFamily())
    const at = new Date().toISOString()
    await adapter.appendEvents([
      { id: 'v1', at, type: 'chore.checked', kidId: nolan, choreId: TRASH, date: '2026-11-04' },
      { id: 'v2', at, type: 'chore.verified', kidId: nolan, choreId: TRASH, date: '2026-11-04' },
    ])
    render(<StoreProvider adapter={adapter}><Board /></StoreProvider>)
    const row = await screen.findByRole('button', { name: /Take out trash/ })
    expect(row).toHaveAttribute('data-state', 'verified')
    expect(row).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(row)
    await new Promise((r) => setTimeout(r, 20))
    expect((await adapter.load()).events.filter((e) => e.type === 'chore.unchecked')).toHaveLength(0)
  })
})
