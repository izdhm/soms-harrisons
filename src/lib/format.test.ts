import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent, orDash } from './format'

describe('formatCurrency', () => {
  it('formats ringgit with two decimals and a space after RM', () => {
    expect(formatCurrency(998244.3)).toBe('RM 998,244.30')
    expect(formatCurrency(0)).toBe('RM 0.00')
  })

  it('returns a dash for missing values', () => {
    expect(formatCurrency(null)).toBe('-')
    expect(formatCurrency(undefined)).toBe('-')
    expect(formatCurrency(Number.NaN)).toBe('-')
  })
})

describe('formatDate', () => {
  it('shows the Malaysia calendar day, not the UTC day', () => {
    // 20:30 UTC on 30 Sep is 04:30 on 1 Oct in Malaysia (UTC+8).
    expect(formatDate('2026-09-30T20:30:00.000Z')).toBe('01 Oct 2026')
    expect(formatDate('2026-09-30T03:07:00.000Z')).toBe('30 Sep 2026')
  })

  it('includes the local time in formatDateTime', () => {
    expect(formatDateTime('2026-09-30T03:07:00.000Z')).toBe('30 Sep 2026, 11:07 AM')
  })

  it('handles empty and invalid input', () => {
    expect(formatDate(null)).toBe('-')
    expect(formatDate('not a date')).toBe('-')
  })
})

describe('number helpers', () => {
  it('formats counts and percentages', () => {
    expect(formatNumber(1200)).toBe('1,200')
    expect(formatPercent(420, 1200)).toBe('35.0%')
    expect(formatPercent(5, 0)).toBe('0%')
  })

  it('falls back to a dash for blank text', () => {
    expect(orDash('  ')).toBe('-')
    expect(orDash(null)).toBe('-')
    expect(orDash('Confirmed')).toBe('Confirmed')
  })
})
