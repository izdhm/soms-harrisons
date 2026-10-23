import { useCallback, useEffect, useState } from 'react'
import type { OrderQuery } from '../api/types'
import { parseUrlState, serializeUrlState, type UrlState } from '../lib/query'

/** Keeps list filters and the open order in the address bar so views can be bookmarked and shared. */
export function useUrlState() {
  const [state, setState] = useState<UrlState>(() => parseUrlState(window.location.search))

  useEffect(() => {
    const next = `${window.location.pathname}${serializeUrlState(state)}${window.location.hash}`
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(null, '', next)
    }
  }, [state])

  /** Any change other than paging sends the user back to page 1. */
  const updateQuery = useCallback((patch: Partial<OrderQuery>) => {
    setState((prev) => ({
      ...prev,
      query: { ...prev.query, page: 1, ...patch },
    }))
  }, [])

  const resetFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      query: { ...prev.query, page: 1, q: '', status: '', site: '' },
    }))
  }, [])

  const setOrderId = useCallback((orderId: string | null) => {
    setState((prev) => ({ ...prev, orderId }))
  }, [])

  return {
    query: state.query,
    orderId: state.orderId,
    updateQuery,
    resetFilters,
    setOrderId,
  }
}
