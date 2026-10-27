import { useState, type ReactNode } from 'react'
import { ChevronDownIcon, EyeIcon, EyeOffIcon } from './Icons'

export function SettingRow({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="setting">
      <div className="setting__label">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>}
        {hint && <p className="setting__hint">{hint}</p>}
      </div>
      <div className="setting__control">
        {children}
        {error && (
          <p className="setting__error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

export function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  invalid = false,
  suffix,
  min,
  max,
  disabled,
}: {
  id: string
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'number' | 'url'
  invalid?: boolean
  suffix?: string
  min?: number
  max?: number
  disabled?: boolean
}) {
  return (
    <div className={`text-field${invalid ? ' is-invalid' : ''}`}>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {suffix && <span className="text-field__suffix">{suffix}</span>}
    </div>
  )
}

export function SecretInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="text-field">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="text-field__btn"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide value' : 'Show value'}
      >
        {visible ? <EyeOffIcon width="16" height="16" /> : <EyeIcon width="16" height="16" />}
      </button>
    </div>
  )
}

export function Select({
  id,
  value,
  onChange,
  children,
}: {
  id: string
  value: string | number
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div className="text-field text-field--select">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <ChevronDownIcon className="text-field__chevron" width="16" height="16" />
    </div>
  )
}

export function Toggle({
  id,
  checked,
  onChange,
  label,
  disabled = false,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`switch${checked ? ' is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__thumb" />
    </button>
  )
}

export function RadioCards<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; icon?: ReactNode }[]
}) {
  return (
    <div className="radio-cards" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <label key={o.value} className={`radio-card${o.value === value ? ' is-active' : ''}`}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={o.value === value}
            onChange={() => onChange(o.value)}
          />
          {o.icon}
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  )
}
