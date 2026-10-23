import type { ReactNode } from 'react'
import type { ApiError } from '../api/client'
import type { OrdersSummary } from '../api/types'
import { formatCurrency, formatNumber, formatPercent } from '../lib/format'
import { STATUS_ORDER, statusTone } from '../lib/status'
import { ErrorState, Skeleton } from './States'

interface DashboardProps {
  summary: OrdersSummary | null
  error: ApiError | null
  onRetry: () => void
  branchCount: number | null
  activeStatus: string
  onStatusSelect: (status: string) => void
}

function countFor(summary: OrdersSummary, status: string): number {
  switch (status) {
    case 'Open order':
      return summary.open_orders
    case 'Delivered':
      return summary.delivered_orders
    case 'Invoiced':
      return summary.invoiced_orders
    case 'Cancelled':
      return summary.cancelled_orders
    default:
      return 0
  }
}

function Tile({
  label,
  value,
  meta,
  emphasis = false,
}: {
  label: string
  value: string | null
  meta?: ReactNode
  emphasis?: boolean
}) {
  return (
    <div className={`tile${emphasis ? ' tile--emphasis' : ''}`}>
      <p className="tile__label">{label}</p>
      {value === null ? (
        <>
          <Skeleton width="60%" height={30} />
          <Skeleton width="40%" height={12} />
        </>
      ) : (
        <>
          <p className="tile__value">{value}</p>
          {meta && <p className="tile__meta">{meta}</p>}
        </>
      )}
    </div>
  )
}

export function Dashboard({
  summary,
  error,
  onRetry,
  branchCount,
  activeStatus,
  onStatusSelect,
}: DashboardProps) {
  if (!summary && error) {
    return (
      <ErrorState
        compact
        title="Unable to load the dashboard"
        message={error.message}
        onRetry={onRetry}
      />
    )
  }

  const total = summary?.total_orders ?? 0
  const completed = summary ? summary.invoiced_orders + summary.delivered_orders : 0
  const average = summary && total ? summary.total_order_value / total : 0

  return (
    <>
      <div className="tiles">
        <Tile
          label="Total orders"
          value={summary ? formatNumber(total) : null}
          meta={branchCount ? `${branchCount} branches` : undefined}
        />
        <Tile
          label="Open / pending"
          value={summary ? formatNumber(summary.open_orders) : null}
          meta={summary && `${formatPercent(summary.open_orders, total)} of orders`}
        />
        <Tile
          label="Completed"
          value={summary ? formatNumber(completed) : null}
          meta={
            summary && (
              <>
                <span className="tile__split">
                  <span className="dot dot--invoiced" aria-hidden="true" />
                  Invoiced {formatNumber(summary.invoiced_orders)}
                </span>
                <span className="tile__split">
                  <span className="dot dot--delivered" aria-hidden="true" />
                  Delivered {formatNumber(summary.delivered_orders)}
                </span>
              </>
            )
          }
        />
        <Tile
          label="Cancelled"
          value={summary ? formatNumber(summary.cancelled_orders) : null}
          meta={summary && `${formatPercent(summary.cancelled_orders, total)} of orders`}
        />
        <Tile
          emphasis
          label="Total order value"
          value={summary ? formatCurrency(summary.total_order_value) : null}
          meta={summary && `Avg ${formatCurrency(average)} per order`}
        />
      </div>

      <div className="panel mix">
        <h3 className="panel__title">Order status mix</h3>
        {summary ? (
          <>
            <div className="mix__bar" aria-hidden="true">
              {STATUS_ORDER.map((status) => {
                const count = countFor(summary, status)
                if (!count) return null
                return (
                  <div
                    key={status}
                    className={`mix__segment mix__segment--${statusTone(status)}`}
                    style={{ flexGrow: count }}
                    onClick={() => onStatusSelect(activeStatus === status ? '' : status)}
                  >
                    <span className="mix__tip">
                      <strong>{status}</strong>
                      {formatNumber(count)} orders, {formatPercent(count, total)}
                    </span>
                  </div>
                )
              })}
            </div>
            <ul className="mix__legend" aria-label="Filter orders by status">
              {STATUS_ORDER.map((status) => {
                const count = countFor(summary, status)
                const active = activeStatus === status
                return (
                  <li key={status}>
                    <button
                      type="button"
                      className={`mix__item${active ? ' is-active' : ''}`}
                      aria-pressed={active}
                      onClick={() => onStatusSelect(active ? '' : status)}
                    >
                      <span className={`dot dot--${statusTone(status)}`} aria-hidden="true" />
                      <span className="mix__name">{status}</span>
                      <span className="mix__count">{formatNumber(count)}</span>
                      <span className="mix__pct">{formatPercent(count, total)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <>
            <Skeleton width="100%" height={14} />
            <div className="mix__legend">
              {STATUS_ORDER.map((s) => (
                <Skeleton key={s} width="100%" height={40} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
