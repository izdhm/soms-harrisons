import { describe, expect, it } from 'vitest'
import { DEFAULT_QUERY, hasActiveFilters, pageWindow, parseUrlState, serializeUrlState } from './query'

describe('parseUrlState', () => {
  it('returns defaults for an empty search string', () => {
    expect(parseUrlState('')).toEqual({ query: DEFAULT_QUERY, orderId: null })
  })

  it('reads filters, paging, sorting and the open order', () => {
    const { query, orderId } = parseUrlState(
      '?q=Siti&status=Open%20order&site=B20&page=3&pageSize=50&sort=HAR_TotalSOAmount&order=asc&order_id=SO-MOCK-00001',
    )
    expect(query).toEqual({
      q: 'Siti',
      status: 'Open order',
      site: 'B20',
      page: 3,
      pageSize: 50,
      sort: 'HAR_TotalSOAmount',
      order: 'asc',
    })
    expect(orderId).toBe('SO-MOCK-00001')
  })

  it('rejects invalid values instead of sending them to the API', () => {
    const { query } = parseUrlState('?page=-2&pageSize=500&sort=DROP&order=sideways')
    expect(query.page).toBe(1)
    expect(query.pageSize).toBe(DEFAULT_QUERY.pageSize)
    expect(query.sort).toBe(DEFAULT_QUERY.sort)
    expect(query.order).toBe(DEFAULT_QUERY.order)
  })
})

describe('serializeUrlState', () => {
  it('omits defaults so the URL stays clean', () => {
    expect(serializeUrlState({ query: DEFAULT_QUERY, orderId: null })).toBe('')
  })

  it('round-trips through parseUrlState', () => {
    const state = {
      query: { ...DEFAULT_QUERY, q: 'Wong', site: 'KK01', page: 2, order: 'asc' as const },
      orderId: 'SO-MOCK-00042',
    }
    expect(parseUrlState(serializeUrlState(state))).toEqual(state)
  })
})

describe('hasActiveFilters', () => {
  it('ignores whitespace-only search text', () => {
    expect(hasActiveFilters({ ...DEFAULT_QUERY, q: '   ' })).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_QUERY, site: 'A10' })).toBe(true)
  })
})

describe('pageWindow', () => {
  it('shows every page when there are only a few', () => {
    expect(pageWindow(2, 4)).toEqual([1, 2, 3, 4])
  })

  it('collapses distant pages into gaps', () => {
    expect(pageWindow(6, 12)).toEqual([1, null, 5, 6, 7, null, 12])
    expect(pageWindow(1, 12)).toEqual([1, 2, null, 12])
  })

  it('fills a single-page gap with the page itself', () => {
    expect(pageWindow(4, 12)).toEqual([1, 2, 3, 4, 5, null, 12])
  })
})
