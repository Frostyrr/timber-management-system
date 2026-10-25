import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  RefreshCw,
  AlertCircle,
  Lock,
  Terminal,
} from 'lucide-react'
import { client, fetchRecentPublicActivity, type PublicActivityLog } from '../backend/client'
import { GoogleIcon } from '../components/ui/GoogleIcon'

export interface PublicLogItem {
  id: string
  tag: string
  name: string
  category: string
  action: 'checkout' | 'return' | 'item' | 'incident' | 'resolve' | 'archive' | 'unarchive'
  actionLabel: string
  details: string
  timeStr: string
}

const FALLBACK_LOGS: PublicLogItem[] = [
  {
    id: 'log-1',
    tag: 'TP-CAM-001',
    name: 'Sony Alpha a6400 Mirrorless Camera',
    category: 'Camera',
    action: 'checkout',
    actionLabel: 'CHECKOUT',
    details: 'Released for Feature Desk campus event coverage',
    timeStr: '12:28:14',
  },
  {
    id: 'log-2',
    tag: 'TP-AUD-002',
    name: 'Zoom H6 Handy Field Audio Recorder',
    category: 'Audio',
    action: 'return',
    actionLabel: 'RETURN',
    details: 'Returned in Good Condition to Sound Locker A',
    timeStr: '12:14:02',
  },
  {
    id: 'log-3',
    tag: 'TP-GIM-001',
    name: 'DJI Ronin-SC 3-Axis Handheld Gimbal',
    category: 'Accessory',
    action: 'checkout',
    actionLabel: 'CHECKOUT',
    details: 'Released for Sports Desk championship match video',
    timeStr: '11:49:33',
  },
  {
    id: 'log-4',
    tag: 'TP-LGT-003',
    name: 'Godox SL-60W Continuous Studio Light',
    category: 'Lighting',
    action: 'item',
    actionLabel: 'CATALOG',
    details: 'Routine safety inspection verified by custodian',
    timeStr: '10:56:40',
  },
  {
    id: 'log-5',
    tag: 'TP-TRP-002',
    name: 'Manfrotto 055 Pro 3-Section Tripod',
    category: 'Accessory',
    action: 'checkout',
    actionLabel: 'CHECKOUT',
    details: 'Released for Editorial portrait shoot',
    timeStr: '10:12:19',
  },
]

function formatActionBadge(action: string): { label: string; badgeClass: string } {
  switch (action.toLowerCase()) {
    case 'checkout':
      return {
        label: 'CHECKOUT',
        badgeClass: 'bg-amber-50 text-amber-900 border border-amber-300/80',
      }
    case 'return':
      return {
        label: 'RETURN',
        badgeClass: 'bg-emerald-50 text-emerald-900 border border-emerald-300/80',
      }
    case 'item':
      return {
        label: 'CATALOG',
        badgeClass: 'bg-sky-50 text-sky-900 border border-sky-300/80',
      }
    case 'incident':
      return {
        label: 'INCIDENT',
        badgeClass: 'bg-rose-50 text-rose-900 border border-rose-300/80',
      }
    case 'resolve':
      return {
        label: 'RESOLVE',
        badgeClass: 'bg-purple-50 text-purple-900 border border-purple-300/80',
      }
    case 'archive':
      return {
        label: 'ARCHIVE',
        badgeClass: 'bg-slate-100 text-slate-800 border border-slate-300/80',
      }
    case 'unarchive':
      return {
        label: 'RESTORE',
        badgeClass: 'bg-teal-50 text-teal-900 border border-teal-300/80',
      }
    default:
      return {
        label: action.toUpperCase(),
        badgeClass: 'bg-emerald-50 text-emerald-900 border border-emerald-300/80',
      }
  }
}

function formatIsoTime(iso?: string): string {
  if (!iso) return '12:00:00'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '12:00:00'
    return d.toTimeString().slice(0, 8)
  } catch {
    return '12:00:00'
  }
}

export function Login({ checkingSession = false }: { checkingSession?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [logs, setLogs] = useState<PublicLogItem[]>(FALLBACK_LOGS)
  const [isLiveFromDb, setIsLiveFromDb] = useState(false)

  // Fetch recent equipment activity from the database
  useEffect(() => {
    let active = true
    async function loadActivity() {
      try {
        const rawLogs = await fetchRecentPublicActivity()
        if (!active || !rawLogs || rawLogs.length === 0) return

        const formatted: PublicLogItem[] = rawLogs.slice(0, 5).map((l: PublicActivityLog, idx: number) => {
          const badge = formatActionBadge(l.action)
          return {
            id: l.id || `db-${idx}`,
            tag: l.tag || 'TP-EQP',
            name: l.itemName || 'Equipment item',
            category: l.category || 'Gear',
            action: (l.action as PublicLogItem['action']) || 'checkout',
            actionLabel: badge.label,
            details: l.details || 'Database record updated',
            timeStr: formatIsoTime(l.at),
          }
        })

        if (formatted.length > 0) {
          const combined = [...formatted]
          if (combined.length < 5) {
            FALLBACK_LOGS.slice(combined.length, 5).forEach((item) => combined.push(item))
          }
          setLogs(combined)
          setIsLiveFromDb(true)
        }
      } catch {
        // Fallback to initial mock logs if DB query fails or unconfigured
      }
    }

    void loadActivity()
    return () => {
      active = false
    }
  }, [])

  // Auto-cycle through the 5 CLI logs with slide-and-fade animation
  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % logs.length)
    }, 3400)
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
        {/* Left Column: Brand Masthead & Light White CLI Terminal Stream */}
        <div className="order-2 flex flex-col gap-6 lg:order-1 lg:col-span-7">
          {/* Masthead Header */}
          <div className="flex flex-col gap-3">
            <Link to="/" className="inline-flex items-center transition-transform hover:scale-105 w-fit">
              <img
                src="/logo.png"
                alt="The Timberland publication logo"
                className="h-12 w-auto object-contain drop-shadow-xs sm:h-14"
              />
            </Link>

            <h1 className="text-[28px] font-bold tracking-[-0.03em] text-ink sm:text-[34px] lg:text-[38px] leading-tight">
              The Timberland
            </h1>
            <p className="max-w-[560px] text-[14px] leading-relaxed text-muted-ink sm:text-[15px]">
              Equipping campus journalists, photographers, and editors with reliable gear.
              Real-time checkout, return verification, and transparent student custodian accountability.
            </p>
          </div>

          {/* White / Light Theme CLI Terminal Container */}
          <section
            aria-label="Recent equipment activity CLI stream"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="flex flex-col overflow-hidden rounded-2xl border border-[#dce6df] bg-white/95 shadow-[0_20px_50px_rgba(21,63,50,0.08)] backdrop-blur-xl font-mono text-xs select-none"
          >
            {/* White Terminal Chrome Title Bar */}
            <div className="flex items-center justify-between border-b border-[#e2eae4] bg-[#f8faf9] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]/90" aria-hidden="true" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]/90" aria-hidden="true" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]/90" aria-hidden="true" />
                <span className="ml-2 font-mono text-[11.5px] font-semibold text-[#2d523e] flex items-center gap-1.5">
                  <Terminal size={12} className="text-primary" />
                  <span>timberd --tail=5 --stream</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                </span>
                <span className="font-mono text-[10.5px] font-bold tracking-wider text-primary uppercase">
                  {isPaused ? 'PAUSED' : isLiveFromDb ? 'LIVE DB' : 'STREAM'}
                </span>
              </div>
            </div>

            {/* White Terminal Console Content */}
            <div className="p-4 sm:p-5 flex flex-col gap-3 bg-[#fcfdfc]">
              {/* CLI Command Line */}
              <div className="flex items-center gap-2 text-[11.5px] text-[#4a6356]">
                <span className="text-primary font-bold">$</span>
                <span className="text-ink font-medium">timber telemetry --tail=5 --format=interactive</span>
              </div>

              {/* Staggered Streaming Logs with One-by-One Slide and Fade */}
              <div className="flex flex-col gap-1.5 pt-1">
                {logs.map((item, index) => {
                  const isSelected = index === activeIndex
                  const badge = formatActionBadge(item.actionLabel)

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
                      aria-label={`${item.tag} ${badge.label} ${item.name}`}
                      className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2.5 rounded-lg px-3 py-2 transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? 'bg-[#eef4f0] border-l-3 border-[#153f32] text-ink translate-x-1.5 shadow-xs font-medium'
                          : 'text-[#33463c] border-l-3 border-transparent hover:bg-[#f4f7f5] hover:text-ink'
                      }`}
                      style={{
                        animation: `cliFadeSlide 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${index * 140}ms both`,
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Timestamp */}
                        <span className="text-[11px] text-[#6b8577] shrink-0 font-medium">
                          [{item.timeStr}]
                        </span>

                        {/* Action Badge on White CLI */}
                        <span
                          className={`text-[10px] font-bold shrink-0 rounded px-1.5 py-0.5 tracking-tight ${badge.badgeClass}`}
                        >
                          [{badge.label}]
                        </span>

                        {/* Equipment Tag */}
                        <span className="font-bold text-[#153f32] shrink-0">
                          {item.tag}
                        </span>

                        <span className="text-primary font-bold shrink-0">»</span>

                        {/* Equipment Name & Details */}
                        <span className="truncate text-xs text-[#18221d]">
                          <strong className="font-medium">{item.name}</strong>
                          <span className="hidden md:inline text-[#5a6f63] ml-1.5 font-normal">
                            ({item.details})
                          </span>
                        </span>
                      </div>

                      {/* Right Tag/Status Indicator */}
                      <div className="flex items-center gap-1.5 shrink-0 pl-7 sm:pl-0">
                        <span className="text-[10px] text-[#6b8577] uppercase font-semibold">
                          {item.category}
                        </span>
                        {isSelected && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* White Terminal Bottom Command Prompt */}
              <div className="mt-2 flex items-center justify-between border-t border-[#e2eae4] pt-3 text-[11px] text-[#4a6356]">
                <div className="flex items-center gap-1.5">
                  <span className="text-primary font-semibold">timber@workspace:~$</span>
                  <span className="inline-block h-3.5 w-2 bg-primary animate-pulse align-middle" />
                </div>
                <span className="text-[#6b8577] font-mono text-[10.5px]">
                  {isLiveFromDb ? 'database rpc: connected' : 'telemetry: mock active'}
                </span>
              </div>
            </div>
          </section>
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
