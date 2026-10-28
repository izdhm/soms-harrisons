import { describe, expect, it } from 'vitest'
import { makeOrder } from '../test/fixtures'
import {
  attention,
  byBranch,
  byMonth,
  byStatus,
  filterOrders,
  niceScale,
  openAging,
  rankBy,
  toDateRange,
  totals,
} from './analytics'
import { createFormatter } from './format'

const NOW = new Date('2026-10-01T00:00:00.000Z')

const ROWS = [
  makeOrder({ SalesId: 'A', InventSiteId: 'A10', SalesStatus: 'Open order', HAR_TotalSOAmount: 2000, HAR_BalanceAmount: 2000, CreatedDateTime1: '2026-09-25T02:00:00.000Z', MCROrderStopped: 'Yes' }),
  makeOrder({ SalesId: 'B', InventSiteId: 'A10', SalesStatus: 'Open order', HAR_TotalSOAmount: 100, HAR_BalanceAmount: 100, CreatedDateTime1: '2026-05-01T02:00:00.000Z', DOT_ValidationStatus: 'Pending' }),
  makeOrder({ SalesId: 'C', InventSiteId: 'B20', SalesStatus: 'Invoiced', HAR_TotalSOAmount: 300, HAR_BalanceAmount: 0, CreatedDateTime1: '2026-08-10T02:00:00.000Z', DOT_ItemGroupId: 'FG-FOOD' }),
  makeOrder({ SalesId: 'D', InventSiteId: 'B20', SalesStatus: 'Cancelled', HAR_TotalSOAmount: 50, HAR_BalanceAmount: 50, CreatedDateTime1: '2026-08-31T20:00:00.000Z', MCROrderStopped: 'Yes' }),
]

describe('totals', () => {
  it('counts statuses and sums value, leaving cancelled orders out of the balance', () => {
    expect(totals(ROWS)).toEqual({
      orders: 4,
      open: 2,
      delivered: 0,
      invoiced: 1,
      cancelled: 1,
      completed: 1,
      value: 2450,
      balance: 2100,
      average: 612.5,
    })
  })

  it('handles an empty list', () => {
    expect(totals([]).average).toBe(0)
  })
})

describe('grouping', () => {
  it('groups by month in the Malaysia time zone', () => {
    const months = byMonth(ROWS, createFormatter().monthKey)
    // Order D is 31 Aug UTC but 1 Sep in Malaysia.
    expect(months.map((m) => [m.key, m.orders])).toEqual([
      ['2026-05', 1],
      ['2026-08', 1],
      ['2026-09', 2],
    ])
    expect(months[2].counts).toEqual({ 'Open order': 1, Cancelled: 1 })
  })

  it('keeps every known status in a fixed order, even at zero', () => {
    expect(byStatus(ROWS).map((s) => [s.status, s.count])).toEqual([
      ['Open order', 2],
      ['Delivered', 0],
      ['Invoiced', 1],
      ['Cancelled', 1],
    ])
  })

  it('ranks branches by value with a cancellation rate', () => {
    expect(byBranch(ROWS)).toEqual([
      { site: 'A10', orders: 2, open: 2, cancelled: 0, value: 2100, cancelRate: 0 },
      { site: 'B20', orders: 2, open: 0, cancelled: 1, value: 350, cancelRate: 0.5 },
    ])
  })

  it('ignores cancelled orders when ranking', () => {
    expect(rankBy(ROWS, (r) => r.DOT_ItemGroupId)).toEqual([
      { label: 'FG-HOME', count: 2, value: 2100 },
      { label: 'FG-FOOD', count: 1, value: 300 },
    ])
  })
})

describe('time based views', () => {
  it('filters by branch and period', () => {
    expect(filterOrders(ROWS, { site: 'A10', period: 'all' }, NOW).map((r) => r.SalesId)).toEqual(['A', 'B'])
    expect(filterOrders(ROWS, { site: '', period: '90d' }, NOW).map((r) => r.SalesId)).toEqual(['A', 'C', 'D'])
  })

  it('filters by a custom range of whole days in the configured time zone', () => {
    const { dayKey } = createFormatter()
    const ids = (from: string, to: string, site = '') =>
      filterOrders(ROWS, { site, period: 'custom', range: { from, to } }, NOW, dayKey).map((r) => r.SalesId)

    // Order D is 31 Aug UTC but 1 Sep in Malaysia, so August ends without it.
    expect(ids('2026-08-01', '2026-08-31')).toEqual(['C'])
    expect(ids('2026-09-01', '2026-09-25')).toEqual(['A', 'D'])
    expect(ids('2026-09-01', '')).toEqual(['A', 'D'])
    expect(ids('', '2026-05-01')).toEqual(['B'])
    expect(ids('', '', 'B20')).toEqual(['C', 'D'])
  })

  it('reads a custom range safely from the URL', () => {
    expect(toDateRange('2026-05-01', '2026-06-30')).toEqual({ from: '2026-05-01', to: '2026-06-30' })
    expect(toDateRange('2026-06-30', '2026-05-01')).toEqual({ from: '2026-05-01', to: '2026-06-30' })
    expect(toDateRange('2026-02-30', 'yesterday')).toEqual({ from: '', to: '' })
    expect(toDateRange(null, '2026-06-30')).toEqual({ from: '', to: '2026-06-30' })
  })

  it('buckets open orders by age', () => {
    const aging = openAging(ROWS, NOW)
    expect(aging.map((b) => b.count)).toEqual([1, 0, 0, 0, 1])
    expect(aging[4].label).toBe('120+')
  })

  it('collects orders that need attention', () => {
    const a = attention(ROWS, { highValue: 1500, agingDays: 90 }, NOW)
    expect(a.onHold.map((r) => r.SalesId)).toEqual(['A'])
    expect(a.pendingValidation.map((r) => r.SalesId)).toEqual(['B'])
    expect(a.highValueOpen.map((r) => r.SalesId)).toEqual(['A'])
    expect(a.agedOpen.map((r) => r.SalesId)).toEqual(['B'])
  })
})

describe('niceScale', () => {
  it('produces clean axis ticks', () => {
    expect(niceScale(217)).toEqual({ max: 300, ticks: [0, 100, 200, 300] })
    expect(niceScale(0).ticks).toEqual([0, 1])
  })
})
