// Connection details for the sales order API. Build-time values come from Vite env
// variables; administrators can override them at runtime in System settings.

export interface ApiConfig {
  baseUrl: string
  apiKey: string
  timeoutMs: number
}

export const ENV_API_CONFIG: ApiConfig = {
  baseUrl: (
    import.meta.env.VITE_API_BASE_URL || 'https://hiring.harrisons.my/api/mock/sales-orders'
  ).replace(/\/+$/, ''),
  apiKey: import.meta.env.VITE_API_KEY ?? '',
  timeoutMs: 15_000,
}

let current: ApiConfig = { ...ENV_API_CONFIG }

export function getApiConfig(): ApiConfig {
  return current
}

export function setApiConfig(next: Partial<ApiConfig>): void {
  current = {
    baseUrl: (next.baseUrl || ENV_API_CONFIG.baseUrl).replace(/\/+$/, ''),
    apiKey: next.apiKey || ENV_API_CONFIG.apiKey,
    timeoutMs: next.timeoutMs ?? ENV_API_CONFIG.timeoutMs,
  }
}
