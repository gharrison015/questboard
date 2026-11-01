import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../../src/state/store'
import { AppShell } from '../../src/ui/shell/AppShell'
import { InMemoryAdapter } from '../../src/storage/memory'
import { makeFamily } from '../fixtures'
import type { Family } from '../../src/engine/types'

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

  it('skips archived kids', async () => {
    const f = makeFamily()
    await mountTv({ ...f, kids: [f.kids[0], { ...f.kids[1], archived: true }] })
    tick(40_000)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nolan')
  })

  it('renders the clock as h:mm and the full date', async () => {
    const { container } = await mountTv()
    const clock = container.querySelector('.tv-clock-time')
    expect(clock?.textContent).toMatch(/^(1[0-2]|[1-9]):[0-5]\d(am|pm)$/i)
    expect(container.querySelector('.tv-date')?.textContent).toMatch(/^[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}$/)
  })

  it('lists chores still to do, capped at 6, with the count in the stats', async () => {
    const { container } = await mountTv()
    expect(screen.getByText('Still to do today')).toBeInTheDocument()
    const rows = container.querySelectorAll('.tv-todo li')
    expect(rows.length).toBe(5)
    expect(screen.getByText('Make your bed')).toBeInTheDocument()
    expect(container.querySelector('.tv-stat-left b')?.textContent).toBe('5')
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
