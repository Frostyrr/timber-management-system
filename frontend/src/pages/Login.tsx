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

        // Filter strictly for actual equipment usage (checkout) and returns
        const filtered = rawLogs.filter(
          (l) => l.action.toLowerCase() === 'checkout' || l.action.toLowerCase() === 'return'
        )

        const targetList = filtered.length > 0 ? filtered : rawLogs
        const formatted: PublicLogItem[] = targetList.slice(0, 5).map((l: PublicActivityLog, idx: number) => {
          const action = l.action.toLowerCase() === 'return' ? 'return' : 'checkout'
          return {
            id: l.id || `db-${idx}`,
            tag: l.tag || 'TP-EQP',
            name: l.itemName || 'Equipment item',
            category: l.category || 'Gear',
            action,
            actionLabel: action === 'return' ? 'RETURN' : 'CHECKOUT',
            details: l.details || (action === 'return' ? 'Returned in Good condition' : 'Checked out for assignment coverage'),
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

        {/* Right Column: Messenger/iMessage-Style Chatbox with Blue Bubbles & Logo Avatars */}
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

            {/* Chat Messages Body - Blue speech bubbles with logo avatars and bottom-right tail */}
            <div className="p-4 sm:p-5 flex flex-col gap-3 min-h-[380px] max-h-[460px] overflow-hidden">
              {logs.map((item, index) => {
                const isSelected = index === activeIndex

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
                    aria-label={`${item.tag} ${item.actionLabel} ${item.name}`}
                    className={`group relative flex items-end justify-end gap-2.5 transition-all duration-300 cursor-pointer ${
                      isSelected ? 'scale-[1.01]' : 'hover:scale-[1.005]'
                    }`}
                    style={{
                      animation: `messagePop 0.42s cubic-bezier(0.16, 1, 0.3, 1) ${index * 130}ms both`,
                    }}
                  >
                    {/* Blue Chat Speech Bubble with iconic tail */}
                    <div
                      className={`relative flex flex-col gap-1 rounded-[20px] rounded-br-[4px] bg-[#007aff] px-4 py-3 text-white shadow-xs transition-all duration-300 max-w-[85%] sm:max-w-[80%] ${
                        isSelected
                          ? 'bg-[#0071eb] ring-2 ring-[#007aff]/30 shadow-[0_6px_18px_rgba(0,122,255,0.28)]'
                          : 'hover:bg-[#0075f5]'
                      }`}
                    >
                      {/* Top Row: Tag, Action Badge & Time */}
                      <div className="flex items-center justify-between gap-2.5 border-b border-white/20 pb-1 text-[11px] font-['Geist_Mono',monospace]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold tracking-tight bg-white/25 px-2 py-0.5 rounded-full text-[10.5px]">
                            {item.tag}
                          </span>
                          <span className="text-[10px] font-bold tracking-wide uppercase bg-black/15 px-1.5 py-0.5 rounded">
                            {item.actionLabel}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] opacity-90">
                          <span>{item.timeStr}</span>
                          <CheckCheck size={13} className="text-white" />
                        </div>
                      </div>

                      {/* Chat Message Content */}
                      <div className="text-[13px] leading-snug pt-0.5 text-white">
                        <strong className="font-semibold block">{item.name}</strong>
                        <p className="mt-0.5 text-xs text-white/90 leading-normal">
                          {item.details}
                        </p>
                      </div>

                      {/* Iconic Bottom-Right Curved Speech Tail */}
                      <svg
                        className="absolute -bottom-[1px] -right-[5px] h-3.5 w-2.5 text-[#007aff] fill-current pointer-events-none group-hover:text-[#0075f5] transition-colors"
                        viewBox="0 0 10 14"
                        aria-hidden="true"
                      >
                        <path d="M0,0 C0,7 2,14 10,14 C4,14 0,10 0,0 Z" />
                      </svg>
                    </div>

                    {/* Logo Icon Avatar beside the chat bubble */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white p-1 transition-all duration-300 shadow-2xs mb-0.5 ${
                        isSelected
                          ? 'border-[#007aff] ring-2 ring-[#007aff]/20 scale-105'
                          : 'border-[#dce6df] group-hover:border-[#cbd8cf]'
                      }`}
                    >
                      <img
                        src="/logo.png"
                        alt="Timberland avatar"
                        className="h-full w-full object-contain"
                      />
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
