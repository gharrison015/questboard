import { useEffect, useState } from 'react'
import { labTouch } from './lab'
import type { ModeInput } from './mode'

export type Viewport = Pick<ModeInput, 'width' | 'coarse' | 'hash'>

export function readViewport(): Viewport {
  const coarse = labTouch() || typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
  return { width: window.innerWidth, coarse, hash: window.location.hash }
}

/** Live width, pointer type and URL hash. Updates on resize and hashchange. */
export function useViewport(): Viewport {
  const [vp, setVp] = useState<Viewport>(readViewport)
  useEffect(() => {
    const update = (): void => {
      const next = readViewport()
      setVp((prev) =>
        prev.width === next.width && prev.coarse === next.coarse && prev.hash === next.hash ? prev : next,
      )
    }
    window.addEventListener('resize', update)
    window.addEventListener('hashchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('hashchange', update)
    }
  }, [])
  return vp
}
