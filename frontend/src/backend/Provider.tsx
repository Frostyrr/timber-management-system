import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DemoProvider } from '../demo/Provider'
import { DemoContext } from '../demo/context'
import { type Action, type Profile, type State } from '../demo/model'
import { client, demoMode, identity, mutate, snapshot } from './client'

export function DataProvider({ children }: { children: ReactNode }) {
  return demoMode ? <DemoProvider>{children}</DemoProvider> : <LiveProvider>{children}</LiveProvider>
}
function LiveProvider({ children }: { children: ReactNode }) {
  const [person, setPerson] = useState<Profile | null>(null)
  const [state, setState] = useState<State | null>(null)
  const [loading, setLoading] = useState(!!client)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [signedIn, setSignedIn] = useState(false)
  const generation = useRef(0)
  const pending = useRef(new Map<string, string>())
  const refresh = async () => {
    const token = generation.current
    try {
      const p = await identity()
      const next = p.status === 'active' ? await snapshot() : null
      if (token !== generation.current) return
      setPerson(p); setState(next); setError('')
    } catch (e) {
      if (token === generation.current) { setState(null); setError(e instanceof Error ? e.message : 'Could not load inventory. Check your connection and backend setup.') }
    }
  }
  useEffect(() => {
    if (!client) return
    let disposed = false
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const token = ++generation.current
      pending.current.clear()
      setState(null); setPerson(null); setError(''); setSignedIn(!!session); setLoading(!!session)
      if (session) {
        // Do not await Supabase operations inside its auth callback.
        void (async () => {
          try {
            const p = await identity()
            const s = p.status === 'active' ? await snapshot() : null
            if (!disposed && token === generation.current) { setPerson(p); setState(s) }
          } catch (e) {
            if (!disposed && token === generation.current) setError(e instanceof Error ? e.message : 'Unable to load membership. Apply the backend migration first.')
          } finally { if (!disposed && token === generation.current) setLoading(false) }
        })()
      }
    })
    return () => { disposed = true; generation.current++; data.subscription.unsubscribe() }
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
    setNotice('Saved to Supabase. The server recorded the change in audit history.')
    await refresh()
  }
  if (state && person) return <DemoContext.Provider value={{ state, person, act, mode: 'live', refresh, signOut,
    switchPerson: () => { throw Error('Persona switching is available only in demo mode.') }, reset: () => { throw Error('Live records cannot be reset.') }, warning: error, notice }}>{children}</DemoContext.Provider>
  return <main className="min-h-screen bg-workspace flex items-center justify-center p-6"><section className="bg-white rounded-3xl p-8 max-w-lg space-y-5 shadow-lg">
    <img src="/logo.png" alt="Timber publication" className="h-14" />
    <h1 className="text-2xl font-semibold">Timber inventory</h1>
    {!client ? <p>Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env.local, then restart the development server. For fictional sample records only, set VITE_APP_MODE=demo.</p>
      : loading ? <p role="status">Loading your membership…</p>
      : signedIn ? <><p>{person?.status === 'suspended' ? 'Your access is suspended. Contact a publication administrator.' : 'Your account needs approval from a publication administrator.'}</p><button className="secondary" onClick={() => void refresh()}>Check access again</button><button className="secondary" onClick={() => void signOut()}>Sign out</button></>
      : <><p>Sign in with Google. New accounts require administrator approval before accessing inventory.</p><button className="primary" onClick={async () => {
        const { error: failure } = await client!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
        if (failure) setError(failure.message)
      }}>Continue with Google</button></>}
    {error && <p role="alert">{error}</p>}
  </section></main>
}
