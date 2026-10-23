// All dates are shown in Malaysia time so every branch sees the same calendar day.
const TIME_ZONE = 'Asia/Kuala_Lumpur'
const EMPTY = '-'

const currencyFormatter = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat('en-MY')

const dateParts = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: TIME_ZONE,
})

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY
  // Intl renders "RM998.00"; a space reads better in tables and tiles.
  return currencyFormatter.format(value).replace(/^RM\s*/, 'RM ')
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EMPTY
  return numberFormatter.format(value)
}

export function formatPercent(part: number, total: number): string {
  if (!total) return '0%'
  return `${((part / total) * 100).toFixed(1)}%`
}

/** "30 Sep 2026" */
export function formatDate(value: string | null | undefined): string {
  const date = toDate(value)
  if (!date) return EMPTY
  const parts = Object.fromEntries(dateParts.formatToParts(date).map((p) => [p.type, p.value]))
  return `${parts.day} ${parts.month} ${parts.year}`
}

/** "30 Sep 2026, 11:07 AM" */
export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value)
  if (!date) return EMPTY
  return `${formatDate(value)}, ${timeFormatter.format(date)}`
}

export function formatTime(date: Date): string {
  return timeFormatter.format(date)
}

export function orDash(value: string | null | undefined): string {
  return value && value.trim() ? value : EMPTY
}
