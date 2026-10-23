import { useRef } from 'react'
import { fetchMeta, fetchOrders } from './api/client'
import { Dashboard } from './components/Dashboard'
import { Filters } from './components/Filters'
import { LogoMark, RefreshIcon } from './components/Icons'
import { OrderDrawer } from './components/OrderDrawer'
import { OrdersTable } from './components/OrdersTable'
import { Pagination } from './components/Pagination'
import { EmptyState, ErrorState } from './components/States'
import { useApi } from './hooks/useApi'
import { useUrlState } from './hooks/useUrlState'
import { formatNumber, formatTime } from './lib/format'
import { hasActiveFilters } from './lib/query'

export default function App() {
  const { query, orderId, updateQuery, resetFilters, setOrderId } = useUrlState()
  const meta = useApi('meta', fetchMeta)
  const orders = useApi(JSON.stringify(query), (signal) => fetchOrders(query, signal), {
    keepPreviousData: true,
  })
  const ordersSectionRef = useRef<HTMLElement>(null)

  const result = orders.data
  const summary = result?.summary ?? null
  const filtersActive = hasActiveFilters(query)

  function refresh() {
    orders.reload()
    meta.reload()
  }

  /** Brings the table back into view when a change happens far below or above it. */
  function revealOrders() {
    const el = ordersSectionRef.current
    if (!el) return
    const { top } = el.getBoundingClientRect()
    if (top < 0 || top > window.innerHeight * 0.6) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function renderOrders() {
    if (!result && orders.error) {
      return (
        <ErrorState
          title="Unable to load orders"
          message={orders.error.message}
          onRetry={orders.reload}
        />
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
          title={`Page ${formatNumber(query.page)} is out of range`}
          action={
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => updateQuery({ page: 1 })}
            >
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
          onSort={(sort, order) => updateQuery({ sort, order })}
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
              revealOrders()
            }}
            onPageSizeChange={(pageSize) => updateQuery({ pageSize })}
          />
        )}
      </>
    )
  }

  return (
    <>
      <header className="topbar">
        <div className="container topbar__inner">
          <div className="brand">
            <LogoMark className="brand__mark" />
            <div>
              <p className="brand__org">Harrisons Sabah</p>
              <h1 className="brand__title">Sales Order Monitoring</h1>
            </div>
          </div>
          <div className="topbar__actions">
            {orders.updatedAt && (
              <span className="topbar__updated" aria-live="polite">
                Updated {formatTime(orders.updatedAt)}
              </span>
            )}
            <button
              type="button"
              className="btn btn--on-dark"
              onClick={refresh}
              disabled={orders.loading}
            >
              <RefreshIcon
                width="16"
                height="16"
                className={orders.loading ? 'spin' : undefined}
              />
              <span className="hide-sm">Refresh</span>
              <span className="sr-only">orders</span>
            </button>
          </div>
        </div>
        <div className={`topbar__progress${orders.loading ? ' is-active' : ''}`} aria-hidden="true" />
      </header>

      <main className="container main">
        <section className="section" aria-labelledby="overview-title">
          <div className="section__head">
            <h2 id="overview-title" className="section__title">
              Overview
            </h2>
          </div>
          <Dashboard
            summary={summary}
            error={orders.error}
            onRetry={orders.reload}
            branchCount={meta.data?.facets.sites.length ?? null}
            activeStatus={query.status}
            onStatusSelect={(status) => {
              updateQuery({ status })
              revealOrders()
            }}
          />
        </section>

        <section className="section" ref={ordersSectionRef} aria-labelledby="orders-title">
          <div className="section__head">
            <h2 id="orders-title" className="section__title">
              Orders
            </h2>
            {summary && (
              <span className="count-pill" aria-live="polite">
                {filtersActive
                  ? `${formatNumber(summary.filtered_orders)} of ${formatNumber(summary.total_orders)}`
                  : formatNumber(summary.total_orders)}
              </span>
            )}
          </div>

          <div className="panel panel--flush">
            <Filters
              query={query}
              sites={meta.data?.facets.sites ?? null}
              statuses={meta.data?.facets.statuses ?? null}
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

            {renderOrders()}
          </div>
        </section>
      </main>

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
