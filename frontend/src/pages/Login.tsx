import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  PackageCheck,
  ShieldCheck,
  Lock,
  Sparkles,
  Activity,
} from 'lucide-react'
import { client } from '../backend/client'
import { GoogleIcon } from '../components/ui/GoogleIcon'

interface PublicLogItem {
  id: string
  tag: string
  name: string
  category: string
  action: 'checkout' | 'return' | 'catalog'
  actionLabel: string
  details: string
  minutesAgo: number
}

const INITIAL_RECENT_LOGS: PublicLogItem[] = [
  {
    id: 'log-1',
    tag: 'TP-CAM-001',
    name: 'Sony Alpha a6400 Mirrorless Camera',
    category: 'Camera',
    action: 'checkout',
    actionLabel: 'Checked out',
    details: 'Released for Feature Desk campus event coverage',
    minutesAgo: 4,
  },
  {
    id: 'log-2',
    tag: 'TP-AUD-002',
    name: 'Zoom H6 Handy Field Audio Recorder',
    category: 'Audio',
    action: 'return',
    actionLabel: 'Returned in Good Condition',
    details: 'Verified and restocked in Sound Locker A',
    minutesAgo: 18,
  },
  {
    id: 'log-3',
    tag: 'TP-GIM-001',
    name: 'DJI Ronin-SC 3-Axis Handheld Gimbal',
    category: 'Accessory',
    action: 'checkout',
    actionLabel: 'Checked out',
    details: 'Released for Sports Desk championship match video',
    minutesAgo: 42,
  },
  {
    id: 'log-4',
    tag: 'TP-LGT-003',
    name: 'Godox SL-60W Continuous Studio Light',
    category: 'Lighting',
    action: 'catalog',
    actionLabel: 'Maintenance Inspection Passed',
    details: 'Routine safety and power inspection verified by custodian',
    minutesAgo: 95,
  },
  {
    id: 'log-5',
    tag: 'TP-TRP-002',
    name: 'Manfrotto 055 Pro 3-Section Tripod',
    category: 'Accessory',
    action: 'checkout',
    actionLabel: 'Checked out',
    details: 'Released for Editorial portrait shoot',
    minutesAgo: 140,
  },
]

function formatRelativeTime(mins: number): string {
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  return `${hours}h ago`
}

export function Login({ checkingSession = false }: { checkingSession?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [logs] = useState<PublicLogItem[]>(INITIAL_RECENT_LOGS)

  // Auto-cycle through the 5 most recent logs every 3.8s when not paused by hover
  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % logs.length)
    }, 3800)
    return () => clearInterval(timer)
  }, [isPaused, logs.length])

  const handleSignIn = async () => {
    setError('')
    setBusy(true)
    try {
      if (client) {
        const { error: failure } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        })
        if (failure) throw failure
      } else {
        throw Error('Sign-in is not configured. Contact the publication administrator.')
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to connect to Google Workspace. Please try again.')
      setBusy(false)
    }
  }

  const isLoading = busy || checkingSession

  return (
    <div className="w-full max-w-[1200px] py-4 sm:py-8 lg:py-12">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
        {/* Left Column: Brand Masthead & Animated Recent 5 Activity Logs */}
        <div className="order-2 flex flex-col gap-6 lg:order-1 lg:col-span-7">
          {/* Masthead Header */}
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2.5">
              <Link to="/" className="inline-flex items-center transition-transform hover:scale-105">
                <img
                  src="/logo.png"
                  alt="The Timberland publication logo"
                  className="h-12 w-auto object-contain drop-shadow-xs sm:h-14"
                />
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-pale px-3 py-1 font-mono text-[11px] font-semibold text-primary">
                <Sparkles size={12} />
                <span>Publication Asset Custody</span>
              </span>
            </div>

            <h1 className="text-[28px] font-bold tracking-[-0.03em] text-ink sm:text-[34px] lg:text-[38px] leading-tight">
              The Timberland
            </h1>
            <p className="max-w-[560px] text-[14px] leading-relaxed text-muted-ink sm:text-[15px]">
              Equipping campus journalists, photographers, and editors with reliable gear.
              Real-time checkout, return verification, and transparent student custodian accountability.
            </p>
          </div>

          {/* Animated 5 Recent Logs Stream Card */}
          <section
            aria-label="Recent equipment activity stream"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="flex flex-col rounded-3xl border border-white/90 bg-white/75 p-5 shadow-[0_16px_48px_rgba(21,63,50,0.08)] backdrop-blur-2xl transition-all"
          >
            {/* Live Telemetry Status Header */}
            <div className="flex items-center justify-between border-b border-line-subtle pb-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[13px] font-semibold text-ink">Recent Equipment Activity</span>
                <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-[10.5px] font-medium text-muted-ink">
                  Top 5 Wire
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-ink">
                <Activity size={13} className="text-primary animate-pulse" />
                <span>{isPaused ? 'Paused' : 'Auto-cycling'}</span>
              </div>
            </div>

            {/* 5 Animated Log Items */}
            <div className="mt-3.5 flex flex-col gap-2.5">
              {logs.map((item, index) => {
                const isSelected = index === activeIndex
                const Icon =
                  item.action === 'checkout'
                    ? ArrowUpRight
                    : item.action === 'return'
                      ? ArrowDownLeft
                      : PackageCheck

                const badgeStyle =
                  item.action === 'checkout'
                    ? 'bg-amber-100/90 text-amber-900 border-amber-200/80'
                    : item.action === 'return'
                      ? 'bg-emerald-100/90 text-emerald-900 border-emerald-200/80'
                      : 'bg-blue-100/90 text-blue-900 border-blue-200/80'

                const iconStyle =
                  item.action === 'checkout'
                    ? 'bg-amber-500/10 text-amber-700'
                    : item.action === 'return'
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : 'bg-blue-500/10 text-blue-700'

                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveIndex(index)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setActiveIndex(index)
                      }
                    }}
                    aria-label={`${item.tag} - ${item.actionLabel}`}
                    className={`group relative flex items-start gap-3 rounded-2xl border p-3 transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? 'border-primary/40 bg-white/95 shadow-[0_8px_24px_rgba(21,63,50,0.08)] scale-[1.01]'
                        : 'border-white/70 bg-white/50 hover:border-white/95 hover:bg-white/80'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 ${iconStyle} ${
                        isSelected ? 'scale-110 shadow-xs' : ''
                      }`}
                    >
                      <Icon size={16} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold text-muted-ink">
                            {item.tag}
                          </span>
                          <span className="text-[11px] text-muted-ink">·</span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${badgeStyle}`}
                          >
                            {item.actionLabel}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] font-medium text-muted-ink">
                          {formatRelativeTime(item.minutesAgo)}
                        </span>
                      </div>

                      <strong className="mt-1 block truncate text-[13px] font-medium text-ink">
                        {item.name}
                      </strong>
                      <p className="mt-0.5 truncate text-[11.5px] text-muted-ink">
                        {item.details}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bottom Telemetry Note */}
            <div className="mt-3 flex items-center justify-between border-t border-line-subtle pt-2.5 text-[11px] text-muted-ink">
              <span>Sanitized public activity feed</span>
              <span className="flex items-center gap-1 font-mono">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live Feed
              </span>
            </div>
          </section>

          {/* Trust & Compliance Badges */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-ink pt-1">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-primary" />
              <span>Audit Logging & RLS</span>
            </div>
            <span>·</span>
            <div className="flex items-center gap-1.5">
              <Lock size={14} className="text-primary" />
              <span>Google SSO Protected</span>
            </div>
            <span>·</span>
            <span>24/7 Equipment Custody</span>
          </div>
        </div>

        {/* Right Column: High-Contrast Glassmorphic Login Portal Card */}
        <div className="order-1 flex justify-center lg:order-2 lg:col-span-5">
          <div className="w-full max-w-[440px] rounded-[32px] border border-white/95 bg-white/90 p-8 shadow-[0_24px_64px_rgba(21,63,50,0.14)] backdrop-blur-2xl backdrop-saturate-[180%] sm:p-10 text-center animate-enter">
            {/* Login Card Header */}
            <div className="mb-8 flex flex-col items-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-pale text-primary shadow-xs">
                <Lock size={24} />
              </div>
              <h2 className="text-[24px] font-bold tracking-[-0.03em] text-ink sm:text-[26px]">
                Sign in to Timberland
              </h2>
              <p className="mt-2 text-[13px] leading-[1.5] text-muted-ink">
                Sign in with your Google Workspace account to access publication equipment and inventory records.
              </p>
            </div>

            {/* Sole Action: Continue with Google */}
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isLoading}
                className="google-official-btn py-3.5 transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw size={19} className="animate-spin text-primary" />
                ) : (
                  <GoogleIcon size={19} />
                )}
                <span className="font-medium text-[14px] text-ink">
                  {isLoading ? 'Connecting to Google…' : 'Continue with Google'}
                </span>
              </button>

              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/90 p-3 text-left text-xs text-red-700"
                >
                  <AlertCircle size={15} className="shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-line-subtle bg-surface/70 p-3 text-center text-[11.5px] text-muted-ink">
                <span className="font-medium text-ink">Authorized Operators Only</span>
                <span>Use your registered university or student publication Google account.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
