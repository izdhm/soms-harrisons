import { useEffect, useRef, useState } from 'react'
import type { Facet, OrderQuery, SortField, SortOrder } from '../api/types'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { hasActiveFilters } from '../lib/query'
import { STATUS_ORDER } from '../lib/status'
import { ChevronDownIcon, CloseIcon, FilterResetIcon, SearchIcon } from './Icons'

const SEARCH_DEBOUNCE_MS = 350

const SORT_OPTIONS: { label: string; sort: SortField; order: SortOrder }[] = [
  { label: 'Order date, newest first', sort: 'CreatedDateTime1', order: 'desc' },
  { label: 'Order date, oldest first', sort: 'CreatedDateTime1', order: 'asc' },
  { label: 'Amount, highest first', sort: 'HAR_TotalSOAmount', order: 'desc' },
  { label: 'Amount, lowest first', sort: 'HAR_TotalSOAmount', order: 'asc' },
  { label: 'Order no., ascending', sort: 'SalesId', order: 'asc' },
  { label: 'Order no., descending', sort: 'SalesId', order: 'desc' },
  { label: 'Status, A to Z', sort: 'SalesStatus', order: 'asc' },
  { label: 'Status, Z to A', sort: 'SalesStatus', order: 'desc' },
  { label: 'Branch, A to Z', sort: 'InventSiteId', order: 'asc' },
  { label: 'Branch, Z to A', sort: 'InventSiteId', order: 'desc' },
]

interface FiltersProps {
  query: OrderQuery
  sites: Facet[] | null
  statuses: Facet[] | null
  onChange: (patch: Partial<OrderQuery>) => void
  onReset: () => void
}

/** Ensures the current value is always selectable, even if the facet list failed to load. */
function withCurrent(options: string[], current: string): string[] {
  return current && !options.includes(current) ? [...options, current] : options
}

export function Filters({ query, sites, statuses, onChange, onReset }: FiltersProps) {
  const [text, setText] = useState(query.q)
  const debouncedText = useDebouncedValue(text, SEARCH_DEBOUNCE_MS)
  const inputRef = useRef<HTMLInputElement>(null)

  // Typing settles, then the search is applied.
  useEffect(() => {
    if (debouncedText.trim() !== query.q.trim()) onChange({ q: debouncedText })
  }, [debouncedText])

  // Filters cleared elsewhere (e.g. the reset button) must also clear the box.
  useEffect(() => {
    setText((current) => (current.trim() === query.q.trim() ? current : query.q))
  }, [query.q])

  const siteOptions = withCurrent(sites?.map((s) => s.value) ?? [], query.site)
  const statusOptions = withCurrent(
    statuses?.map((s) => s.value) ?? [...STATUS_ORDER],
    query.status,
  )
  const siteCounts = new Map(sites?.map((s) => [s.value, s.count]))
  const sortValue = `${query.sort}:${query.order}`
  const filtersActive = hasActiveFilters(query)

  return (
    <div className="filters" role="search">
      <div className="field field--search">
        <label htmlFor="order-search" className="sr-only">
          Search orders
        </label>
        <SearchIcon className="field__icon" />
        <input
          ref={inputRef}
          id="order-search"
          type="search"
          className="input"
          placeholder="Search order no., customer, account, PO or sales taker"
          value={text}
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onChange({ q: text })
            if (e.key === 'Escape' && text) {
              e.preventDefault()
              setText('')
              onChange({ q: '' })
            }
          }}
        />
        {text && (
          <button
            type="button"
            className="field__clear"
            aria-label="Clear search"
            onClick={() => {
              setText('')
              onChange({ q: '' })
              inputRef.current?.focus()
            }}
          >
            <CloseIcon width="16" height="16" />
          </button>
        )}
      </div>

      <div className="field field--select">
        <label htmlFor="filter-site" className="field__label">
          Branch
        </label>
        <select
          id="filter-site"
          className="select"
          value={query.site}
          onChange={(e) => onChange({ site: e.target.value })}
        >
          <option value="">All branches</option>
          {siteOptions.map((site) => (
            <option key={site} value={site}>
              {siteCounts.has(site) ? `${site} (${siteCounts.get(site)})` : site}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="field__chevron" />
      </div>

      <div className="field field--select">
        <label htmlFor="filter-status" className="field__label">
          Status
        </label>
        <select
          id="filter-status"
          className="select"
          value={query.status}
          onChange={(e) => onChange({ status: e.target.value })}
        >
          <option value="">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="field__chevron" />
      </div>

      <div className="field field--select only-mobile">
        <label htmlFor="filter-sort" className="field__label">
          Sort
        </label>
        <select
          id="filter-sort"
          className="select"
          value={sortValue}
          onChange={(e) => {
            const [sort, order] = e.target.value.split(':') as [SortField, SortOrder]
            onChange({ sort, order })
          }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={`${o.sort}:${o.order}`} value={`${o.sort}:${o.order}`}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="field__chevron" />
      </div>

      <button
        type="button"
        className="btn btn--ghost filters__reset"
        onClick={() => {
          setText('')
          onReset()
        }}
        disabled={!filtersActive}
      >
        <FilterResetIcon width="16" height="16" />
        Clear filters
      </button>
    </div>
  )
}
