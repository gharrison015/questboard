import { useEffect, useRef, useState } from 'react'
import { THEMES } from '../../config/themes'
import { buddyUrl } from '../shell/KidAvatar'
import type { Kid } from '../../engine/types'

const SHOW_MS = 3000

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function seen(key: string): boolean {
  try { return sessionStorage.getItem(key) !== null } catch { return false }
}
function mark(key: string): void {
  try { sessionStorage.setItem(key, '1') } catch { /* private mode: celebrate again next time */ }
}

function Confetti({ color }: { color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext?.('2d')
    if (!canvas || !ctx) return
    const style = getComputedStyle(document.documentElement)
    const palette = [color, ...['--save', '--spend', '--give'].map((v) => style.getPropertyValue(v).trim())].filter(Boolean)
    const w = (canvas.width = canvas.clientWidth || 360)
    const h = (canvas.height = canvas.clientHeight || 640)
    const bits = Array.from({ length: 90 }, (_, i) => ({
      x: Math.random() * w, y: -Math.random() * h * 0.5, s: 5 + Math.random() * 7,
      vy: 2 + Math.random() * 3, vx: (Math.random() - 0.5) * 2, c: palette[i % palette.length],
    }))
    let raf = 0
    const tick = (): void => {
      ctx.clearRect(0, 0, w, h)
      for (const b of bits) {
        b.x += b.vx; b.y += b.vy
        ctx.fillStyle = b.c
        ctx.fillRect(b.x, b.y, b.s, b.s * 0.6)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [color])
  return <canvas ref={ref} className="kb-confetti" aria-hidden="true" />
}

interface CelebrationProps {
  kid: Kid
  date: string
  /** True while the kid's day is perfect. The overlay fires when this flips from false to true. */
  perfect: boolean
}

/** Overlay for a perfect day. Once per kid per day (sessionStorage), 3 s, tap to dismiss. */
export function Celebration({ kid, date, perfect }: CelebrationProps) {
  const [open, setOpen] = useState(false)
  const prev = useRef(perfect)
  useEffect(() => {
    const was = prev.current
    prev.current = perfect
    if (!perfect || was) return
    const key = `celebrated:${kid.id}:${date}`
    if (seen(key)) return
    mark(key)
    setOpen(true)
  }, [perfect, kid.id, date])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => setOpen(false), SHOW_MS)
    return () => window.clearTimeout(t)
  }, [open])

  if (!open) return null
  return (
    <div className="kb-celebrate" role="dialog" aria-label="Perfect day" onClick={() => setOpen(false)}>
      {reducedMotion() ? null : <Confetti color={THEMES[kid.theme].accent} />}
      <img className="kb-buddy kb-hop kb-celebrate-buddy" src={buddyUrl(kid)} alt="" draggable={false} />
      <p className="kb-celebrate-text">Perfect day, {kid.name}!</p>
      <p className="kb-celebrate-sub">Tap to close</p>
    </div>
  )
}
