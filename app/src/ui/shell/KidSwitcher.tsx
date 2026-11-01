import { activeKids, useActions, useKid, useStore } from '../../state/store'
import { Icon } from '../primitives/Icon'
import { Modal } from '../primitives/Modal'
import { KidAvatar } from './KidAvatar'

interface KidSwitcherProps {
  gridOpen: boolean
  onGridChange(open: boolean): void
}

/** Horizontal avatar strip under the header, plus the full-screen grid when there are 3 or more kids. */
export function KidSwitcher({ gridOpen, onGridChange }: KidSwitcherProps) {
  const { family } = useStore()
  const { setKid } = useActions()
  const current = useKid()
  const kids = activeKids(family)
  if (kids.length < 2) return null

  return (
    <div className="qb-switcher">
      <div className="qb-strip" role="group" aria-label="Kids">
        {kids.map((k) => (
          <button
            key={k.id}
            type="button"
            className="qb-chip"
            aria-pressed={k.id === current?.id}
            onClick={() => setKid(k.id)}
          >
            <KidAvatar kid={k} size={32} />
            <span>{k.name}</span>
          </button>
        ))}
      </div>
      {kids.length >= 3 ? (
        <button type="button" className="qb-handle" aria-label="Show all kids" onClick={() => onGridChange(true)}>
          <Icon name="chev" />
        </button>
      ) : null}
      <Modal open={gridOpen} title="Choose a kid" fullscreen onClose={() => onGridChange(false)}>
        <div className="qb-grid-head">
          <h2>Who is playing?</h2>
          <button type="button" className="qb-iconbtn" aria-label="Close" onClick={() => onGridChange(false)}>
            <Icon name="x" />
          </button>
        </div>
        <div className="qb-kidgrid">
          {kids.map((k) => (
            <button
              key={k.id}
              type="button"
              className="qb-kidtile"
              aria-pressed={k.id === current?.id}
              onClick={() => { setKid(k.id); onGridChange(false) }}
            >
              <KidAvatar kid={k} size={96} />
              <span>{k.name}</span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
