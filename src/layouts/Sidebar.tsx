import { NavLink } from 'react-router'
import { fetchMeta } from '../api/client'
import { LogoMark } from '../components/Icons'
import { useApi } from '../hooks/useApi'
import { useSettings } from '../settings/SettingsContext'
import { NAV_GROUPS } from './nav'

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onNavigate: () => void
}

export function Sidebar({ collapsed, mobileOpen, onNavigate }: SidebarProps) {
  const { settings } = useSettings()
  const meta = useApi('meta', fetchMeta)
  const apiState = meta.loading ? 'checking' : meta.error ? 'offline' : 'online'
  const apiText =
    apiState === 'online'
      ? `API online, version ${meta.data?.version}`
      : apiState === 'checking'
        ? 'Checking API'
        : 'API unreachable'

  return (
    <aside
      className={`sidebar${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-open' : ''}`}
      aria-label="Main navigation"
    >
      <div className="sidebar__brand" title={`${settings.general.systemName}, ${settings.general.companyName}`}>
        <LogoMark className="sidebar__logo" />
        <span className="sidebar__rule" aria-hidden="true" />
        <span className="sidebar__word">SOMS</span>
      </div>

      <nav className="sidebar__nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="nav-group">
            <p className="nav-group__label">{group.label}</p>
            <ul>
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
                      title={collapsed ? item.label : undefined}
                      onClick={onNavigate}
                    >
                      <Icon className="nav-link__icon" width="19" height="19" />
                      <span className="nav-link__label">{item.label}</span>
                      {item.planned && <span className="nav-link__tag">Soon</span>}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className="sidebar__footer"
        title={meta.error ? `${apiText}. ${meta.error.message}` : collapsed ? apiText : undefined}
      >
        <span className={`api-dot api-dot--${apiState}`} aria-hidden="true" />
        <span className="sidebar__footer-text">{apiText}</span>
      </div>
    </aside>
  )
}
