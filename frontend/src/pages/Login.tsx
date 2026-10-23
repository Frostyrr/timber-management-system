import { useState } from 'react'
import { Link } from 'react-router-dom'
import { client, demoMode } from '../backend/client'
export function Login({ checkingSession = false }: { checkingSession?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const signIn = async () => {
    if (!client) { setError('Sign-in is not configured. Contact the publication administrator.'); return }
    setBusy(true)
    setError('')
    try {
      const { error: failure } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
      if (failure) throw failure
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to sign in. Please try again.')
      setBusy(false)
    }
  }
  return <section className="panel p-8 max-w-lg mx-auto">
    <img src="/logo.png" alt="Timber publication" className="h-14 mb-5" />
    <h1 className="text-2xl mb-4">Timber inventory</h1>
    <p>{demoMode ? 'Demo mode uses fictional personas. It does not authenticate with Google.' : 'Sign in to manage publication equipment.'}</p>
    {demoMode ? <Link className="primary mt-5 inline-flex" to="/">Open inventory workspace</Link>
      : <button className="primary mt-5" disabled={busy || checkingSession} onClick={() => void signIn()}>{busy ? 'Connecting to Google…' : 'Continue with Google'}</button>}
    {error && <p className="mt-4" role="alert">{error}</p>}
  </section>
}
