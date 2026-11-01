import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../../src/state/store'
import { AppShell } from '../../src/ui/shell/AppShell'
import { InMemoryAdapter } from '../../src/storage/memory'
import { ev, makeFamily, makenna, nolan, TRASH } from '../fixtures'
import { dateKey } from '../../src/engine/dates'
import type { Chore, Family } from '../../src/engine/types'

async function mountTv(family: Family | null = makeFamily()) {
  window.location.hash = '#tv'
  const adapter = new InMemoryAdapter()
  if (family) await adapter.saveFamily(family)
  const view = render(
    <StoreProvider adapter={adapter}>
      <AppShell />
    </StoreProvider>,
  )
  if (family) await screen.findByRole('heading', { level: 1 })
  return view
}

const tick = (ms: number): void => {
  act(() => { vi.advanceTimersByTime(ms) })
}

describe('tv board', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  })
  afterEach(() => {
    vi.useRealTimers()
    window.location.hash = ''
  })

  it('rotates to the next kid every 20 seconds and wraps around', async () => {
    await mountTv()
    const name = (): string | null => screen.getByRole('heading', { level: 1 }).textContent
    expect(name()).toBe('Nolan')
    expect(document.documentElement.dataset.buddy).toBe('truck')
    tick(19_000)
    expect(name()).toBe('Nolan')
    tick(1_000)
    expect(name()).toBe('Makenna')
    expect(document.documentElement.dataset.buddy).toBe('unicorn')
    tick(20_000)
    expect(name()).toBe('Nolan')
    expect(document.documentElement.dataset.buddy).toBe('truck')
  })

  it('shows one dot per kid with the current one marked', async () => {
    const { container } = await mountTv()
    const dots = container.querySelectorAll('.tv-dot')
    expect(dots).toHaveLength(2)
    expect(dots[0]).toHaveAttribute('data-current', 'true')
    tick(20_000)
    expect(container.querySelectorAll('.tv-dot')[1]).toHaveAttribute('data-current', 'true')
  })

  it('does not rotate with only one kid', async () => {
    const f = makeFamily()
    await mountTv({ ...f, kids: [f.kids[0]] })
    tick(100_000)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nolan')
    expect(document.documentElement.dataset.buddy).toBe('truck')
  })

  it('skips archived kids: A then C', async () => {
    const f = makeFamily()
    const [a, b] = f.kids
    const c = { ...b, id: 'kid-c', name: 'Cora', order: 2 }
    await mountTv({ ...f, kids: [a, { ...b, archived: true, order: 1 }, c] })
    const name = (): string | null => screen.getByRole('heading', { level: 1 }).textContent
    expect(name()).toBe('Nolan')
    tick(20_000)
    expect(name()).toBe('Cora')
    tick(20_000)
    expect(name()).toBe('Nolan')
  })

  it('renders the clock as h:mm and the full date', async () => {
    const { container } = await mountTv()
    const clock = container.querySelector('.tv-clock-time')
    expect(clock?.textContent).toMatch(/^(1[0-2]|[1-9]):[0-5]\d(am|pm)$/i)
    expect(container.querySelector('.tv-date')?.textContent).toMatch(/^[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}$/)
  })

  it('lists chores still to do, capped at 6, with the full count in the stats', async () => {
    const f = makeFamily()
    const extra = (id: string): Chore => ({ id, label: `Extra ${id}`, icon: 'star', days: [0, 1, 2, 3, 4, 5, 6], pay: 0, active: true })
    const kids = [{ ...f.kids[0], chores: [...f.kids[0].chores, extra('x1'), extra('x2')] }, f.kids[1]]
    const { container } = await mountTv({ ...f, kids })
    expect(screen.getByText('Still to do today')).toBeInTheDocument()
    expect(container.querySelectorAll('.tv-chores li')).toHaveLength(6)
    expect(screen.getByText('and 1 more')).toBeInTheDocument()
    expect(container.querySelector('.tv-stat-left b')?.textContent).toBe('7')
  })

  it('counts a checked chore waiting for a check as done, and a rejected one as still to do', async () => {
    const today = dateKey(new Date())
    const at = new Date().toISOString()
    const checked = ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: today }, at)
    const adapter = new InMemoryAdapter()
    await adapter.saveFamily(makeFamily())
    await adapter.appendEvents([checked])
    window.location.hash = '#tv'
    const { container } = render(<StoreProvider adapter={adapter}><AppShell /></StoreProvider>)
    await screen.findByRole('heading', { level: 1 })
    expect(container.querySelector('.tv-stat-left b')?.textContent).toBe('4')
    expect(screen.queryByText('Take out trash')).toBeNull()
    cleanup()

    const rej = ev({ type: 'chore.rejected', kidId: nolan, choreId: TRASH, date: today }, new Date(Date.now() + 1000).toISOString())
    await adapter.appendEvents([rej])
    const again = render(<StoreProvider adapter={adapter}><AppShell /></StoreProvider>)
    await screen.findByRole('heading', { level: 1 })
    expect(again.container.querySelector('.tv-stat-left b')?.textContent).toBe('5')
    expect(screen.getByText('Take out trash')).toBeInTheDocument()
  })

  it('shows what was really given: one donation plus one gift', async () => {
    const at = new Date().toISOString()
    const adapter = new InMemoryAdapter()
    await adapter.saveFamily(makeFamily())
    await adapter.appendEvents([
      ev({ type: 'jar.allocated', kidId: nolan, jar: 'give', amount: 1000 }, at),
      ev({ type: 'jar.donated', kidId: nolan, amount: 300, to: 'Food bank' }, at),
      ev({ type: 'jar.gifted', fromKidId: nolan, toKidId: makenna, amount: 200 }, at),
      ev({ type: 'jar.gifted', fromKidId: makenna, toKidId: nolan, amount: 999 }, at),
    ])
    window.location.hash = '#tv'
    const { container } = render(<StoreProvider adapter={adapter}><AppShell /></StoreProvider>)
    await screen.findByRole('heading', { level: 1 })
    expect(container.querySelector('.tv-stat-give b')?.textContent).toBe('$5')
  })

  it('stops rotating on unmount and leaves no timers behind', async () => {
    const { unmount } = await mountTv()
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    tick(60_000)
  })

  it('is read-only: no buttons and no links', async () => {
    const { container } = await mountTv()
    expect(container.querySelectorAll('button')).toHaveLength(0)
    expect(container.querySelectorAll('a')).toHaveLength(0)
    expect(document.querySelectorAll('button, a')).toHaveLength(0)
  })

  it('says all done when a kid has nothing left', async () => {
    const f = makeFamily()
    await mountTv({ ...f, kids: [{ ...f.kids[1] }, f.kids[0]] .map((k, i) => ({ ...k, order: i })) })
    expect(screen.getByText('All done for today')).toBeInTheDocument()
  })

  it('shows the streak line', async () => {
    await mountTv()
    expect(screen.getByText(/Streak: \d+ days?/)).toBeInTheDocument()
  })
})
