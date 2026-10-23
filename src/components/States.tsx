import type { ReactNode } from 'react'
import { AlertIcon, InboxIcon, RefreshIcon } from './Icons'

export function ErrorState({
  title,
  message,
  onRetry,
  compact = false,
}: {
  title: string
  message: string
  onRetry?: () => void
  compact?: boolean
}) {
  return (
    <div className={`state state--error${compact ? ' state--compact' : ''}`} role="alert">
      <span className="state__icon">
        <AlertIcon width="22" height="22" />
      </span>
      <p className="state__title">{title}</p>
      <p className="state__message">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          <RefreshIcon width="16" height="16" />
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="state" role="status">
      <span className="state__icon">
        <InboxIcon width="22" height="22" />
      </span>
      <p className="state__title">{title}</p>
      {action}
    </div>
  )
}

export function Skeleton({ width, height = 14 }: { width?: number | string; height?: number }) {
  return <span className="skeleton" style={{ width, height }} aria-hidden="true" />
}
