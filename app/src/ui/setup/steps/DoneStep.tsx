import { THEMES } from '../../../config/themes'
import type { StepProps } from './types'

export function DoneStep({ state }: StepProps) {
  return (
    <>
      <h2 className="su-title">You&apos;re set up</h2>
      <p className="su-lead">The {state.familyName.trim()} board is ready.</p>
      <ul className="su-buddies">
        {state.kids.map((k) => (
          <li key={k.key} className="su-buddy">
            <img src={`${import.meta.env.BASE_URL}buddies/${THEMES[k.theme].img}`} alt="" width={96} height={96} />
            <span>{k.name.trim()}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
