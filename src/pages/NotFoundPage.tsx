import { Link } from 'react-router'
import { LayersIcon } from '../components/Icons'

export default function NotFoundPage({ inApp = false }: { inApp?: boolean }) {
  return (
    <div className={inApp ? 'card placeholder' : 'not-found'}>
      <span className="placeholder__icon">
        <LayersIcon width="28" height="28" />
      </span>
      <p className="placeholder__title">Page not found</p>
      <Link to={inApp ? '/app/dashboard' : '/'} className="btn btn--primary">
        {inApp ? 'Back to dashboard' : 'Back to sign in'}
      </Link>
    </div>
  )
}
