import { useState } from 'react'
import { X, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react'
import { useDemo } from '../demo/context'

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

export function GoogleAuthModal({
  isOpen,
  onClose,
  connected,
  onToggleConnect,
}: {
  isOpen: boolean
  onClose: () => void
  connected: boolean
  onToggleConnect: (status: boolean) => void
}) {
  const { person } = useDemo()
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  if (!isOpen) return null

  const mockEmail = `${person.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@timber.publication.edu`

  const handleSimulateLogin = () => {
    setLoading(true)
    setNotice('')
    setTimeout(() => {
      setLoading(false)
      onToggleConnect(!connected)
      setNotice(
        !connected
          ? 'Successfully authenticated with Google Workspace SSO.'
          : 'Google session disconnected.',
      )
    }, 600)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(24,34,29,0.45)] p-4 backdrop-blur-sm animate-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-auth-title"
    >
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-[24px] border border-white/90 bg-white/95 p-6 shadow-[0_24px_60px_rgba(21,63,50,0.18)] backdrop-blur-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="icon-button absolute top-4 right-4"
          aria-label="Close authentication modal"
        >
          <X size={18} />
        </button>

        {/* Header branding */}
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-3 flex items-center justify-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-surface shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <GoogleIcon size={24} />
            </span>
            <span className="text-muted-ink text-sm">✕</span>
            <img
              src="/logo.png"
              alt="Timber logo"
              className="h-10 w-10 rounded-2xl border border-primary/20 bg-pale object-contain p-1"
            />
          </div>
          <h2 id="google-auth-title" className="text-[17px] font-medium tracking-[-0.02em] text-ink">
            Google Workspace Single Sign-On
          </h2>
          <p className="mt-1 max-w-[340px] text-[12.5px] leading-[1.5] text-muted-ink">
            Institutional authentication for Timber Student Publication editors, photographers, and
            staff.
          </p>
        </div>

        {notice && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#cde0d2] bg-pale px-3.5 py-2 text-[12px] font-medium text-primary">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Auth Body */}
        <div className="flex flex-col gap-3.5">
          {connected ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-line-subtle bg-surface p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium tracking-[0.05em] text-muted-ink uppercase">
                  ACTIVE GOOGLE SESSION
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#cde0d2] bg-pale px-2 py-0.5 text-[10.5px] font-medium text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Verified Domain
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4285f4] font-medium text-white">
                  {person.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-[13.5px] font-medium text-ink">
                    {person.name}
                  </strong>
                  <p className="truncate text-xs text-muted-ink">{mockEmail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSimulateLogin}
                disabled={loading}
                className="mt-1 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-canvas py-2 text-[12px] font-medium text-muted-ink transition-colors hover:border-danger-border hover:bg-danger-bg hover:text-danger-text"
              >
                {loading && <RefreshCw size={13} className="animate-spin" />}
                Disconnect Google Session
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSimulateLogin}
                disabled={loading}
                className="google-official-btn group"
              >
                {loading ? (
                  <RefreshCw size={18} className="animate-spin text-primary" />
                ) : (
                  <GoogleIcon size={19} />
                )}
                <span>{loading ? 'Verifying with Google...' : 'Continue with Google Workspace'}</span>
              </button>
              <p className="text-center text-[11px] text-muted-ink">
                Use your official institutional account (<span className="font-mono">@timber.publication.edu</span>)
              </p>
            </div>
          )}

          {/* Scopes & Developer Notes */}
          <div className="rounded-2xl border border-line-subtle bg-surface/60 p-3.5 text-xs text-muted-ink">
            <div className="mb-1.5 flex items-center gap-1.5 font-medium text-ink">
              <ShieldCheck size={14} className="text-supporting" />
              <span>OAuth 2.0 PKCE Architecture</span>
            </div>
            <p className="text-[11.5px] leading-[1.5]">
              Timber integrates Google OAuth 2.0 via standard authorization code flow with PKCE.
              Configured scopes: <code className="rounded bg-canvas px-1 py-0.5 font-mono text-[10.5px]">openid</code>,{' '}
              <code className="rounded bg-canvas px-1 py-0.5 font-mono text-[10.5px]">email</code>,{' '}
              <code className="rounded bg-canvas px-1 py-0.5 font-mono text-[10.5px]">profile</code>.
            </p>
            <div className="mt-2.5 flex items-center justify-between border-t border-line-subtle pt-2 text-[11px]">
              <span className="text-muted-ink">Target Client ID:</span>
              <span className="font-mono text-primary font-medium">timber-oauth-prod.apps.googleusercontent.com</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="secondary">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
