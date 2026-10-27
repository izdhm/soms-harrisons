import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { useSettings } from '../settings/SettingsContext'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const COLLAPSE_KEY = 'soms.sidebar.collapsed'

function readCollapsed(fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(COLLAPSE_KEY)
    return stored === null ? fallback : stored === '1'
  } catch {
    return fallback
  }
}

export function AppLayout() {
  const { settings } = useSettings()
  const [collapsed, setCollapsed] = useState(() => readCollapsed(settings.appearance.sidebarCollapsed))
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // A new default saved in settings replaces the user's last manual toggle.
  const savedDefault = useRef(settings.appearance.sidebarCollapsed)
  useEffect(() => {
    if (savedDefault.current === settings.appearance.sidebarCollapsed) return
    savedDefault.current = settings.appearance.sidebarCollapsed
    setCollapsed(settings.appearance.sidebarCollapsed)
    try {
      localStorage.removeItem(COLLAPSE_KEY)
    } catch {
      // Not critical.
    }
  }, [settings.appearance.sidebarCollapsed])

  useEffect(() => {
    setMobileOpen(false)
    window.scrollTo?.({ top: 0 })
  }, [location.pathname])

  function toggleSidebar() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      } catch {
        // Not critical.
      }
      return !c
    })
  }

  return (
    <div className={`shell${collapsed ? ' shell--collapsed' : ''}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      {mobileOpen && <div className="shell__scrim" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
      <div className="shell__main">
        <Topbar onOpenMenu={() => setMobileOpen(true)} onToggleSidebar={toggleSidebar} />
        <main id="main" className="page" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
