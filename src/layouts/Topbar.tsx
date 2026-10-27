import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import {
  BellIcon,
  ChevronDownIcon,
  LogoutIcon,
  MenuIcon,
  MoonIcon,
  SearchIcon,
  SettingsIcon,
  SidebarIcon,
  SunIcon,
  UserIcon,
} from '../components/Icons'
import { Popover } from '../components/Popover'
import { useToast } from '../components/Toast'
import { useFormat } from '../hooks/useFormat'
import { useOrderDataset } from '../hooks/useOrderDataset'
import { attention } from '../lib/analytics'
import { initials } from '../lib/format'
import { useSettings } from '../settings/SettingsContext'

const SEEN_KEY = 'soms.notifications.seen'

interface TopbarProps {
  onOpenMenu: () => void
  onToggleSidebar: () => void
}

function readSeen(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? ''
  } catch {
    return ''
  }
}

function useNotifications() {
  const { settings } = useSettings()
  const { rows } = useOrderDataset()
  const fmt = useFormat()
  const n = settings.notifications

  return useMemo(() => {
    if (!rows) return []
    const a = attention(rows, {
      highValue: settings.orders.highValueThreshold,
      agingDays: n.agingDays,
    })
    const items = [
      n.onHold && {
        id: 'onHold',
        title: `${fmt.number(a.onHold.length)} orders on hold`,
      },
      n.pendingValidation && {
        id: 'pendingValidation',
        title: `${fmt.number(a.pendingValidation.length)} open orders pending validation`,
      },
      n.highValueOpen && {
        id: 'highValueOpen',
        title: `${fmt.number(a.highValueOpen.length)} open orders of ${fmt.currency(settings.orders.highValueThreshold)} or more`,
      },
      n.agingOpen && {
        id: 'agedOpen',
        title: `${fmt.number(a.agedOpen.length)} open orders older than ${n.agingDays} days`,
      },
    ]
    return items.filter((i): i is { id: string; title: string } => Boolean(i))
  }, [rows, n, settings.orders.highValueThreshold, fmt])
}

export function Topbar({ onOpenMenu, onToggleSidebar }: TopbarProps) {
  const { user, signOut } = useAuth()
  const { settings, save, resolvedTheme } = useSettings()
  const navigate = useNavigate()
  const notify = useToast()
  const [search, setSearch] = useState('')
  const notifications = useNotifications()
  const signature = notifications.map((n) => n.title).join('|')
  const [seen, setSeen] = useState(readSeen)
  const unread = notifications.length > 0 && seen !== signature

  const isDark = resolvedTheme === 'dark'

  function markSeen() {
    setSeen(signature)
    try {
      localStorage.setItem(SEEN_KEY, signature)
    } catch {
      // Not critical.
    }
  }

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button type="button" className="icon-btn icon-btn--ghost topbar__menu" onClick={onOpenMenu} aria-label="Open menu">
          <MenuIcon />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--ghost topbar__collapse"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <SidebarIcon />
        </button>
      </div>

      <form
        className="topbar__search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          const q = search.trim()
          navigate(q ? `/app/orders?q=${encodeURIComponent(q)}` : '/app/orders')
          setSearch('')
        }}
      >
        <SearchIcon className="topbar__search-icon" width="16" height="16" />
        <label htmlFor="global-search" className="sr-only">
          Search sales orders
        </label>
        <input
          id="global-search"
          type="search"
          placeholder="Search order no., customer or PO"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
      </form>

      <div className="topbar__right">
        <button
          type="button"
          className="icon-btn icon-btn--ghost"
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Light theme' : 'Dark theme'}
          onClick={() =>
            save({ ...settings, appearance: { ...settings.appearance, theme: isDark ? 'light' : 'dark' } })
          }
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>

        <Popover
          className="notif"
          trigger={(props) => (
            <button
              type="button"
              className="icon-btn icon-btn--ghost notif__trigger"
              aria-label={`Notifications${unread ? ', new alerts' : ''}`}
              {...props}
            >
              <BellIcon />
              {unread && <span className="notif__badge" aria-hidden="true" />}
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="popover__head">
                <span>Notifications</span>
                {notifications.length > 0 && (
                  <button type="button" className="link-btn link-btn--sm" onClick={markSeen}>
                    Mark all as read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="popover__empty">No alerts</p>
              ) : (
                <ul className="notif__list">
                  {notifications.map((n) => (
                    <li key={n.id}>
                      <Link
                        to={`/app/dashboard?focus=${n.id}`}
                        className="notif__item"
                        onClick={() => {
                          markSeen()
                          close()
                        }}
                      >
                        <span className={`notif__dot${unread ? ' is-unread' : ''}`} aria-hidden="true" />
                        <span className="notif__title">{n.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/app/settings/notifications" className="popover__foot" onClick={close}>
                Notification settings
              </Link>
            </>
          )}
        </Popover>

        <Popover
          className="usermenu"
          trigger={(props) => (
            <button type="button" className="user-btn" aria-label="Account menu" {...props}>
              <span className="avatar" aria-hidden="true">
                {initials(user?.name ?? '')}
              </span>
              <span className="user-btn__text hide-mobile">
                <span className="user-btn__name">{user?.name}</span>
                <span className="user-btn__role">{user?.role}</span>
              </span>
              <ChevronDownIcon width="16" height="16" className="hide-mobile" />
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="usermenu__head">
                <span className="avatar avatar--lg" aria-hidden="true">
                  {initials(user?.name ?? '')}
                </span>
                <span>
                  <span className="usermenu__name">{user?.name}</span>
                  <span className="usermenu__email">{user?.email}</span>
                </span>
              </div>
              <Link to="/app/profile" className="menu-item" onClick={close}>
                <UserIcon width="16" height="16" />
                My profile
              </Link>
              <Link to="/app/settings" className="menu-item" onClick={close}>
                <SettingsIcon width="16" height="16" />
                System settings
              </Link>
              <button
                type="button"
                className="menu-item menu-item--danger"
                onClick={() => {
                  close()
                  signOut()
                  notify('You have been signed out.', 'info')
                  navigate('/', { replace: true })
                }}
              >
                <LogoutIcon width="16" height="16" />
                Sign out
              </button>
            </>
          )}
        </Popover>
      </div>
    </header>
  )
}
