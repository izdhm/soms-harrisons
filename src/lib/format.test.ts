import { describe, expect, it } from 'vitest'
import { createFormatter, greeting, initials, orDash } from './format'

const fmt = createFormatter()

describe('currency', () => {
  it('formats ringgit with two decimals and a space after RM', () => {
    expect(fmt.currency(998244.3)).toBe('RM 998,244.30')
    expect(fmt.currency(0)).toBe('RM 0.00')
  })

  it('returns a dash for missing values', () => {
    expect(fmt.currency(null)).toBe('-')
    expect(fmt.currency(undefined)).toBe('-')
    expect(fmt.currency(Number.NaN)).toBe('-')
  })

  it('switches to the MYR code when configured', () => {
    expect(createFormatter({ currencyStyle: 'code' }).currency(12.5)).toBe('MYR 12.50')
  })

  it('shortens large values for tiles', () => {
    expect(fmt.currencyCompact(998244.3)).toBe('RM 998.2K')
  })
})

describe('dates', () => {
  it('shows the Malaysia calendar day, not the UTC day', () => {
    // 20:30 UTC on 30 Sep is 04:30 on 1 Oct in Malaysia (UTC+8).
    expect(fmt.date('2026-09-30T20:30:00.000Z')).toBe('01 Oct 2026')
    expect(fmt.date('2026-09-30T03:07:00.000Z')).toBe('30 Sep 2026')
  })

  it('includes the local time in dateTime', () => {
    expect(fmt.dateTime('2026-09-30T03:07:00.000Z')).toBe('30 Sep 2026, 11:07 AM')
  })

  it('follows the configured date format and time zone', () => {
    const iso = createFormatter({ dateFormat: 'YYYY-MM-DD' })
    expect(iso.date('2026-09-30T20:30:00.000Z')).toBe('2026-10-01')
    const slash = createFormatter({ dateFormat: 'DD/MM/YYYY', timeZone: 'UTC' })
    expect(slash.date('2026-09-30T20:30:00.000Z')).toBe('30/09/2026')
  })

  it('groups by month in the configured time zone', () => {
    expect(fmt.monthKey('2026-09-30T20:30:00.000Z')).toBe('2026-10')
    expect(fmt.monthLabel('2026-10')).toBe('Oct')
    expect(fmt.monthLabel('2026-10', true)).toBe('Oct 2026')
  })

  it('handles empty and invalid input', () => {
    expect(fmt.date(null)).toBe('-')
    expect(fmt.date('not a date')).toBe('-')
    expect(fmt.monthKey('not a date')).toBe('')
  })
})

describe('number helpers', () => {
  it('formats counts and percentages', () => {
    expect(fmt.number(1200)).toBe('1,200')
    expect(fmt.percent(420, 1200)).toBe('35.0%')
    expect(fmt.percent(5, 0)).toBe('0%')
  })

  it('falls back to a dash for blank text', () => {
    expect(orDash('  ')).toBe('-')
    expect(orDash(null)).toBe('-')
    expect(orDash('Confirmed')).toBe('Confirmed')
  })

  it('builds initials from a name', () => {
    expect(initials('Amir Hakim')).toBe('AH')
    expect(initials('  siti  ')).toBe('S')
  })
})

describe('welcome banner clock', () => {
  // 17:42:07 UTC on 23 Oct is 01:42:07 on Saturday 24 Oct in Malaysia.
  const instant = new Date('2026-10-23T17:42:07.000Z')

  it('shows the time, long date and hour in the configured zone', () => {
    expect(fmt.clock(instant)).toBe('1:42:07 AM')
    expect(fmt.longDate(instant)).toBe('Saturday, 24 October 2026')
    expect(fmt.hour(instant)).toBe(1)
    expect(createFormatter({ timeZone: 'UTC' }).hour(instant)).toBe(17)
  })

  it('picks a greeting for the hour', () => {
    expect(greeting(1)).toBe('Good morning')
    expect(greeting(11)).toBe('Good morning')
    expect(greeting(12)).toBe('Good afternoon')
    expect(greeting(18)).toBe('Good evening')
  })
})
