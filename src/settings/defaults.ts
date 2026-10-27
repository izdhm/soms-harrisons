import { SORT_FIELDS, type SortField, type SortOrder } from '../api/types'

export type DateFormat = 'DD MMM YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
export type CurrencyStyle = 'symbol' | 'code'
export type ThemeSetting = 'light' | 'dark' | 'system'
export type Density = 'comfortable' | 'compact'

export interface Settings {
  general: {
    companyName: string
    systemName: string
    timeZone: string
    dateFormat: DateFormat
    currencyStyle: CurrencyStyle
  }
  appearance: {
    theme: ThemeSetting
    density: Density
    sidebarCollapsed: boolean
  }
  orders: {
    pageSize: number
    sort: SortField
    order: SortOrder
    highValueThreshold: number
    flagHighValue: boolean
  }
  /** Display names for branch site codes, e.g. { KK01: 'Kota Kinabalu' }. */
  branches: Record<string, string>
  api: {
    /** Empty means "use the build default". */
    baseUrl: string
    timeoutSeconds: number
    refreshMinutes: number
    cacheMinutes: number
  }
  notifications: {
    onHold: boolean
    pendingValidation: boolean
    highValueOpen: boolean
    agingOpen: boolean
    agingDays: number
    emailDigest: boolean
  }
  security: {
    sessionTimeoutMinutes: number
    allowRememberMe: boolean
  }
}

export const TIME_ZONES = [
  { value: 'Asia/Kuala_Lumpur', label: 'Malaysia (UTC+08:00)' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+08:00)' },
  { value: 'Asia/Jakarta', label: 'Jakarta (UTC+07:00)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
]

export const DATE_FORMATS: DateFormat[] = ['DD MMM YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']

export const DEFAULT_SETTINGS: Settings = {
  general: {
    companyName: 'Harrisons Sabah Sdn Bhd',
    systemName: 'Sales Order Monitoring',
    timeZone: 'Asia/Kuala_Lumpur',
    dateFormat: 'DD MMM YYYY',
    currencyStyle: 'symbol',
  },
  appearance: {
    theme: 'light',
    density: 'comfortable',
    sidebarCollapsed: false,
  },
  orders: {
    pageSize: 25,
    sort: 'CreatedDateTime1',
    order: 'desc',
    highValueThreshold: 1500,
    flagHighValue: true,
  },
  branches: {},
  api: {
    baseUrl: '',
    timeoutSeconds: 15,
    refreshMinutes: 0,
    cacheMinutes: 5,
  },
  notifications: {
    onHold: true,
    pendingValidation: true,
    highValueOpen: true,
    agingOpen: true,
    agingDays: 90,
    emailDigest: false,
  },
  security: {
    sessionTimeoutMinutes: 30,
    allowRememberMe: true,
  },
}

export const SETTINGS_STORAGE_KEY = 'soms.settings'

type Section = keyof Settings

/** Merges stored values over defaults so new settings keep working after an upgrade. */
export function mergeSettings(stored: unknown): Settings {
  const result = structuredClone(DEFAULT_SETTINGS)
  if (!stored || typeof stored !== 'object') return result
  for (const section of Object.keys(DEFAULT_SETTINGS) as Section[]) {
    const value = (stored as Record<string, unknown>)[section]
    if (value && typeof value === 'object') {
      Object.assign(result[section], value)
    }
  }
  if (!SORT_FIELDS.includes(result.orders.sort)) result.orders.sort = DEFAULT_SETTINGS.orders.sort
  // Earlier versions saved an API key here; the key is now fixed at build time.
  delete (result.api as Record<string, unknown>).apiKey
  return result
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    return mergeSettings(raw ? JSON.parse(raw) : null)
  } catch {
    return structuredClone(DEFAULT_SETTINGS)
  }
}

export function storeSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage can be unavailable (private mode); settings then last for this visit only.
  }
}
