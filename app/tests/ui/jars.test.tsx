import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider, useKid } from '../../src/state/store'
import { InMemoryAdapter } from '../../src/storage/memory'
import { KidBoard } from '../../src/ui/kid/KidBoard'
import { Toaster } from '../../src/ui/primitives/Toaster'
import type { QBEvent } from '../../src/engine/types'
import { ev, makeFamily, makenna, nolan } from '../fixtures'

function Board() {
  const kid = useKid()
  return kid ? <KidBoard kid={kid} /> : null
}

async function mount(balance: number, withCharity = false) {
  const adapter = new InMemoryAdapter()
  const family = makeFamily({ createdAt: '2026-11-01T00:00:00.000Z' })
  if (withCharity) family.kids[0].charity = { name: 'Animal Rescue' }
  await adapter.saveFamily(family)
  const closed: QBEvent[] = balance > 0
    ? [ev({ type: 'week.closed', kidId: nolan, weekStart: '2026-10-25', balance }, '2026-11-01T00:00:00.000Z')]
    : []
  await adapter.appendEvents(closed)
  render(<StoreProvider adapter={adapter}><Board /><Toaster /></StoreProvider>)
  await screen.findByRole('navigation', { name: 'Sections' })
  fireEvent.click(screen.getByRole('button', { name: /Jars/ }))
  return adapter
}

const card = (name: string) => screen.getByRole('group', { name })
const events = async (a: InMemoryAdapter) => (await a.load()).events

describe('Jars tab', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 4, 12, 0, 0)) // Wednesday
  })
  afterEach(() => vi.useRealTimers())

  it('+$1 on Save appends jar.allocated', async () => {
    const adapter = await mount(1200)
    expect(screen.getByText('$12 left')).toBeInTheDocument()
    fireEvent.click(within(card('Save')).getByRole('button', { name: '+$1' }))
    await waitFor(async () => expect((await events(adapter)).filter((e) => e.type === 'jar.allocated')).toHaveLength(1))
    expect((await events(adapter)).find((e) => e.type === 'jar.allocated')).toMatchObject({ kidId: nolan, jar: 'save', amount: 100 })
    expect(await screen.findByText('Saved $1')).toBeInTheDocument()
    expect(screen.getByText('$11 left')).toBeInTheDocument()
  })

  it('All on Give appends the remaining 1100 after a Save tap', async () => {
    const adapter = await mount(1200)
    fireEvent.click(within(card('Save')).getByRole('button', { name: '+$1' }))
    fireEvent.click(within(card('Give')).getByRole('button', { name: 'All' }))
    await waitFor(async () => expect((await events(adapter)).filter((e) => e.type === 'jar.allocated')).toHaveLength(2))
    expect((await events(adapter)).filter((e) => e.type === 'jar.allocated')[1]).toMatchObject({ jar: 'give', amount: 1100 })
  })

  it('fast double taps cannot over-allocate', async () => {
    const adapter = await mount(100)
    const all = within(card('Save')).getByRole('button', { name: 'All' })
    fireEvent.click(all)
    fireEvent.click(all)
    await waitFor(async () => expect((await events(adapter)).filter((e) => e.type === 'jar.allocated').length).toBeGreaterThan(0))
    expect((await events(adapter)).filter((e) => e.type === 'jar.allocated')).toHaveLength(1)
  })

  it('buttons are disabled with nothing to split', async () => {
    const adapter = await mount(0)
    expect(screen.getByText(/No coins to split yet\. Payday is Sunday\./)).toBeInTheDocument()
    for (const name of ['Save', 'Spend', 'Give']) {
      for (const b of within(card(name)).getAllByRole('button', { name: /^(\+|All)/ })) {
        expect(b).toHaveAttribute('aria-disabled', 'true')
        fireEvent.click(b)
      }
    }
    expect((await events(adapter)).filter((e) => e.type === 'jar.allocated')).toHaveLength(0)
  })

  it('cents kids see +25¢ and +$1.25', async () => {
    await mount(1225)
    const save = within(card('Save'))
    expect(save.getByRole('button', { name: '+25¢' })).toBeInTheDocument()
    expect(save.getByRole('button', { name: '+$1.25' })).toBeInTheDocument()
  })

  it('a sibling target on Give appends jar.gifted', async () => {
    const adapter = await mount(1200, true)
    const give = within(card('Give'))
    expect(give.getByRole('radio', { name: 'Animal Rescue' })).toBeChecked()
    fireEvent.click(give.getByRole('radio', { name: 'Makenna' }))
    fireEvent.click(give.getByRole('button', { name: '+$1' }))
    await waitFor(async () => expect((await events(adapter)).some((e) => e.type === 'jar.gifted')).toBe(true))
    expect((await events(adapter)).find((e) => e.type === 'jar.gifted')).toMatchObject({ fromKidId: nolan, toKidId: makenna, amount: 100 })
    expect(await screen.findByText('Giving $1 to Makenna')).toBeInTheDocument()
  })

  it('the charity target allocates to the give jar', async () => {
    const adapter = await mount(1200, true)
    fireEvent.click(within(card('Give')).getByRole('button', { name: '+$1' }))
    await waitFor(async () => expect((await events(adapter)).some((e) => e.type === 'jar.allocated')).toBe(true))
    expect((await events(adapter)).find((e) => e.type === 'jar.allocated')).toMatchObject({ jar: 'give', amount: 100 })
    expect(await screen.findByText('Giving $1 to Animal Rescue')).toBeInTheDocument()
  })
})
