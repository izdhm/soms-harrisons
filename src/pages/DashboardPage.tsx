import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { fetchMeta } from '../api/client'
import type { SalesOrder } from '../api/types'
import { AgingChart, MonthlyChart, RankBars, StatusBreakdown, StatusLegend } from '../components/dashboard/Charts'
import { WelcomeBanner } from '../components/dashboard/WelcomeBanner'
import {
  ArrowRightIcon,
  BanknoteIcon,
  CheckCircleIcon,
  ClockIcon,
  OrdersIcon,
  RefreshIcon,
  WalletIcon,
  XCircleIcon,
} from '../components/Icons'
import { DateField, PageHeader, Panel, Segmented, SelectField } from '../components/Page'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { StatusBadge } from '../components/StatusBadge'
import { useApi } from '../hooks/useApi'
import { useFormat } from '../hooks/useFormat'
import { useInterval } from '../hooks/useInterval'
import { useOrderDataset } from '../hooks/useOrderDataset'
import {
  PERIODS,
  ageInDays,
  attention,
  byBranch,
  byMonth,
  byStatus,
  filterOrders,
  latest,
  openAging,
  periodStart,
  rankBy,
  toDateRange,
  totals,
  type Attention,
  type DateRange,
  type Period,
} from '../lib/analytics'
import { useSettings } from '../settings/SettingsContext'

type AttentionKey = keyof Attention

const ATTENTION_TABS: { key: AttentionKey; label: string }[] = [
  { key: 'onHold', label: 'On hold' },
  { key: 'pendingValidation', label: 'Pending validation' },
  { key: 'highValueOpen', label: 'High value' },
  { key: 'agedOpen', label: 'Aged' },
]

function isPeriod(value: string | null): value is Period {
  return PERIODS.some((p) => p.value === value)
}

function KpiTile({
  label,
  value,
  title,
  meta,
  icon,
}: {
  label: string
  value: string
  title?: string
  meta?: ReactNode
  icon: ReactNode
}) {
  return (
    <div className="tile">
      <div className="tile__body">
        <p className="tile__label">{label}</p>
        <p className="tile__value" title={title}>
          {value}
        </p>
        {meta && <p className="tile__meta">{meta}</p>}
      </div>
      <span className="tile__icon" aria-hidden="true">
        {icon}
      </span>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="tiles">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="tile">
            <div className="tile__body">
              <Skeleton width="50%" height={12} />
              <Skeleton width="70%" height={28} />
              <Skeleton width="40%" height={10} />
            </div>
            <span className="tile__icon tile__icon--loading" />
          </div>
        ))}
      </div>
      <div className="dash-grid">
        <div className="card span-8 card--skeleton">
          <Skeleton width="30%" height={16} />
          <Skeleton width="100%" height={240} />
        </div>
        <div className="card span-4 card--skeleton">
          <Skeleton width="40%" height={16} />
          <Skeleton width="100%" height={240} />
        </div>
      </div>
    </>
  )
}

export default function DashboardPage() {
  const fmt = useFormat()
  const navigate = useNavigate()
  const { settings, branchName } = useSettings()
  const [params, setParams] = useSearchParams()
  const periodParam = params.get('period')
  const period: Period = isPeriod(periodParam) ? periodParam : 'all'
  const range = useMemo(() => toDateRange(params.get('from'), params.get('to')), [params])
  const site = params.get('site') ?? ''
  const focus = params.get('focus')

  const dataset = useOrderDataset()
  const meta = useApi('meta', fetchMeta)
  useInterval(() => void dataset.reload(), settings.api.refreshMinutes * 60_000)

  const [metric, setMetric] = useState<'orders' | 'value'>('orders')
  const [attentionTab, setAttentionTab] = useState<AttentionKey>('onHold')
  const attentionRef = useRef<HTMLDivElement>(null)

  // Deep links from the notification bell open the matching attention list.
  useEffect(() => {
    if (!focus || !ATTENTION_TABS.some((t) => t.key === focus)) return
    setAttentionTab(focus as AttentionKey)
    attentionRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('focus')
        return next
      },
      { replace: true },
    )
  }, [focus, dataset.rows, setParams])

  // React Router passes updaters the params of the last render, which lag behind when the From
  // and To dates change in quick succession, so each update starts from the live address instead.
  function updateParams(edit: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(window.location.search)
    edit(next)
    setParams(next, { replace: true })
  }

  function setFilter(key: 'site' | 'from' | 'to', value: string) {
    updateParams((next) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
  }

  const now = useMemo(() => new Date(), [dataset.fetchedAt])
  const today = fmt.dayKey(now)

  // A custom range opens on the days the current period already covers, so the figures stay put
  // until a date is changed.
  function spanOf(p: Period): DateRange {
    const times = (dataset.rows ?? []).map((r) => Date.parse(r.CreatedDateTime1))
    const first = times.length ? Math.min(...times) : Number.NEGATIVE_INFINITY
    const start = Math.max(periodStart(p, now), first)
    return { from: Number.isFinite(start) ? fmt.dayKey(new Date(start)) : '', to: today }
  }

  function setPeriod(value: string) {
    updateParams((next) => {
      next.delete('from')
      next.delete('to')
      if (value === 'all') next.delete('period')
      else next.set('period', value)
      if (value === 'custom') {
        const span = spanOf(period)
        if (span.from) next.set('from', span.from)
        next.set('to', span.to)
      }
    })
  }

  const rows = useMemo(
    () => (dataset.rows ? filterOrders(dataset.rows, { site, period, range }, now, fmt.dayKey) : null),
    [dataset.rows, site, period, range, now, fmt],
  )

  const view = useMemo(() => {
    if (!rows) return null
    const months = byMonth(rows, fmt.monthKey)
    return {
      totals: totals(rows),
      months,
      statuses: byStatus(rows),
      branches: byBranch(rows),
      groups: rankBy(rows, (r) => r.DOT_ItemGroupId),
      customers: rankBy(rows, (r) => r.SalesName),
      aging: openAging(rows, now),
      attention: attention(
        rows,
        { highValue: settings.orders.highValueThreshold, agingDays: settings.notifications.agingDays },
        now,
      ),
      recent: latest(rows, 6),
    }
  }, [rows, fmt, now, settings.orders.highValueThreshold, settings.notifications.agingDays])

  const ordersLink = (extra: Record<string, string>) => {
    const p = new URLSearchParams(extra)
    if (site && !p.has('site')) p.set('site', site)
    return `/app/orders?${p.toString()}`
  }

  const openOrder = (o: SalesOrder) => navigate(`/app/orders?order_id=${encodeURIComponent(o.SalesId)}`)

  const header = (
    <PageHeader
      title="Dashboard"
      actions={
        <>
          {dataset.fetchedAt && (
            <span className="updated-at" aria-live="polite">
              Updated {fmt.time(dataset.fetchedAt)}
            </span>
          )}
          <SelectField
            id="dash-period"
            label="Period"
            value={period}
            onChange={setPeriod}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </SelectField>
          {period === 'custom' && (
            <div className="date-range" role="group" aria-label="Custom range">
              <DateField
                id="dash-from"
                label="From"
                value={range.from}
                max={range.to || today}
                onChange={(v) => setFilter('from', v)}
              />
              <DateField
                id="dash-to"
                label="To"
                value={range.to}
                min={range.from || undefined}
                max={today}
                onChange={(v) => setFilter('to', v)}
              />
            </div>
          )}
          <SelectField id="dash-site" label="Branch" value={site} onChange={(v) => setFilter('site', v)}>
            <option value="">All branches</option>
            {(meta.data?.facets.sites ?? []).map((s) => (
              <option key={s.value} value={s.value}>
                {branchName(s.value) === s.value ? s.value : `${s.value}, ${branchName(s.value)}`}
              </option>
            ))}
          </SelectField>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => void dataset.reload()}
            disabled={dataset.loading}
          >
            <RefreshIcon width="16" height="16" className={dataset.loading ? 'spin' : undefined} />
            Refresh
          </button>
        </>
      }
    />
  )

  if (!view) {
    return (
      <>
        {header}
        <WelcomeBanner />
        {dataset.error ? (
          <ErrorState
            compact
            title="Unable to load the dashboard"
            message={dataset.error.message}
            onRetry={() => void dataset.reload()}
          />
        ) : (
          <DashboardSkeleton />
        )}
      </>
    )
  }

  const t = view.totals
  const attentionRows = view.attention[attentionTab]

  return (
    <>
      {header}
      <WelcomeBanner />

      {dataset.error && (
        <div className="inline-alert" role="alert">
          <span>Could not refresh. Showing data from {fmt.time(dataset.fetchedAt!)}. {dataset.error.message}</span>
          <button type="button" className="link-btn" onClick={() => void dataset.reload()}>
            Retry
          </button>
        </div>
      )}

      <div className={`tiles${dataset.loading ? ' is-refreshing' : ''}`}>
        <KpiTile
          label="Total orders"
          value={fmt.number(t.orders)}
          meta={`${view.branches.length} branches`}
          icon={<OrdersIcon />}
        />
        <KpiTile
          label="Open / pending"
          value={fmt.number(t.open)}
          meta={`${fmt.percent(t.open, t.orders)} of orders`}
          icon={<ClockIcon />}
        />
        <KpiTile
          label="Completed"
          value={fmt.number(t.completed)}
          meta={
            <>
              <span className="tile__split">
                <span className="dot dot--delivered" aria-hidden="true" />
                Delivered {fmt.number(t.delivered)}
              </span>
              <span className="tile__split">
                <span className="dot dot--invoiced" aria-hidden="true" />
                Invoiced {fmt.number(t.invoiced)}
              </span>
            </>
          }
          icon={<CheckCircleIcon />}
        />
        <KpiTile
          label="Cancelled"
          value={fmt.number(t.cancelled)}
          meta={`${fmt.percent(t.cancelled, t.orders)} cancellation rate`}
          icon={<XCircleIcon />}
        />
        <KpiTile
          label="Total order value"
          value={fmt.currencyCompact(t.value)}
          title={fmt.currency(t.value)}
          meta={`Avg ${fmt.currency(t.average)} per order`}
          icon={<BanknoteIcon />}
        />
        <KpiTile
          label="Outstanding balance"
          value={fmt.currencyCompact(t.balance)}
          title={fmt.currency(t.balance)}
          meta={`${fmt.percent(t.balance, t.value)} of order value`}
          icon={<WalletIcon />}
        />
      </div>

      {t.orders === 0 ? (
        <div className="card">
          <EmptyState
            title="No orders in this period"
            action={
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
              >
                Show all orders
              </button>
            }
          />
        </div>
      ) : (
        <div className="dash-grid">
          <Panel
            title="Orders by month"
            className="span-8"
            actions={
              <Segmented
                label="Chart metric"
                value={metric}
                onChange={setMetric}
                options={[
                  { value: 'orders', label: 'Orders' },
                  { value: 'value', label: 'Value' },
                ]}
              />
            }
          >
            <StatusLegend />
            <MonthlyChart buckets={view.months} metric={metric} fmt={fmt} />
          </Panel>

          <Panel title="Status breakdown" className="span-4">
            <StatusBreakdown
              slices={view.statuses}
              fmt={fmt}
              onSelect={(status) => navigate(ordersLink({ status }))}
            />
          </Panel>

          <div className="span-7" ref={attentionRef}>
            <Panel title="Needs attention" className="card--fill">
              <div className="tabs" role="tablist" aria-label="Attention lists">
                {ATTENTION_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={attentionTab === tab.key}
                    className={`tabs__tab${attentionTab === tab.key ? ' is-active' : ''}`}
                    onClick={() => setAttentionTab(tab.key)}
                  >
                    {tab.label}
                    <span className="tabs__count">{fmt.number(view.attention[tab.key].length)}</span>
                  </button>
                ))}
              </div>
              {attentionRows.length === 0 ? (
                <EmptyState title="Nothing needs attention here" />
              ) : (
                <ul className="attention" role="tabpanel">
                  {attentionRows.map((o) => (
                    <li key={o.SalesId}>
                      <button type="button" className="attention__row" onClick={() => openOrder(o)}>
                        <span className="attention__main">
                          <span className="attention__id">{o.SalesId}</span>
                          <span className="attention__customer">{o.SalesName}</span>
                        </span>
                        <span className="site-tag">{o.InventSiteId}</span>
                        <span className="attention__age">{fmt.number(ageInDays(o, now))} days</span>
                        <StatusBadge status={o.SalesStatus} />
                        <span className="attention__amount">{fmt.currency(o.HAR_TotalSOAmount)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel title="Open order aging" className="span-5 card--stretch">
            <AgingChart buckets={view.aging} fmt={fmt} />
          </Panel>

          <Panel title="Branch performance" className="span-7">
            <div className="table-scroll">
              <table className="mini-table">
                <thead>
                  <tr>
                    <th scope="col">Branch</th>
                    <th scope="col" className="num">Orders</th>
                    <th scope="col" className="num">Open</th>
                    <th scope="col" className="num">Cancel rate</th>
                    <th scope="col" className="num">Order value</th>
                  </tr>
                </thead>
                <tbody>
                  {view.branches.map((b) => {
                    const name = branchName(b.site)
                    return (
                      <tr key={b.site} onClick={() => navigate(ordersLink({ site: b.site }))}>
                        <td>
                          <Link to={ordersLink({ site: b.site })} className="mini-table__link">
                            <span className="site-tag">{b.site}</span>
                            {name !== b.site && <span className="site-name">{name}</span>}
                          </Link>
                        </td>
                        <td className="num">{fmt.number(b.orders)}</td>
                        <td className="num">{fmt.number(b.open)}</td>
                        <td className="num">{fmt.percent(b.cancelled, b.orders)}</td>
                        <td className="num strong">{fmt.currency(b.value)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Sales by product group" className="span-5">
            <RankBars rows={view.groups} fmt={fmt} />
          </Panel>

          <Panel
            title="Recent orders"
            className="span-8"
            actions={
              <Link to={ordersLink({})} className="link-btn link-btn--icon">
                View all
                <ArrowRightIcon width="15" height="15" />
              </Link>
            }
          >
            <div className="table-scroll">
              <table className="mini-table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Branch</th>
                    <th scope="col">Order date</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {view.recent.map((o) => (
                    <tr key={o.SalesId} onClick={() => openOrder(o)}>
                      <td>
                        <Link
                          to={`/app/orders?order_id=${encodeURIComponent(o.SalesId)}`}
                          className="mini-table__link strong"
                        >
                          {o.SalesId}
                        </Link>
                        <span className="mini-table__sub">{o.SalesName}</span>
                      </td>
                      <td>
                        <span className="site-tag">{o.InventSiteId}</span>
                      </td>
                      <td className="nowrap">{fmt.date(o.CreatedDateTime1)}</td>
                      <td>
                        <StatusBadge status={o.SalesStatus} />
                      </td>
                      <td className="num strong">{fmt.currency(o.HAR_TotalSOAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Top customers" className="span-4">
            <RankBars
              rows={view.customers}
              fmt={fmt}
              limit={5}
              onSelect={(name) => navigate(ordersLink({ q: name }))}
            />
          </Panel>
        </div>
      )}
    </>
  )
}
