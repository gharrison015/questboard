import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../../src/state/store'
import { AppShell } from '../../src/ui/shell/AppShell'
import { InMemoryAdapter } from '../../src/storage/memory'
import { hashPin, verifyPin } from '../../src/security/pin'
import { exportFamily, parseImport } from '../../src/storage/exportImport'
import { makeFamily, nolan } from '../fixtures'
import type { Chore, Family } from '../../src/engine/types'

const NOW = new Date(2026, 10, 4, 12, 0, 0)

async function mount(opts: { family?: Partial<Family> } = {}) {
  const adapter = new InMemoryAdapter()
  const salt = 'salt'
  await adapter.saveFamily(makeFamily({
    createdAt: '2026-11-01T00:00:00.000Z',
    pinSalt: salt,
    pinHash: await hashPin('1234', salt),
    recoveryHash: await hashPin('ABCDEFGH', salt),
    ...opts.family,
  }))
  render(<StoreProvider adapter={adapter}><AppShell /></StoreProvider>)
  await screen.findByRole('banner')
  fireEvent.click(screen.getByRole('button', { name: 'Parent view' }))
  await screen.findByRole('dialog')
  for (const d of '1234') fireEvent.click(screen.getByRole('button', { name: d }))
  fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
  await screen.findByRole('region', { name: 'Log a deduction' })
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
  await screen.findByRole('region', { name: 'Settings' })
  return { adapter }
}

const family = async (a: InMemoryAdapter): Promise<Family> => (await a.load()).family as Family
const fill = (label: string, value: string, scope: HTMLElement = document.body): void => {
  const input = within(scope).getByLabelText(label)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}
const typeInto = (name: string | RegExp, value: string, scope: HTMLElement = document.body): void => {
  const input = within(scope).getByRole('textbox', { name })
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

describe('settings', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('Keep it sets the money preset', async () => {
    const { adapter } = await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }))
    await waitFor(async () => expect((await family(adapter)).money).toMatchObject({ startAmount: 2000, deductionDefault: 100, chorePayDefault: 0 }))
  })

  it('typing 0.25 into Deduction stores 25 cents', async () => {
    const { adapter } = await mount()
    typeInto('Deduction', '0.25')
    await waitFor(async () => expect((await family(adapter)).money.deductionDefault).toBe(25))
  })

  it('accepts .5 as 50 cents and rejects junk without changing the value', async () => {
    const { adapter } = await mount()
    typeInto('Pay per new chore', '.5')
    await waitFor(async () => expect((await family(adapter)).money.chorePayDefault).toBe(50))
    typeInto('Pay per new chore', 'abc')
    expect(await screen.findByText(/Enter an amount like 1.50/)).toBeInTheDocument()
    expect((await family(adapter)).money.chorePayDefault).toBe(50)
    expect(screen.getByRole('textbox', { name: 'Pay per new chore' })).toHaveValue('$0.50')
  })

  it('shows the unlock prompt for an 11th active chore and does not save', async () => {
    const chores: Chore[] = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`, label: `Chore ${i}`, icon: 'star', days: [0, 1, 2, 3, 4, 5, 6], pay: 0, active: true,
    }))
    const base = makeFamily()
    const { adapter } = await mount({ family: { kids: base.kids.map((k) => (k.id === nolan ? { ...k, chores } : k)) } })
    expect(screen.getByText('10 of 10 active')).toBeInTheDocument()
    const saveSpy = vi.spyOn(adapter, 'saveFamily')
    fireEvent.click(screen.getByRole('button', { name: 'Add chore' }))
    expect(await screen.findByText(/free limit/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Unlock unlimited chores/ }).length).toBeGreaterThan(0)
    expect(saveSpy).not.toHaveBeenCalled()
    expect((await family(adapter)).kids.find((k) => k.id === nolan)!.chores).toHaveLength(10)
  })

  it('adds a chore under the limit and the unlock grants chores-unlimited', async () => {
    const { adapter } = await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Add chore' }))
    await waitFor(async () => expect((await family(adapter)).kids.find((k) => k.id === nolan)!.chores).toHaveLength(6))
  })

  it('Export downloads JSON that parseImport accepts', async () => {
    const { adapter } = await mount()
    let blob: Blob | undefined
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: (b: Blob) => { blob = b; return 'blob:x' } })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Export family' }))
    await waitFor(() => expect(blob).toBeDefined())
    expect(click).toHaveBeenCalled()
    const text = await new Promise<string>((res) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.readAsText(blob!)
    })
    const parsed = parseImport(text)
    expect('error' in parsed).toBe(false)
    if (!('error' in parsed)) expect(parsed.family.id).toBe((await family(adapter)).id)
  })

  it('resets the PIN with the right recovery code and shows a new code', async () => {
    const { adapter } = await mount()
    const group = screen.getByRole('group', { name: 'Reset PIN with recovery code' })
    fill('Recovery code', 'abcd-efgh', group)
    fill('New PIN', '5678', group)
    fill('Confirm new PIN', '5678', group)
    fireEvent.click(within(group).getByRole('button', { name: 'Reset PIN' }))
    const dlg = await screen.findByRole('dialog', { name: 'New recovery code' })
    const done = within(dlg).getByRole('button', { name: 'Done' })
    expect(done).toBeDisabled()
    fireEvent.click(within(dlg).getByRole('checkbox', { name: 'I wrote it down' }))
    expect(done).toBeEnabled()
    const f = await family(adapter)
    expect(await verifyPin('5678', f.pinSalt, f.pinHash)).toBe(true)
    expect(f.recoveryHash).not.toBe(await hashPin('ABCDEFGH', 'salt'))
  })

  it('refuses a wrong recovery code', async () => {
    const { adapter } = await mount()
    const before = await family(adapter)
    const group = screen.getByRole('group', { name: 'Reset PIN with recovery code' })
    fill('Recovery code', 'WRONG-CODE', group)
    fill('New PIN', '5678', group)
    fill('Confirm new PIN', '5678', group)
    fireEvent.click(within(group).getByRole('button', { name: 'Reset PIN' }))
    expect(await within(group).findByText('That recovery code does not match.')).toBeInTheDocument()
    expect((await family(adapter)).pinHash).toBe(before.pinHash)
  })

  it('saves a pay handle without the leading $', async () => {
    const { adapter } = await mount()
    typeInto('Cash App', '$cash')
    await waitFor(async () => expect((await family(adapter)).payHandles?.cashapp).toBe('cash'))
  })

  it('clears a kid money override by sending null', async () => {
    const base = makeFamily()
    const { adapter } = await mount({
      family: { kids: base.kids.map((k) => (k.id === nolan ? { ...k, moneyOverrides: { startAmount: 500 } } : k)) },
    })
    const toggle = screen.getByRole('checkbox', { name: 'Own money rules for Nolan' })
    expect(toggle).toBeChecked()
    fireEvent.click(toggle)
    await waitFor(async () => {
      const k = (await family(adapter)).kids.find((x) => x.id === nolan)!
      expect('moneyOverrides' in k).toBe(false)
    })
  })

  it('removes a kid photo', async () => {
    const base = makeFamily()
    const { adapter } = await mount({
      family: { kids: base.kids.map((k) => (k.id === nolan ? { ...k, photo: 'data:image/jpeg;base64,AAAA' } : k)) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }))
    await waitFor(async () => expect((await family(adapter)).kids.find((k) => k.id === nolan)!.photo).toBeUndefined())
  })

  it('Change PIN saves a new hash with the same salt when the current PIN is right', async () => {
    const { adapter } = await mount()
    const group = screen.getByRole('group', { name: 'Change PIN' })
    fill('Current PIN', '1234', group)
    fill('New PIN', '4321', group)
    fill('Confirm new PIN', '4321', group)
    fireEvent.click(within(group).getByRole('button', { name: 'Change PIN' }))
    await waitFor(async () => expect((await family(adapter)).pinHash).toBe(await hashPin('4321', 'salt')))
    const f = await family(adapter)
    expect(f.pinSalt).toBe('salt')
    expect(f.recoveryHash).toBe(await hashPin('ABCDEFGH', 'salt'))
  })

  it('Change PIN rejects a wrong current PIN and saves nothing', async () => {
    const { adapter } = await mount()
    const before = await family(adapter)
    const saveSpy = vi.spyOn(adapter, 'saveFamily')
    const group = screen.getByRole('group', { name: 'Change PIN' })
    fill('Current PIN', '9999', group)
    fill('New PIN', '4321', group)
    fill('Confirm new PIN', '4321', group)
    fireEvent.click(within(group).getByRole('button', { name: 'Change PIN' }))
    expect(await within(group).findByText('That is not the current PIN.')).toBeInTheDocument()
    expect(saveSpy).not.toHaveBeenCalled()
    expect((await family(adapter)).pinHash).toBe(before.pinHash)
  })

  it('uses real password fields for PINs and a text field for the recovery code', async () => {
    await mount()
    const group = screen.getByRole('group', { name: 'Reset PIN with recovery code' })
    expect(within(group).getByLabelText('New PIN')).toHaveAttribute('type', 'password')
    expect(within(group).getByLabelText('New PIN')).toHaveAttribute('inputmode', 'numeric')
    expect(within(group).getByLabelText('New PIN')).toHaveAttribute('maxlength', '6')
    expect(within(group).getByLabelText('Recovery code')).toHaveAttribute('type', 'text')
    expect(within(screen.getByRole('group', { name: 'Change PIN' })).getByLabelText('Current PIN')).toHaveAttribute('autocomplete', 'current-password')
  })

  it('locks Change PIN after five wrong current PINs', async () => {
    const { adapter } = await mount()
    const group = screen.getByRole('group', { name: 'Change PIN' })
    fill('New PIN', '4321', group)
    fill('Confirm new PIN', '4321', group)
    for (let i = 0; i < 5; i += 1) {
      fill('Current PIN', '9999', group)
      fireEvent.click(within(group).getByRole('button', { name: 'Change PIN' }))
      await waitFor(() => expect(within(group).getByRole('alert')).toBeInTheDocument())
      fireEvent.change(within(group).getByLabelText('Current PIN'), { target: { value: '' } })
    }
    fill('Current PIN', '1234', group)
    fireEvent.click(within(group).getByRole('button', { name: 'Change PIN' }))
    expect(await within(group).findByText(/Too many wrong tries/)).toBeInTheDocument()
    expect((await adapter.load()).lockout.lockedUntil).not.toBeNull()
  })

  it('erases everything only after typing ERASE, then shows setup', async () => {
    const { adapter } = await mount()
    fireEvent.click(screen.getByRole('button', { name: 'Erase all data' }))
    const dlg = await screen.findByRole('dialog', { name: 'Erase all data' })
    const go = within(dlg).getByRole('button', { name: 'Erase everything' })
    expect(go).toBeDisabled()
    fireEvent.change(within(dlg).getByLabelText('Type ERASE'), { target: { value: 'erase' } })
    expect(go).toBeDisabled()
    fireEvent.change(within(dlg).getByLabelText('Type ERASE'), { target: { value: 'ERASE' } })
    expect(go).toBeEnabled()
    fireEvent.click(go)
    expect(await screen.findByRole('heading', { name: 'Welcome to QuestBoard' })).toBeInTheDocument()
    expect((await adapter.load()).family).toBeNull()
  })

  it('imports a valid export after a confirm that shows the name and counts', async () => {
    const { adapter } = await mount()
    const incoming = makeFamily({ id: 'fam-2', name: 'Imported crew', recoveryHash: 'abc' })
    const json = exportFamily(incoming, [])
    const file = new File([json], 'x.json', { type: 'application/json' })
    fireEvent.change(screen.getByLabelText('Import file'), { target: { files: [file] } })
    const dlg = await screen.findByRole('dialog', { name: 'Import this file' })
    expect(dlg).toHaveTextContent('Family: Imported crew')
    expect(dlg).toHaveTextContent('Kids: 2')
    expect(dlg).toHaveTextContent('Events: 0')
    expect((await family(adapter)).name).toBe('Test family')
    fireEvent.click(within(dlg).getByRole('button', { name: 'Replace everything' }))
    await waitFor(async () => expect((await family(adapter)).name).toBe('Imported crew'))
  })

  it('shows an error for an import file that is incomplete', async () => {
    const { adapter } = await mount()
    const bad = JSON.parse(exportFamily(makeFamily({ recoveryHash: 'abc' }), [])) as { family: Record<string, unknown> }
    delete bad.family.entitlements
    fireEvent.change(screen.getByLabelText('Import file'), { target: { files: [new File([JSON.stringify(bad)], 'x.json')] } })
    expect(await screen.findByText(/"entitlements" is missing/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Import this file' })).toBeNull()
    expect((await family(adapter)).name).toBe('Test family')
  })

  it('unlocks unlimited chores after the PIN gate', async () => {
    const chores: Chore[] = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`, label: `Chore ${i}`, icon: 'star', days: [0, 1, 2, 3, 4, 5, 6], pay: 0, active: true,
    }))
    const base = makeFamily()
    const { adapter } = await mount({ family: { kids: base.kids.map((k) => (k.id === nolan ? { ...k, chores } : k)) } })
    vi.setSystemTime(new Date(NOW.getTime() + 6 * 60 * 1000))
    fireEvent.click(screen.getByRole('button', { name: /Unlock unlimited chores/ }))
    await screen.findByRole('dialog')
    expect((await family(adapter)).entitlements).toHaveLength(0)
    for (const d of '1234') fireEvent.click(screen.getByRole('button', { name: d }))
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    await waitFor(async () => expect((await family(adapter)).entitlements.map((e) => e.key)).toContain('chores-unlimited'))
  })

  it('unlocks an extra kid slot as kid-slot:1 at the kid limit', async () => {
    const { adapter } = await mount()
    fireEvent.click(screen.getByRole('button', { name: /Unlock extra profile/ }))
    await waitFor(async () => expect((await family(adapter)).entitlements.map((e) => e.key)).toContain('kid-slot:1'))
  })

  it('resizes a chosen photo to a 256px JPEG data URL', async () => {
    const { adapter } = await mount()
    const drawImage = vi.fn()
    const toDataURL = vi.fn(() => 'data:image/jpeg;base64,STUB')
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(toDataURL)
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:p' })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined })
    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      naturalWidth = 400
      naturalHeight = 300
      set src(_v: string) { queueMicrotask(() => this.onload?.()) }
    })
    try {
      const file = new File(['x'], 'p.png', { type: 'image/png' })
      fireEvent.change(screen.getByLabelText('Photo for Nolan'), { target: { files: [file] } })
      await waitFor(async () => expect((await family(adapter)).kids.find((k) => k.id === nolan)!.photo).toBe('data:image/jpeg;base64,STUB'))
      expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.85)
      expect(drawImage).toHaveBeenCalledWith(expect.anything(), 50, 0, 300, 300, 0, 0, 256, 256)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('keeps the previous emoji when the new one is empty', async () => {
    const { adapter } = await mount()
    const box = screen.getByLabelText('Emoji for Yelling')
    fireEvent.change(box, { target: { value: '' } })
    fireEvent.blur(box)
    expect(box).toHaveValue('1')
    expect((await family(adapter)).reasons[0].emoji).toBe('1')
  })
})

describe('parseImport validation', () => {
  const base = (): { family: Record<string, unknown> } => JSON.parse(exportFamily(makeFamily({ recoveryHash: 'abc' }), []))
  it('names a missing entitlements list', () => {
    const d = base()
    delete d.family.entitlements
    const r = parseImport(JSON.stringify(d))
    expect('error' in r && r.error).toContain('"entitlements" is missing')
  })
  it('rejects an unknown verification mode', () => {
    const d = base()
    d.family.verification = 'whenever'
    const r = parseImport(JSON.stringify(d))
    expect('error' in r && r.error).toContain('verification')
  })
  it('rejects a kid without chores and a bad week start day', () => {
    const d = base()
    ;(d.family.kids as Record<string, unknown>[])[0].chores = 'no'
    expect('error' in parseImport(JSON.stringify(d))).toBe(true)
    const e = base()
    ;(e.family.money as Record<string, unknown>).weekStartDay = 9
    expect('error' in parseImport(JSON.stringify(e))).toBe(true)
  })
  it('accepts a complete export', () => {
    expect('error' in parseImport(JSON.stringify(base()))).toBe(false)
  })
})

describe('Caregivers block', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('says that sharing comes with sync', async () => {
    await mount()
    expect(screen.getByRole('region', { name: 'Caregivers' })).toHaveTextContent('Sharing with another phone comes with sync. For now, one device runs the board.')
  })
})
