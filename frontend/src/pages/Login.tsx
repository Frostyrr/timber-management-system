import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  RefreshCw,
  AlertCircle,
  Camera,
  Mic,
  Video,
  Lightbulb,
  Compass,
  Package,
  CheckCheck,
  Radio,
  Send,
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
    timeStr: '12:28 PM',
  },
  {
    id: 'log-2',
    tag: 'TP-AUD-002',
    name: 'Zoom H6 Handy Field Audio Recorder',
    category: 'Audio',
    action: 'return',
    actionLabel: 'RETURN',
    details: 'Returned in Good Condition to Sound Locker A',
    timeStr: '12:14 PM',
  },
  {
    id: 'log-3',
    tag: 'TP-GIM-001',
    name: 'DJI Ronin-SC 3-Axis Handheld Gimbal',
    category: 'Accessory',
    action: 'checkout',
    actionLabel: 'CHECKOUT',
    details: 'Released for Sports Desk championship match video',
    timeStr: '11:49 AM',
  },
  {
    id: 'log-4',
    tag: 'TP-LGT-003',
    name: 'Godox SL-60W Continuous Studio Light',
    category: 'Lighting',
    action: 'item',
    actionLabel: 'CATALOG',
    details: 'Routine safety inspection verified by custodian',
    timeStr: '10:56 AM',
  },
  {
    id: 'log-5',
    tag: 'TP-TRP-002',
    name: 'Manfrotto 055 Pro 3-Section Tripod',
    category: 'Accessory',
    action: 'checkout',
    actionLabel: 'CHECKOUT',
    details: 'Released for Editorial portrait shoot',
    timeStr: '10:12 AM',
  },
]

function getEquipmentIcon(category: string, name: string = '') {
  const c = category.toLowerCase()
  const n = name.toLowerCase()
  if (c.includes('camera') || n.includes('camera') || n.includes('lens')) return Camera
  if (c.includes('audio') || n.includes('audio') || n.includes('mic')) return Mic
  if (c.includes('light') || n.includes('light')) return Lightbulb
  if (n.includes('gimbal') || n.includes('video')) return Video
  if (n.includes('tripod') || c.includes('tripod')) return Compass
  return Package
}

function formatActionBadge(action: string): { label: string; badgeClass: string } {
  switch (action.toLowerCase()) {
    case 'checkout':
      return {
        label: 'CHECKOUT',
        badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300/80',
      }
    case 'return':
      return {
        label: 'RETURN',
        badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300/80',
      }
    case 'item':
      return {
        label: 'CATALOG',
        badgeClass: 'bg-sky-100 text-sky-900 border border-sky-300/80',
      }
    case 'incident':
      return {
        label: 'INCIDENT',
        badgeClass: 'bg-rose-100 text-rose-900 border border-rose-300/80',
      }
    case 'resolve':
      return {
        label: 'RESOLVE',
        badgeClass: 'bg-purple-100 text-purple-900 border border-purple-300/80',
      }
    case 'archive':
      return {
        label: 'ARCHIVE',
        badgeClass: 'bg-slate-100 text-slate-800 border border-slate-300/80',
      }
    case 'unarchive':
      return {
        label: 'RESTORE',
        badgeClass: 'bg-teal-100 text-teal-900 border border-teal-300/80',
      }
    default:
      return {
        label: action.toUpperCase(),
        badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300/80',
      }
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

  // Auto-cycle through the 5 messenger message bubbles every 3.4s when not paused
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

        {/* Right Column: Messenger-Style Activity Feed with Staggered Incoming Logs */}
        <div className="flex flex-col lg:col-span-6">
          <section
            aria-label="Recent equipment activity messenger stream"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="flex flex-col overflow-hidden rounded-3xl border border-[#dce6df] bg-white/95 shadow-[0_20px_50px_rgba(21,63,50,0.08)] backdrop-blur-2xl select-none"
          >
            {/* Messenger Chat Header Bar */}
            <div className="flex items-center justify-between border-b border-[#e2eae4] bg-[#f8faf9] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-pale border border-primary/20 text-primary">
                  <Radio size={16} />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-semibold text-ink tracking-tight flex items-center gap-1.5">
                    <span>Equipment Channel</span>
                    <span className="text-[11px] font-mono text-muted-ink">#live-wire</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-ink font-['Geist_Mono',monospace]">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>
                      {isPaused
                        ? 'Paused (Hover)'
                        : isLiveFromDb
                          ? 'Live Database Wire'
                          : 'Active Telemetry'}
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

            {/* Chat Messages Body - Each log starts invisible and staggers in one by one */}
            <div className="p-4 sm:p-5 flex flex-col gap-3 min-h-[380px] max-h-[440px] overflow-hidden">
              {logs.map((item, index) => {
                const isSelected = index === activeIndex
                const Icon = getEquipmentIcon(item.category, item.name)
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
                      animation: `messagePop 0.42s cubic-bezier(0.16, 1, 0.3, 1) ${index * 140}ms both`,
                    }}
                  >
                    {/* Category Avatar */}
                    <div
                      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs shadow-2xs transition-all duration-300 ${
                        isSelected
                          ? 'border-primary bg-primary text-white scale-105 shadow-xs'
                          : 'border-[#dce6df] bg-surface text-muted-ink group-hover:border-[#cbd8cf]'
                      }`}
                    >
                      <Icon size={14} />
                    </div>

                    {/* Chat Bubble Card */}
                    <div
                      className={`relative flex flex-1 flex-col gap-1 rounded-2xl rounded-tl-sm border p-3 transition-all duration-300 ${
                        isSelected
                          ? 'border-primary/40 bg-[#f2f7f4] shadow-xs'
                          : 'border-[#e2eae4] bg-white hover:border-[#cbd8cf] hover:bg-[#fafbfa]'
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

                      {/* Message Content */}
                      <div className="text-[13px] leading-snug text-ink">
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

            {/* Messenger Decorative Bottom Input Bar */}
            <div className="flex items-center gap-2 border-t border-[#e2eae4] bg-[#f8faf9] px-4 py-2.5">
              <div className="flex flex-1 items-center justify-between rounded-full border border-[#dce6df] bg-white px-3.5 py-1.5 text-xs text-muted-ink shadow-2xs">
                <span className="truncate text-[12px]">Listening for live equipment events…</span>
                <span className="flex items-center gap-1 font-['Geist_Mono',monospace] text-[10.5px] text-primary shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Realtime Wire</span>
                </span>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-xs">
                <Send size={13} className="ml-0.5" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
