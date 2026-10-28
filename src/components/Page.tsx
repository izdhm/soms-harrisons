import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { findNavItem } from '../layouts/nav'

export function PageHeader({
  title,
  badge,
  actions,
}: {
  title: string
  badge?: ReactNode
  actions?: ReactNode
}) {
  // The sidebar group names the section, so the header carries it instead of a breadcrumb.
  const { pathname } = useLocation()
  const section = findNavItem(pathname)?.group ?? 'Account'
  return (
    <div className="page-header">
      <div>
        <p className="page-header__eyebrow">{section}</p>
        <div className="page-header__title">
          <h1>{title}</h1>
          {badge}
        </div>
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  )
}

export function Panel({
  title,
  actions,
  children,
  className = '',
  id,
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section className={`card ${className}`} id={id} aria-label={title}>
      <div className="card__head">
        <h2 className="card__title">{title}</h2>
        {actions && <div className="card__actions">{actions}</div>}
      </div>
      <div className="card__body">{children}</div>
    </section>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`segmented__btn${o.value === value ? ' is-active' : ''}`}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  children,
  className = '',
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`field field--select ${className}`}>
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <svg className="field__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}

/** A native date input in the inline-label field style. Values are "YYYY-MM-DD". */
export function DateField({
  id,
  label,
  value,
  onChange,
  min,
  max,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
}) {
  return (
    <div className="field field--date">
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      <input
        id={id}
        type="date"
        className="date-input"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
