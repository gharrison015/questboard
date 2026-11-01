import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StoreProvider } from '../../src/state/store'
import { InMemoryAdapter } from '../../src/storage/memory'
import { TvBoard } from '../../src/ui/tv/TvBoard'
import { makeFamily } from '../fixtures'

afterEach(() => { window.location.hash = '' })

describe('tv board with no kids', () => {
  it('asks for a kid to be added on the tablet', async () => {
    const adapter = new InMemoryAdapter()
    await adapter.saveFamily(makeFamily({ kids: [] }))
    render(<StoreProvider adapter={adapter}><TvBoard /></StoreProvider>)
    expect(await screen.findByText('Add a kid on the tablet to get started.')).toBeInTheDocument()
  })
})
