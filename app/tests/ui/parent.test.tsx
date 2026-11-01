import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider, useActions, type Actions } from '../../src/state/store'
import { AppShell } from '../../src/ui/shell/AppShell'
import { InMemoryAdapter } from '../../src/storage/memory'
import { hashPin } from '../../src/security/pin'
import { eventLabel } from '../../src/ui/parent/eventLabels'
import { ev, makeFamily, makenna, nolan, TRASH } from '../fixtures'
import type { Family, QBEvent } from '../../src/engine/types'

const NOW = new Date(2026, 10, 4, 12, 0, 0) // Wednesday 2026-11-04, week starts Sunday 11-01
const AT = NOW.toISOString()

async function mount(opts: { family?: Partial<Family>; events?: QBEvent[]; unlock?: boolean } = {}) {
  const adapter = new InMemoryAdapter()
  const salt = 'salt'
  await adapter.saveFamily(makeFamily({
    createdAt: '2026-11-01T00:00:00.000Z', pinSalt: salt, pinHash: await hashPin('1234', salt), ...opts.family,
  }))
  if (opts.events) await adapter.appendEvents(opts.events)
  let actions!: Actions
  function Probe() { actions = useActions(); return null }
  render(<StoreProvider adapter={adapter}><Probe /><AppShell /></StoreProvider>)
  await screen.findByRole('banner')
  if (opts.unlock !== false) await unlock()
  return { adapter, actions: () => actions }
}

async function unlock() {
  fireEvent.click(screen.getByRole('button', { name: 'Parent view' }))
  await screen.findByRole('dialog')
  for (const d of '1234') fireEvent.click(screen.getByRole('button', { name: d }))
  fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
  await screen.findByRole('region', { name: 'Log a deduction' })
}

const stored = async (a: InMemoryAdapter) => (await a.load()).events

describe('parent view', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('shows the gate first, then DeductPanel after the right PIN', async () => {
    await mount({ unlock: false })
    expect(screen.queryByRole('region', { name: 'Log a deduction' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Parent view' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    for (const d of '1234') fireEvent.click(screen.getByRole('button', { name: d }))
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByRole('region', { name: 'Log a deduction' })).toBeInTheDocument()
  })

  it('logs a deduction at the preset amount and lists it with an Undo that appends undo', async () => {
    const { adapter } = await mount()
    fireEvent.click(screen.getByRole('button', { name: /Yelling/ }))
    await waitFor(async () => expect((await stored(adapter)).some((e) => e.type === 'deduction.logged')).toBe(true))
    const logged = (await stored(adapter)).find((e) => e.type === 'deduction.logged')
    expect(logged).toMatchObject({ kidId: nolan, reasonId: 'r-yelling', amount: 50, date: '2026-11-04' })

    const list = await screen.findByRole('list', { name: 'Activity' })
    expect(within(list).getByText('Lost $0.50, Yelling')).toBeInTheDocument()
    fireEvent.click(within(list).getByRole('button', { name: 'Undo Lost $0.50, Yelling' }))
    await waitFor(async () => expect((await stored(adapter)).filter((e) => e.type === 'undo')).toHaveLength(1))
    expect((await stored(adapter)).find((e) => e.type === 'undo')).toMatchObject({ targetEventId: logged!.id })
    // Struck through with Redo.
    expect(await within(list).findByRole('button', { name: 'Redo Lost $0.50, Yelling' })).toBeInTheDocument()
  })

  it('offers an undo from the toast', async () => {
    const { adapter } = await mount()
    const before = screen.queryAllByRole('button', { name: 'Undo' }).length
    fireEvent.click(screen.getByRole('button', { name: /Yelling/ }))
    await waitFor(() => expect(screen.queryAllByRole('button', { name: 'Undo' }).length).toBeGreaterThan(before))
    // Toasts are a module-level queue, so earlier tests may leave one behind; the newest is last.
    const undos = await screen.findAllByRole('button', { name: 'Undo' })
    fireEvent.click(undos[undos.length - 1])
    await waitFor(async () => expect((await stored(adapter)).some((e) => e.type === 'undo')).toBe(true))
  })

  it('Verify all appends one chore.verified per unverified row', async () => {
    const { adapter } = await mount({
      family: { verification: 'parent-approve' },
      events: [
        ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: '2026-11-04' }, AT),
        ev({ type: 'chore.checked', kidId: nolan, choreId: 'chore-bed', date: '2026-11-04' }, AT),
        ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: '2026-11-03' }, AT),
      ],
    })
    // Only paid chores need verifying, so the unpaid bed chore is not listed.
    const section = screen.getByRole('region', { name: 'Verify' })
    const rows = within(section).getAllByRole('listitem')
    fireEvent.click(within(section).getByRole('button', { name: 'Verify all' }))
    await waitFor(async () =>
      expect((await stored(adapter)).filter((e) => e.type === 'chore.verified')).toHaveLength(rows.length))
    expect(rows).toHaveLength(2)
  })

  it('hides Verify when nothing is waiting', async () => {
    await mount()
    expect(screen.queryByRole('region', { name: 'Verify' })).toBeNull()
  })

  it('buying a theme grants theme:ocean', async () => {
    const { adapter } = await mount()
    expect(screen.getByText('Preview pricing. Nothing is charged yet.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Buy Ocean Friends' }))
    await waitFor(async () =>
      expect((await adapter.load()).family?.entitlements.map((e) => e.key)).toContain('theme:ocean'))
    expect(await screen.findByText('Ocean Friends unlocked')).toBeInTheDocument()
  })

  it('buying a pack and Pro grant their keys', async () => {
    const { adapter } = await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Buy Party pack' }))
    fireEvent.click(screen.getByRole('button', { name: 'Buy Family Pro' }))
    await waitFor(async () => {
      const keys = (await adapter.load()).family?.entitlements.map((e) => e.key) ?? []
      expect(keys).toEqual(expect.arrayContaining(['pack:party', 'pro']))
    })
  })

  it('Shop art box has a fixed height class and object-fit contain, with the name below', async () => {
    await mount()
    const tile = screen.getByText('Ocean Friends').closest('.pr-tile') as HTMLElement
    const box = tile.querySelector('.pr-artbox') as HTMLElement
    const img = box.querySelector('img') as HTMLImageElement
    expect(img).toHaveClass('pr-art')
    expect(img.style.objectFit).toBe('contain')
    expect(box.nextElementSibling).toHaveTextContent('Ocean Friends')
  })

  it('undo of a grouped gift appends two undo events in one call, and Redo undoes the undos', async () => {
    const gid = 'g1'
    const { adapter } = await mount({
      events: [
        ev({ type: 'week.closed', kidId: nolan, weekStart: '2026-10-25', balance: 1200 }, AT),
        { ...ev({ type: 'jar.allocated', kidId: nolan, jar: 'give', amount: 200 }, AT), groupId: gid },
        { ...ev({ type: 'jar.gifted', fromKidId: nolan, toKidId: makenna, amount: 200 }, AT), groupId: gid },
      ],
    })
    const list = screen.getByRole('list', { name: 'Activity' })
    expect(within(list).getAllByText('Gave $2 to Makenna')).toHaveLength(1)
    const spy = vi.spyOn(adapter, 'appendEvents')
    fireEvent.click(within(list).getByRole('button', { name: 'Undo Gave $2 to Makenna' }))
    await waitFor(async () => expect((await stored(adapter)).filter((e) => e.type === 'undo')).toHaveLength(2))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toHaveLength(2)

    fireEvent.click(await within(list).findByRole('button', { name: 'Redo Gave $2 to Makenna' }))
    await waitFor(async () => expect((await stored(adapter)).filter((e) => e.type === 'undo')).toHaveLength(4))
    const all = await stored(adapter)
    const undos = all.filter((e) => e.type === 'undo')
    const firstUndoIds = undos.slice(0, 2).map((e) => e.id)
    expect(undos.slice(2).map((e) => e.type === 'undo' && e.targetEventId).sort()).toEqual([...firstUndoIds].sort())
    expect(await within(list).findByRole('button', { name: 'Undo Gave $2 to Makenna' })).toBeInTheDocument()
  })

  it('Close week now confirms, then appends week.closed with the current balance', async () => {
    const { adapter } = await mount({
      events: [ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 50, date: '2026-11-04' }, AT)],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Close week now' }))
    expect(await screen.findByText('Close this week now? Payday happens early.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close week' }))
    await waitFor(async () => expect((await stored(adapter)).some((e) => e.type === 'week.closed' && e.weekStart === '2026-11-01')).toBe(true))
    const close = (await stored(adapter)).find((e) => e.type === 'week.closed' && e.weekStart === '2026-11-01')
    expect(close).toMatchObject({ kidId: nolan, balance: 950 })
  })

  it('payout links use the handle and record jar.paidOut; missing handles show a prompt', async () => {
    const { adapter } = await mount({
      family: { payHandles: { paypal: 'harrisonfamily' } },
      events: [
        ev({ type: 'week.closed', kidId: nolan, weekStart: '2026-10-25', balance: 1200 }, AT),
        ev({ type: 'jar.allocated', kidId: nolan, jar: 'spend', amount: 500 }, AT),
      ],
    })
    const group = screen.getByRole('group', { name: 'Pay out Spend' })
    const link = within(group).getByRole('link', { name: 'PayPal' })
    expect(link).toHaveAttribute('href', 'https://paypal.me/harrisonfamily/5')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(group).getByText('Add your Cash App handle in Settings')).toBeInTheDocument()
    expect(within(group).getByText('Add your Venmo handle in Settings')).toBeInTheDocument()
    link.addEventListener('click', (e) => e.preventDefault())
    fireEvent.click(link)
    await waitFor(async () => expect((await stored(adapter)).some((e) => e.type === 'jar.paidOut')).toBe(true))
    expect((await stored(adapter)).find((e) => e.type === 'jar.paidOut')).toMatchObject({ kidId: nolan, jar: 'spend', amount: 500, via: 'paypal' })
  })

  it('Donate opens the charity url and records jar.donated; without a url it only records', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const events = [
      ev({ type: 'week.closed', kidId: nolan, weekStart: '2026-10-25', balance: 1200 }, AT),
      ev({ type: 'jar.allocated', kidId: nolan, jar: 'give', amount: 300 }, AT),
    ]
    const family = makeFamily()
    family.kids[0].charity = { name: 'Animal Rescue', url: 'https://example.org/give' }
    const { adapter } = await mount({ family: { kids: family.kids }, events })
    fireEvent.click(screen.getByRole('button', { name: 'Donate to Animal Rescue' }))
    await waitFor(async () => expect((await stored(adapter)).some((e) => e.type === 'jar.donated')).toBe(true))
    expect(open).toHaveBeenCalledWith('https://example.org/give', '_blank', 'noopener,noreferrer')
    expect((await stored(adapter)).find((e) => e.type === 'jar.donated')).toMatchObject({ amount: 300, to: 'Animal Rescue' })
    open.mockRestore()
  })

  it('shows the missed approvals note once and remembers a dismissal', async () => {
    await mount({
      family: { verification: 'parent-approve' },
      events: [ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: '2026-10-28' }, AT)],
    })
    expect(screen.getByText('1 approval missed last week')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss note' }))
    expect(screen.queryByText('1 approval missed last week')).toBeNull()
    expect(localStorage.getItem(`missed-note:${nolan}:2026-11-01`)).toBe('1')
  })

  it('Lock returns to the kid board', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Lock' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Log a deduction' })).toBeNull())
  })

  it('Settings shows the placeholder', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByText('Settings coming in Task 15')).toBeInTheDocument()
  })
})

describe('parent view fixes', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  const spendEvents = (spend: number): QBEvent[] => [
    ev({ type: 'week.closed', kidId: nolan, weekStart: '2026-10-25', balance: 5000 }, AT),
    ev({ type: 'jar.allocated', kidId: nolan, jar: 'spend', amount: spend }, AT),
  ]

  it('builds all three payout URLs with a cents amount and an encoded handle', async () => {
    await mount({
      family: { payHandles: { paypal: 'a/b?c', cashapp: 'cash', venmo: 'ven' } },
      events: spendEvents(1250),
    })
    const group = screen.getByRole('group', { name: 'Pay out Spend' })
    expect(within(group).getByRole('link', { name: 'PayPal' })).toHaveAttribute('href', 'https://paypal.me/a%2Fb%3Fc/12.50')
    expect(within(group).getByRole('link', { name: 'Cash App' })).toHaveAttribute('href', 'https://cash.app/$cash/12.50')
    expect(within(group).getByRole('link', { name: 'Venmo' })).toHaveAttribute('href', 'https://venmo.com/ven?txn=pay&amount=12.50')
  })

  it('a double click on a payout link records one jar.paidOut', async () => {
    const { adapter } = await mount({ family: { payHandles: { paypal: 'fam' } }, events: spendEvents(500) })
    const link = within(screen.getByRole('group', { name: 'Pay out Spend' })).getByRole('link', { name: 'PayPal' })
    link.addEventListener('click', (e) => e.preventDefault())
    fireEvent.click(link)
    fireEvent.click(link)
    await waitFor(async () => expect((await stored(adapter)).some((e) => e.type === 'jar.paidOut')).toBe(true))
    await new Promise((r) => setTimeout(r, 30))
    expect((await stored(adapter)).filter((e) => e.type === 'jar.paidOut')).toHaveLength(1)
  })

  it('a double click on Donate records one jar.donated', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const family = makeFamily()
    family.kids[0].charity = { name: 'Animal Rescue', url: 'https://example.org/give' }
    const { adapter } = await mount({
      family: { kids: family.kids },
      events: [
        ev({ type: 'week.closed', kidId: nolan, weekStart: '2026-10-25', balance: 1200 }, AT),
        ev({ type: 'jar.allocated', kidId: nolan, jar: 'give', amount: 300 }, AT),
      ],
    })
    const btn = screen.getByRole('button', { name: 'Donate to Animal Rescue' })
    fireEvent.click(btn)
    fireEvent.click(btn)
    await waitFor(async () => expect((await stored(adapter)).some((e) => e.type === 'jar.donated')).toBe(true))
    await new Promise((r) => setTimeout(r, 30))
    expect((await stored(adapter)).filter((e) => e.type === 'jar.donated')).toHaveLength(1)
    expect(open).toHaveBeenCalledTimes(1)
    open.mockRestore()
  })

  it('Close week now fires once and then disables', async () => {
    const { adapter } = await mount()
    const spy = vi.spyOn(adapter, 'appendEvents')
    fireEvent.click(screen.getByRole('button', { name: 'Close week now' }))
    const confirm = await screen.findByRole('button', { name: 'Close week' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    const done = await screen.findByRole('button', { name: 'Week already closed' })
    expect(done).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(done)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(spy).toHaveBeenCalledTimes(1)
    expect((await stored(adapter)).filter((e) => e.type === 'week.closed' && e.weekStart === '2026-11-01')).toHaveLength(1)
  })

  it('a double tap on Verify records one chore.verified', async () => {
    const { adapter } = await mount({
      family: { verification: 'parent-approve' },
      events: [ev({ type: 'chore.checked', kidId: nolan, choreId: TRASH, date: '2026-11-04' }, AT)],
    })
    const btn = screen.getByRole('button', { name: 'Verify Take out trash' })
    fireEvent.click(btn)
    fireEvent.click(btn)
    await waitFor(async () => expect((await stored(adapter)).some((e) => e.type === 'chore.verified')).toBe(true))
    await new Promise((r) => setTimeout(r, 30))
    expect((await stored(adapter)).filter((e) => e.type === 'chore.verified')).toHaveLength(1)
  })

  it('undoing a week close confirms first when nothing moved after it', async () => {
    const { adapter } = await mount({
      events: [ev({ type: 'week.closed', kidId: nolan, weekStart: '2026-11-01', balance: 1200 }, AT)],
    })
    const list = screen.getByRole('list', { name: 'Activity' })
    fireEvent.click(within(list).getByRole('button', { name: 'Undo Payday: $12 to split' }))
    expect(await screen.findByText('Reopen this week? The payday coins go back.')).toBeInTheDocument()
    expect((await stored(adapter)).some((e) => e.type === 'undo')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Reopen week' }))
    await waitFor(async () => expect((await stored(adapter)).filter((e) => e.type === 'undo')).toHaveLength(1))
  })

  it('hides Undo on a week close once money moved after it', async () => {
    await mount({
      events: [
        ev({ type: 'week.closed', kidId: nolan, weekStart: '2026-11-01', balance: 1200 }, AT),
        ev({ type: 'jar.allocated', kidId: nolan, jar: 'save', amount: 100 }, new Date(NOW.getTime() + 60000).toISOString()),
      ],
    })
    const list = screen.getByRole('list', { name: 'Activity' })
    expect(within(list).queryByRole('button', { name: 'Undo Payday: $12 to split' })).toBeNull()
    expect(within(list).getByText('Closed')).toBeInTheDocument()
    expect(within(list).getByRole('button', { name: 'Undo Saved $1' })).toBeInTheDocument()
  })

  it('the toast Undo does nothing after Lock and says to unlock', async () => {
    const { adapter } = await mount()
    const before = screen.queryAllByRole('button', { name: 'Undo' }).length
    fireEvent.click(screen.getByRole('button', { name: /Yelling/ }))
    await waitFor(() => expect(screen.queryAllByRole('button', { name: 'Undo' }).length).toBeGreaterThan(before))
    fireEvent.click(screen.getByRole('button', { name: 'Lock' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Log a deduction' })).toBeNull())
    const undos = screen.getAllByRole('button', { name: 'Undo' })
    fireEvent.click(undos[undos.length - 1])
    expect(await screen.findAllByText('Unlock to undo')).not.toHaveLength(0)
    expect((await stored(adapter)).some((e) => e.type === 'undo')).toBe(false)
  })

  it('leaves the parent view when the five minute session lapses', async () => {
    await mount()
    expect(screen.getByRole('region', { name: 'Log a deduction' })).toBeInTheDocument()
    // The shell's minute tick (and a return to the tab) refreshes `now`; the effect then calls lockParent.
    vi.setSystemTime(new Date(NOW.getTime() + 5 * 60_000 + 60_000))
    fireEvent(document, new Event('visibilitychange'))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Log a deduction' })).toBeNull())
  })
})

describe('eventLabel', () => {
  it('writes plain labels', () => {
    const f = makeFamily()
    const kid = f.kids[0]
    const t = '2026-11-04'
    expect(eventLabel(ev({ type: 'chore.checked', kidId: nolan, choreId: 'chore-bed', date: t }, AT), f, kid, t)).toBe('Checked Make your bed')
    expect(eventLabel(ev({ type: 'deduction.logged', kidId: nolan, reasonId: 'r-yelling', amount: 50, date: t }, AT), f, kid, t)).toBe('Lost $0.50, Yelling')
    expect(eventLabel(ev({ type: 'earnback.earned', kidId: nolan, skill: 'math', amount: 100, date: t }, AT), f, kid, t)).toBe('Earned back $1, Math')
    expect(eventLabel(ev({ type: 'week.closed', kidId: nolan, weekStart: '2026-11-01', balance: 1200 }, AT), f, kid, t)).toBe('Payday: $12 to split')
    expect(eventLabel(ev({ type: 'jar.allocated', kidId: nolan, jar: 'save', amount: 500 }, AT), f, kid, t)).toBe('Saved $5')
    expect(eventLabel(ev({ type: 'jar.gifted', fromKidId: nolan, toKidId: makenna, amount: 200 }, AT), f, kid, t)).toBe('Gave $2 to Makenna')
  })
})
