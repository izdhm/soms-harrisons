import { describe, expect, it } from 'vitest'
import { csvCell, toCsv } from './csv'

describe('csv', () => {
  it('quotes cells that contain commas, quotes or line breaks', () => {
    expect(csvCell('Wong, Lee & Co')).toBe('"Wong, Lee & Co"')
    expect(csvCell('12" pipe')).toBe('"12"" pipe"')
    expect(csvCell(162.35)).toBe('162.35')
    expect(csvCell(null)).toBe('')
  })

  it('stops text from being read as a spreadsheet formula', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(csvCell(-5)).toBe('-5')
  })

  it('joins rows with CRLF', () => {
    expect(toCsv([['a', 1], ['b', 2]])).toBe('a,1\r\nb,2')
  })
})
