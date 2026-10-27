import type { CurrencyStyle, DateFormat } from '../settings/defaults'

const EMPTY = '-'

export interface FormatOptions {
  timeZone: string
  dateFormat: DateFormat
  currencyStyle: CurrencyStyle
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  timeZone: 'Asia/Kuala_Lumpur',
  dateFormat: 'DD MMM YYYY',
  currencyStyle: 'symbol',
}

export interface Formatter {
  currency: (value: number | null | undefined) => string
  /** "RM 998.2K", for tiles and chart labels. */
  currencyCompact: (value: number) => string
  number: (value: number | null | undefined) => string
  compact: (value: number) => string
  percent: (part: number, total: number) => string
  date: (value: string | null | undefined) => string
  dateTime: (value: string | null | undefined) => string
  time: (date: Date) => string
  /** "1:42:07 AM", for the live clock. */
  clock: (date: Date) => string
  /** "Saturday, 24 October 2026". */
  longDate: (date: Date) => string
  /** Hour of the day, 0 to 23, in the configured time zone. */
  hour: (date: Date) => number
  /** "2026-09" in the configured time zone, for grouping. */
  monthKey: (value: string) => string
  /** "Sep 2026" from a month key. */
  monthLabel: (key: string, withYear?: boolean) => string
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function createFormatter(options: Partial<FormatOptions> = {}): Formatter {
  const { timeZone, dateFormat, currencyStyle } = { ...DEFAULT_FORMAT_OPTIONS, ...options }
  const prefix = currencyStyle === 'code' ? 'MYR ' : 'RM '

  const money = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const integer = new Intl.NumberFormat('en-MY')
  const compactFmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone,
  })
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  })
  const clockFmt = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone,
  })
  const longDateFmt = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  })
  const hourFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone })

  function dateParts(date: Date) {
    const p = Object.fromEntries(parts.formatToParts(date).map((x) => [x.type, x.value]))
    return { day: p.day, month: p.month, year: p.year }
  }

  function date(value: string | null | undefined): string {
    const d = toDate(value)
    if (!d) return EMPTY
    const { day, month, year } = dateParts(d)
    if (dateFormat === 'DD/MM/YYYY') return `${day}/${month}/${year}`
    if (dateFormat === 'YYYY-MM-DD') return `${year}-${month}-${day}`
    return `${day} ${MONTHS[Number(month) - 1]} ${year}`
  }

  return {
    currency: (value) =>
      value === null || value === undefined || Number.isNaN(value) ? EMPTY : prefix + money.format(value),
    currencyCompact: (value) => prefix + compactFmt.format(value),
    number: (value) =>
      value === null || value === undefined || Number.isNaN(value) ? EMPTY : integer.format(value),
    compact: (value) => compactFmt.format(value),
    percent: (part, total) => (total ? `${((part / total) * 100).toFixed(1)}%` : '0%'),
    date,
    dateTime: (value) => {
      const d = toDate(value)
      return d ? `${date(value)}, ${timeFmt.format(d)}` : EMPTY
    },
    time: (d) => timeFmt.format(d),
    clock: (d) => clockFmt.format(d),
    longDate: (d) => longDateFmt.format(d).replace(/^(\w+) /, '$1, '),
    hour: (d) => Number(hourFmt.format(d)),
    monthKey: (value) => {
      const d = toDate(value)
      if (!d) return ''
      const { month, year } = dateParts(d)
      return `${year}-${month}`
    },
    monthLabel: (key, withYear = false) => {
      const [year, month] = key.split('-')
      return withYear ? `${MONTHS[Number(month) - 1]} ${year}` : MONTHS[Number(month) - 1]
    },
  }
}

/** Greeting for an hour of the day, 0 to 23. */
export function greeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function orDash(value: string | null | undefined): string {
  return value && value.trim() ? value : EMPTY
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}
