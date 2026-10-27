import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import photo from '../assets/login-photo.webp'
import { useAuth } from '../auth/AuthContext'
import { PRIMARY_DEMO_ACCOUNT } from '../auth/demoAccounts'
import { AlertIcon, ArrowRightIcon, EyeIcon, EyeOffIcon, InfoIcon, LogoMark } from '../components/Icons'
import { useToast } from '../components/Toast'
import { useSettings } from '../settings/SettingsContext'

const PHOTO = {
  author: 'Tom Fisk',
  url: 'https://www.pexels.com/photo/aerial-view-of-cargo-ship-1554646/',
}

export default function LoginPage() {
  const { user, signIn, lastSignOutReason } = useAuth()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const notify = useToast()
  const from = (location.state as { from?: string } | null)?.from ?? '/app/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  if (user && !submitting) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setSubmitting(true)
    setError(null)
    const problem = await signIn(email, password, remember)
    if (problem) {
      setSubmitting(false)
      setError(problem)
      return
    }
    notify('Signed in successfully.')
    navigate(from, { replace: true })
  }

  return (
    <div className="signin">
      <main className="signin__panel">
        <header className="signin__brand">
          <LogoMark className="signin__mark" />
          <span className="signin__word">SOMS</span>
          <span className="signin__company">{settings.general.companyName}</span>
        </header>

        <div className="signin__body">
          <h1 className="signin__title">Sign in</h1>

          {lastSignOutReason === 'expired' && !error && (
            <p className="auth-alert auth-alert--info" role="status">
              <InfoIcon width="16" height="16" />
              Your session expired after inactivity. Please sign in again.
            </p>
          )}
          {error && (
            <p className="auth-alert auth-alert--error" role="alert">
              <AlertIcon width="16" height="16" />
              {error}
            </p>
          )}

          <form className="signin-form" onSubmit={onSubmit} noValidate>
            <div className="signin-field">
              <label htmlFor="login-email">Work email</label>
              <input
                id="login-email"
                className="signin-input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </div>

            <div className="signin-field">
              <label htmlFor="login-password">Password</label>
              <div className="signin-password">
                <input
                  id="login-password"
                  className="signin-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon width="17" height="17" /> : <EyeIcon width="17" height="17" />}
                </button>
              </div>
            </div>

            <div className="signin-form__row">
              {settings.security.allowRememberMe ? (
                <label className="checkbox">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Keep me signed in
                </label>
              ) : (
                <span />
              )}
              <button type="button" className="link-btn link-btn--sm" onClick={() => setShowForgot((v) => !v)}>
                Forgot password?
              </button>
            </div>
            {showForgot && (
              <p className="signin-form__note">Contact your system administrator to reset your password.</p>
            )}

            <button type="submit" className="btn btn--primary btn--block signin-submit" disabled={submitting}>
              {submitting ? 'Signing in' : 'Sign in'}
              {!submitting && <ArrowRightIcon width="17" height="17" />}
            </button>
          </form>

          <div className="signin-demo">
            <dl className="signin-demo__creds">
              <dt>Demo account</dt>
              <dd>{PRIMARY_DEMO_ACCOUNT.email}</dd>
              <dd>{PRIMARY_DEMO_ACCOUNT.password}</dd>
            </dl>
            <button
              type="button"
              className="btn btn--ghost signin-demo__btn"
              onClick={() => {
                setEmail(PRIMARY_DEMO_ACCOUNT.email)
                setPassword(PRIMARY_DEMO_ACCOUNT.password)
                setError(null)
              }}
            >
              Use demo account
            </button>
          </div>
        </div>

        <footer className="signin__foot">
          <span>
            Copyright {new Date().getFullYear()} {settings.general.companyName}
          </span>
          <span>Demonstration build</span>
        </footer>
      </main>

      <aside className="signin__visual">
        <img className="signin__photo" src={photo} alt="" />
        <p className="signin__statement">Every sales order, across every branch, in one view.</p>
        <p className="signin__credit">
          Photo by{' '}
          <a href={PHOTO.url} target="_blank" rel="noreferrer">
            {PHOTO.author}
          </a>{' '}
          on Pexels
        </p>
      </aside>
    </div>
  )
}
