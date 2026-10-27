import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AlertIcon, CheckCircleIcon, CloseIcon, InfoIcon } from './Icons'

type Tone = 'success' | 'error' | 'info'

interface Toast {
  id: number
  title: string
  tone: Tone
}

type Notify = (title: string, tone?: Tone) => void

const ToastContext = createContext<Notify | null>(null)

const ICONS = { success: CheckCircleIcon, error: AlertIcon, info: InfoIcon }

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback<Notify>(
    (title, tone = 'success') => {
      const id = nextId++
      setToasts((list) => [...list.slice(-2), { id, title, tone }])
      window.setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  const value = useMemo(() => notify, [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => {
          const Icon = ICONS[t.tone]
          return (
            <div key={t.id} className={`toast toast--${t.tone}`} role="status">
              <Icon width="18" height="18" className="toast__icon" />
              <span className="toast__title">{t.title}</span>
              <button
                type="button"
                className="toast__close"
                aria-label="Dismiss notification"
                onClick={() => dismiss(t.id)}
              >
                <CloseIcon width="14" height="14" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): Notify {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
