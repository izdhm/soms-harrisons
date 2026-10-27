import { useEffect, useRef, type ReactNode } from 'react'
import { fetchOrder } from '../../api/client'
import type { SalesOrder } from '../../api/types'
import { useApi } from '../../hooks/useApi'
import { useFormat } from '../../hooks/useFormat'
import { orDash } from '../../lib/format'
import { useSettings } from '../../settings/SettingsContext'
import { CloseIcon } from '../Icons'
import { ErrorState, Skeleton } from '../States'
import { StatusBadge } from '../StatusBadge'

interface OrderDrawerProps {
  salesId: string
  /** Row already shown in the table, rendered while the fresh record loads. */
  preview: SalesOrder | null
  onClose: () => void
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`detail__field${wide ? ' detail__field--wide' : ''}`}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="detail__section">
      <h3 className="detail__heading">{title}</h3>
      <dl className="detail__grid">{children}</dl>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="detail__section">
      <Skeleton width="50%" height={22} />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="detail__skeleton-row">
          <Skeleton width="35%" height={10} />
          <Skeleton width="70%" />
        </div>
      ))}
    </div>
  )
}

function OrderDetail({ order }: { order: SalesOrder }) {
  const fmt = useFormat()
  const { branchName } = useSettings()
  const branch = branchName(order.InventSiteId)
  return (
    <>
      <div className="detail__hero">
        <p className="detail__customer">{order.SalesName}</p>
        <p className="detail__account">{order.CustAccount}</p>
      </div>

      <div className="detail__amounts">
        <div className="detail__amount detail__amount--total">
          <span>Order amount</span>
          <strong>{fmt.currency(order.HAR_TotalSOAmount)}</strong>
        </div>
        <div className="detail__amount">
          <span>Invoiced</span>
          <strong>{fmt.currency(order.HAR_InvoicedAmount)}</strong>
        </div>
        <div className="detail__amount">
          <span>Balance</span>
          <strong>{fmt.currency(order.HAR_BalanceAmount)}</strong>
        </div>
      </div>

      <Section title="Order">
        <Field label="Order date">{fmt.dateTime(order.CreatedDateTime1)}</Field>
        <Field label="Requested ship date">{fmt.date(order.ShippingDateRequested)}</Field>
        <Field label="Last modified">{fmt.dateTime(order.ModifiedDateTime1)}</Field>
        <Field label="Sales type">{orDash(order.SalesType)}</Field>
        <Field label="Document status">{orDash(order.DocumentStatus)}</Field>
        <Field label="Release status">{orDash(order.ReleaseStatus)}</Field>
        <Field label="Validation">{orDash(order.DOT_ValidationStatus)}</Field>
        <Field label="Order stopped">{orDash(order.MCROrderStopped)}</Field>
      </Section>

      <Section title="Customer">
        <Field label="Customer ref.">{orDash(order.CustomerRef)}</Field>
        <Field label="PO form no.">{orDash(order.PurchOrderFormNum)}</Field>
        <Field label="Sales taker">{orDash(order.SalesTaker)}</Field>
        <Field label="Sales group">{orDash(order.SalesGroup)}</Field>
      </Section>

      <Section title="Branch and delivery">
        <Field label="Branch / site">
          {order.InventSiteId}
          {branch !== order.InventSiteId && <span className="detail__muted"> ({branch})</span>}
        </Field>
        <Field label="Item group">{orDash(order.DOT_ItemGroupId)}</Field>
        <Field label="Sales district">{orDash(order.SalesDistrictDescription)}</Field>
        <Field label="Delivery district">
          {orDash(order.HAR_DeliveryDistrictDescription)}
          {order.HAR_SalesDeliveryDistrictId && (
            <span className="detail__muted"> ({order.HAR_SalesDeliveryDistrictId})</span>
          )}
        </Field>
      </Section>

      <Section title="Notes">
        <Field label="Sales order notes" wide>
          {orDash(order.DOT_SONotes)}
        </Field>
        <Field label="SFA notes" wide>
          {orDash(order.DOT_SFANotes)}
        </Field>
      </Section>
    </>
  )
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function OrderDrawer({ salesId, preview, onClose }: OrderDrawerProps) {
  const detail = useApi(`order:${salesId}`, (signal) => fetchOrder(salesId, signal))
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Modal behaviour: focus inside, Escape closes, Tab stays in the panel, page does not scroll behind.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => !el.hasAttribute('disabled'),
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.()
    }
  }, [])

  const order = detail.data ?? preview
  const titleId = 'order-drawer-title'

  return (
    <div className="drawer" role="presentation">
      <div className="drawer__backdrop" onClick={onClose} />
      <div
        ref={panelRef}
        className="drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="drawer__header">
          <div className="drawer__title-row">
            <h2 id={titleId} className="drawer__title">
              {salesId}
            </h2>
            {order && <StatusBadge status={order.SalesStatus} />}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close order details"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="drawer__body">
          {detail.error && preview && (
            <p className="inline-alert" role="status">
              Showing the list snapshot. Latest details could not be loaded.{' '}
              <button type="button" className="link-btn" onClick={detail.reload}>
                Retry
              </button>
            </p>
          )}
          {order ? (
            <OrderDetail order={order} />
          ) : detail.error ? (
            <ErrorState
              title={detail.error.status === 404 ? 'Order not found' : 'Unable to load this order'}
              message={detail.error.message}
              onRetry={detail.error.status === 404 ? undefined : detail.reload}
            />
          ) : (
            <DetailSkeleton />
          )}
        </div>
      </div>
    </div>
  )
}
