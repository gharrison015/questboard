import type { Kid } from '../../engine/types'
import { effectiveMoney } from '../../engine/money'
import { earnBackRoom } from '../../engine/week'
import { useWeek } from '../../state/selectors'
import { useStore } from '../../state/store'
import { Card } from '../primitives/Card'

/** Placeholder for the earn-it-back panel. Task 13 fills it in. */
export function EarnBackSlot({ kid }: { kid: Kid }) {
  const { family } = useStore()
  const ws = useWeek(kid)
  if (!family || !effectiveMoney(family, kid).earnBackEnabled || earnBackRoom(ws) === 0) return null
  return <Card className="kb-earnback">Earn it back (coming soon)</Card>
}
