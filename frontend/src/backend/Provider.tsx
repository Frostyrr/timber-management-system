import { useEffect, useRef, useState, type ReactNode } from 'react'
import { InventoryContext } from '../backend/context'
import { type Action, type Profile, type State } from '../backend/model'
import { client, identity, mutate, snapshot } from './client'
import { Navigate, useLocation } from 'react-router-dom'
import { Login } from '../pages/Login'

function getActionSuccessMessage(action: Action, state: State | null): string {
  switch (action.type) {
    case 'person-save': return 'Staff directory entry saved.'
    case 'person-archive': return 'Staff directory entry archived. Usage history retained.'
    case 'checkout': {
      const item = state?.items.find((i) => i.id === action.itemId)
      return item
        ? `Equipment release for ${item.name} recorded successfully.`
        : 'Equipment release recorded successfully.'
    }
    case 'return': {
      const loan = state?.loans.find((l) => l.id === action.loanId)
      const item = loan ? state?.items.find((i) => i.id === loan.itemId) : null
      return item
        ? `Equipment return for ${item.name} recorded successfully.`
        : 'Equipment return recorded successfully.'
    }
    case 'item': {
      const isExisting = state?.items.some((i) => i.id === action.item.id)
      return isExisting
        ? `Equipment details for ${action.item.name} updated successfully.`
        : `New equipment "${action.item.name}" registered successfully.`
    }
    case 'incident': {
      const item = state?.items.find((i) => i.id === action.itemId)
      return item
        ? `Incident report for ${item.name} submitted for review.`
        : 'Incident report submitted for review.'
    }
    case 'resolve': {
      const inc = state?.incidents.find((i) => i.id === action.id)
      const item = inc ? state?.items.find((i) => i.id === inc.itemId) : null
      return item
        ? `Incident review for ${item.name} resolved successfully.`
        : 'Incident review resolved successfully.'
    }
    case 'archive': {
      const item = state?.items.find((i) => i.id === action.itemId)
      return item
        ? `Equipment "${item.name}" decommissioned successfully.`
        : 'Equipment decommissioned successfully.'
    }
    case 'correct': {
      return 'Loan schedule and details updated successfully.'
    }
    case 'membership': {
      const target = state?.profiles.find((p) => p.id === action.id)
      return target
        ? `Access permissions for ${target.name} updated successfully.`
        : 'Member access permissions updated successfully.'
    }
    case 'update-profile': {
      const target = state?.profiles.find((p) => p.id === action.id)
      return target
        ? `Staff details for ${target.name} updated successfully.`
        : 'Staff details updated successfully.'
    }
    case 'delete-profile': {
      const target = state?.profiles.find((p) => p.id === action.id)
      return target
        ? `Access for ${target.name} suspended successfully.`
        : 'Staff access suspended successfully.'
    }
    default:
      return 'Changes saved successfully.'
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  return <LiveProvider>{children}</LiveProvider>
}
function LiveProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [person, setPerson] = useState<Profile | null>(null)
  const [state, setState] = useState<State | null>(null)
  const [loading, setLoading] = useState(!!client)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [signedIn, setSignedIn] = useState(false)
  const generation = useRef(0)
  const pending = useRef(new Map<string, string>())
  const noticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (noticeTimeout.current) clearTimeout(noticeTimeout.current)
    }
  }, [])

  const refresh = async () => {
    const token = generation.current
    try {
      const p = await identity()
      const next = p.status === 'active' && ['Administrator','Inventory Custodian'].includes(p.role) ? await snapshot() : null
      if (token !== generation.current) return
      setPerson(p); setState(next); setError('')
    } catch (e) {
      if (token === generation.current) { setState(null); setError(e instanceof Error ? e.message : 'Could not load inventory. Check your connection and backend setup.') }
    }
  }
  useEffect(() => {
    if (!client) return
    const gen = generation
    let disposed = false
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const token = ++gen.current
      pending.current.clear()
      setState(null); setPerson(null); setError(''); setSignedIn(!!session); setLoading(!!session)
      if (session) {
        // Do not await Supabase operations inside its auth callback.
        void (async () => {
          try {
            const p = await identity()
            const s = p.status === 'active' && ['Administrator','Inventory Custodian'].includes(p.role) ? await snapshot() : null
            if (!disposed && token === gen.current) { setPerson(p); setState(s) }
          } catch (e) {
            if (!disposed && token === gen.current) setError(e instanceof Error ? e.message : 'Unable to load membership. Apply the backend migration first.')
          } finally { if (!disposed && token === gen.current) setLoading(false) }
        })()
      }
    })
    return () => { disposed = true; gen.current++; data.subscription.unsubscribe() }
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
    await mutate(action, requestId)
    pending.current.delete(payload)
    if (token !== generation.current) return
    const msg = getActionSuccessMessage(action, state)
    setNotice(msg)
    if (noticeTimeout.current) clearTimeout(noticeTimeout.current)
    noticeTimeout.current = setTimeout(() => setNotice(''), 6000)
    await refresh()
  }
  if (loading) return <div className="app-backdrop min-h-screen bg-workspace" />

  if (state && person && (location.pathname === '/login' || location.pathname === '/auth/callback')) return <Navigate to="/" replace />
  if (state && person) return <InventoryContext.Provider value={{ state, person, act, mode: 'live', refresh, signOut,
    warning: error, notice }}>{children}</InventoryContext.Provider>
  if (!signedIn) return <>
    {location.pathname !== '/login' && <Navigate to="/login" replace />}
    <main className="min-h-screen bg-workspace flex items-center justify-center p-4"><Login checkingSession={false} /></main>
  </>
  return <main className="min-h-screen bg-workspace flex items-center justify-center p-4">
    <div className="w-full max-w-[440px] rounded-[32px] border border-white/90 bg-white/85 p-8 shadow-[0_24px_64px_rgba(21,63,50,0.12)] backdrop-blur-2xl text-center animate-enter">
      <img src="/logo.png" alt="The Timberland logo" className="h-16 w-auto mx-auto mb-4 object-contain" />
      <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-ink">
        {person?.status === 'suspended' ? 'Access Suspended' : 'Membership Approval Required'}
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-ink">
        {person?.status === 'suspended'
          ? 'Your publication equipment access has been suspended. Please contact the administrator.'
          : 'Your Google account has been authenticated, but requires role authorization from a publication administrator.'}
      </p>
      <div className="mt-6 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[13px] font-medium text-white shadow-sm transition hover:bg-forest-deep"
        >
          Check access status
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
