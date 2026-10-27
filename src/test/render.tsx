import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import App from '../App'
import { AuthProvider } from '../auth/AuthContext'
import { DEMO_ACCOUNTS } from '../auth/demoAccounts'
import { ToastProvider } from '../components/Toast'
import { invalidateDataset } from '../hooks/useOrderDataset'
import { SettingsProvider } from '../settings/SettingsContext'

/** Starts a demo session the same way a successful sign-in stores it. */
export function seedSession() {
  const account = DEMO_ACCOUNTS[0]
  const now = Date.now()
  sessionStorage.setItem(
    'soms.session',
    JSON.stringify({
      userId: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      department: account.department,
      signedInAt: now,
      expiresAt: now + 30 * 60_000,
      remember: false,
    }),
  )
}

export function resetBrowserState() {
  localStorage.clear()
  sessionStorage.clear()
  invalidateDataset()
}

/** Renders the whole app at `path` with the real providers and router. */
export function renderApp(path: string, { signedIn = true } = {}) {
  if (signedIn) seedSession()
  window.history.replaceState(null, '', path)
  return render(
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>,
  )
}
