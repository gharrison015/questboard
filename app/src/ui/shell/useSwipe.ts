import { useRef, type TouchEvent } from 'react'

export const SWIPE_THRESHOLD = 60

interface SwipeHandlers {
  onLeft?(): void
  onRight?(): void
  onDown?(): void
}

/** Touch handlers that fire once per gesture. The dominant axis decides, so vertical scrolling never swipes. */
export function useSwipe({ onLeft, onRight, onDown }: SwipeHandlers) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onTouchStart(e: TouchEvent): void {
      const t = e.touches[0]
      start.current = t ? { x: t.clientX, y: t.clientY } : null
    },
    onTouchEnd(e: TouchEvent): void {
      const s = start.current
      start.current = null
      const t = e.changedTouches[0]
      if (!s || !t) return
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (Math.abs(dx) >= Math.abs(dy)) {
        if (dx <= -SWIPE_THRESHOLD) onLeft?.()
        else if (dx >= SWIPE_THRESHOLD) onRight?.()
      } else if (dy >= SWIPE_THRESHOLD) onDown?.()
    },
  }
}
