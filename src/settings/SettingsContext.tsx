import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setApiConfig } from '../api/config'
import { DEFAULT_SETTINGS, loadSettings, storeSettings, type Settings } from './defaults'

interface SettingsContextValue {
  settings: Settings
  save: (next: Settings) => void
  reset: () => void
  /** Display name for a branch code, falling back to the code itself. */
  branchName: (code: string) => string
  /** The theme in effect after resolving "system". */
  resolvedTheme: 'light' | 'dark'
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function applyApiSettings(settings: Settings) {
  setApiConfig({
    baseUrl: settings.api.baseUrl.trim(),
    apiKey: settings.api.apiKey.trim(),
    timeoutMs: settings.api.timeoutSeconds * 1000,
  })
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  // The API client is configured during the first render so children's first requests use it.
  const [settings, setSettings] = useState<Settings>(() => {
    const initial = loadSettings()
    applyApiSettings(initial)
    return initial
  })

  const { theme, density } = settings.appearance
  const [systemDark, setSystemDark] = useState(systemPrefersDark)
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(DARK_QUERY)
    const onChange = () => setSystemDark(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.dataset.density = density
  }, [resolvedTheme, density])

  const save = useCallback((next: Settings) => {
    applyApiSettings(next)
    storeSettings(next)
    setSettings(next)
  }, [])

  const reset = useCallback(() => save(structuredClone(DEFAULT_SETTINGS)), [save])

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      save,
      reset,
      branchName: (code) => settings.branches[code]?.trim() || code,
      resolvedTheme,
    }),
    [settings, save, reset, resolvedTheme],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
