import { activeKids, useActions, useKid, useStore } from '../../state/store'
import { KidAvatar } from './KidAvatar'

/** Vertical avatar rail for tablets with 3 or more kids. */
export function KidRail() {
  const { family } = useStore()
  const { setKid } = useActions()
  const current = useKid()
  const kids = activeKids(family)
  return (
    <div className="qb-rail" role="group" aria-label="Kids">
      {kids.map((k) => (
        <button
          key={k.id}
          type="button"
          className="qb-railbtn"
          aria-pressed={k.id === current?.id}
          onClick={() => setKid(k.id)}
        >
          <KidAvatar kid={k} size={44} />
          <span>{k.name}</span>
        </button>
      ))}
    </div>
  )
}
