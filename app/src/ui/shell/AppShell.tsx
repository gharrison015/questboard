import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { isFold } from '../../app/mode'
import { sessionValid } from '../../security/session'
import { activeKids, useActions, useKid, useStore } from '../../state/store'
import { seedDemoFamily } from '../../state/devSeed'
import { KidBoard } from '../kid/KidBoard'
import { ParentProvider } from '../parent/useParent'
import { ParentView } from '../parent/ParentView'
import { Toaster } from '../primitives/Toaster'
import { SetupWizard } from '../setup/SetupWizard'
import { TvBoard } from '../tv/TvBoard'
import { Header } from './Header'
import { KidRail } from './KidRail'
import { KidSwitcher } from './KidSwitcher'
import { useSwipe } from './useSwipe'

function wantsDemo(): boolean {
  return new URLSearchParams(window.location.search).get('demo') === '1'
}

function Shell() {
  const { family, mode, appearance, view, parentUnlockedAt, now } = useStore()
  const { setKid, setView, replaceAll } = useActions()
  const kid = useKid()
  const [gridOpen, setGridOpen] = useState(false)
  const seeded = useRef(false)
  const kids = activeKids(family)

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.appearance = appearance
    root.dataset.buddy = kid?.theme ?? 'truck'
  }, [appearance, kid?.theme])

  // Dev only: ?demo=1 on an empty install loads the demo family once.
  useEffect(() => {
    if (family || seeded.current || !wantsDemo()) return
    seeded.current = true
    void seedDemoFamily().then((s) => replaceAll(s.family, s.events))
  }, [family, replaceAll])

  // The parent session expires on the minute tick.
  useEffect(() => {
    if (view === 'parent' && !sessionValid(parentUnlockedAt, now.getTime())) setView('kid')
  }, [view, parentUnlockedAt, now, setView])

  const step = (delta: number): void => {
    if (!kid) return
    const next = kids[kids.findIndex((k) => k.id === kid.id) + delta]
    if (next) setKid(next.id)
  }
  const swipe = useSwipe({ onLeft: () => step(1), onRight: () => step(-1) })

  if (!family) return <SetupWizard />
  if (mode === 'tv') return <TvBoard />
  if (!kid) return <SetupWizard />

  const rail = mode === 'tablet' && kids.length >= 3
  return (
    <div className="qb-shell" data-mode={mode} data-fold={isFold() ? 'true' : undefined}>
      <Header onPullDown={kids.length >= 3 ? () => setGridOpen(true) : undefined} />
      {rail ? null : <KidSwitcher gridOpen={gridOpen} onGridChange={setGridOpen} />}
      <div className="qb-body">
        {rail ? <KidRail /> : null}
        {view === 'parent' ? (
          <main className="qb-main"><ParentView /></main>
        ) : (
          <main className="qb-main" {...swipe}>
            <div key={kid.id} className="qb-fade"><KidBoard kid={kid} /></div>
          </main>
        )}
      </div>
    </div>
  )
}

export function AppShell() {
  return (
    <ParentProvider>
      <Shell />
      <Toaster />
    </ParentProvider>
  )
}
