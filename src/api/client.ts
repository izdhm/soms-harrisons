import { API_BASE_URL, API_KEY, REQUEST_TIMEOUT_MS } from '../config'
import type {
  MetaResponse,
  OrderDetailResponse,
  OrderQuery,
  OrdersListResponse,
  SalesOrder,
} from './types'

export type ApiErrorKind = 'config' | 'network' | 'timeout' | 'http' | 'parse'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null

  constructor(message: string, kind: ApiErrorKind, status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

type Params = Record<string, string | number | undefined>

export function buildUrl(path: string, params: Params = {}): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return `${API_BASE_URL}${path}${qs ? `?${qs}` : ''}`
}

function messageForStatus(status: number, apiMessage: string | undefined): string {
  if (status === 401 || status === 403) {
    return 'The API rejected the access key. Check VITE_API_KEY.'
  }
  if (status === 404) return 'The requested order could not be found.'
  if (status === 429) return 'Too many requests. Please wait a moment and try again.'
  if (status >= 500) return `The sales order service is unavailable (HTTP ${status}).`
  return apiMessage ?? `Request failed (HTTP ${status}).`
}

async function request<T>(path: string, params?: Params, signal?: AbortSignal): Promise<T> {
  if (!API_KEY) {
    throw new ApiError('API key is not configured. Set VITE_API_KEY and rebuild.', 'config')
  }

  // One controller covers both the caller's cancellation and our own timeout.
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)
  const forwardAbort = () => controller.abort()
  signal?.addEventListener('abort', forwardAbort)

  try {
    const res = await fetch(buildUrl(path, params), {
      headers: { 'x-assessment-key': API_KEY, Accept: 'application/json' },
      signal: controller.signal,
    })

    let body: unknown = null
    try {
      body = await res.json()
    } catch {
      if (res.ok) throw new ApiError('The API returned an unreadable response.', 'parse', res.status)
    }

    if (!res.ok) {
      const apiMessage =
        body && typeof body === 'object' && 'error' in body ? String(body.error) : undefined
      throw new ApiError(messageForStatus(res.status, apiMessage), 'http', res.status)
    }

    return body as T
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (signal?.aborted) throw err
    if (timedOut) {
      throw new ApiError('The request timed out. Please try again.', 'timeout')
    }
    throw new ApiError(
      'Unable to reach the sales order service. Check your connection and try again.',
      'network',
    )
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}

export function fetchOrders(query: OrderQuery, signal?: AbortSignal): Promise<OrdersListResponse> {
  return request<OrdersListResponse>(
    '',
    {
      page: query.page,
      pageSize: query.pageSize,
      q: query.q.trim(),
      status: query.status,
      site: query.site,
      sort: query.sort,
      order: query.order,
    },
    signal,
  )
}

export async function fetchOrder(salesId: string, signal?: AbortSignal): Promise<SalesOrder> {
  const res = await request<OrderDetailResponse>(`/${encodeURIComponent(salesId)}`, {}, signal)
  return res.data
}

export function fetchMeta(signal?: AbortSignal): Promise<MetaResponse> {
  return request<MetaResponse>('/meta', {}, signal)
}
