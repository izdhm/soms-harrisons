import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useSettings } from '../settings/SettingsContext'
import { DEMO_ACCOUNTS } from './demoAccounts'

export interface Session {
  userId: string
  name: string
  email: string
  role: string
  department: string
  signedInAt: number
  /** Idle expiry; pushed forward while the user is active. */
  expiresAt: number
  remember: boolean
}

export type SignOutReason = 'manual' | 'expired'

interface AuthContextValue {
  user: Session | null
  signIn: (email: string, password: string, remember: boolean) => Promise<string | null>
  signOut: (reason?: SignOutReason) => void
  lastSignOutReason: SignOutReason | null
}

const SESSION_KEY = 'soms.session'
const ACTIVITY_THROTTLE_MS = 30_000

const AuthContext = createContext<AuthContextValue | null>(null)

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    return session.expiresAt > Date.now() ? session : null
  } catch {
    return null
  }
}

function writeSession(session: Session | null) {
  try {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    if (session) {
      ;(session.remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session))
    }
  } catch {
    // Storage unavailable: the session lives in memory only.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const timeoutMs = settings.security.sessionTimeoutMinutes * 60_000
  const [user, setUser] = useState<Session | null>(readSession)
  const [lastSignOutReason, setLastSignOutReason] = useState<SignOutReason | null>(null)
  const lastTouch = useRef(0)

  const signOut = useCallback((reason: SignOutReason = 'manual') => {
    writeSession(null)
    setUser(null)
    setLastSignOutReason(reason)
  }, [])

  const signIn = useCallback(
    async (email: string, password: string, remember: boolean) => {
      // A short pause so the button state is visible, as with a real auth server.
      await new Promise((r) => setTimeout(r, 450))
      const account = DEMO_ACCOUNTS.find(
        (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password,
      )
      if (!account) return 'Incorrect email or password.'
      const now = Date.now()
      const session: Session = {
        userId: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        department: account.department,
        signedInAt: now,
        expiresAt: now + timeoutMs,
        remember: remember && settings.security.allowRememberMe,
      }
      writeSession(session)
      setUser(session)
      setLastSignOutReason(null)
      return null
    },
    [timeoutMs, settings.security.allowRememberMe],
  )

  // Idle timeout: activity extends the session; a periodic check signs out when it lapses.
  useEffect(() => {
    if (!user) return
    const touch = () => {
      const now = Date.now()
      if (now - lastTouch.current < ACTIVITY_THROTTLE_MS) return
      lastTouch.current = now
      setUser((current) => {
        if (!current) return current
        const next = { ...current, expiresAt: now + timeoutMs }
        writeSession(next)
        return next
      })
    }
    const check = window.setInterval(() => {
      setUser((current) => {
        if (current && current.expiresAt <= Date.now()) {
          writeSession(null)
          setLastSignOutReason('expired')
          return null
        }
        return current
      })
    }, 15_000)
    window.addEventListener('pointerdown', touch)
    window.addEventListener('keydown', touch)
    return () => {
      window.clearInterval(check)
      window.removeEventListener('pointerdown', touch)
      window.removeEventListener('keydown', touch)
    }
  }, [user, timeoutMs])

  const value = useMemo(
    () => ({ user, signIn, signOut, lastSignOutReason }),
    [user, signIn, signOut, lastSignOutReason],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
