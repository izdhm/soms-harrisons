import { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useFormat } from '../../hooks/useFormat'
import { useInterval } from '../../hooks/useInterval'
import { greeting } from '../../lib/format'
import { TIME_ZONES } from '../../settings/defaults'
import { useSettings } from '../../settings/SettingsContext'
import { MoonIcon, SunIcon } from '../Icons'

/* Greets the signed-in user and shows a live clock in the configured time zone. */
export function WelcomeBanner() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const fmt = useFormat()
  const [now, setNow] = useState(() => new Date())
  useInterval(() => setNow(new Date()), 1000)

  const hour = fmt.hour(now)
  const Icon = hour >= 7 && hour < 19 ? SunIcon : MoonIcon
  const firstName = user?.name.split(/\s+/)[0] ?? ''
  const zone = TIME_ZONES.find((z) => z.value === settings.general.timeZone)?.label ?? settings.general.timeZone
  const [time, period] = fmt.clock(now).split(/\s+/)

  return (
    <section className="welcome" aria-label="Welcome">
      <div className="welcome__hello">
        <p className="welcome__date">
          <Icon width="15" height="15" aria-hidden="true" />
          {fmt.longDate(now)}
        </p>
        <h2 className="welcome__greeting">
          {greeting(hour)}, {firstName}
        </h2>
      </div>
      <div className="welcome__clock">
        <time className="welcome__time" dateTime={now.toISOString()}>
          {time} <span className="welcome__period">{period}</span>
        </time>
        <p className="welcome__zone">{zone}</p>
      </div>
    </section>
  )
}
