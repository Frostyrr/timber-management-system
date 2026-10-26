import { useEffect, useRef, useState } from 'react'
import { client } from '../../backend/client'
import { AuthenticatorCodeField } from './AuthenticatorCodeField'
import { Skeleton } from './Skeleton'
import { LockKeyhole, ShieldCheck, Smartphone, ArrowRight, LoaderCircle, Copy, Check } from 'lucide-react'
import { summarizeMfaAction, type MfaSummary } from '../../backend/mfaSummary'

export function AuthenticatorForm({
  scope = 'unlock',
  payload = {},
  onVerified,
  onCancel,
  operatorName,
  summary,
}: {
  operatorName?: string
  summary?: MfaSummary
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
  const actionSummary = summary ?? summarizeMfaAction(payload)
  const preparing = !factor && !error
  return (
    <form
      className="mfa-form"
      aria-busy={busy || preparing}
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
      <div className="mfa-brand">
        <img src="/logo.png" alt="The Timberland" />
        <span>
          TIMBER<span>Publication inventory</span>
        </span>
      </div>
      {preparing ? (
        <div className="mfa-preparing" aria-label="Preparing verification">
          <Skeleton className="mx-auto h-12 w-12 rounded-2xl" />
          <Skeleton className="mx-auto mt-5 h-7 w-52" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-7 h-16 w-full" />
          <Skeleton className="mt-5 h-12 w-full" />
        </div>
      ) : (
        <>
          <div className="mfa-intro">
            <span className="mfa-emblem" aria-hidden="true">
              {setup ? (
                <Smartphone size={23} />
              ) : scope === 'unlock' ? (
                <LockKeyhole size={23} />
              ) : (
                <ShieldCheck size={23} />
              )}
            </span>
            <p className="mfa-eyebrow">
              {setup
                ? 'ACCOUNT PROTECTION'
                : scope === 'unlock'
                  ? 'SECURE WORKSPACE'
                  : 'CONFIRM YOUR IDENTITY'}
            </p>
            <h1>
              {setup
                ? 'Secure your account'
                : scope === 'unlock'
                  ? 'Unlock workspace'
                  : 'Verify this action'}
            </h1>
            <p>
              {setup
                ? 'Link your phone’s authenticator to keep your publication account protected.'
                : scope === 'unlock'
                  ? 'Your workspace is protected. Verify to pick up where you left off.'
                  : 'One more check before this change takes effect.'}
            </p>
            {operatorName && scope === 'unlock' && !setup && (
              <span className="mfa-identity">{operatorName}</span>
            )}
          </div>
          {setup && (
            <section className="mfa-setup" aria-label="Authenticator setup">
              <p className="mfa-step">
                <span>1</span> Scan with your authenticator app
              </p>
              <div className="mfa-qr">
                <img
                  src={setup.qr_code}
                  alt="Authenticator setup QR code"
                  width="192"
                  height="192"
                />
              </div>
              <details className="mfa-disclosure">
                <summary>Can’t scan? Use a setup key</summary>
                <p>Enter this key in your authenticator app. Keep it private.</p>
                <code className="mfa-secret">{setup.secret}</code>
              </details>
              <p className="mfa-step">
                <span>2</span> Enter the code from your phone
              </p>
            </section>
          )}
          {scope !== 'unlock' && (
            <section
              className={`mfa-action-summary ${actionSummary.destructive ? 'is-destructive' : ''}`}
              aria-label="Action summary"
            >
              <strong>{actionSummary.title}</strong>
              {actionSummary.records.length > 0 && (
                <ul>
                  {actionSummary.records.map((name, index) => (
                    <li key={index}>{name}</li>
                  ))}
                </ul>
              )}
              <p>{actionSummary.consequence}</p>
            </section>
          )}
          <AuthenticatorCodeField
            value={code}
            onChange={setCode}
            disabled={busy || !factor}
            error={error}
          />
          {error && (
            <button
              type="button"
              className="mfa-text-button"
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
          )}
          <button
            className="primary mfa-submit"
            disabled={busy || !factor || !intent || code.length !== 6}
          >
            {busy ? (
              <>
                <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" />
                Verifying…
              </>
            ) : (
              <>
                {setup
                  ? 'Finish setup'
                  : scope === 'unlock'
                    ? 'Unlock workspace'
                    : 'Verify and continue'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </>
      )}
      <div className="mfa-secondary-actions">
        {onCancel ? (
          <button type="button" className="mfa-text-button" disabled={busy} onClick={onCancel}>
            Cancel and go back
          </button>
        ) : (
          <button
            type="button"
            className="mfa-text-button"
            disabled={busy}
            onClick={() => void client!.auth.signOut()}
          >
            Sign out
          </button>
        )}
      </div>
      <details className="mfa-disclosure mfa-recovery">
        <summary>Can’t access your authenticator?</summary>
        <p>
          Contact the project owner to verify your identity and recover access. Your equipment
          records will be preserved.
        </p>
      </details>
    </form>
  )
}
