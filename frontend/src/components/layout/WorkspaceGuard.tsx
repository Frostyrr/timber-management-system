import { WorkspaceLockContext } from '../../backend/workspaceLock'
import type { State } from '../../backend/model'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { lockWorkspace, workspaceAccess } from '../../backend/client'
import { AuthenticatorForm } from '../ui/AuthenticatorForm'
import { MfaActionHost } from './MfaActionHost'
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
      <div ref={content} hidden={showLock} inert={showLock}>
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
            <p
              role="status"
              className="fixed bottom-40 right-4 z-40 rounded-xl bg-white p-3 shadow-lg"
            >
              Workspace locks in 30 seconds without interaction.
            </p>
          )}
          <MfaActionHost state={state} />
        </>
      )}
    </>
  )
}
