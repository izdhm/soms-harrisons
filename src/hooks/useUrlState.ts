import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { OrderQuery } from '../api/types'
import { parseUrlState, serializeUrlState, type UrlState } from '../lib/query'

/** Keeps list filters and the open order in the address bar so views can be bookmarked and shared. */
export function useUrlState(defaults: OrderQuery) {
  const [params, setParams] = useSearchParams()
  const search = params.toString()
  const state = useMemo(() => parseUrlState(search, defaults), [search, defaults])

  const update = useCallback(
    (fn: (prev: UrlState) => UrlState) => {
      setParams(
        (prev) => {
          const next = fn(parseUrlState(prev.toString(), defaults))
          return new URLSearchParams(serializeUrlState(next, defaults))
        },
        { replace: true },
      )
    },
    [setParams, defaults],
  )

  /** Any change other than paging sends the user back to page 1. */
  const updateQuery = useCallback(
    (patch: Partial<OrderQuery>) =>
      update((prev) => ({ ...prev, query: { ...prev.query, page: 1, ...patch } })),
    [update],
  )

  const resetFilters = useCallback(
    () =>
      update((prev) => ({
        ...prev,
        query: { ...prev.query, page: 1, q: '', status: '', site: '' },
      })),
    [update],
  )

  const setOrderId = useCallback(
    (orderId: string | null) => update((prev) => ({ ...prev, orderId })),
    [update],
  )

  return { query: state.query, orderId: state.orderId, updateQuery, resetFilters, setOrderId }
}
