import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { ApiError, fetchAllOrders } from '../api/client'
import type { SalesOrder } from '../api/types'
import { useSettings } from '../settings/SettingsContext'

// One shared copy of the full order list, used by the dashboard and the notification
// bell. It is cached for the configured number of minutes to avoid re-paging the API.

interface DatasetState {
  rows: SalesOrder[] | null
  fetchedAt: Date | null
  loading: boolean
  error: ApiError | null
}

let state: DatasetState = { rows: null, fetchedAt: null, loading: false, error: null }
const listeners = new Set<() => void>()

function setState(patch: Partial<DatasetState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

let inflight: Promise<void> | null = null

function load(force: boolean, ttlMs: number): Promise<void> {
  const fresh = state.fetchedAt && Date.now() - state.fetchedAt.getTime() < ttlMs
  if (!force && (fresh || state.error)) return Promise.resolve()
  if (inflight) return inflight
  setState({ loading: true, error: null })
  inflight = fetchAllOrders({ q: '', status: '', site: '', sort: 'CreatedDateTime1', order: 'desc' })
    .then(
      (rows) => setState({ rows, fetchedAt: new Date(), loading: false }),
      (err: unknown) =>
        setState({
          loading: false,
          error: err instanceof ApiError ? err : new ApiError('Could not load orders.', 'network'),
        }),
    )
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** Drops the cached dataset, e.g. after the API connection settings change. */
export function invalidateDataset() {
  setState({ rows: null, fetchedAt: null, error: null })
}

export function useOrderDataset() {
  const ttlMs = useSettings().settings.api.cacheMinutes * 60_000
  const snapshot = useSyncExternalStore(subscribe, () => state)

  useEffect(() => {
    void load(false, ttlMs)
  }, [ttlMs])

  const reload = useCallback(() => load(true, ttlMs), [ttlMs])

  return { ...snapshot, reload }
}
