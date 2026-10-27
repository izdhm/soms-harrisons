import { useMemo, useRef, useState } from 'react'
import { fetchAllOrders, fetchMeta, fetchOrders } from '../api/client'
import type { OrderQuery } from '../api/types'
import { DownloadIcon, RefreshIcon } from '../components/Icons'
import { Filters } from '../components/orders/Filters'
import { OrderDrawer } from '../components/orders/OrderDrawer'
import { OrdersTable } from '../components/orders/OrdersTable'
import { Pagination } from '../components/orders/Pagination'
import { PageHeader } from '../components/Page'
import { EmptyState, ErrorState } from '../components/States'
import { useToast } from '../components/Toast'
import { useApi } from '../hooks/useApi'
import { useFormat } from '../hooks/useFormat'
import { useInterval } from '../hooks/useInterval'
import { useUrlState } from '../hooks/useUrlState'
import { downloadCsv, toCsv } from '../lib/csv'
import { createFormatter } from '../lib/format'
import { DEFAULT_QUERY, hasActiveFilters } from '../lib/query'
import { STATUS_ORDER, statusTone } from '../lib/status'
import { useSettings } from '../settings/SettingsContext'

export default function OrdersPage() {
  const { settings, branchName } = useSettings()
  const fmt = useFormat()
  const notify = useToast()
  const { pageSize, sort, order } = settings.orders
  const defaults = useMemo<OrderQuery>(
    () => ({ ...DEFAULT_QUERY, pageSize, sort, order }),
    [pageSize, sort, order],
  )
  const { query, orderId, updateQuery, resetFilters, setOrderId } = useUrlState(defaults)
  const meta = useApi('meta', fetchMeta)
  const orders = useApi(JSON.stringify(query), (signal) => fetchOrders(query, signal), {
    keepPreviousData: true,
  })
  useInterval(orders.reload, settings.api.refreshMinutes * 60_000)
  const [exporting, setExporting] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  const result = orders.data
  const summary = result?.summary ?? null
  const filtersActive = hasActiveFilters(query)
  // The API summary covers all orders, so per-status counts only apply when no other filter is set.
  const showTabCounts = summary !== null && !query.q.trim() && !query.site
  const tabCount: Record<string, number | undefined> = summary
    ? {
        '': summary.total_orders,
        'Open order': summary.open_orders,
        Delivered: summary.delivered_orders,
        Invoiced: summary.invoiced_orders,
        Cancelled: summary.cancelled_orders,
      }
    : {}

  function revealTable() {
    const el = sectionRef.current
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function exportCsv() {
    setExporting(true)
    try {
      const rows = await fetchAllOrders(query)
      const iso = createFormatter({ timeZone: settings.general.timeZone, dateFormat: 'YYYY-MM-DD' })
      const csv = toCsv([
        [
          'Order no.',
          'Customer',
          'Account',
          'Branch',
          'Branch name',
          'Order date',
          'Requested ship date',
          'Status',
          'Amount (MYR)',
          'Invoiced (MYR)',
          'Balance (MYR)',
          'Sales taker',
          'Customer ref.',
        ],
        ...rows.map((o) => [
          o.SalesId,
          o.SalesName,
          o.CustAccount,
          o.InventSiteId,
          branchName(o.InventSiteId),
          iso.date(o.CreatedDateTime1),
          iso.date(o.ShippingDateRequested),
          o.SalesStatus,
          o.HAR_TotalSOAmount.toFixed(2),
          o.HAR_InvoicedAmount?.toFixed(2),
          o.HAR_BalanceAmount?.toFixed(2),
          o.SalesTaker,
          o.CustomerRef,
        ]),
      ])
      downloadCsv(`sales-orders-${iso.date(new Date().toISOString())}.csv`, csv)
      notify(`Exported ${fmt.number(rows.length)} orders to CSV.`)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Export failed.', 'error')
    } finally {
      setExporting(false)
    }
  }

  function renderBody() {
    if (!result && orders.error) {
      return (
        <ErrorState title="Unable to load orders" message={orders.error.message} onRetry={orders.reload} />
      )
    }

    if (result && result.total === 0) {
      return (
        <EmptyState
          title={filtersActive ? 'No orders match your search and filters' : 'No orders available'}
          action={
            filtersActive && (
              <button type="button" className="btn btn--primary" onClick={resetFilters}>
                Clear filters
              </button>
            )
          }
        />
      )
    }

    if (result && result.data.length === 0) {
      return (
        <EmptyState
          title={`Page ${fmt.number(query.page)} is out of range`}
          action={
            <button type="button" className="btn btn--primary" onClick={() => updateQuery({ page: 1 })}>
              Go to page 1
            </button>
          }
        />
      )
    }

    return (
      <>
        <OrdersTable
          orders={result?.data ?? null}
          sort={query.sort}
          order={query.order}
          skeletonRows={Math.min(query.pageSize, 10)}
          busy={orders.loading && result !== null}
          selectedId={orderId}
          onSort={(s, o) => updateQuery({ sort: s, order: o })}
          onSelect={setOrderId}
        />
        {result && (
          <Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={result.total}
            totalPages={result.totalPages}
            disabled={orders.loading}
            onPageChange={(page) => {
              updateQuery({ page })
              revealTable()
            }}
            onPageSizeChange={(size) => updateQuery({ pageSize: size })}
          />
        )}
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Sales orders"
        badge={
          summary && (
            <span className="count-pill" aria-live="polite">
              {filtersActive
                ? `${fmt.number(summary.filtered_orders)} of ${fmt.number(summary.total_orders)}`
                : fmt.number(summary.total_orders)}
            </span>
          )
        }
        actions={
          <>
            {orders.updatedAt && (
              <span className="updated-at">Updated {fmt.time(orders.updatedAt)}</span>
            )}
            <button
              type="button"
              className="btn btn--ghost"
              onClick={exportCsv}
              disabled={exporting || !result || result.total === 0}
            >
              <DownloadIcon width="16" height="16" />
              {exporting ? 'Exporting' : 'Export CSV'}
            </button>
            <button type="button" className="btn btn--primary" onClick={orders.reload} disabled={orders.loading}>
              <RefreshIcon width="16" height="16" className={orders.loading ? 'spin' : undefined} />
              Refresh
            </button>
          </>
        }
      />

      <div className="status-tabs" role="tablist" aria-label="Filter by status">
        {['', ...STATUS_ORDER].map((status) => {
          const active = query.status === status
          return (
            <button
              key={status || 'all'}
              type="button"
              role="tab"
              aria-selected={active}
              className={`status-tab${active ? ' is-active' : ''}`}
              onClick={() => updateQuery({ status })}
            >
              {status && <span className={`dot dot--${statusTone(status)}`} aria-hidden="true" />}
              {status || 'All orders'}
              {showTabCounts && tabCount[status] !== undefined && (
                <span className="status-tab__count">{fmt.number(tabCount[status]!)}</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="card card--flush" ref={sectionRef}>
        <Filters
          query={query}
          sites={meta.data?.facets.sites ?? null}
          onChange={updateQuery}
          onReset={resetFilters}
        />

        {orders.error && result && (
          <div className="inline-alert inline-alert--bar" role="alert">
            <span>Could not refresh orders. {orders.error.message}</span>
            <button type="button" className="link-btn" onClick={orders.reload}>
              Retry
            </button>
          </div>
        )}

        {renderBody()}
      </div>

      {orderId && (
        <OrderDrawer
          key={orderId}
          salesId={orderId}
          preview={result?.data.find((o) => o.SalesId === orderId) ?? null}
          onClose={() => setOrderId(null)}
        />
      )}
    </>
  )
}
