/** One coin glyph. The drop-shadow comes from CSS so it follows the 3D lift rule. */
export function Coin({ size = 22 }: { size?: number }) {
  return (
    <svg className="kb-coin" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" fill="var(--coin)" stroke="var(--coin-rim)" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="var(--coin-rim)" strokeOpacity="0.6" strokeWidth="1.5" />
      <ellipse cx="8.5" cy="7.5" rx="2.6" ry="1.5" transform="rotate(-35 8.5 7.5)" fill="var(--coin-shine)" />
    </svg>
  )
}
