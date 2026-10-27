import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrdersListResponse } from '../api/types'
import { installApiMock } from '../test/apiMock'
import { jsonResponse, makeList, makeOrder } from '../test/fixtures'
import { renderApp, resetBrowserState } from '../test/render'

const ORDERS = [
  makeOrder(),
  makeOrder({
    SalesId: 'SO-MOCK-00002',
    SalesName: 'John Distribution Sdn Bhd',
    CustAccount: 'C10002',
    InventSiteId: 'C30',
    SalesStatus: 'Invoiced',
    HAR_TotalSOAmount: 274.7,
  }),
]

let api: ReturnType<typeof installApiMock>

beforeEach(() => {
  resetBrowserState()
  api = installApiMock(ORDERS)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const searchBox = () => screen.getByRole('searchbox', { name: 'Search orders' })

describe('Sales orders page', () => {
  it('lists orders and status counts from the API', async () => {
    renderApp('/app/orders')

    expect(await screen.findByText('SO-MOCK-00001')).toBeInTheDocument()
    expect(screen.getByText('John Distribution Sdn Bhd')).toBeInTheDocument()
    expect(screen.getByText('RM 274.70')).toBeInTheDocument()

    const tabs = within(screen.getByRole('tablist', { name: 'Filter by status' }))
    expect(tabs.getByRole('tab', { name: /All orders/ })).toHaveTextContent('1,200')
    expect(tabs.getByRole('tab', { name: /Open order/ })).toHaveTextContent('420')
  })

  it('sends search text to the API after typing stops', async () => {
    const user = userEvent.setup()
    renderApp('/app/orders')
    await screen.findByText('SO-MOCK-00001')

    await user.type(searchBox(), 'Siti')

    await waitFor(() => expect(api.tableCalls().at(-1)?.get('q')).toBe('Siti'))
    expect(api.tableCalls().filter((p) => p.has('q'))).toHaveLength(1)
    expect(window.location.search).toContain('q=Siti')
  })

  it('filters by branch and by status tab', async () => {
    const user = userEvent.setup()
    renderApp('/app/orders')
    await screen.findByText('SO-MOCK-00001')

    await user.selectOptions(screen.getByLabelText('Branch'), 'B20')
    await user.click(screen.getByRole('tab', { name: /Invoiced/ }))

    await waitFor(() => {
      const last = api.tableCalls().at(-1)
      expect(last?.get('site')).toBe('B20')
      expect(last?.get('status')).toBe('Invoiced')
      expect(last?.get('page')).toBe('1')
    })
    expect(screen.getByRole('tab', { name: /Invoiced/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows an empty state and lets the user clear filters', async () => {
    const user = userEvent.setup()
    api.list = (params) => jsonResponse(params.get('q') ? makeList([]) : makeList(ORDERS))
    renderApp('/app/orders?q=nothing-matches')

    expect(await screen.findByText('No orders match your search and filters')).toBeInTheDocument()
    const emptyState = screen.getByRole('status')
    await user.click(within(emptyState).getByRole('button', { name: 'Clear filters' }))

    expect(await screen.findByText('SO-MOCK-00001')).toBeInTheDocument()
    expect(searchBox()).toHaveValue('')
  })

  it('shows an error state and recovers on retry', async () => {
    const user = userEvent.setup()
    let fail = true
    api.list = () => (fail ? jsonResponse({ error: 'Boom' }, 500) : jsonResponse(makeList(ORDERS)))
    renderApp('/app/orders')

    expect(await screen.findByText('Unable to load orders')).toBeInTheDocument()
    expect(screen.getByText('The sales order service is unavailable (HTTP 500).')).toBeInTheDocument()

    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('SO-MOCK-00001')).toBeInTheDocument()
    expect(screen.queryByText('Unable to load orders')).not.toBeInTheDocument()
  })

  it('keeps the latest response when an older one resolves late', async () => {
    const user = userEvent.setup()
    let releaseSlow: (r: Response) => void = () => {}
    api.list = (params) => {
      const site = params.get('site')
      if (site === 'A10') {
        return new Promise<Response>((resolve) => {
          releaseSlow = resolve
        })
      }
      return jsonResponse(makeList(site ? ORDERS.filter((o) => o.InventSiteId === site) : ORDERS))
    }
    renderApp('/app/orders')
    await screen.findByText('SO-MOCK-00001')

    await user.selectOptions(screen.getByLabelText('Branch'), 'A10')
    await user.selectOptions(screen.getByLabelText('Branch'), 'B20')
    await waitFor(() => expect(screen.queryByText('SO-MOCK-00002')).not.toBeInTheDocument())

    const stale: OrdersListResponse = makeList([ORDERS[1]])
    releaseSlow(jsonResponse(stale))
    await new Promise((r) => setTimeout(r, 20))

    expect(screen.getByText('SO-MOCK-00001')).toBeInTheDocument()
    expect(screen.queryByText('SO-MOCK-00002')).not.toBeInTheDocument()
  })

  it('opens order details from the table and closes with Escape', async () => {
    const user = userEvent.setup()
    renderApp('/app/orders')

    await user.click(await screen.findByRole('button', { name: 'SO-MOCK-00002' }))

    const dialog = await screen.findByRole('dialog', { name: 'SO-MOCK-00002' })
    expect(within(dialog).getByText('John Distribution Sdn Bhd')).toBeInTheDocument()
    await waitFor(() =>
      expect(api.fetch.mock.calls.some(([u]) => String(u).endsWith('/SO-MOCK-00002'))).toBe(true),
    )
    expect(window.location.search).toContain('order_id=SO-MOCK-00002')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(window.location.search).not.toContain('order_id')
  })

  it('shows not found for a deep link to a missing order', async () => {
    renderApp('/app/orders?order_id=SO-NOPE')

    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Order not found')).toBeInTheDocument()
  })
})
