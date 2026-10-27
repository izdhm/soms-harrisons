import { vi } from 'vitest'
import type { SalesOrder } from '../api/types'
import { META, jsonResponse, makeList } from './fixtures'

type ListHandler = (params: URLSearchParams) => Response | Promise<Response>

/**
 * Routes fetch calls the way the mock API does: the list, /meta and /{SalesId}.
 * `list` can be swapped per test to simulate filters, failures or slow responses.
 */
export function installApiMock(orders: SalesOrder[]) {
  const mock = {
    fetch: vi.fn<typeof fetch>(),
    list: ((params) => {
      const site = params.get('site')
      const status = params.get('status')
      return jsonResponse(
        makeList(orders.filter((o) => (!site || o.InventSiteId === site) && (!status || o.SalesStatus === status))),
      )
    }) as ListHandler,
    /** Query strings of list requests made by the orders table (the dataset pages at 100). */
    tableCalls(): URLSearchParams[] {
      return mock.fetch.mock.calls
        .map(([url]) => new URL(String(url)))
        .filter((u) => u.pathname === '/sales-orders' && u.searchParams.get('pageSize') !== '100')
        .map((u) => u.searchParams)
    },
  }

  mock.fetch.mockImplementation(async (input) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/meta')) return jsonResponse(META)
    if (url.pathname === '/sales-orders') return mock.list(url.searchParams)
    const id = decodeURIComponent(url.pathname.split('/').pop() ?? '')
    const order = orders.find((o) => o.SalesId === id)
    return order ? jsonResponse({ data: order }) : jsonResponse({ error: 'Not found' }, 404)
  })
  vi.stubGlobal('fetch', mock.fetch)
  return mock
}
