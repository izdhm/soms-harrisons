import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type Dispatch,
  type SetStateAction,
  type SVGProps,
} from 'react'
import { NavLink, Navigate, useParams } from 'react-router'
import { fetchMeta, testConnection, type ConnectionResult } from '../api/client'
import { ENV_API_CONFIG } from '../api/config'
import { useAuth } from '../auth/AuthContext'
import {
  RadioCards,
  Select,
  SecretInput,
  SettingRow,
  TextInput,
  Toggle,
} from '../components/FormControls'
import {
  BellIcon,
  BranchIcon,
  CheckCircleIcon,
  AlertIcon,
  GlobeIcon,
  LockIcon,
  MonitorIcon,
  MoonIcon,
  OrdersIcon,
  PaletteIcon,
  PlugIcon,
  ServerIcon,
  SunIcon,
} from '../components/Icons'
import { SORT_OPTIONS } from '../components/orders/Filters'
import { PageHeader } from '../components/Page'
import { ErrorState, Skeleton } from '../components/States'
import { useToast } from '../components/Toast'
import { useApi } from '../hooks/useApi'
import { useFormat } from '../hooks/useFormat'
import { invalidateDataset } from '../hooks/useOrderDataset'
import { createFormatter } from '../lib/format'
import { PAGE_SIZES } from '../lib/query'
import {
  DATE_FORMATS,
  DEFAULT_SETTINGS,
  TIME_ZONES,
  type DateFormat,
  type Settings,
} from '../settings/defaults'
import { useSettings } from '../settings/SettingsContext'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

const SECTIONS: { id: string; label: string; icon: Icon }[] = [
  { id: 'general', label: 'General', icon: GlobeIcon },
  { id: 'appearance', label: 'Appearance', icon: PaletteIcon },
  { id: 'orders', label: 'Sales orders', icon: OrdersIcon },
  { id: 'branches', label: 'Branches', icon: BranchIcon },
  { id: 'api', label: 'Data and API', icon: PlugIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
  { id: 'security', label: 'Security', icon: LockIcon },
  { id: 'about', label: 'System information', icon: ServerIcon },
]

const SAMPLE_DATE = '2026-09-30T03:07:00.000Z'

type Errors = Partial<Record<string, string>>

function validate(s: Settings): Errors {
  const errors: Errors = {}
  if (!s.general.companyName.trim()) errors.companyName = 'Company name is required.'
  if (!s.general.systemName.trim()) errors.systemName = 'System name is required.'
  if (!(s.orders.highValueThreshold > 0)) errors.highValueThreshold = 'Enter an amount above zero.'
  const url = s.api.baseUrl.trim()
  if (url) {
    try {
      if (new URL(url).protocol !== 'https:') errors.baseUrl = 'Use an https:// address.'
    } catch {
      errors.baseUrl = 'Enter a full URL, for example https://example.com/api.'
    }
  }
  if (!(s.api.timeoutSeconds >= 5 && s.api.timeoutSeconds <= 60)) {
    errors.timeoutSeconds = 'Choose between 5 and 60 seconds.'
  }
  if (!(s.notifications.agingDays >= 1 && s.notifications.agingDays <= 365)) {
    errors.agingDays = 'Choose between 1 and 365 days.'
  }
  return errors
}

export default function SettingsPage() {
  const { tab } = useParams()
  const { settings, save } = useSettings()
  const notify = useToast()
  const [draft, setDraft] = useState<Settings>(() => structuredClone(settings))

  // Pick up changes saved elsewhere (e.g. the theme toggle in the top bar) unless edits are pending.
  const [baseline, setBaseline] = useState(settings)
  if (baseline !== settings) {
    setBaseline(settings)
    if (JSON.stringify(draft) === JSON.stringify(baseline)) setDraft(structuredClone(settings))
  }
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings])

  const errors = validate(draft)
  const valid = Object.keys(errors).length === 0

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (!tab || !SECTIONS.some((s) => s.id === tab)) {
    return <Navigate to="/app/settings/general" replace />
  }

  function update<K extends keyof Settings>(section: K, patch: Partial<Settings[K]>) {
    setDraft((d) => ({ ...d, [section]: { ...d[section], ...patch } }))
  }

  function handleSave() {
    if (!valid) return
    const apiChanged = JSON.stringify(draft.api) !== JSON.stringify(settings.api)
    save(draft)
    if (apiChanged) invalidateDataset()
    notify('Settings saved.')
  }

  const current = SECTIONS.find((s) => s.id === tab)!

  return (
    <>
      <PageHeader title="System settings" />

      <div className="settings">
        <nav className="settings__nav" aria-label="Settings sections">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            return (
              <NavLink
                key={s.id}
                to={`/app/settings/${s.id}`}
                className={({ isActive }) => `settings__link${isActive ? ' is-active' : ''}`}
              >
                <Icon width="17" height="17" />
                {s.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="settings__content">
          <section className="card settings__card" aria-labelledby="settings-section-title">
            <div className="card__head">
              <h2 id="settings-section-title" className="card__title">
                {current.label}
              </h2>
              {tab !== 'about' && (
                <button
                  type="button"
                  className="link-btn link-btn--sm"
                  onClick={() => {
                    const key = tab as keyof Settings
                    setDraft((d) => ({ ...d, [key]: structuredClone(DEFAULT_SETTINGS[key]) }))
                  }}
                >
                  Restore defaults
                </button>
              )}
            </div>
            <div className="settings__body">
              {tab === 'general' && <GeneralSection draft={draft} update={update} errors={errors} />}
              {tab === 'appearance' && <AppearanceSection draft={draft} update={update} />}
              {tab === 'orders' && <OrdersSection draft={draft} update={update} errors={errors} />}
              {tab === 'branches' && <BranchesSection draft={draft} setDraft={setDraft} />}
              {tab === 'api' && <ApiSection draft={draft} update={update} errors={errors} />}
              {tab === 'notifications' && (
                <NotificationsSection draft={draft} update={update} errors={errors} />
              )}
              {tab === 'security' && <SecuritySection draft={draft} update={update} />}
              {tab === 'about' && <AboutSection />}
            </div>
          </section>
        </div>
      </div>

      <div className={`savebar${dirty ? ' is-visible' : ''}`} aria-hidden={!dirty}>
        <span className="savebar__text">
          {valid ? 'You have unsaved changes' : 'Fix the highlighted fields to save'}
        </span>
        <div className="savebar__actions">
          <button
            type="button"
            className="btn btn--ghost"
            tabIndex={dirty ? 0 : -1}
            onClick={() => setDraft(structuredClone(settings))}
          >
            Discard
          </button>
          <button
            type="button"
            className="btn btn--primary"
            tabIndex={dirty ? 0 : -1}
            disabled={!valid}
            onClick={handleSave}
          >
            Save changes
          </button>
        </div>
      </div>
    </>
  )
}

interface SectionProps {
  draft: Settings
  update: <K extends keyof Settings>(section: K, patch: Partial<Settings[K]>) => void
  errors?: Errors
}

function GeneralSection({ draft, update, errors = {} }: SectionProps) {
  const g = draft.general
  const preview = createFormatter(g)
  return (
    <>
      <SettingRow label="Company name" htmlFor="s-company" error={errors.companyName}>
        <TextInput
          id="s-company"
          value={g.companyName}
          invalid={!!errors.companyName}
          onChange={(v) => update('general', { companyName: v })}
        />
      </SettingRow>
      <SettingRow label="System name" htmlFor="s-system" error={errors.systemName}>
        <TextInput
          id="s-system"
          value={g.systemName}
          invalid={!!errors.systemName}
          onChange={(v) => update('general', { systemName: v })}
        />
      </SettingRow>
      <SettingRow label="Time zone" htmlFor="s-tz">
        <Select id="s-tz" value={g.timeZone} onChange={(v) => update('general', { timeZone: v })}>
          {TIME_ZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </Select>
      </SettingRow>
      <SettingRow label="Date format" htmlFor="s-datefmt">
        <Select
          id="s-datefmt"
          value={g.dateFormat}
          onChange={(v) => update('general', { dateFormat: v as DateFormat })}
        >
          {DATE_FORMATS.map((f) => (
            <option key={f} value={f}>
              {createFormatter({ ...g, dateFormat: f }).date(SAMPLE_DATE)}
            </option>
          ))}
        </Select>
      </SettingRow>
      <SettingRow label="Currency display" htmlFor="s-currency">
        <Select
          id="s-currency"
          value={g.currencyStyle}
          onChange={(v) => update('general', { currencyStyle: v as 'symbol' | 'code' })}
        >
          <option value="symbol">RM 1,234.50</option>
          <option value="code">MYR 1,234.50</option>
        </Select>
      </SettingRow>
      <div className="preview-box">
        <span className="preview-box__label">Preview</span>
        <span>{preview.dateTime(SAMPLE_DATE)}</span>
        <span>{preview.currency(1234.5)}</span>
      </div>
    </>
  )
}

function AppearanceSection({ draft, update }: SectionProps) {
  const a = draft.appearance
  return (
    <>
      <SettingRow label="Theme">
        <RadioCards
          name="Theme"
          value={a.theme}
          onChange={(theme) => update('appearance', { theme })}
          options={[
            { value: 'light', label: 'Light', icon: <SunIcon /> },
            { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
            { value: 'system', label: 'System', icon: <MonitorIcon /> },
          ]}
        />
      </SettingRow>
      <SettingRow label="Table density">
        <RadioCards
          name="Table density"
          value={a.density}
          onChange={(density) => update('appearance', { density })}
          options={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
      </SettingRow>
      <SettingRow label="Sidebar" htmlFor="s-sidebar">
        <Select
          id="s-sidebar"
          value={a.sidebarCollapsed ? 'collapsed' : 'expanded'}
          onChange={(v) => update('appearance', { sidebarCollapsed: v === 'collapsed' })}
        >
          <option value="expanded">Expanded</option>
          <option value="collapsed">Collapsed, icons only</option>
        </Select>
      </SettingRow>
    </>
  )
}

function OrdersSection({ draft, update, errors = {} }: SectionProps) {
  const o = draft.orders
  return (
    <>
      <SettingRow label="Rows per page" htmlFor="s-pagesize">
        <Select
          id="s-pagesize"
          value={o.pageSize}
          onChange={(v) => update('orders', { pageSize: Number(v) })}
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
      </SettingRow>
      <SettingRow label="Default sort" htmlFor="s-sort">
        <Select
          id="s-sort"
          value={`${o.sort}:${o.order}`}
          onChange={(v) => {
            const option = SORT_OPTIONS.find((x) => `${x.sort}:${x.order}` === v)!
            update('orders', { sort: option.sort, order: option.order })
          }}
        >
          {SORT_OPTIONS.map((x) => (
            <option key={`${x.sort}:${x.order}`} value={`${x.sort}:${x.order}`}>
              {x.label}
            </option>
          ))}
        </Select>
      </SettingRow>
      <SettingRow
        label="High-value threshold"
        htmlFor="s-threshold"
        error={errors.highValueThreshold}
      >
        <TextInput
          id="s-threshold"
          type="number"
          min={1}
          value={o.highValueThreshold}
          invalid={!!errors.highValueThreshold}
          suffix="MYR"
          onChange={(v) => update('orders', { highValueThreshold: Number(v) })}
        />
      </SettingRow>
      <SettingRow label="Flag high-value orders" htmlFor="s-flag">
        <Toggle
          id="s-flag"
          label="Flag high-value orders"
          checked={o.flagHighValue}
          onChange={(flagHighValue) => update('orders', { flagHighValue })}
        />
      </SettingRow>
    </>
  )
}

function BranchesSection({
  draft,
  setDraft,
}: {
  draft: Settings
  setDraft: Dispatch<SetStateAction<Settings>>
}) {
  const meta = useApi('meta', fetchMeta)
  const fmt = useFormat()

  if (meta.error) {
    return <ErrorState compact title="Unable to load branches" message={meta.error.message} onRetry={meta.reload} />
  }
  if (!meta.data) {
    return (
      <div className="stack">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} width="100%" height={36} />
        ))}
      </div>
    )
  }

  return (
    <table className="mini-table branch-table">
      <thead>
        <tr>
          <th scope="col">Site code</th>
          <th scope="col" className="num">Orders</th>
          <th scope="col">Display name</th>
        </tr>
      </thead>
      <tbody>
        {meta.data.facets.sites.map((site) => (
          <tr key={site.value}>
            <td>
              <span className="site-tag">{site.value}</span>
            </td>
            <td className="num">{fmt.number(site.count)}</td>
            <td>
              <label htmlFor={`branch-${site.value}`} className="sr-only">
                Display name for {site.value}
              </label>
              <TextInput
                id={`branch-${site.value}`}
                value={draft.branches[site.value] ?? ''}
                placeholder="Not set"
                onChange={(v) =>
                  setDraft((d) => ({ ...d, branches: { ...d.branches, [site.value]: v } }))
                }
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ApiSection({ draft, update, errors = {} }: SectionProps) {
  const a = draft.api
  const [test, setTest] = useState<
    { state: 'idle' } | { state: 'running' } | { state: 'ok'; result: ConnectionResult } | { state: 'error'; message: string }
  >({ state: 'idle' })

  async function runTest() {
    setTest({ state: 'running' })
    try {
      const result = await testConnection({
        baseUrl: (a.baseUrl.trim() || ENV_API_CONFIG.baseUrl).replace(/\/+$/, ''),
        apiKey: a.apiKey.trim() || ENV_API_CONFIG.apiKey,
        timeoutMs: a.timeoutSeconds * 1000,
      })
      setTest({ state: 'ok', result })
    } catch (err) {
      setTest({ state: 'error', message: err instanceof Error ? err.message : 'Connection failed.' })
    }
  }

  return (
    <>
      <SettingRow
        label="API base URL"
        htmlFor="s-baseurl"
        hint="Leave blank to use the build default."
        error={errors.baseUrl}
      >
        <TextInput
          id="s-baseurl"
          type="url"
          value={a.baseUrl}
          placeholder={ENV_API_CONFIG.baseUrl}
          invalid={!!errors.baseUrl}
          onChange={(v) => update('api', { baseUrl: v })}
        />
      </SettingRow>
      <SettingRow label="API key" htmlFor="s-apikey" hint="Leave blank to use the build default.">
        <SecretInput
          id="s-apikey"
          value={a.apiKey}
          placeholder={ENV_API_CONFIG.apiKey ? 'Using build default' : 'Not configured'}
          onChange={(v) => update('api', { apiKey: v })}
        />
      </SettingRow>
      <SettingRow label="Request timeout" htmlFor="s-timeout" error={errors.timeoutSeconds}>
        <TextInput
          id="s-timeout"
          type="number"
          min={5}
          max={60}
          value={a.timeoutSeconds}
          suffix="seconds"
          invalid={!!errors.timeoutSeconds}
          onChange={(v) => update('api', { timeoutSeconds: Number(v) })}
        />
      </SettingRow>
      <SettingRow label="Auto-refresh" htmlFor="s-refresh">
        <Select
          id="s-refresh"
          value={a.refreshMinutes}
          onChange={(v) => update('api', { refreshMinutes: Number(v) })}
        >
          <option value={0}>Off</option>
          {[1, 5, 15, 30].map((m) => (
            <option key={m} value={m}>
              Every {m} {m === 1 ? 'minute' : 'minutes'}
            </option>
          ))}
        </Select>
      </SettingRow>
      <SettingRow
        label="Dashboard cache"
        htmlFor="s-cache"
        hint="How long the dashboard reuses the full order list before paging the API again."
      >
        <Select id="s-cache" value={a.cacheMinutes} onChange={(v) => update('api', { cacheMinutes: Number(v) })}>
          {[1, 5, 15, 30].map((m) => (
            <option key={m} value={m}>
              {m} {m === 1 ? 'minute' : 'minutes'}
            </option>
          ))}
        </Select>
      </SettingRow>
      <SettingRow label="Connection">
        <div className="conn-test">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={runTest}
            disabled={test.state === 'running' || !!errors.baseUrl}
          >
            <PlugIcon width="16" height="16" />
            {test.state === 'running' ? 'Testing' : 'Test connection'}
          </button>
          {test.state === 'ok' && (
            <p className="conn-test__result is-ok" role="status">
              <CheckCircleIcon width="16" height="16" />
              Connected in {test.result.latencyMs} ms. API v{test.result.version}, {test.result.sites} branches,{' '}
              {test.result.statuses} statuses.
            </p>
          )}
          {test.state === 'error' && (
            <p className="conn-test__result is-error" role="alert">
              <AlertIcon width="16" height="16" />
              {test.message}
            </p>
          )}
        </div>
      </SettingRow>
    </>
  )
}

function NotificationsSection({ draft, update, errors = {} }: SectionProps) {
  const n = draft.notifications
  const fmt = useFormat()
  const rows: { key: 'onHold' | 'pendingValidation' | 'highValueOpen' | 'agingOpen'; label: string }[] = [
    { key: 'onHold', label: 'Orders on hold' },
    { key: 'pendingValidation', label: 'Open orders pending validation' },
    { key: 'highValueOpen', label: `High-value open orders (${fmt.currency(draft.orders.highValueThreshold)} and above)` },
    { key: 'agingOpen', label: 'Aged open orders' },
  ]
  return (
    <>
      {rows.map((r) => (
        <SettingRow key={r.key} label={r.label} htmlFor={`s-n-${r.key}`}>
          <Toggle
            id={`s-n-${r.key}`}
            label={r.label}
            checked={n[r.key]}
            onChange={(v) => update('notifications', { [r.key]: v })}
          />
        </SettingRow>
      ))}
      <SettingRow label="Aged after" htmlFor="s-aging" error={errors.agingDays}>
        <TextInput
          id="s-aging"
          type="number"
          min={1}
          max={365}
          value={n.agingDays}
          suffix="days"
          invalid={!!errors.agingDays}
          disabled={!n.agingOpen}
          onChange={(v) => update('notifications', { agingDays: Number(v) })}
        />
      </SettingRow>
      <SettingRow label="Daily email summary" htmlFor="s-email" hint="Requires a mail server, not available in this release.">
        <Toggle id="s-email" label="Daily email summary" checked={false} disabled onChange={() => {}} />
      </SettingRow>
    </>
  )
}

function SecuritySection({ draft, update }: SectionProps) {
  const s = draft.security
  const { user } = useAuth()
  const fmt = useFormat()
  return (
    <>
      <SettingRow label="Idle session timeout" htmlFor="s-timeout-session">
        <Select
          id="s-timeout-session"
          value={s.sessionTimeoutMinutes}
          onChange={(v) => update('security', { sessionTimeoutMinutes: Number(v) })}
        >
          {[15, 30, 60, 120, 240].map((m) => (
            <option key={m} value={m}>
              {m < 60 ? `${m} minutes` : `${m / 60} ${m === 60 ? 'hour' : 'hours'}`}
            </option>
          ))}
        </Select>
      </SettingRow>
      <SettingRow label={'Allow "Keep me signed in"'} htmlFor="s-remember">
        <Toggle
          id="s-remember"
          label="Allow keep me signed in"
          checked={s.allowRememberMe}
          onChange={(allowRememberMe) => update('security', { allowRememberMe })}
        />
      </SettingRow>
      <SettingRow label="Password" hint="The demo account password is managed in the seed file.">
        <button type="button" className="btn btn--ghost" disabled>
          <LockIcon width="16" height="16" />
          Change password
        </button>
      </SettingRow>
      {user && (
        <div className="preview-box">
          <span className="preview-box__label">Current session</span>
          <span>Signed in {fmt.dateTime(new Date(user.signedInAt).toISOString())}</span>
          <span>{user.remember ? 'Kept signed in on this device' : 'Ends when the browser closes'}</span>
        </div>
      )}
    </>
  )
}

function AboutSection() {
  const meta = useApi('meta', fetchMeta)
  const { settings } = useSettings()
  const rows: [string, string][] = [
    ['System', settings.general.systemName],
    ['Version', __APP_VERSION__],
    ['Environment', import.meta.env.MODE],
    ['API endpoint', settings.api.baseUrl.trim() || ENV_API_CONFIG.baseUrl],
    ['API version', meta.data ? meta.data.version : meta.error ? 'Unreachable' : 'Checking'],
    ['Branches', meta.data ? String(meta.data.facets.sites.length) : '-'],
    ['Front end', 'React, TypeScript, Vite'],
    ['Data', 'Fictional assessment data, read only'],
  ]
  return (
    <dl className="about">
      {rows.map(([k, v]) => (
        <div key={k} className="about__row">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}
