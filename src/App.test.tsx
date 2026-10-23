import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { OrdersListResponse } from './api/types'
import { META, jsonResponse, makeList, makeOrder } from './test/fixtures'

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

type ListHandler = (params: URLSearchParams) => Response | Promise<Response>

let listHandler: ListHandler
const fetchMock = vi.fn<typeof fetch>()

function listCalls(): URLSearchParams[] {
  return fetchMock.mock.calls
    .map(([url]) => new URL(String(url)))
    .filter((u) => u.pathname === '/sales-orders')
    .map((u) => u.searchParams)
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  listHandler = () => jsonResponse(makeList(ORDERS))
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/meta')) return jsonResponse(META)
    if (url.pathname === '/sales-orders') return listHandler(url.searchParams)
    const id = decodeURIComponent(url.pathname.split('/').pop() ?? '')
    const order = ORDERS.find((o) => o.SalesId === id)
    return order ? jsonResponse({ data: order }) : jsonResponse({ error: 'Not found' }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('shows dashboard totals and the order list from the API', async () => {
    render(<App />)

    expect(await screen.findByText('SO-MOCK-00001')).toBeInTheDocument()
    const overview = within(screen.getByRole('region', { name: 'Overview' }))
    expect(overview.getByText('1,200')).toBeInTheDocument()
    expect(overview.getByText('660')).toBeInTheDocument()
    expect(overview.getByText('RM 998,244.30')).toBeInTheDocument()
    expect(screen.getByText('John Distribution Sdn Bhd')).toBeInTheDocument()
    expect(screen.getByText('RM 274.70')).toBeInTheDocument()
  })

  it('sends search text to the API after typing stops', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('SO-MOCK-00001')

    await user.type(screen.getByRole('searchbox', { name: /search orders/i }), 'Siti')

    await waitFor(() => expect(listCalls().at(-1)?.get('q')).toBe('Siti'))
    expect(listCalls().filter((p) => p.has('q'))).toHaveLength(1)
    expect(window.location.search).toContain('q=Siti')
  })

  it('filters by branch and status', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('SO-MOCK-00001')

    await user.selectOptions(screen.getByLabelText('Branch'), 'B20')
    await user.selectOptions(screen.getByLabelText('Status'), 'Invoiced')

    await waitFor(() => {
      const last = listCalls().at(-1)
      expect(last?.get('site')).toBe('B20')
      expect(last?.get('status')).toBe('Invoiced')
      expect(last?.get('page')).toBe('1')
    })
  })

  it('shows an empty state and lets the user clear filters', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/?q=nothing-matches')
    listHandler = (params) =>
      jsonResponse(params.get('q') ? makeList([]) : makeList(ORDERS))
    render(<App />)

    expect(await screen.findByText('No orders match your search and filters')).toBeInTheDocument()
    const emptyState = screen.getByRole('status')
    await user.click(within(emptyState).getByRole('button', { name: 'Clear filters' }))

    expect(await screen.findByText('SO-MOCK-00001')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: /search orders/i })).toHaveValue('')
  })

  it('shows an error state and recovers on retry', async () => {
    const user = userEvent.setup()
    let fail = true
    listHandler = () =>
      fail ? jsonResponse({ error: 'Boom' }, 500) : jsonResponse(makeList(ORDERS))
    render(<App />)

    expect(await screen.findByText('Unable to load orders')).toBeInTheDocument()
    expect(screen.getByText('Unable to load the dashboard')).toBeInTheDocument()

    fail = false
    await user.click(screen.getAllByRole('button', { name: 'Try again' })[0])

    expect(await screen.findByText('SO-MOCK-00001')).toBeInTheDocument()
    expect(screen.queryByText('Unable to load orders')).not.toBeInTheDocument()
  })

  it('keeps the latest response when an older one resolves late', async () => {
    const user = userEvent.setup()
    let releaseSlow: (r: Response) => void = () => {}
    listHandler = (params) => {
      if (params.get('site') === 'A10') {
        return new Promise<Response>((resolve) => {
          releaseSlow = resolve
        })
      }
      const site = params.get('site')
      return jsonResponse(
        makeList(site ? ORDERS.filter((o) => o.InventSiteId === site) : ORDERS),
      )
    }
    render(<App />)
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
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'SO-MOCK-00002' }))

    const dialog = await screen.findByRole('dialog', { name: 'SO-MOCK-00002' })
    expect(within(dialog).getByText('John Distribution Sdn Bhd')).toBeInTheDocument()
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('/SO-MOCK-00002'))).toBe(true),
    )
    expect(window.location.search).toContain('order_id=SO-MOCK-00002')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(window.location.search).not.toContain('order_id')
  })

  it('shows not found for a deep link to a missing order', async () => {
    window.history.replaceState(null, '', '/?order_id=SO-NOPE')
    render(<App />)

    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Order not found')).toBeInTheDocument()
  })
})
