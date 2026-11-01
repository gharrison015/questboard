import { useRef, useState } from 'react'
import { exportFamily, parseImport } from '../../../storage/exportImport'
import type { Family, QBEvent } from '../../../engine/types'
import { useActions, useStore } from '../../../state/store'
import { Button } from '../../primitives/Button'
import { Modal } from '../../primitives/Modal'
import { useToast } from '../../primitives/Toaster'
import { useParent } from '../useParent'
import { PinSettings } from './PinSettings'

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'family'

function readText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('That file could not be read.'))
    r.readAsText(file)
  })
}

interface Pending { family: Family; events: QBEvent[] }

function isComplete(f: Family): boolean {
  return typeof f.recoveryHash === 'string' && f.recoveryHash !== ''
    && typeof f.money === 'object' && f.money !== null
    && Array.isArray(f.reasons) && Array.isArray(f.routines)
}

export function DataSettings() {
  const { family, events } = useStore()
  const { replaceAll, eraseAll } = useActions()
  const { require } = useParent()
  const toast = useToast()
  const pick = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [importError, setImportError] = useState('')
  const [erasing, setErasing] = useState(false)
  const [typed, setTyped] = useState('')
  if (!family) return null

  const doExport = (): void => {
    require(() => {
      const json = exportFamily(family, events)
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `questboard-${slug(family.name)}-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.show('Export saved')
    })
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setImportError('')
    readText(f).then((text) => {
      const parsed = parseImport(text)
      if ('error' in parsed) { setImportError(parsed.error); return }
      if (!isComplete(parsed.family)) {
        setImportError('This file is missing its recovery code, money settings, reasons or routines, so it cannot be imported.')
        return
      }
      setPending(parsed)
    }).catch((err: unknown) => setImportError(err instanceof Error ? err.message : 'That file could not be read.'))
  }

  const confirmImport = (): void => {
    const p = pending
    if (!p) return
    require(() => {
      replaceAll(p.family, p.events)
        .then(() => { setPending(null); toast.show('Import finished') })
        .catch(() => toast.show('Could not import that file. Nothing was changed.'))
    })
  }

  const confirmErase = (): void => {
    if (typed !== 'ERASE') return
    require(() => {
      eraseAll().then(() => toast.show('Everything was erased')).catch(() => toast.show('Could not erase. Try again.'))
    })
  }

  return (
    <div className="st-body">
      <div className="st-card">
        <h4 className="pr-sub">Export</h4>
        <Button className="pr-dense" onClick={doExport}>Export family</Button>
        <p className="st-hint">Keep this file private. It contains your family's data and a hashed PIN.</p>
      </div>

      <div className="st-card">
        <h4 className="pr-sub">Import</h4>
        <input ref={pick} type="file" accept="application/json,.json" className="st-sr" aria-label="Import file" onChange={onFile} />
        <Button className="pr-dense" variant="quiet" onClick={() => pick.current?.click()}>Import from file</Button>
        <p className="st-hint">Importing replaces everything on this device with the contents of the file.</p>
        {importError ? <p className="st-error" role="alert">{importError}</p> : null}
      </div>

      <PinSettings />

      <div className="st-card">
        <h4 className="pr-sub">Erase all data</h4>
        <p className="st-hint">Removes the family, history and settings from this device and returns to setup. Export first if you may want it back.</p>
        <Button className="pr-dense" variant="danger" onClick={() => { setTyped(''); setErasing(true) }}>Erase all data</Button>
      </div>

      <div className="st-card" aria-label="About and privacy">
        <h4 className="pr-sub">About and privacy</h4>
        <p className="st-hint">QuestBoard keeps your family's data on this device. There are no accounts, no ads and no tracking.</p>
        <p className="st-hint">Kid names, photos and notes are entered by a parent. The app never asks a child for personal information.</p>
        <p className="st-hint">To see the board on another device, export the family and import the file there. Live sync is planned for a later version.</p>
        <p className="st-hint">Version {import.meta.env.VITE_APP_VERSION ?? 'dev'}</p>
      </div>

      <Modal open={pending !== null} title="Import this file" onClose={() => setPending(null)}>
        <h3 className="pr-modal-title">Replace everything with this file?</h3>
        {pending ? (
          <p className="st-hint">
            Family: {pending.family.name}. Kids: {pending.family.kids.length}. Events: {pending.events.length}.
            Everything now on this device will be replaced.
          </p>
        ) : null}
        <div className="pr-modal-actions">
          <Button variant="quiet" onClick={() => setPending(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmImport}>Replace everything</Button>
        </div>
      </Modal>

      <Modal open={erasing} title="Erase all data" onClose={() => setErasing(false)}>
        <h3 className="pr-modal-title">Erase everything?</h3>
        <p className="st-hint">This cannot be undone. Type ERASE to confirm.</p>
        <input className="st-input" aria-label="Type ERASE" value={typed} autoComplete="off" onChange={(e) => setTyped(e.target.value)} />
        <div className="pr-modal-actions">
          <Button variant="quiet" onClick={() => setErasing(false)}>Cancel</Button>
          <Button variant="danger" disabled={typed !== 'ERASE'} onClick={confirmErase}>Erase everything</Button>
        </div>
      </Modal>
    </div>
  )
}
