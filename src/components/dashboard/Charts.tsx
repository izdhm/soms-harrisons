import type { ReactNode } from 'react'
import type { Formatter } from '../../lib/format'
import { niceScale, type GroupRow, type MonthBucket, type StatusSlice } from '../../lib/analytics'
import { STATUS_ORDER, statusTone } from '../../lib/status'

/* Legend for status series. */
export function StatusLegend({ statuses = STATUS_ORDER }: { statuses?: readonly string[] }) {
  return (
    <ul className="legend" aria-label="Legend">
      {statuses.map((s) => (
        <li key={s}>
          <span className={`dot dot--${statusTone(s)}`} aria-hidden="true" />
          {s}
        </li>
      ))}
    </ul>
  )
}

function Tooltip({ children, edge }: { children: ReactNode; edge: 'start' | 'middle' | 'end' }) {
  return <span className={`chart-tip chart-tip--${edge}`}>{children}</span>
}

function edgeFor(index: number, count: number): 'start' | 'middle' | 'end' {
  if (count > 3 && index === 0) return 'start'
  if (count > 3 && index === count - 1) return 'end'
  return 'middle'
}

/* Monthly stacked columns, one segment per status. */
export function MonthlyChart({
  buckets,
  metric,
  fmt,
}: {
  buckets: MonthBucket[]
  metric: 'orders' | 'value'
  fmt: Formatter
}) {
  const pick = (b: MonthBucket, s: string) => (metric === 'orders' ? b.counts[s] ?? 0 : b.values[s] ?? 0)
  const totalOf = (b: MonthBucket) => (metric === 'orders' ? b.orders : b.value)
  const scale = niceScale(Math.max(...buckets.map(totalOf), 1))
  const formatTick = (v: number) => (metric === 'orders' ? fmt.number(v) : fmt.compact(v))
  const formatValue = (v: number) => (metric === 'orders' ? fmt.number(v) : fmt.currency(v))

  return (
    <div className="colchart" role="img" aria-label={`Orders by month, ${metric === 'orders' ? 'count' : 'value'}`}>
      <div className="colchart__plot">
        {scale.ticks.map((t) => (
          <div key={t} className="colchart__grid" style={{ bottom: `${(t / scale.max) * 100}%` }}>
            <span className="colchart__tick">{formatTick(t)}</span>
          </div>
        ))}
        <div className="colchart__cols">
          {buckets.map((b, i) => {
            const total = totalOf(b)
            return (
              <div key={b.key} className="colchart__slot" tabIndex={0}>
                <div className="colchart__col" style={{ height: `${(total / scale.max) * 100}%` }}>
                  {STATUS_ORDER.map((s) => {
                    const v = pick(b, s)
                    if (!v) return null
                    return (
                      <span
                        key={s}
                        className={`colchart__seg fill--${statusTone(s)}`}
                        style={{ flexGrow: v }}
                      />
                    )
                  })}
                </div>
                <Tooltip edge={edgeFor(i, buckets.length)}>
                  <strong>{fmt.monthLabel(b.key, true)}</strong>
                  {STATUS_ORDER.map((s) => (
                    <span key={s} className="chart-tip__row">
                      <span className={`dot dot--${statusTone(s)}`} aria-hidden="true" />
                      <span>{s}</span>
                      <span className="chart-tip__val">{formatValue(pick(b, s))}</span>
                    </span>
                  ))}
                  <span className="chart-tip__row chart-tip__total">
                    <span />
                    <span>Total</span>
                    <span className="chart-tip__val">{formatValue(total)}</span>
                  </span>
                </Tooltip>
              </div>
            )
          })}
        </div>
      </div>
      <div className="colchart__labels" aria-hidden="true">
        {buckets.map((b, i) => {
          const showYear = i === 0 || b.key.slice(0, 4) !== buckets[i - 1].key.slice(0, 4)
          return (
            <span key={b.key}>
              {fmt.monthLabel(b.key)}
              {showYear && <em>{b.key.slice(0, 4)}</em>}
            </span>
          )
        })}
      </div>
    </div>
  )
}

/* Open order aging: ordered buckets on a single-hue ramp, counts on the caps. */
export function AgingChart({ buckets, fmt }: { buckets: GroupRow[]; fmt: Formatter }) {
  const max = Math.max(...buckets.map((b) => b.count), 1)
  return (
    <div className="aging" role="img" aria-label="Open orders by days since order date">
      <div className="aging__cols">
        {buckets.map((b, i) => (
          <div key={b.label} className="aging__slot" tabIndex={0}>
            <div
              className={`aging__col ramp-${i + 1}`}
              style={{ height: `${Math.max((b.count / max) * 100, b.count ? 3 : 0)}%` }}
            >
              <span className="aging__cap">{fmt.number(b.count)}</span>
            </div>
            <Tooltip edge={edgeFor(i, buckets.length)}>
              <strong>{b.label} days</strong>
              <span className="chart-tip__row chart-tip__row--plain">
                <span>Open orders</span>
                <span className="chart-tip__val">{fmt.number(b.count)}</span>
              </span>
              <span className="chart-tip__row chart-tip__row--plain">
                <span>Value</span>
                <span className="chart-tip__val">{fmt.currency(b.value)}</span>
              </span>
            </Tooltip>
          </div>
        ))}
      </div>
      <div className="aging__labels" aria-hidden="true">
        {buckets.map((b) => (
          <span key={b.label}>{b.label}</span>
        ))}
      </div>
      <p className="axis-title">Days since order date</p>
    </div>
  )
}

/* Ranked horizontal bars, one hue. */
export function RankBars({
  rows,
  fmt,
  limit = 6,
  onSelect,
}: {
  rows: GroupRow[]
  fmt: Formatter
  limit?: number
  onSelect?: (label: string) => void
}) {
  const shown = rows.slice(0, limit)
  const max = Math.max(...shown.map((r) => r.value), 1)
  return (
    <ol className="rank">
      {shown.map((r, i) => {
        const content = (
          <>
            <span className="rank__pos">{i + 1}</span>
            <span className="rank__label">{r.label}</span>
            <span className="rank__value">{fmt.currency(r.value)}</span>
            <span className="rank__track" aria-hidden="true">
              <span className="rank__fill" style={{ width: `${(r.value / max) * 100}%` }} />
            </span>
            <span className="rank__meta">{fmt.number(r.count)} orders</span>
          </>
        )
        return (
          <li key={r.label}>
            {onSelect ? (
              <button type="button" className="rank__row" onClick={() => onSelect(r.label)}>
                {content}
              </button>
            ) : (
              <div className="rank__row">{content}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* Part-to-whole bar for statuses, with a clickable legend table. */
export function StatusBreakdown({
  slices,
  fmt,
  onSelect,
}: {
  slices: StatusSlice[]
  fmt: Formatter
  onSelect: (status: string) => void
}) {
  const total = slices.reduce((s, x) => s + x.count, 0)
  const visible = slices.filter((s) => s.count > 0)
  return (
    <div className="status-breakdown">
      <div className="mix__bar" aria-hidden="true">
        {visible.map((s, i) => (
          <div
            key={s.status}
            className={`mix__segment fill--${statusTone(s.status)}`}
            style={{ flexGrow: s.count }}
            onClick={() => onSelect(s.status)}
          >
            <Tooltip edge={i === 0 ? 'start' : i === visible.length - 1 ? 'end' : 'middle'}>
              <strong>{s.status}</strong>
              <span className="chart-tip__row chart-tip__row--plain">
                <span>{fmt.number(s.count)} orders</span>
                <span className="chart-tip__val">{fmt.percent(s.count, total)}</span>
              </span>
            </Tooltip>
          </div>
        ))}
      </div>
      <ul className="status-list" aria-label="Open orders filtered by status">
        {slices.map((s) => (
          <li key={s.status}>
            <button type="button" className="status-list__row" onClick={() => onSelect(s.status)}>
              <span className={`dot dot--${statusTone(s.status)}`} aria-hidden="true" />
              <span className="status-list__name">{s.status}</span>
              <span className="status-list__count">{fmt.number(s.count)}</span>
              <span className="status-list__pct">{fmt.percent(s.count, total)}</span>
              <span className="status-list__value">{fmt.currencyCompact(s.value)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
