import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider, useKid } from '../../src/state/store'
import { InMemoryAdapter } from '../../src/storage/memory'
import { AppShell } from '../../src/ui/shell/AppShell'
import { DayDetail } from '../../src/ui/kid/DayDetail'
import { WeekTab } from '../../src/ui/kid/WeekTab'
import { Toaster } from '../../src/ui/primitives/Toaster'
import type { Routine } from '../../src/engine/types'
import { ev, makeFamily, nolan } from '../fixtures'

const ROUTINE: Routine = {
  id: 'rt-morning', name: 'Morning', days: [0, 1, 2, 3, 4, 5, 6],
  steps: [{ id: 's1', label: 'Brush teeth' }, { id: 's2', label: 'Get dressed' }],
}

async function adapterWith(extra: boolean) {
  const adapter = new InMemoryAdapter()
  const family = makeFamily()
  if (extra) {
    family.routines = [ROUTINE]
    family.kids[0].routineIds = [ROUTINE.id]
  }
  await adapter.saveFamily(family)
  await adapter.appendEvents([
    ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 50, date: '2026-11-04' }, '2026-11-04T10:00:00'),
    ev({ type: 'routine.step', kidId: nolan, routineId: ROUTINE.id, stepId: 's1', date: '2026-11-04', done: true }, '2026-11-04T11:00:00'),
  ])
  return adapter
}

function Probe({ children }: { children: (kid: NonNullable<ReturnType<typeof useKid>>) => React.ReactNode }) {
  const kid = useKid()
  return kid ? <>{children(kid)}</> : null
}

describe('Week tab and day detail', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 4, 12, 0, 0)) // Wednesday
  })
  afterEach(() => vi.useRealTimers())

  it('DayDetail for Wednesday shows the reason and amount', async () => {
    const adapter = await adapterWith(true)
    render(
      <StoreProvider adapter={adapter}>
        <Probe>{(kid) => <DayDetail kid={kid} date="2026-11-04" onClose={() => {}} />}</Probe>
      </StoreProvider>,
    )
    const dialog = await screen.findByRole('dialog', { name: 'Wednesday' })
    const list = within(dialog).getByRole('list', { name: 'Deductions' })
    expect(list).toHaveTextContent('Yelling, -$0.50')
    expect(dialog).toHaveTextContent('-$0.50 lost')
    expect(dialog).toHaveTextContent('Brush teeth')
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('DayDetail says nothing lost on a clean day and coming up for the future', async () => {
    const adapter = await adapterWith(false)
    const { rerender } = render(
      <StoreProvider adapter={adapter}>
        <Probe>{(kid) => <DayDetail kid={kid} date="2026-11-03" onClose={() => {}} />}</Probe>
      </StoreProvider>,
    )
    expect(await screen.findByText('Nothing lost today')).toBeInTheDocument()
    rerender(
      <StoreProvider adapter={adapter}>
        <Probe>{(kid) => <DayDetail kid={kid} date="2026-11-06" onClose={() => {}} />}</Probe>
      </StoreProvider>,
    )
    expect(await screen.findByText('Coming up')).toBeInTheDocument()
  })

  it('WeekTab renders seven day labels from the week start and opens detail from a header', async () => {
    const adapter = await adapterWith(true)
    render(
      <StoreProvider adapter={adapter}>
        <Probe>{(kid) => <WeekTab kid={kid} />}</Probe>
        <Toaster />
      </StoreProvider>,
    )
    await screen.findByRole('list', { name: 'Days of the week' })
    const heads = screen.getAllByRole('button', { name: /^Open \w+day|^Open (Sun|Mon|Tue|Wed|Thu|Fri|Sat)/ })
    expect(heads.map((h) => h.querySelector('.kb-wk-name')?.textContent)).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
    expect(screen.getByText('Routines 1/2', { selector: '[data-date="2026-11-04"] *' })).toBeInTheDocument()

    fireEvent.click(heads[3])
    expect(await screen.findByRole('dialog', { name: 'Wednesday' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('past days are read-only and today is interactive', async () => {
    const adapter = await adapterWith(false)
    render(
      <StoreProvider adapter={adapter}>
        <Probe>{(kid) => <WeekTab kid={kid} />}</Probe>
        <Toaster />
      </StoreProvider>,
    )
    await screen.findByRole('list', { name: 'Days of the week' })
    const tue = document.querySelector('[data-date="2026-11-03"]') as HTMLElement
    const wed = document.querySelector('[data-date="2026-11-04"]') as HTMLElement
    expect(within(tue).getByRole('button', { name: /Make your bed/ })).toHaveAttribute('aria-disabled', 'true')
    const row = within(wed).getByRole('button', { name: /Make your bed/ })
    expect(row).not.toHaveAttribute('aria-disabled')
    fireEvent.click(row)
    await waitFor(async () => expect((await adapter.load()).events.filter((e) => e.type === 'chore.checked')).toHaveLength(1))
  })

  it('a swipe inside the day scroller does not change the kid', async () => {
    const adapter = await adapterWith(false)
    render(<StoreProvider adapter={adapter}><AppShell /></StoreProvider>)
    await screen.findByRole('navigation', { name: 'Sections' })
    fireEvent.click(screen.getByRole('button', { name: /^Week/ }))
    const scroller = await screen.findByRole('list', { name: 'Days of the week' })
    const header = screen.getByRole('banner')
    expect(header).toHaveTextContent('Nolan')

    fireEvent.touchStart(scroller, { touches: [{ clientX: 300, clientY: 300 }] })
    fireEvent.touchEnd(scroller, { changedTouches: [{ clientX: 150, clientY: 304 }] })
    expect(header).toHaveTextContent('Nolan')

    // Control: the same swipe on the main area still changes the kid.
    const main = screen.getByRole('main')
    fireEvent.touchStart(main, { touches: [{ clientX: 300, clientY: 300 }] })
    fireEvent.touchEnd(main, { changedTouches: [{ clientX: 150, clientY: 304 }] })
    await waitFor(() => expect(header).toHaveTextContent('Makenna'))
  })
})
