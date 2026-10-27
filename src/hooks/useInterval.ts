import { useEffect, useRef } from 'react'

/** Calls `callback` every `ms` milliseconds; pass 0 to pause. */
export function useInterval(callback: () => void, ms: number) {
  const saved = useRef(callback)
  useEffect(() => {
    saved.current = callback
  })

  useEffect(() => {
    if (!ms) return
    const id = window.setInterval(() => saved.current(), ms)
    return () => window.clearInterval(id)
  }, [ms])
}
