import { Link, useLocation } from 'react-router'
import { ArrowRightIcon, LayersIcon } from '../components/Icons'
import { PageHeader } from '../components/Page'
import { NAV_ITEMS, findNavItem } from '../layouts/nav'

export default function PlaceholderPage() {
  const { pathname } = useLocation()
  const item = findNavItem(pathname)
  const Icon = item?.icon ?? LayersIcon
  const available = NAV_ITEMS.filter((i) => !i.planned)

  return (
    <>
      <PageHeader title={item?.label ?? 'Module'} badge={<span className="count-pill">Planned</span>} />
      <div className="card placeholder">
        <span className="placeholder__icon">
          <Icon width="28" height="28" />
        </span>
        <p className="placeholder__title">{item?.label ?? 'This module'} is planned for a later release</p>
        <div className="placeholder__links">
          {available.map((m) => (
            <Link key={m.path} to={m.path} className="btn btn--ghost">
              {m.label}
              <ArrowRightIcon width="15" height="15" />
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
