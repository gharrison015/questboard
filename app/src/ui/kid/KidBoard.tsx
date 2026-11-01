import type { Kid } from '../../engine/types'
import { buddyUrl } from '../shell/KidAvatar'

/** Placeholder. The real kid board lands in a later task. */
export function KidBoard({ kid }: { kid: Kid }) {
  return (
    <section className="qb-placeholder" aria-label={`${kid.name}'s board`}>
      <img src={buddyUrl(kid)} alt="" className="qb-placeholder-img" />
      <h2>{kid.name}</h2>
    </section>
  )
}
