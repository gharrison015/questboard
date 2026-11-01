/** One coin glyph. The drop-shadow comes from CSS so it follows the 3D lift rule. */
export function Coin({ size = 22 }: { size?: number }) {
  return (
    <svg className="kb-coin" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" fill="var(--warn)" stroke="var(--ink)" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="var(--ink)" strokeOpacity="0.45" strokeWidth="1.5" />
    </svg>
  )
}
