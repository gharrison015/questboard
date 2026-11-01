import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider, useKid } from '../../src/state/store'
import { InMemoryAdapter } from '../../src/storage/memory'
import { KidBoard } from '../../src/ui/kid/KidBoard'
import { ParentProvider } from '../../src/ui/parent/useParent'
import { Toaster } from '../../src/ui/primitives/Toaster'
import { ev, makeFamily, nolan } from '../fixtures'

function Board() {
  const kid = useKid()
  return kid ? <KidBoard kid={kid} /> : null
}

async function mount(deduction: number) {
  const adapter = new InMemoryAdapter()
  await adapter.saveFamily(makeFamily({ createdAt: '2026-11-01T00:00:00.000Z' }))
  if (deduction > 0) {
    await adapter.appendEvents([
      ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: deduction, date: '2026-11-04' }, '2026-11-04T09:00:00'),
    ])
  }
  render(<StoreProvider adapter={adapter}><ParentProvider><Board /><Toaster /></ParentProvider></StoreProvider>)
  await screen.findByRole('navigation', { name: 'Sections' })
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
    const prompt = screen.getByText(/What is \d+ [+-] \d+\?/).textContent as string
    const m = /(\d+) ([+-]) (\d+)/.exec(prompt) as RegExpExecArray
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
    expect(await screen.findByRole('dialog', { name: 'Parent PIN' })).toBeInTheDocument()
    expect(await earned(adapter)).toHaveLength(0)
  })
})
