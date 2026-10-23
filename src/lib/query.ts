import { SORT_FIELDS, type OrderQuery, type SortField, type SortOrder } from '../api/types'

export const PAGE_SIZES = [10, 25, 50, 100] as const

export const DEFAULT_QUERY: OrderQuery = {
  page: 1,
  pageSize: 25,
  q: '',
  status: '',
  site: '',
  sort: 'CreatedDateTime1',
  order: 'desc',
}

export interface UrlState {
  query: OrderQuery
  orderId: string | null
}

function positiveInt(value: string | null, fallback: number): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

/** Reads list filters and the open order from a location search string. Invalid values fall back to defaults. */
export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search)
  const pageSize = positiveInt(params.get('pageSize'), DEFAULT_QUERY.pageSize)
  const sort = params.get('sort')
  const order = params.get('order')

  return {
    query: {
      page: positiveInt(params.get('page'), DEFAULT_QUERY.page),
      pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : DEFAULT_QUERY.pageSize,
      q: params.get('q') ?? '',
      status: params.get('status') ?? '',
      site: params.get('site') ?? '',
      sort: SORT_FIELDS.includes(sort as SortField) ? (sort as SortField) : DEFAULT_QUERY.sort,
      order: order === 'asc' || order === 'desc' ? (order as SortOrder) : DEFAULT_QUERY.order,
    },
    orderId: params.get('order_id') || null,
  }
}

/** Writes only non-default values so shared links stay short. */
export function serializeUrlState({ query, orderId }: UrlState): string {
  const params = new URLSearchParams()
  if (query.q.trim()) params.set('q', query.q.trim())
  if (query.status) params.set('status', query.status)
  if (query.site) params.set('site', query.site)
  if (query.sort !== DEFAULT_QUERY.sort) params.set('sort', query.sort)
  if (query.order !== DEFAULT_QUERY.order) params.set('order', query.order)
  if (query.pageSize !== DEFAULT_QUERY.pageSize) params.set('pageSize', String(query.pageSize))
  if (query.page !== DEFAULT_QUERY.page) params.set('page', String(query.page))
  if (orderId) params.set('order_id', orderId)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function hasActiveFilters(query: OrderQuery): boolean {
  return Boolean(query.q.trim() || query.status || query.site)
}

/** Page numbers to render, with null marking a gap: [1, null, 4, 5, 6, null, 12]. */
export function pageWindow(current: number, total: number, radius = 1): (number | null)[] {
  if (total <= 1) return [1]
  const pages = new Set<number>([1, total])
  for (let p = current - radius; p <= current + radius; p++) {
    if (p >= 1 && p <= total) pages.add(p)
  }
  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | null)[] = []
  sorted.forEach((p, i) => {
    if (i > 0) {
      const gap = p - sorted[i - 1]
      if (gap === 2) result.push(p - 1)
      else if (gap > 2) result.push(null)
    }
    result.push(p)
  })
  return result
}
