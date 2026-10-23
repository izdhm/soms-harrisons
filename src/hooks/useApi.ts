import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api/client'

export interface ApiState<T> {
  data: T | null
  error: ApiError | null
  loading: boolean
  /** When the last successful response arrived. */
  updatedAt: Date | null
  reload: () => void
}

interface Options {
  /** Keep showing the previous result while the next one loads (used by the table). */
  keepPreviousData?: boolean
}

function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  return new ApiError(err instanceof Error ? err.message : 'Something went wrong.', 'network')
}

/**
 * Runs `fetcher` whenever `key` changes, cancelling the previous request so a slow
 * response can never overwrite a newer one.
 */
export function useApi<T>(
  key: string,
  fetcher: (signal: AbortSignal) => Promise<T>,
  { keepPreviousData = false }: Options = {},
): ApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [attempt, setAttempt] = useState(0)

  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    if (!keepPreviousData) setData(null)

    fetcherRef.current(controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return
        setData(result)
        setUpdatedAt(new Date())
        setLoading(false)
      },
      (err: unknown) => {
        if (controller.signal.aborted) return
        setError(toApiError(err))
        setLoading(false)
      },
    )

    return () => controller.abort()
  }, [key, attempt, keepPreviousData])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  return { data, error, loading, updatedAt, reload }
}
