import { useEffect, useRef, useState } from 'react'
import { client } from '../../backend/client'
import { Field } from './Field'

export function AuthenticatorForm({
  scope = 'unlock',
  payload = {},
  onVerified,
  onCancel,
}: {
  scope?: 'unlock' | 'inventory' | 'security'
  payload?: unknown
  onVerified: () => void | Promise<void>
  onCancel?: () => void
}) {
  const [attempt, setAttempt] = useState(0)
  const [factor, setFactor] = useState('')
  const [setup, setSetup] = useState<{ qr_code: string; secret: string } | null>(null)
  const [intent, setIntent] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      try {
        const ticket = await client!.rpc('operator_begin', { scope, payload })
        if (ticket.error) throw ticket.error
        setIntent(ticket.data as string)
        const listed = await client!.auth.mfa.listFactors()
        if (listed.error) throw listed.error
        const existing = listed.data.totp.find((f) => f.status === 'verified')
        if (existing) {
          setFactor(existing.id)
          return
        }
        // Discard incomplete enrollments from a previous abandoned setup, never verified factors.
        for (const f of listed.data.all.filter(
          (f) => f.factor_type === 'totp' && f.status === 'unverified',
        )) {
          const removed = await client!.auth.mfa.unenroll({ factorId: f.id })
          if (removed.error) throw removed.error
        }
        const enrolled = await client!.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'Timber authenticator',
          issuer: 'Timber',
        })
        if (enrolled.error) throw enrolled.error
        setFactor(enrolled.data.id)
        setSetup(enrolled.data.totp)
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : String((e as { message?: string }).message ?? 'Unable to prepare verification.'),
        )
      }
    })()
  }, [scope, payload, attempt])
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        if (busy || !factor || !intent) return
        setBusy(true)
        setError('')
        try {
          const result = await client!.auth.mfa.challengeAndVerify({ factorId: factor, code })
          if (result.error) throw result.error
          const complete = await client!.rpc('operator_complete', { intent_id: intent })
          if (complete.error) throw complete.error
          setSetup(null)
          setCode('')
          await onVerified()
        } catch (e) {
          setCode('')
          setError(
            e instanceof Error
              ? e.message
              : String(
                  (e as { message?: string }).message ?? 'Verification failed. Try a new code.',
                ),
          )
        } finally {
          setBusy(false)
        }
      }}
    >
      <h1 className="text-xl font-semibold">
        {setup
          ? 'Set up authenticator'
          : scope === 'unlock'
            ? 'Unlock workspace'
            : 'Verify this action'}
      </h1>
      <p className="text-sm text-muted-ink">
        {setup
          ? 'Scan this QR code in your phone’s authenticator app, then enter its six-digit code.'
          : 'Enter the current six-digit code from your phone’s authenticator.'}
      </p>
      {setup && (
        <>
          <img
            src={setup.qr_code}
            alt="Authenticator setup QR code"
            className="mx-auto h-48 w-48"
          />
          <details>
            <summary>Enter setup key manually</summary>
            <code className="break-all select-all">{setup.secret}</code>
          </details>
        </>
      )}
      {scope !== 'unlock' && (
        <details>
          <summary>Action details</summary>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </details>
      )}
      <Field label="Authenticator code">
        <input
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
      </Field>
      {error && (
        <>
          <p role="alert" className="error">
            {error}
          </p>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => {
              started.current = false
              setSetup(null)
              setFactor('')
              setIntent('')
              setCode('')
              setError('')
              setAttempt((value) => value + 1)
            }}
          >
            Restart verification
          </button>
        </>
      )}
      <button className="primary" disabled={busy || !factor || !intent}>
        {busy ? 'Verifying…' : 'Verify'}
      </button>
      {onCancel && (
        <button type="button" className="secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      )}
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={() => void client!.auth.signOut()}
      >
        Sign out
      </button>
      <p className="text-xs text-muted-ink">
        Lost access to your phone? Contact the project owner for identity-verified recovery.
      </p>
    </form>
  )
}
