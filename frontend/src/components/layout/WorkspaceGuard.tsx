import { WorkspaceLockContext } from '../../backend/workspaceLock'
import type { State } from '../../backend/model'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { lockWorkspace, workspaceAccess } from '../../backend/client'
import { AuthenticatorForm } from '../ui/AuthenticatorForm'
import { MfaActionHost } from './MfaActionHost'
import { Clock3 } from 'lucide-react'
export function WorkspaceGuard({
  children,
  initiallyLocked = false,
  onUnlocked,
  operatorName,
  state,
}: {
  operatorName?: string
  state?: State
  children: ReactNode
  initiallyLocked?: boolean
  onUnlocked: () => Promise<void>
}) {
  const [locked, setLocked] = useState(initiallyLocked)
  const [warning, setWarning] = useState(false)
  const [error, setError] = useState('')
  const lastActivity = useRef(0)
  const busy = useRef(false)
  const content = useRef<HTMLDivElement>(null)
  const channel = useRef<BroadcastChannel | null>(null)
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const connection = new BroadcastChannel('timber-workspace-lock')
    channel.current = connection
    connection.onmessage = (event) => {
      if (event.data === 'lock') setLocked(true)
    }
    return () => {
      connection.close()
      channel.current = null
    }
  }, [])
  const lock = async () => {
    setLocked(true)
    setWarning(false)
    channel.current?.postMessage('lock')
    try {
      await lockWorkspace()
    } catch {
      setError(
        'The server could not be reached. The server authorization expires automatically; reconnect to verify.',
      )
    }
  }
  useEffect(() => {
    if (!initiallyLocked) return
    const timer = setTimeout(() => setLocked(true), 0)
    return () => clearTimeout(timer)
  }, [initiallyLocked])
  useEffect(() => {
    if (locked) return
    lastActivity.current = Date.now()
    const activity = () => {
      if (Date.now() - lastActivity.current >= 180000) {
        void lock()
        return
      }
      lastActivity.current = Date.now()
      setWarning(false)
    }
    const check = async () => {
      const elapsed = Date.now() - lastActivity.current
      if (elapsed >= 180000) {
        await lock()
        return
      }
      setWarning(elapsed >= 150000)
      if (busy.current) return
      busy.current = true
      try {
        if (!(await workspaceAccess(elapsed < 30000))) setLocked(true)
      } catch {
        setLocked(true)
      } finally {
        busy.current = false
      }
    }
    const timer = setInterval(() => void check(), 15000)
    const visible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    window.addEventListener('pointerdown', activity)
    window.addEventListener('keydown', activity)
    window.addEventListener('wheel', activity, { passive: true })
    document.addEventListener('visibilitychange', visible)
    return () => {
      clearInterval(timer)
      window.removeEventListener('pointerdown', activity)
      window.removeEventListener('keydown', activity)
      window.removeEventListener('wheel', activity)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [locked])
  const showLock = locked || initiallyLocked
  return (
    <>
      <div
        ref={content}
        hidden={showLock}
        inert={showLock}
        style={{ display: showLock ? 'none' : undefined }}
      >
        <WorkspaceLockContext.Provider value={() => void lock()}>
          {children}
        </WorkspaceLockContext.Provider>
      </div>
      {showLock ? (
        <main className="mfa-screen fixed inset-0 z-[200000] overflow-y-auto bg-workspace p-4 sm:p-8">
          <div className="mfa-card mx-auto w-full max-w-[440px]">
            {error && <p role="alert">{error}</p>}
            <AuthenticatorForm
              operatorName={operatorName}
              onVerified={async () => {
                await onUnlocked()
                setError('')
                setLocked(false)
              }}
            />
          </div>
        </main>
      ) : (
        <>
          {warning && (
            <div
              role="status"
              className="fixed bottom-6 right-6 z-[100000] flex max-w-sm items-center gap-3 rounded-2xl border border-amber-200/90 bg-white/95 p-3.5 shadow-[0_12px_36px_-6px_rgba(21,63,50,0.18)] backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock3 size={18} className="animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <strong className="block text-xs font-semibold text-ink">Inactivity warning</strong>
                <p className="text-[11.5px] leading-tight text-muted-ink mt-0.5">
                  Workspace locks in 30 seconds without interaction.
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 px-3 py-1.5 text-xs font-medium bg-[#153f32] text-white rounded-xl hover:bg-[#1b4d3e] transition-all active:scale-95 shadow-sm"
                onClick={() => {
                  lastActivity.current = Date.now()
                  setWarning(false)
                }}
              >
                Stay active
              </button>
            </div>
          )}
          <MfaActionHost state={state} />
        </>
      )}
    </>
  )
}
