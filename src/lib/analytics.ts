// Pure aggregations over the order dataset. The API has no aggregation endpoint, so
// the dashboard computes these in the browser from the paged list results.
import type { SalesOrder } from '../api/types'
import { STATUS_ORDER } from './status'

const DAY_MS = 86_400_000

export type Period = 'all' | '30d' | '90d' | '180d' | 'ytd'

export const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '180d', label: 'Last 180 days' },
  { value: 'ytd', label: 'Year to date' },
]

export function periodStart(period: Period, now: Date): number {
  switch (period) {
    case '30d':
      return now.getTime() - 30 * DAY_MS
    case '90d':
      return now.getTime() - 90 * DAY_MS
    case '180d':
      return now.getTime() - 180 * DAY_MS
    case 'ytd':
      return Date.UTC(now.getUTCFullYear(), 0, 1)
    default:
      return Number.NEGATIVE_INFINITY
  }
}

export function filterOrders(
  rows: SalesOrder[],
  { site, period }: { site: string; period: Period },
  now = new Date(),
): SalesOrder[] {
  const start = periodStart(period, now)
  return rows.filter(
    (r) => (!site || r.InventSiteId === site) && new Date(r.CreatedDateTime1).getTime() >= start,
  )
}

export interface Totals {
  orders: number
  open: number
  delivered: number
  invoiced: number
  cancelled: number
  completed: number
  value: number
  balance: number
  average: number
}

export function totals(rows: SalesOrder[]): Totals {
  const t: Totals = {
    orders: rows.length,
    open: 0,
    delivered: 0,
    invoiced: 0,
    cancelled: 0,
    completed: 0,
    value: 0,
    balance: 0,
    average: 0,
  }
  for (const r of rows) {
    t.value += r.HAR_TotalSOAmount
    if (r.SalesStatus === 'Open order') t.open++
    else if (r.SalesStatus === 'Delivered') t.delivered++
    else if (r.SalesStatus === 'Invoiced') t.invoiced++
    else if (r.SalesStatus === 'Cancelled') t.cancelled++
    if (r.SalesStatus !== 'Cancelled') t.balance += r.HAR_BalanceAmount ?? 0
  }
  t.completed = t.delivered + t.invoiced
  t.average = t.orders ? t.value / t.orders : 0
  return t
}

export interface MonthBucket {
  key: string
  counts: Record<string, number>
  values: Record<string, number>
  orders: number
  value: number
}

export function byMonth(rows: SalesOrder[], monthKey: (iso: string) => string): MonthBucket[] {
  const map = new Map<string, MonthBucket>()
  for (const r of rows) {
    const key = monthKey(r.CreatedDateTime1)
    let bucket = map.get(key)
    if (!bucket) {
      bucket = { key, counts: {}, values: {}, orders: 0, value: 0 }
      map.set(key, bucket)
    }
    bucket.counts[r.SalesStatus] = (bucket.counts[r.SalesStatus] ?? 0) + 1
    bucket.values[r.SalesStatus] = (bucket.values[r.SalesStatus] ?? 0) + r.HAR_TotalSOAmount
    bucket.orders++
    bucket.value += r.HAR_TotalSOAmount
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}

export interface StatusSlice {
  status: string
  count: number
  value: number
}

export function byStatus(rows: SalesOrder[]): StatusSlice[] {
  const order: string[] = [...STATUS_ORDER]
  for (const r of rows) if (!order.includes(r.SalesStatus)) order.push(r.SalesStatus)
  return order.map((status) => {
    const matching = rows.filter((r) => r.SalesStatus === status)
    return {
      status,
      count: matching.length,
      value: matching.reduce((s, r) => s + r.HAR_TotalSOAmount, 0),
    }
  })
}

export interface BranchRow {
  site: string
  orders: number
  open: number
  cancelled: number
  value: number
  cancelRate: number
}

export function byBranch(rows: SalesOrder[]): BranchRow[] {
  const map = new Map<string, BranchRow>()
  for (const r of rows) {
    let row = map.get(r.InventSiteId)
    if (!row) {
      row = { site: r.InventSiteId, orders: 0, open: 0, cancelled: 0, value: 0, cancelRate: 0 }
      map.set(r.InventSiteId, row)
    }
    row.orders++
    row.value += r.HAR_TotalSOAmount
    if (r.SalesStatus === 'Open order') row.open++
    if (r.SalesStatus === 'Cancelled') row.cancelled++
  }
  return [...map.values()]
    .map((row) => ({ ...row, cancelRate: row.orders ? row.cancelled / row.orders : 0 }))
    .sort((a, b) => b.value - a.value)
}

export interface GroupRow {
  label: string
  count: number
  value: number
}

/** Groups non-cancelled orders by a field and ranks by order value. */
export function rankBy(rows: SalesOrder[], key: (r: SalesOrder) => string | null): GroupRow[] {
  const map = new Map<string, GroupRow>()
  for (const r of rows) {
    if (r.SalesStatus === 'Cancelled') continue
    const label = key(r)
    if (!label) continue
    const row = map.get(label) ?? { label, count: 0, value: 0 }
    row.count++
    row.value += r.HAR_TotalSOAmount
    map.set(label, row)
  }
  return [...map.values()].sort((a, b) => b.value - a.value)
}

export const AGING_BUCKETS = [
  { label: '0-30', max: 30 },
  { label: '31-60', max: 60 },
  { label: '61-90', max: 90 },
  { label: '91-120', max: 120 },
  { label: '120+', max: Number.POSITIVE_INFINITY },
]

export function ageInDays(order: SalesOrder, now: Date): number {
  return Math.floor((now.getTime() - new Date(order.CreatedDateTime1).getTime()) / DAY_MS)
}

/** Open orders grouped by days since the order was created. */
export function openAging(rows: SalesOrder[], now = new Date()): GroupRow[] {
  const buckets = AGING_BUCKETS.map((b) => ({ label: b.label, count: 0, value: 0 }))
  for (const r of rows) {
    if (r.SalesStatus !== 'Open order') continue
    const age = ageInDays(r, now)
    const index = AGING_BUCKETS.findIndex((b) => age <= b.max)
    buckets[index].count++
    buckets[index].value += r.HAR_TotalSOAmount
  }
  return buckets
}

export interface Attention {
  onHold: SalesOrder[]
  pendingValidation: SalesOrder[]
  highValueOpen: SalesOrder[]
  agedOpen: SalesOrder[]
}

export function attention(
  rows: SalesOrder[],
  { highValue, agingDays }: { highValue: number; agingDays: number },
  now = new Date(),
): Attention {
  const byAmount = (a: SalesOrder, b: SalesOrder) => b.HAR_TotalSOAmount - a.HAR_TotalSOAmount
  const open = rows.filter((r) => r.SalesStatus === 'Open order')
  return {
    onHold: rows
      .filter((r) => r.MCROrderStopped === 'Yes' && r.SalesStatus !== 'Cancelled')
      .sort(byAmount),
    pendingValidation: open.filter((r) => r.DOT_ValidationStatus === 'Pending').sort(byAmount),
    highValueOpen: open.filter((r) => r.HAR_TotalSOAmount >= highValue).sort(byAmount),
    agedOpen: open
      .filter((r) => ageInDays(r, now) > agingDays)
      .sort((a, b) => a.CreatedDateTime1.localeCompare(b.CreatedDateTime1)),
  }
}

export function latest(rows: SalesOrder[], count: number): SalesOrder[] {
  return [...rows]
    .sort((a, b) => b.CreatedDateTime1.localeCompare(a.CreatedDateTime1))
    .slice(0, count)
}

/** Rounds up to a clean number: 1, 2, 2.5 or 5 times a power of ten. */
export function niceNumber(value: number): number {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const n = value / power
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return step * power
}

/** Axis scale with clean tick values, e.g. max 217 gives ticks 0, 100, 200, 300. */
export function niceScale(max: number, targetTicks = 4): { max: number; ticks: number[] } {
  const step = niceNumber(max / targetTicks)
  const top = Math.max(step, Math.ceil(max / step) * step)
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v)
  return { max: top, ticks }
}
