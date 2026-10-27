import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { LogoutIcon, SettingsIcon } from '../components/Icons'
import { PageHeader } from '../components/Page'
import { useToast } from '../components/Toast'
import { useFormat } from '../hooks/useFormat'
import { initials } from '../lib/format'
import { useSettings } from '../settings/SettingsContext'

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const { settings } = useSettings()
  const fmt = useFormat()
  const navigate = useNavigate()
  const notify = useToast()
  if (!user) return null

  const rows: [string, string][] = [
    ['Full name', user.name],
    ['Email', user.email],
    ['Role', user.role],
    ['Department', user.department],
    ['Company', settings.general.companyName],
    ['Signed in', fmt.dateTime(new Date(user.signedInAt).toISOString())],
    ['Session', user.remember ? 'Kept signed in on this device' : 'Ends when the browser closes'],
  ]

  return (
    <>
      <PageHeader title="My profile" />
      <div className="profile">
        <section className="card profile__card" aria-label="Account">
          <span className="avatar avatar--xl" aria-hidden="true">
            {initials(user.name)}
          </span>
          <p className="profile__name">{user.name}</p>
          <p className="profile__role">{user.role}</p>
          <div className="profile__actions">
            <Link to="/app/settings" className="btn btn--ghost">
              <SettingsIcon width="16" height="16" />
              System settings
            </Link>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                signOut()
                notify('You have been signed out.', 'info')
                navigate('/', { replace: true })
              }}
            >
              <LogoutIcon width="16" height="16" />
              Sign out
            </button>
          </div>
        </section>
        <section className="card" aria-label="Account details">
          <div className="card__head">
            <h2 className="card__title">Account details</h2>
          </div>
          <dl className="about">
            {rows.map(([k, v]) => (
              <div key={k} className="about__row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  )
}
