import { useActions, useKid } from '../../state/store'
import { useParent } from '../parent/useParent'
import { Icon } from '../primitives/Icon'
import { useSwipe } from './useSwipe'

/** Brand, the current kid, and the lock button that opens the parent gate. Pulling down opens the kid grid. */
export function Header({ onPullDown }: { onPullDown?: () => void }) {
  const kid = useKid()
  const parent = useParent()
  const { setView } = useActions()
  const swipe = useSwipe({ onDown: onPullDown })
  return (
    <header className="qb-header" role="banner" {...swipe}>
      <span className="qb-brand">QuestBoard</span>
      <span className="qb-headkid">{kid?.name}</span>
      <button
        type="button"
        className="qb-iconbtn"
        aria-label="Parent view"
        onClick={() => parent.require(() => setView('parent'))}
      >
        <Icon name="lock" />
      </button>
    </header>
  )
}
