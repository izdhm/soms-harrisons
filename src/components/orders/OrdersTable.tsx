import type { SalesOrder, SortField, SortOrder } from '../../api/types'
import { useFormat } from '../../hooks/useFormat'
import { useSettings } from '../../settings/SettingsContext'
import { FlagIcon, SortIcon } from '../Icons'
import { Skeleton } from '../States'
import { StatusBadge } from '../StatusBadge'

interface Column {
  key: string
  label: string
  sort?: SortField
  /** Direction applied the first time a column is sorted. */
  firstOrder?: SortOrder
  align?: 'right'
}

const COLUMNS: Column[] = [
  { key: 'id', label: 'Order no.', sort: 'SalesId', firstOrder: 'asc' },
  { key: 'customer', label: 'Customer' },
  { key: 'site', label: 'Branch', sort: 'InventSiteId', firstOrder: 'asc' },
  { key: 'date', label: 'Order date', sort: 'CreatedDateTime1', firstOrder: 'desc' },
  { key: 'status', label: 'Status', sort: 'SalesStatus', firstOrder: 'asc' },
  { key: 'amount', label: 'Amount', sort: 'HAR_TotalSOAmount', firstOrder: 'desc', align: 'right' },
]

interface OrdersTableProps {
  orders: SalesOrder[] | null
  sort: SortField
  order: SortOrder
  skeletonRows: number
  busy: boolean
  selectedId: string | null
  onSort: (sort: SortField, order: SortOrder) => void
  onSelect: (salesId: string) => void
}

export function OrdersTable({
  orders,
  sort,
  order,
  skeletonRows,
  busy,
  selectedId,
  onSort,
  onSelect,
}: OrdersTableProps) {
  const fmt = useFormat()
  const { settings, branchName } = useSettings()
  const { flagHighValue, highValueThreshold } = settings.orders

  return (
    <div className={`table-wrap${busy ? ' is-busy' : ''}`} aria-busy={busy}>
      <table className="orders">
        <thead>
          <tr>
            {COLUMNS.map((col) => {
              const active = col.sort === sort
              const ariaSort = active ? (order === 'asc' ? 'ascending' : 'descending') : undefined
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className={col.align === 'right' ? 'num' : undefined}
                >
                  {col.sort ? (
                    <button
                      type="button"
                      className={`th-sort${active ? ' is-active' : ''}`}
                      onClick={() =>
                        onSort(
                          col.sort!,
                          active ? (order === 'asc' ? 'desc' : 'asc') : col.firstOrder ?? 'asc',
                        )
                      }
                    >
                      {col.label}
                      <SortIcon sortOrder={active ? order : null} />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {orders === null
            ? Array.from({ length: skeletonRows }, (_, i) => (
                <tr key={i} className="row-skeleton">
                  <td className="cell-id"><Skeleton width={110} /></td>
                  <td className="cell-customer">
                    <Skeleton width="70%" />
                    <Skeleton width={60} height={10} />
                  </td>
                  <td className="cell-site"><Skeleton width={44} /></td>
                  <td className="cell-date"><Skeleton width={90} /></td>
                  <td className="cell-status"><Skeleton width={96} height={22} /></td>
                  <td className="num cell-amount"><Skeleton width={80} /></td>
                </tr>
              ))
            : orders.map((o) => {
                const highValue = flagHighValue && o.HAR_TotalSOAmount >= highValueThreshold
                const name = branchName(o.InventSiteId)
                return (
                  <tr
                    key={o.SalesId}
                    className={o.SalesId === selectedId ? 'is-selected' : undefined}
                    onClick={() => onSelect(o.SalesId)}
                  >
                    <td data-label="Order no." className="cell-id">
                      <button
                        type="button"
                        className="link-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelect(o.SalesId)
                        }}
                      >
                        {o.SalesId}
                      </button>
                    </td>
                    <td data-label="Customer" className="cell-customer">
                      <span className="cell-customer__name">{o.SalesName}</span>
                      <span className="cell-customer__acct">{o.CustAccount}</span>
                    </td>
                    <td data-label="Branch" className="cell-site">
                      <span className="site-tag">{o.InventSiteId}</span>
                      {name !== o.InventSiteId && <span className="site-name">{name}</span>}
                    </td>
                    <td data-label="Order date" className="cell-date">
                      {fmt.date(o.CreatedDateTime1)}
                    </td>
                    <td data-label="Status" className="cell-status">
                      <StatusBadge status={o.SalesStatus} />
                    </td>
                    <td data-label="Amount" className="num cell-amount">
                      {highValue && (
                        <span className="hv-flag" title={`High value (from ${fmt.currency(highValueThreshold)})`}>
                          <FlagIcon width="13" height="13" />
                          <span className="sr-only">High value</span>
                        </span>
                      )}
                      {fmt.currency(o.HAR_TotalSOAmount)}
                    </td>
                  </tr>
                )
              })}
        </tbody>
      </table>
    </div>
  )
}
