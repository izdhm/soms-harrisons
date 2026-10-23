import { formatNumber } from '../lib/format'
import { PAGE_SIZES, pageWindow } from '../lib/query'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  totalPages: number
  disabled?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  disabled = false,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <nav className="pagination" aria-label="Pagination">
      <div className="pagination__size">
        <label htmlFor="page-size">Rows per page</label>
        <div className="field field--select field--inline">
          <select
            id="page-size"
            className="select select--sm"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="field__chevron" width="14" height="14" />
        </div>
      </div>

      <p className="pagination__range" aria-live="polite">
        {first > last ? (
          <>Page {formatNumber(page)} of {formatNumber(totalPages)}</>
        ) : (
          <>
            {formatNumber(first)}-{formatNumber(last)} of {formatNumber(total)}
          </>
        )}
      </p>

      <div className="pagination__pages">
        <button
          type="button"
          className="page-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeftIcon width="16" height="16" />
        </button>
        {pageWindow(Math.min(page, totalPages), totalPages).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="page-gap" aria-hidden="true">
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`page-btn${p === page ? ' is-current' : ''}`}
              onClick={() => onPageChange(p)}
              disabled={disabled}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Page ${p}`}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="page-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRightIcon width="16" height="16" />
        </button>
      </div>
    </nav>
  )
}
