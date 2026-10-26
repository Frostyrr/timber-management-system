import { WorkspaceGuard } from '../components/layout/WorkspaceGuard'
import { WorkspaceSkeleton } from '../components/layout/WorkspaceSkeleton'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { InventoryContext } from '../backend/context'
import { type Action, type Profile, type State } from '../backend/model'
import type { ToastItem, ToastType } from '../types/notification'
import { client, identity, mutate, snapshot, workspaceAccess } from './client'
import { Navigate, useLocation } from 'react-router-dom'
import { Login } from '../pages/Login'

export function getActionToastDetails(
  action: Action,
  state: State | null
): { title: string; message: string; actionLabel?: string; actionUrl?: string; type?: ToastType } {
  switch (action.type) {
    case 'person-save':
      return {
        title: 'Staff member saved',
        message: `Directory entry for "${action.name}" saved successfully.`,
        actionLabel: 'View in Staff',
        actionUrl: '/staff',
        type: 'success',
      }
    case 'person-archive':
      return {
        title: 'Staff member archived',
        message: 'Staff directory entry moved to archives with usage history retained.',
        actionLabel: 'View Archives',
        actionUrl: '/archives',
        type: 'success',
      }
    case 'person-unarchive':
      return {
        title: 'Staff member restored',
        message: 'Staff directory entry restored from archives to active staff.',
        actionLabel: 'View in Staff',
        actionUrl: '/staff',
        type: 'success',
      }
    case 'unarchive':
      return {
        title: 'Equipment restored',
        message: 'Equipment restored from archives to active catalog.',
        actionLabel: 'View in Catalog',
        actionUrl: '/inventory',
        type: 'success',
      }
    case 'purge-archive':
    case 'purge-all-archives':
      return {
        title: 'Archives purged',
        message: 'Archived records permanently purged.',
        actionLabel: 'View Archives',
        actionUrl: '/archives',
        type: 'success',
      }
    case 'archive-note':
      return {
        title: 'Archive note updated',
        message: 'Archive disposition note updated.',
        actionLabel: 'View Archives',
        actionUrl: '/archives',
        type: 'success',
      }
    case 'checkout': {
      const item = state?.items.find((i) => i.id === action.itemId)
      return {
        title: 'Equipment released',
        message: item
          ? `Equipment release for ${item.name} recorded successfully.`
          : 'Equipment release recorded successfully.',
        actionLabel: 'View in Logs',
        actionUrl: '/logs',
        type: 'success',
      }
    }
    case 'return': {
      const loan = state?.loans.find((l) => l.id === action.loanId)
      const item = loan ? state?.items.find((i) => i.id === loan.itemId) : null
      return {
        title: 'Equipment returned',
        message: item
          ? `Equipment return for ${item.name} recorded successfully.`
          : 'Equipment return recorded successfully.',
        actionLabel: 'View in Catalog',
        actionUrl: '/inventory',
        type: 'success',
      }
    }
    case 'item': {
      const isExisting = state?.items.some((i) => i.id === action.item.id)
      return {
        title: isExisting ? 'Equipment updated' : 'Equipment registered',
        message: isExisting
          ? `Equipment details for "${action.item.name}" updated successfully.`
          : `New equipment "${action.item.name}" registered successfully.`,
        actionLabel: 'View in Catalog',
        actionUrl: `/inventory?q=${encodeURIComponent(action.item.name)}`,
        type: 'success',
      }
    }
    case 'incident': {
      const item = state?.items.find((i) => i.id === action.itemId)
      return {
        title: 'Incident reported',
        message: item
          ? `Incident report for ${item.name} submitted for review.`
          : 'Incident report submitted for review.',
        actionLabel: 'View Incidents',
        actionUrl: '/incidents',
        type: 'warning',
      }
    }
    case 'resolve': {
      const inc = state?.incidents.find((i) => i.id === action.id)
      const item = inc ? state?.items.find((i) => i.id === inc.itemId) : null
      return {
        title: 'Incident resolved',
        message: item
          ? `Incident review for ${item.name} resolved successfully.`
          : 'Incident review resolved successfully.',
        actionLabel: 'View Incidents',
        actionUrl: '/incidents',
        type: 'success',
      }
    }
    case 'archive': {
      const item = state?.items.find((i) => i.id === action.itemId)
      return {
        title: 'Equipment archived',
        message: item
          ? `Equipment "${item.name}" decommissioned successfully.`
          : 'Equipment decommissioned successfully.',
        actionLabel: 'View Archives',
        actionUrl: '/archives',
        type: 'info',
      }
    }
    case 'correct':
      return {
        title: 'Loan schedule adjusted',
        message: 'Loan schedule and details updated successfully.',
        actionLabel: 'View in Logs',
        actionUrl: '/logs',
        type: 'success',
      }
    case 'membership': {
      const target = state?.profiles.find((p) => p.id === action.id)
      return {
        title: 'Access updated',
        message: target
          ? `Access permissions for ${target.name} updated successfully.`
          : 'Member access permissions updated successfully.',
        actionLabel: 'View Access',
        actionUrl: '/access',
        type: 'success',
      }
    }
    case 'update-profile': {
      const target = state?.profiles.find((p) => p.id === action.id)
      return {
        title: 'Staff details updated',
        message: target
          ? `Staff details for ${target.name} updated successfully.`
          : 'Staff details updated successfully.',
        actionLabel: 'View in Staff',
        actionUrl: '/staff',
        type: 'success',
      }
    }
    case 'delete-profile': {
      const target = state?.profiles.find((p) => p.id === action.id)
      return {
        title: 'Access suspended',
        message: target
          ? `Access for ${target.name} suspended successfully.`
          : 'Staff access suspended successfully.',
        actionLabel: 'View Access',
        actionUrl: '/access',
        type: 'warning',
      }
    }
    default:
      return {
        title: 'Changes saved',
        message: 'Changes saved successfully.',
        type: 'success',
      }
  }
}

function getActionSuccessMessage(action: Action, state: State | null): string {
  return getActionToastDetails(action, state).message
}

export function DataProvider({ children }: { children: ReactNode }) {
  return <LiveProvider>{children}</LiveProvider>
}
function LiveProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [mfaRequired,setMfaRequired] = useState(false)
  const [person, setPerson] = useState<Profile | null>(null)
  const [state, setState] = useState<State | null>(null)
  const [loading, setLoading] = useState(!!client)
  const [activeLoads, setActiveLoads] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [activityHistory, setActivityHistory] = useState<ToastItem[]>([])
  const [signedIn, setSignedIn] = useState(false)
  const generation = useRef(0)
  const userId = useRef<string | null>(null)
  const requestSequence = useRef(0)
  const pending = useRef(new Map<string, string>())
  const noticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (noticeTimeout.current) clearTimeout(noticeTimeout.current)
    }
  }, [])

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const clearActivityHistory = () => {
    setActivityHistory([])
  }

  const loadWorkspace = async (token: number, sequence: number) => {
    setActiveLoads(count => count + 1)
    try {
      const p = await identity()
      const permitted = p.status === 'active' && ['Administrator','Inventory Custodian'].includes(p.role)
      if (permitted && !await workspaceAccess()) {
        if (token === generation.current && sequence === requestSequence.current) { setPerson(p); setMfaRequired(true); setError('') }
        return false
      }
      const next = permitted ? await snapshot() : null
      if (token !== generation.current || sequence !== requestSequence.current) return false
      setPerson(p); setState(next); setMfaRequired(false); setError('')
      return true
    } catch (e) {
      if (token !== generation.current || sequence !== requestSequence.current) return false
      const message = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : 'Unable to load inventory. Check your connection and retry.'
      if (/Approved .* required|permission denied/i.test(message)) setState(null)
      setError(message)
      return false
    } finally {
      setActiveLoads(count => Math.max(0, count - 1))
    }
  }
  const refresh = async () => { await loadWorkspace(generation.current, ++requestSequence.current) }
  useEffect(() => {
    if (!client) return
    const gen = generation
    const sequence = requestSequence
    const currentUser = userId
    let disposed = false
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user.id ?? null
      const changed = nextUser !== currentUser.current
      if (changed) {
        currentUser.current = nextUser
        gen.current++
        pending.current.clear()
        setState(null); setPerson(null); setMfaRequired(false); setError(''); setNotice(''); setToasts([])
      }
      setSignedIn(!!session)
      if (!session) { sequence.current++; setLoading(false); return }
      if (changed) setLoading(true)
      const token = gen.current
      const loadId = ++sequence.current
      // Start API calls after the auth notification finishes to avoid auth-lock contention.
      queueMicrotask(() => {
        if (disposed) return
        void loadWorkspace(token, loadId).finally(() => {
          if (!disposed && token === gen.current && loadId === sequence.current) setLoading(false)
        })
      })
    })
    return () => { disposed = true; gen.current++; sequence.current++; currentUser.current = null; data.subscription.unsubscribe() }
    // loadWorkspace only uses stable setters/refs; session subscription is mounted once.
  }, [])
  const signOut = async () => {
    const { error: failure } = await client!.auth.signOut()
    if (failure) { setError(failure.message); return }
    setState(null); setPerson(null)
  }
  const act = async (action: Action) => {
    const payload = JSON.stringify(action)
    const requestId = pending.current.get(payload) ?? crypto.randomUUID()
    pending.current.set(payload, requestId)
    const token = generation.current
    try {
      await mutate(action, requestId)
      pending.current.delete(payload)
      if (token !== generation.current) return
      const toastDetails = getActionToastDetails(action, state)
      const toastId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())
      const newToast: ToastItem = {
        id: toastId,
        type: toastDetails.type ?? 'success',
        title: toastDetails.title,
        message: toastDetails.message,
        timestamp: Date.now(),
        actionLabel: toastDetails.actionLabel,
        actionUrl: toastDetails.actionUrl,
      }

      setToasts((prev) => [...prev.slice(-3), newToast])
      setActivityHistory((prev) => [newToast, ...prev].slice(0, 30))

      const msg = getActionSuccessMessage(action, state)
      setNotice(msg)
      if (noticeTimeout.current) clearTimeout(noticeTimeout.current)
      noticeTimeout.current = setTimeout(() => setNotice(''), 6000)

      const loaded = await loadWorkspace(generation.current, ++requestSequence.current)
      if (!loaded && token === generation.current) {
        const warningMsg = 'Saved, but the latest data could not be loaded. Refresh to retry; do not submit the change again.'
        setNotice(warningMsg)
        const warnToast: ToastItem = {
          id: String(Date.now()),
          type: 'warning',
          title: 'Sync Delayed',
          message: warningMsg,
          timestamp: Date.now(),
        }
        setToasts((prev) => [...prev.slice(-3), warnToast])
      }
    } catch (err) {
      pending.current.delete(payload)
      const errText = err instanceof Error ? err.message : 'Action failed to save.'
      const errorToast: ToastItem = {
        id: String(Date.now()),
        type: 'error',
        title: 'Action Failed',
        message: errText,
        timestamp: Date.now(),
      }
      setToasts((prev) => [...prev.slice(-3), errorToast])
      throw err
    }
  }
  if (loading) return <WorkspaceSkeleton />

  if (state && person && (location.pathname === '/login' || location.pathname === '/auth/callback')) return <Navigate to="/" replace />
  if (state && person) return <WorkspaceGuard initiallyLocked={mfaRequired} onUnlocked={async()=>{if(!await loadWorkspace(generation.current, ++requestSequence.current))throw Error('Unable to unlock. Retry verification or reconnect.')}}><InventoryContext.Provider value={{ state, person, act, refreshing: activeLoads > 0, mode: 'live', refresh, signOut,
    warning: error ? `Could not refresh inventory: ${error} Use Refresh to retry.` : '', notice,
    toasts, dismissToast, activityHistory, clearActivityHistory }}>{children}</InventoryContext.Provider></WorkspaceGuard>
  if (signedIn && mfaRequired && person) return <WorkspaceGuard initiallyLocked onUnlocked={async()=>{if(!await loadWorkspace(generation.current, ++requestSequence.current))throw Error('Unable to unlock. Retry verification or reconnect.')}}>{null}</WorkspaceGuard>
  if (!signedIn) return <>
    {location.pathname !== '/login' && <Navigate to="/login" replace />}
    <main className="min-h-screen bg-workspace flex items-center justify-center p-4 sm:p-6 lg:p-10"><div className="w-full max-w-[1240px] flex justify-center"><Login checkingSession={false} /></div></main>
  </>
  return <main className="min-h-screen bg-workspace flex items-center justify-center p-4">
    <div className="w-full max-w-[440px] rounded-[32px] border border-white/90 bg-white/85 p-8 shadow-[0_24px_64px_rgba(21,63,50,0.12)] backdrop-blur-2xl text-center animate-enter">
      <img src="/logo.png" alt="The Timberland logo" className="h-16 w-auto mx-auto mb-4 object-contain" />
      <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-ink">
        {error ? (/migration|upgrade/i.test(error) ? 'Database upgrade required' : 'Unable to load inventory') : person?.status === 'suspended' ? 'Access suspended' : person?.status === 'active' ? 'Operator access required' : 'Membership approval required'}
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-ink">
        {error ? 'Your account approval has not been changed. Retry loading or contact the administrator with the error below.' : person?.status === 'suspended'
          ? 'Your publication equipment access has been suspended. Please contact the administrator.'
          : 'Your Google account has been authenticated, but requires role authorization from a publication administrator.'}
      </p>
      <div className="mt-6 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[13px] font-medium text-white shadow-sm transition hover:bg-forest-deep"
        >
          {error ? 'Retry loading' : 'Check access status'}
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-line-subtle bg-white px-4 py-2.5 text-[13px] font-medium text-muted-ink transition hover:text-ink hover:bg-surface"
        >
          Sign out
        </button>
      </div>
      {error && <p className="mt-4 text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200" role="alert">{error}</p>}
    </div>
  </main>
}
