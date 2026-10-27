import { useMemo } from 'react'
import { createFormatter, type Formatter } from '../lib/format'
import { useSettings } from '../settings/SettingsContext'

/** Formatters that follow the time zone, date and currency settings. */
export function useFormat(): Formatter {
  const { timeZone, dateFormat, currencyStyle } = useSettings().settings.general
  return useMemo(
    () => createFormatter({ timeZone, dateFormat, currencyStyle }),
    [timeZone, dateFormat, currencyStyle],
  )
}
