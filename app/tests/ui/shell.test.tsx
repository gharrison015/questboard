import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StoreProvider } from '../../src/state/store'
import { AppShell } from '../../src/ui/shell/AppShell'
import { InMemoryAdapter } from '../../src/storage/memory'
import { hashPin } from '../../src/security/pin'
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
    expect(enter).toBeDisabled()

    for (const d of '9999') fireEvent.click(screen.getByRole('button', { name: d }))
    expect(enter).toBeEnabled()
    fireEvent.click(enter)
    await waitFor(() => expect(dialog).toHaveClass('shake'))
    expect(screen.queryByText(/Parent view \(coming/)).toBeNull()

    for (const d of '1234') fireEvent.click(screen.getByRole('button', { name: d }))
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    await screen.findByText(/Parent view \(coming in Task 14\)/)
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Lock' }))
    await waitFor(() => expect(screen.queryByText(/Parent view \(coming/)).toBeNull())
  })

  it('closes the gate on Escape', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Parent view' }))
    await screen.findByRole('dialog')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
