import { useId } from 'react'
export function AuthenticatorCodeField({
  value,
  onChange,
  disabled,
  error,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string
}) {
  const id = useId()
  return (
    <div className="mfa-code-field">
      <label htmlFor={id}>Authenticator code</label>
      <input
        id={id}
        autoFocus
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        disabled={disabled}
        value={value}
        placeholder="000000"
        aria-invalid={!!error}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      />
      <p id={`${id}-hint`} className="mfa-hint">
        Enter the 6-digit code from your authenticator app.
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="mfa-error">
          {error}
        </p>
      )}
    </div>
  )
}
