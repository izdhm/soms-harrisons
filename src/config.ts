const DEFAULT_API_BASE_URL = 'https://hiring.harrisons.my/api/mock/sales-orders'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(
  /\/+$/,
  '',
)

export const API_KEY = import.meta.env.VITE_API_KEY ?? ''

export const REQUEST_TIMEOUT_MS = 15_000
