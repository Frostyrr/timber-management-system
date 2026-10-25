import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  RefreshCw,
  AlertCircle,
  CheckCheck,
} from 'lucide-react'
import { client, fetchRecentPublicActivity, type PublicActivityLog } from '../backend/client'
import { GoogleIcon } from '../components/ui/GoogleIcon'

export interface PublicLogItem {
  id: string
  tag: string
  name: string
  category: string
  action: 'checkout' | 'return'
  actionLabel: string
  details: string
  timeStr: string
}

const FALLBACK_USAGE_RETURNS: PublicLogItem[] = [
  {
    id: 'log-1',
    tag: 'TP-CAM-001',
    name: 'Sony Alpha a6400 Mirrorless Camera',
    category: 'Camera',
    action: 'checkout',
    actionLabel: 'CHECKOUT',
    details: 'Checked out for Feature Desk campus event coverage',
    timeStr: '12:28 PM',
  },
  {
    id: 'log-2',
    tag: 'TP-AUD-002',
    name: 'Zoom H6 Handy Field Audio Recorder',
    category: 'Audio',
    action: 'return',
    actionLabel: 'RETURN',
    details: 'Returned in Good condition',
    timeStr: '12:14 PM',
  },
  {
    id: 'log-3',
    tag: 'TP-GIM-001',
    name: 'DJI Ronin-SC 3-Axis Handheld Gimbal',
    category: 'Accessory',
    action: 'checkout',
    actionLabel: 'CHECKOUT',
    details: 'Checked out for Sports Desk match video coverage',
    timeStr: '11:49 AM',
  },
  {
    id: 'log-4',
    tag: 'TP-LGT-003',
    name: 'Godox SL-60W Continuous Studio Light',
    category: 'Lighting',
    action: 'return',
    actionLabel: 'RETURN',
    details: 'Returned in Good condition',
    timeStr: '10:56 AM',
  },
  {
    id: 'log-5',
    tag: 'TP-TRP-002',
    name: 'Manfrotto 055 Pro 3-Section Tripod',
    category: 'Accessory',
    action: 'checkout',
    actionLabel: 'CHECKOUT',
    details: 'Checked out for Editorial portrait shoot',
    timeStr: '10:12 AM',
  },
]

function formatActionBadge(action: string): { label: string; badgeClass: string } {
  if (action.toLowerCase() === 'return') {
    return {
      label: 'RETURN',
      badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300/80',
    }
  }
  return {
    label: 'CHECKOUT',
    badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300/80',
  }
}

function formatIsoTime(iso?: string): string {
  if (!iso) return '12:00 PM'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '12:00 PM'
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '12:00 PM'
  }
}

export function Login({ checkingSession = false }: { checkingSession?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [logs, setLogs] = useState<PublicLogItem[]>(FALLBACK_USAGE_RETURNS)
  const [isLiveFromDb, setIsLiveFromDb] = useState(false)

  // Fetch actual equipment usage & returns from database (most recent 5)
  useEffect(() => {
    let active = true
    async function loadActivity() {
      try {
        const rawLogs = await fetchRecentPublicActivity()
        if (!active || !rawLogs || rawLogs.length === 0) return

        // Filter for actual equipment usage (checkout) and returns
        const filtered = rawLogs.filter(
          (l) => l.action.toLowerCase() === 'checkout' || l.action.toLowerCase() === 'return'
        )

        const targetList = filtered.length > 0 ? filtered : rawLogs
        const formatted: PublicLogItem[] = targetList.slice(0, 5).map((l: PublicActivityLog, idx: number) => {
          const action = l.action.toLowerCase() === 'return' ? 'return' : 'checkout'
          const badge = formatActionBadge(action)
          return {
            id: l.id || `db-${idx}`,
            tag: l.tag || 'TP-EQP',
            name: l.itemName || 'Equipment item',
            category: l.category || 'Gear',
            action,
            actionLabel: badge.label,
            details: l.details || (action === 'return' ? 'Returned in Good condition' : 'Checked out for editorial assignment'),
            timeStr: formatIsoTime(l.at),
          }
        })

        if (formatted.length > 0) {
          const combined = [...formatted]
          if (combined.length < 5) {
            FALLBACK_USAGE_RETURNS.slice(combined.length, 5).forEach((item) => combined.push(item))
          }
          setLogs(combined)
          setIsLiveFromDb(true)
        }
      } catch {
        // Fallback to initial mock usage and returns if DB query fails or unconfigured
      }
    }

    void loadActivity()
    return () => {
      active = false
    }
  }, [])

  // Auto-cycle through the 5 chat bubbles every 3.4s when not paused
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
    <div className="w-full max-w-[1240px] py-4 sm:py-8 lg:py-12 font-['Geist',sans-serif]">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14 xl:gap-20">
        {/* Left Column: Unboxed Hero Masthead & Google Sign-In */}
        <div className="flex flex-col gap-8 lg:col-span-6">
          {/* Masthead Header without card background */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="inline-flex items-center transition-transform hover:scale-105 w-fit">
              <img
                src="/logo.png"
                alt="The Timberland publication logo"
                className="h-14 w-auto object-contain drop-shadow-xs sm:h-16"
              />
            </Link>

            <h1 className="text-[32px] font-bold tracking-[-0.03em] text-ink sm:text-[40px] lg:text-[44px] leading-[1.12]">
              The Timberland
            </h1>

            <p className="max-w-[500px] text-[15px] leading-relaxed text-muted-ink sm:text-[16px]">
              Equipping campus journalists, photographers, and editors with reliable gear.
              Real-time checkout, return verification, and transparent student custodian accountability.
            </p>
          </div>

          {/* Action Area directly below hero text */}
          <div className="flex flex-col gap-4 max-w-[420px]">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isLoading}
              className="google-official-btn w-full py-3.5 transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-[0_4px_16px_rgba(21,63,50,0.08)] hover:shadow-[0_6px_20px_rgba(21,63,50,0.12)] active:scale-[0.99]"
            >
              {isLoading ? (
                <RefreshCw size={19} className="animate-spin text-primary" />
              ) : (
                <GoogleIcon size={19} />
              )}
              <span className="font-medium text-[14.5px] text-ink">
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

            <div className="flex items-center gap-2 text-[12px] text-muted-ink">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Authorized operators only · Student publication Google Workspace</span>
            </div>
          </div>
        </div>

        {/* Right Column: Chatbox with Logo Icon Avatar & Staggered Incoming Bubbles */}
        <div className="flex flex-col lg:col-span-6">
          <section
            aria-label="Recent equipment usage and returns chatbox"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="flex flex-col overflow-hidden rounded-3xl border border-[#dce6df] bg-white/95 shadow-[0_20px_50px_rgba(21,63,50,0.08)] backdrop-blur-2xl select-none"
          >
            {/* Chatbox Header */}
            <div className="flex items-center justify-between border-b border-[#e2eae4] bg-[#f8faf9] px-5 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-[#dce6df] p-1.5 shadow-2xs">
                  <img
                    src="/logo.png"
                    alt="The Timberland logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold text-ink tracking-tight">
                    Timberland Custodian
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-ink font-['Geist_Mono',monospace]">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>
                      {isPaused
                        ? 'Paused (Hover)'
                        : isLiveFromDb
                          ? 'Live Equipment Wire'
                          : 'Recent Equipment Usage'}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-pale border border-primary/15 px-2.5 py-1 font-['Geist_Mono',monospace] text-[10.5px] font-semibold text-primary">
                  {isLiveFromDb ? 'LIVE DB' : '5 RECENT'}
                </span>
              </div>
            </div>

            {/* Chat Messages Body - Staggered speech bubbles with logo avatar */}
            <div className="p-4 sm:p-5 flex flex-col gap-3 min-h-[380px] max-h-[460px] overflow-hidden">
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
                    className={`group relative flex items-start gap-3 transition-all duration-300 cursor-pointer ${
                      isSelected ? 'translate-x-1.5' : ''
                    }`}
                    style={{
                      animation: `messagePop 0.42s cubic-bezier(0.16, 1, 0.3, 1) ${index * 130}ms both`,
                    }}
                  >
                    {/* Publication Logo Icon Avatar */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white p-1 transition-all duration-300 shadow-2xs ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20 scale-105 shadow-xs'
                          : 'border-[#dce6df] group-hover:border-[#cbd8cf]'
                      }`}
                    >
                      <img
                        src="/logo.png"
                        alt="Timberland avatar"
                        className="h-full w-full object-contain"
                      />
                    </div>

                    {/* Chat Speech Bubble */}
                    <div
                      className={`relative flex flex-1 flex-col gap-1 rounded-2xl rounded-tl-xs border p-3.5 transition-all duration-300 ${
                        isSelected
                          ? 'border-primary/40 bg-[#f0f6f2] shadow-xs'
                          : 'border-[#e2eae4] bg-[#f8faf9] hover:border-[#cbd8cf] hover:bg-white'
                      }`}
                    >
                      {/* Top Bubble Row: Tag, Action Badge & Time */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-['Geist_Mono',monospace] text-[11px] font-bold text-primary bg-pale px-2 py-0.5 rounded-full">
                            {item.tag}
                          </span>
                          <span
                            className={`font-['Geist_Mono',monospace] text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.badgeClass}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] font-['Geist_Mono',monospace] text-muted-ink">
                          <span>{item.timeStr}</span>
                          <CheckCheck size={13} className="text-primary" />
                        </div>
                      </div>

                      {/* Chat Message Content */}
                      <div className="text-[13px] leading-snug text-ink pt-0.5">
                        <strong className="font-semibold text-ink">{item.name}</strong>
                        <p className="mt-0.5 text-xs text-muted-ink leading-normal">
                          {item.details}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
