import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_QUERY } from '../lib/query'
import { META, jsonResponse, makeList, makeOrder } from '../test/fixtures'
import { ApiError, fetchOrder, fetchOrders, testConnection } from './client'

const fetchMock = vi.fn<typeof fetch>()

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function stubFetch() {
  vi.stubGlobal('fetch', fetchMock)
}

describe('fetchOrders', () => {
  it('sends the auth header and only non-empty query params', async () => {
    stubFetch()
    fetchMock.mockResolvedValue(jsonResponse(makeList([makeOrder()])))

    await fetchOrders({ ...DEFAULT_QUERY, q: '  Siti ', site: 'B20' })

    const [url, init] = fetchMock.mock.calls[0]
    const parsed = new URL(String(url))
    expect(parsed.origin + parsed.pathname).toBe('https://api.test/sales-orders')
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      page: '1',
      pageSize: '25',
      q: 'Siti',
      site: 'B20',
      sort: 'CreatedDateTime1',
      order: 'desc',
    })
    expect((init?.headers as Record<string, string>)['x-assessment-key']).toBe('test-key')
  })

  it('turns a 401 into a readable ApiError', async () => {
    stubFetch()
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Unauthorized' }, 401))

    const err = await fetchOrders(DEFAULT_QUERY).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ kind: 'http', status: 401 })
    expect((err as ApiError).message).toMatch(/access key/i)
  })

  it('reports server errors with the status code', async () => {
    stubFetch()
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }))

    await expect(fetchOrders(DEFAULT_QUERY)).rejects.toMatchObject({
      kind: 'http',
      status: 502,
      message: 'The sales order service is unavailable (HTTP 502).',
    })
  })

  it('reports network failures', async () => {
    stubFetch()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(fetchOrders(DEFAULT_QUERY)).rejects.toMatchObject({ kind: 'network' })
  })

  it('times out slow requests', async () => {
    vi.useFakeTimers()
    stubFetch()
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )

    const pending = fetchOrders(DEFAULT_QUERY).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(15_000)
    expect(await pending).toMatchObject({ kind: 'timeout' })
  })

  it('passes caller cancellation through untouched', async () => {
    stubFetch()
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )

    const controller = new AbortController()
    const pending = fetchOrders(DEFAULT_QUERY, controller.signal).catch((e: unknown) => e)
    controller.abort()
    const err = await pending
    expect(err).not.toBeInstanceOf(ApiError)
    expect((err as DOMException).name).toBe('AbortError')
  })
})

describe('fetchOrder', () => {
  it('unwraps the data envelope and encodes the id', async () => {
    stubFetch()
    fetchMock.mockResolvedValue(jsonResponse({ data: makeOrder() }))

    const order = await fetchOrder('SO-MOCK-00001')
    expect(order.SalesId).toBe('SO-MOCK-00001')
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.test/sales-orders/SO-MOCK-00001')
  })

  it('maps 404 to a not-found message', async () => {
    stubFetch()
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Not found' }, 404))

    await expect(fetchOrder('SO-NOPE')).rejects.toMatchObject({
      status: 404,
      message: 'The requested order could not be found.',
    })
  })
})

describe('testConnection', () => {
  const config = { baseUrl: 'https://api.test/sales-orders', apiKey: 'typed-key', timeoutMs: 15_000 }

  it('sends the typed key and reports the meta details', async () => {
    stubFetch()
    fetchMock.mockResolvedValue(jsonResponse(META))

    await expect(testConnection(config)).resolves.toMatchObject({ version: '1.1.0', sites: 2, statuses: 4 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('https://api.test/sales-orders/meta')
    expect((init?.headers as Record<string, string>)['x-assessment-key']).toBe('typed-key')
  })

  it('fails with the access key message when the API rejects the key', async () => {
    stubFetch()
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Unauthorized' }, 401))

    const err = await testConnection(config).catch((e: unknown) => e)
    expect(err).toMatchObject({ kind: 'http', status: 401 })
    expect((err as ApiError).message).toMatch(/access key/i)
  })
})
