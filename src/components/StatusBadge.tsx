import { statusTone } from '../lib/status'

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge badge--${statusTone(status)}`}>
      <span className="badge__dot" aria-hidden="true" />
      {status}
    </span>
  )
}
