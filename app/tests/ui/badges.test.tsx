import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider, useKid } from '../../src/state/store'
import { InMemoryAdapter } from '../../src/storage/memory'
import { KidBoard } from '../../src/ui/kid/KidBoard'
import { Toaster } from '../../src/ui/primitives/Toaster'
import { BADGES } from '../../src/content/badges'
import { ev, makeFamily, nolan, TRASH } from '../fixtures'

function Board() {
  const kid = useKid()
  return kid ? <KidBoard kid={kid} /> : null
}

async function mount() {
  const adapter = new InMemoryAdapter()
  await adapter.saveFamily(makeFamily({ createdAt: '2026-10-01T00:00:00.000Z' }))
  await adapter.appendEvents([
    ev({ type: 'jar.allocated', kidId: nolan, jar: 'give', amount: 100 }, new Date(2026, 10, 2, 9).toISOString()),
    ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: '2026-11-02' }, new Date(2026, 10, 2, 10).toISOString()),
  ])
  render(<StoreProvider adapter={adapter}><Board /><Toaster /></StoreProvider>)
  await screen.findByRole('navigation', { name: 'Sections' })
  fireEvent.click(screen.getByRole('button', { name: /Badges/ }))
  return adapter
}

describe('Badges tab', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 4, 12, 0, 0))
  })
  afterEach(() => vi.useRealTimers())

  it('shows 2 earned badges with dates and 8 with rule text', async () => {
    await mount()
    expect(screen.getByText('2/10')).toBeInTheDocument()
    expect(screen.getAllByText(/^Earned Nov 2$/)).toHaveLength(2)
    const grid = within(screen.getByRole('region', { name: 'Badge collection' }).querySelector('ul') as HTMLElement)
    const locked = BADGES.filter((b) => b.id !== 'first-give' && b.id !== 'first-paid-chore')
    expect(locked).toHaveLength(8)
    for (const b of locked) expect(grid.getByText(b.rule)).toBeInTheDocument()
    expect(screen.getByText('Best: 0')).toBeInTheDocument()
  })

  it('lists exactly the 4 free buddies and switches to Unicorn on tap', async () => {
    const adapter = await mount()
    const picker = screen.getByRole('region', { name: 'Your buddies' })
    expect(within(picker).getAllByRole('button')).toHaveLength(4)
    expect(within(picker).getByRole('button', { name: 'Monster Truck, using' })).toBeInTheDocument()
    expect(within(picker).queryByText('Ocean Friends')).toBeNull()
    expect(within(picker).getByText('More buddies are in the parent Shop.')).toBeInTheDocument()
    fireEvent.click(within(picker).getByRole('button', { name: 'Unicorn' }))
    await waitFor(async () => expect((await adapter.load()).family?.kids[0].theme).toBe('unicorn'))
    expect(await screen.findByText('Nolan is now a Unicorn')).toBeInTheDocument()
    expect(within(picker).getByRole('button', { name: 'Unicorn, using' })).toBeInTheDocument()
  })

  it('remembers seen badges so the pop plays once', async () => {
    await mount()
    const pops = () => document.querySelectorAll('.kb-badge[data-fresh="true"]').length
    expect(pops()).toBe(2)
    await waitFor(() => expect(JSON.parse(localStorage.getItem('badges-seen:kid-nolan') ?? '[]')).toHaveLength(2))
  })
})
