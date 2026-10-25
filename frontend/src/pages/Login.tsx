import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  RefreshCw,
  AlertCircle,
  CheckCheck,
  PackageOpen,
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
  const [logs, setLogs] = useState<PublicLogItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [trackOffset, setTrackOffset] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Dynamically centers the active carousel item within the viewport
  useLayoutEffect(() => {
    if (logs.length === 0) return
    const container = containerRef.current
    const activeEl = itemRefs.current[activeIndex]
    if (!container || !activeEl) {
      setTrackOffset(-activeIndex * 104)
      return
    }
    const containerH = container.clientHeight || 410
    const itemTop = activeEl.offsetTop || activeIndex * 104
    const itemH = activeEl.offsetHeight || 88
    setTrackOffset(containerH / 2 - (itemTop + itemH / 2))
  }, [activeIndex, logs.length])

  // Fetch actual equipment usage & returns from database (maximum 5)
  useEffect(() => {
    let active = true
    async function loadActivity() {
      try {
        const rawLogs = await fetchRecentPublicActivity()
        if (!active) return

        if (!rawLogs || rawLogs.length === 0) {
          setLogs([])
          return
        }

        // Filter for actual equipment usage (checkout) and returns, or all activity
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

        setLogs(formatted)
      } catch {
        if (active) setLogs([])
      } finally {
        if (active) setIsLoaded(true)
      }
    }

    void loadActivity()
    return () => {
      active = false
    }
  }, [])

  // Auto-cycle through the chat bubbles when multiple are present and not paused
  useEffect(() => {
    if (isPaused || logs.length <= 1) return
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % logs.length)
    }, 4000)
    return () => clearInterval(interval)
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

        {/* Right Column: Vertical Carousel with Center Spotlight & Ambient Gradient Blur */}
        <div className="flex flex-col justify-center lg:col-span-6">
          <section
            ref={containerRef}
            aria-label="Recent equipment usage and returns chatbox"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="relative h-[410px] w-full overflow-hidden select-none"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
            }}
          >
            {/* Top & Bottom Ambient Vignette Fade Overlays */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#f7f9f7]/90 via-[#f7f9f7]/40 to-transparent z-30" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#f7f9f7]/90 via-[#f7f9f7]/40 to-transparent z-30" />

            {isLoaded && logs.length === 0 ? (
              <div
                data-testid="chatbox-empty-state"
                className="flex h-full flex-col items-center justify-center text-center p-8 sm:p-11 rounded-3xl border border-[#dce6df] bg-white/75 backdrop-blur-md shadow-xs max-w-[460px] mx-auto lg:mx-0 lg:ml-auto"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pale text-primary border border-primary/15 shadow-2xs mb-3.5">
                  <PackageOpen size={24} className="text-primary" />
                </div>
                <h3 className="text-[14.5px] font-semibold text-ink tracking-tight">
                  No Equipment Activity Yet
                </h3>
                <p className="mt-1.5 max-w-[320px] text-[12.5px] leading-relaxed text-muted-ink">
                  Recent checkouts and returns from publication custodians will appear here in real time.
                </p>
              </div>
            ) : (
              <div
                className="flex flex-col gap-3.5 transition-transform duration-600 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform py-20"
                style={{
                  transform: `translate3d(0, ${trackOffset}px, 0)`,
                }}
              >
                {logs.map((item, index) => {
                  const isSelected = index === activeIndex
                  const distance = Math.abs(index - activeIndex)

                  return (
                    <div
                      key={item.id}
                      ref={(el) => {
                        itemRefs.current[index] = el
                      }}
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
                      className={`chat-bubble-pop group relative flex items-end justify-end gap-2.5 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        isSelected
                          ? 'scale-[1.03] opacity-100 z-20 filter-none'
                          : distance === 1
                            ? 'scale-[0.93] opacity-35 filter blur-[1.5px] hover:opacity-75 hover:blur-none hover:scale-[0.97]'
                            : 'scale-[0.88] opacity-20 filter blur-[2.5px] hover:opacity-60 hover:blur-[0.5px] hover:scale-[0.92]'
                      }`}
                      style={{
                        animation: `messagePop 0.44s cubic-bezier(0.16, 1, 0.3, 1) ${index * 110}ms both`,
                      }}
                    >
                      {/* Primary Dark Green Chat Speech Bubble with iconic tail */}
                      <div
                        className={`relative flex flex-col gap-1 rounded-[20px] rounded-br-[4px] px-4 py-3 text-white shadow-xs transition-all duration-500 max-w-[88%] sm:max-w-[82%] ${
                          isSelected
                            ? 'bg-[#0d2e24] ring-2 ring-primary/40 shadow-[0_16px_36px_rgba(21,63,50,0.35)]'
                            : 'bg-primary hover:bg-[#103429]'
                        }`}
                      >
                        {/* Top Row: Tag, Action Badge & Time */}
                        <div className="flex items-center justify-between gap-2.5 border-b border-white/20 pb-1 text-[11px] font-['Geist_Mono',monospace]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold tracking-tight bg-white/20 px-2 py-0.5 rounded-full text-[10.5px]">
                              {item.tag}
                            </span>
                            <span className="text-[10px] font-bold tracking-wide uppercase bg-black/25 px-1.5 py-0.5 rounded text-white/95">
                              {item.actionLabel}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-white/80">
                            <span>{item.timeStr}</span>
                            <CheckCheck size={13} className="text-white/90" />
                          </div>
                        </div>

                        {/* Chat Message Content */}
                        <div className="text-[13px] leading-snug pt-0.5 text-white">
                          <strong className="font-semibold block">{item.name}</strong>
                          <p className="mt-0.5 text-xs text-white/85 leading-normal">
                            {item.details}
                          </p>
                        </div>

                        {/* Iconic Bottom-Right Curved Speech Tail */}
                        <svg
                          className={`absolute -bottom-[1px] -right-[5px] h-3.5 w-2.5 fill-current pointer-events-none transition-colors duration-300 ${
                            isSelected
                              ? 'text-[#0d2e24]'
                              : 'text-primary group-hover:text-[#103429]'
                          }`}
                          viewBox="0 0 10 14"
                          aria-hidden="true"
                        >
                          <path d="M0,0 C0,7 2,14 10,14 C4,14 0,10 0,0 Z" />
                        </svg>
                      </div>

                      {/* Logo Icon Avatar beside the chat bubble */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white p-1 transition-all duration-500 shadow-2xs mb-0.5 ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/30 scale-110 shadow-sm opacity-100'
                            : 'border-[#dce6df] opacity-40 group-hover:opacity-100 group-hover:border-primary/50'
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
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
