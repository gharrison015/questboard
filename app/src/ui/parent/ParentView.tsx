import { useParent } from './useParent'
import { Button } from '../primitives/Button'

/** Placeholder. The parent tabs land in Task 14. */
export function ParentView() {
  const parent = useParent()
  return (
    <section className="qb-placeholder" aria-label="Parent">
      <h2>Parent view (coming in Task 14)</h2>
      <Button variant="quiet" icon="lock" onClick={parent.lock}>Lock</Button>
    </section>
  )
}
