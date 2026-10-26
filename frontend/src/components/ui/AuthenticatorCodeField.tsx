import { useId, useState, useRef, useEffect } from 'react'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [shaking, setShaking] = useState(false)

  // Trigger tactile shake animation when an error occurs
  useEffect(() => {
    if (error) {
      setShaking(true)
      const t = setTimeout(() => setShaking(false), 450)
      return () => clearTimeout(t)
    }
  }, [error])

  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')

  return (
    <div className="mfa-code-field">
      <label htmlFor={id} className="block text-xs font-medium text-ink mb-2">
        Authenticator code
      </label>

      {/* Segmented 6-Box Container with Transparent Overlay Input */}
      <div
        className={`relative flex items-center justify-between gap-2 sm:gap-2.5 cursor-text ${
          shaking ? 'mfa-shake' : ''
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Real accessible input overlaying the boxes for native password managers, autofill, and a11y */}
        <input
          ref={inputRef}
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
          className="absolute inset-0 z-10 h-full w-full opacity-0 cursor-text select-none caret-transparent"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6)
            onChange(cleaned)
          }}
        />

        {/* 6 Visual Segmented Digit Boxes */}
        {digits.map((digit, idx) => {
          const isActive =
            isFocused && (idx === value.length || (idx === 5 && value.length === 6))
          const isFilled = digit !== ''

          return (
            <div
              key={idx}
              className={`flex-1 h-14 sm:h-16 flex items-center justify-center rounded-2xl border text-2xl font-bold font-mono transition-all duration-150 select-none ${
                error
                  ? 'border-red-400/90 bg-red-50/50 text-red-900 ring-2 ring-red-400/20'
                  : isActive
                  ? 'border-forest bg-white text-forest ring-2 ring-forest/20 shadow-[0_2px_10px_rgba(21,63,50,0.14)] -translate-y-0.5'
                  : isFilled
                  ? 'border-forest/40 bg-surface/80 text-ink shadow-[0_1px_3px_rgba(21,63,50,0.06)]'
                  : 'border-[#cbd8ce] bg-[#fafcf9] text-muted-ink'
              }`}
            >
              {digit ? (
                <span className="animate-in zoom-in-75 duration-100">{digit}</span>
              ) : isActive ? (
                <span className="inline-block w-0.5 h-6 bg-forest animate-pulse rounded-full" />
              ) : (
                <span className="text-muted-ink/30 text-lg">·</span>
              )}
            </div>
          )
        })}
      </div>

      <p id={`${id}-hint`} className="mfa-hint text-[11.5px] text-muted-ink mt-2">
        Enter or paste the 6-digit code from your authenticator app.
      </p>
      {error && (
        <p id={`${id}-error`} role="alert" className="mfa-error text-xs text-[#963838] mt-2">
          {error}
        </p>
      )}
    </div>
  )
}
