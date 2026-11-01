import { useMemo } from 'react'
import { prepare, type Prepared } from '../engine/ledger'
import type { QBEvent } from '../engine/types'
import { useStore } from './store'

/** The ledger version: length plus last id. Appends always change it. */
export function ledgerKey(events: QBEvent[]): string {
  return `${events.length}:${events.length > 0 ? events[events.length - 1].id : ''}`
}

/**
 * Live events and per-kid per-day buckets, built once per ledger version and shared by every
 * selector and board on screen (Ruling 28).
 */
export function useDerived(): Prepared {
  const { events } = useStore()
  const key = ledgerKey(events)
  return useMemo(() => prepare(events), [key])
}
