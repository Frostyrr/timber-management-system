import { useEffect, useRef, useState } from 'react'
import { client } from '../../backend/client'
import { AuthenticatorCodeField } from './AuthenticatorCodeField'
import { Skeleton } from './Skeleton'
import { Avatar } from './Avatar'
import { ArrowRight, Check, Copy, LoaderCircle, ShieldCheck } from 'lucide-react'
import { summarizeMfaAction, type MfaSummary } from '../../backend/mfaSummary'

export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return ''
  const trimmed = email.trim()
  const atIndex = trimmed.indexOf('@')
  if (atIndex <= 0) return ''
  const local = trimmed.slice(0, atIndex)
  const domain = trimmed.slice(atIndex + 1)
  if (!domain) return ''
  const maskedLocal = local.length <= 1 ? `${local}***` : `${local[0]}***`
  return `${maskedLocal}@${domain}`
}

export function AuthenticatorForm({
  scope = 'unlock',
  payload = {},
  onVerified,
  onCancel,
  operatorName,
  operatorAvatarUrl,
  operatorEmail,
  summary,
}: {
  operatorName?: string
  operatorAvatarUrl?: string | null
  operatorEmail?: string | null
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
  const [copiedKey, setCopiedKey] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null | undefined>(operatorEmail)
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(operatorAvatarUrl)
  const started = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (operatorEmail) setUserEmail(operatorEmail)
    if (operatorAvatarUrl) setAvatarUrl(operatorAvatarUrl)
  }, [operatorEmail, operatorAvatarUrl])

  useEffect(() => {
    if ((!userEmail || !avatarUrl) && client) {
      client.auth
        .getUser()
        .then(({ data }) => {
          const u = data?.user
          if (u) {
            if (!userEmail && u.email) setUserEmail(u.email)
            if (!avatarUrl) {
              const meta = u.user_metadata
              const pic = (meta?.avatar_url || meta?.picture) as string | undefined
              if (pic) setAvatarUrl(pic)
            }
          }
        })
        .catch(() => {})
    }
  }, [userEmail, avatarUrl])

  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    if (newCode.length === 6 && !busy && factor && intent) {
      setTimeout(() => {
        formRef.current?.requestSubmit()
      }, 50)
    }
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      try {
        const ticket = await client!.rpc('operator_begin', { scope, payload })
        if (ticket.error) throw ticket.error
        setIntent(ticket.data as string)
        const listed = await client!.auth.mfa.listFactors()
        if (listed.error || !listed.data) throw listed.error || new Error('Failed to list factors')
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
        if (enrolled.error || !enrolled.data) throw enrolled.error || new Error('Failed to enroll factor')
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
  const maskedEmail = maskEmail(userEmail)

  return (
    <form
      ref={formRef}
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
      {preparing ? (
        <div
          className="mfa-preparing flex flex-col items-center justify-center text-center py-2"
          aria-label="Preparing verification"
        >
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="mt-3 h-5 w-28 rounded-full" />
          <Skeleton className="mt-4 h-6 w-48 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-60 rounded-md" />
          <div className="mt-6 flex w-full max-w-[280px] gap-2 justify-center">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 flex-1 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="mt-5 h-11 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <div className="mfa-intro flex flex-col items-center text-center">
            {/* Primary Identity: Avatar with subtle security emblem */}
            <div className="relative inline-flex items-center justify-center">
              <Avatar
                name={operatorName || userEmail || 'Operator'}
                url={avatarUrl}
                className="h-16 w-16 text-lg rounded-full shadow-md border-2 border-white ring-4 ring-[#153f32]/10"
                alt={operatorName ? `Account avatar for ${operatorName}` : 'Operator avatar'}
              />
              <span
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-forest text-white ring-2 ring-white shadow-sm"
                aria-hidden="true"
              >
                <ShieldCheck size={12} className="stroke-[2.5]" />
              </span>
            </div>

            {/* Subtle Masked Email confirming account identity without clutter */}
            {maskedEmail && (
              <span
                className="mfa-masked-email mt-2.5"
                title={operatorName ? `${operatorName} (${userEmail})` : userEmail ?? undefined}
                aria-label={`Verifying account for ${operatorName || userEmail}`}
              >
                {maskedEmail}
              </span>
            )}

            <h1 className="mt-3.5 text-xl font-bold tracking-[-0.025em] text-ink sm:text-[22px]">
              {setup
                ? 'Set up two-factor authentication'
                : scope === 'unlock'
                  ? 'Two-factor authentication'
                  : 'Verify action'}
            </h1>
            <p className="mt-1 text-xs text-muted-ink leading-relaxed sm:text-[13px]">
              {setup
                ? 'Scan the QR code with your authenticator app to protect your account.'
                : scope === 'unlock'
                  ? 'Enter the 6-digit verification code from your authenticator app.'
                  : 'Enter your authenticator code to authorize this change.'}
            </p>
          </div>

          {setup && (
            <section className="mfa-setup" aria-label="Authenticator setup">
              <p className="mfa-step text-xs font-medium text-ink">
                <span>1</span> Scan with your authenticator app
              </p>
              <div className="mfa-qr">
                <img
                  src={setup.qr_code}
                  alt="Authenticator setup QR code"
                  width="180"
                  height="180"
                />
              </div>
              <details className="mfa-disclosure">
                <summary className="text-xs font-medium text-primary hover:text-forest transition-colors">
                  Can’t scan? Use a setup key
                </summary>
                <p className="text-xs text-muted-ink mt-1">
                  Enter this key manually in your authenticator app.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <code className="mfa-secret flex-1 font-mono text-xs">{setup.secret}</code>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-line-subtle bg-surface hover:bg-[#edf4ee] text-ink transition-colors shrink-0"
                    onClick={() => {
                      void navigator.clipboard?.writeText(setup.secret)
                      setCopiedKey(true)
                      setTimeout(() => setCopiedKey(false), 2000)
                    }}
                  >
                    {copiedKey ? (
                      <>
                        <Check size={14} className="text-forest" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="text-muted-ink" />
                        <span>Copy key</span>
                      </>
                    )}
                  </button>
                </div>
              </details>
              <p className="mfa-step text-xs font-medium text-ink mt-4">
                <span>2</span> Enter the code from your phone
              </p>
            </section>
          )}

          {scope !== 'unlock' && (
            <section
              className={`mfa-action-summary ${actionSummary.destructive ? 'is-destructive' : ''}`}
              aria-label="Action summary"
            >
              <strong className="block font-semibold text-xs text-ink">{actionSummary.title}</strong>
              {actionSummary.records.length > 0 && (
                <ul className="my-2 pl-4 list-disc text-xs text-muted-ink max-h-24 overflow-y-auto">
                  {actionSummary.records.map((name, index) => (
                    <li key={index}>{name}</li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-ink mt-1.5">{actionSummary.consequence}</p>
            </section>
          )}

          <AuthenticatorCodeField
            value={code}
            onChange={handleCodeChange}
            disabled={busy || !factor}
            error={error}
          />

          {error && (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                className="mfa-text-button text-xs text-muted-ink hover:text-primary transition-colors"
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
            </div>
          )}

          <button
            className="primary mfa-submit w-full"
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

      <div className="mfa-secondary-actions flex items-center justify-center pt-1">
        {onCancel ? (
          <button type="button" className="mfa-text-button" disabled={busy} onClick={onCancel}>
            Cancel and go back
          </button>
        ) : (
          <button
            type="button"
            className="mfa-text-button inline-flex items-center gap-1.5"
            disabled={busy}
            onClick={() => void client!.auth.signOut()}
          >
            Sign out
          </button>
        )}
      </div>

      <details className="mfa-disclosure mfa-recovery mt-2 pt-3 border-t border-line-subtle text-center">
        <summary className="text-xs text-muted-ink hover:text-primary cursor-pointer transition-colors">
          Can’t access your authenticator?
        </summary>
        <p className="text-xs text-muted-ink mt-2 leading-relaxed text-left bg-surface/60 p-3 rounded-xl border border-line-subtle">
          Contact your publication administrator to verify your identity and restore access. All your
          equipment and history records remain protected.
        </p>
      </details>
    </form>
  )
}
