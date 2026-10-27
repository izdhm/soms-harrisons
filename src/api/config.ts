// Connection details for the sales order API. Build-time values come from Vite env
// variables; administrators can override the address and timeout in System settings.
// The key is fixed at build time so every visitor sees data without setting anything.

export interface ApiConfig {
  baseUrl: string
  apiKey: string
  timeoutMs: number
}

/** The public, read-only key published in the assessment brief. */
const ASSESSMENT_API_KEY = 'hssb-assessment-mock-2026'

export const ENV_API_CONFIG: ApiConfig = {
  baseUrl: (
    import.meta.env.VITE_API_BASE_URL || 'https://hiring.harrisons.my/api/mock/sales-orders'
  ).replace(/\/+$/, ''),
  apiKey: import.meta.env.VITE_API_KEY || ASSESSMENT_API_KEY,
  timeoutMs: 15_000,
}

let current: ApiConfig = { ...ENV_API_CONFIG }

export function getApiConfig(): ApiConfig {
  return current
}

export function setApiConfig(next: Partial<Omit<ApiConfig, 'apiKey'>>): void {
  current = {
    baseUrl: (next.baseUrl || ENV_API_CONFIG.baseUrl).replace(/\/+$/, ''),
    apiKey: ENV_API_CONFIG.apiKey,
    timeoutMs: next.timeoutMs ?? ENV_API_CONFIG.timeoutMs,
  }
}
