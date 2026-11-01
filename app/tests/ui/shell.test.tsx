import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StoreProvider, useActions, useStore, type Actions } from '../../src/state/store'
import { AppShell } from '../../src/ui/shell/AppShell'
import { InMemoryAdapter } from '../../src/storage/memory'
import { hashPin } from '../../src/security/pin'
import { act } from '@testing-library/react'
import { makeFamily, makenna, nolan } from '../fixtures'

async function mount(pin = '1234') {
  const adapter = new InMemoryAdapter()
  const salt = 'salt'
  await adapter.saveFamily(makeFamily({ pinSalt: salt, pinHash: await hashPin(pin, salt) }))
  render(
    <StoreProvider adapter={adapter}>
      <AppShell />
    </StoreProvider>,
  )
  await screen.findByRole('banner')
  return adapter
}

function swipe(el: HTMLElement, dx: number) {
  fireEvent.touchStart(el, { touches: [{ clientX: 200, clientY: 300 }] })
  fireEvent.touchEnd(el, { changedTouches: [{ clientX: 200 + dx, clientY: 304 }] })
}

describe('app shell', () => {
  it('shows the kid name and buddy, and swipes between kids', async () => {
    await mount()
    const header = screen.getByRole('banner')
    expect(header).toHaveTextContent('Nolan')
    expect(document.documentElement.dataset.buddy).toBe('truck')
    expect(document.documentElement.dataset.appearance).toBe('bright')

    swipe(screen.getByRole('main'), -80)
    await waitFor(() => expect(header).toHaveTextContent('Makenna'))
    expect(document.documentElement.dataset.buddy).toBe('unicorn')

    swipe(screen.getByRole('main'), 30)
    expect(header).toHaveTextContent('Makenna')
    swipe(screen.getByRole('main'), 80)
    await waitFor(() => expect(header).toHaveTextContent('Nolan'))
  })

  it('switches kids from the avatar strip', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Makenna' }))
    await waitFor(() => expect(document.documentElement.dataset.buddy).toBe('unicorn'))
    expect(screen.getByRole('banner')).toHaveTextContent('Makenna')
    expect(nolan).not.toBe(makenna)
  })

  it('opens the parent gate, rejects a wrong PIN, and unlocks on the right one', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Parent view' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    const enter = screen.getByRole('button', { name: 'Enter' })
    expect(enter).toHaveAttribute('aria-disabled', 'true')

    for (const d of '9999') fireEvent.click(screen.getByRole('button', { name: d }))
    expect(enter).toHaveAttribute('aria-disabled', 'false')
    fireEvent.click(enter)
    await waitFor(() => expect(dialog).toHaveClass('shake'))
    expect(screen.queryByText(/Log a deduction/)).toBeNull()

    for (const d of '1234') fireEvent.click(screen.getByRole('button', { name: d }))
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    await screen.findByRole('region', { name: 'Log a deduction' })
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Lock' }))
    await waitFor(() => expect(screen.queryByText(/Log a deduction/)).toBeNull())
  })

  it('closes the gate on Escape', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Parent view' }))
    await screen.findByRole('dialog')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('applies two update calls fired in the same tick', async () => {
    const adapter = new InMemoryAdapter()
    await adapter.saveFamily(makeFamily())
    let actions!: Actions
    let kidChores = 0
    function Probe() {
      actions = useActions()
      kidChores = useStore().family?.kids[0].chores.length ?? 0
      return null
    }
    render(<StoreProvider adapter={adapter}><Probe /></StoreProvider>)
    await waitFor(() => expect(actions).toBeDefined())
    const before = kidChores
    const chore = (label: string) => ({ label, icon: 'star', days: [1], pay: 0, active: true })
    await act(async () => {
      await Promise.all([
        actions.update({ type: 'chore.add', kidId: nolan, chore: chore('One') }),
        actions.update({ type: 'chore.add', kidId: nolan, chore: chore('Two') }),
      ])
    })
    expect(kidChores).toBe(before + 2)
    expect((await adapter.load()).family?.kids[0].chores).toHaveLength(before + 2)
  })

  it('never shows the parent view from public actions without unlocking', async () => {
    const adapter = new InMemoryAdapter()
    await adapter.saveFamily(makeFamily())
    let actions!: Actions
    function Probe() {
      actions = useActions()
      return null
    }
    render(<StoreProvider adapter={adapter}><Probe /><AppShell /></StoreProvider>)
    await screen.findByRole('banner')
    act(() => actions.enterParent())
    expect(screen.queryByText(/Log a deduction/)).toBeNull()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
