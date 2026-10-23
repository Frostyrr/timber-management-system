import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { client } from '../backend/client'
import { GoogleIcon } from '../components/auth'

export function Login({ checkingSession = false }: { checkingSession?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
    <div className="flex min-h-[85vh] w-full items-center justify-center p-4">
      <div className="w-full max-w-[420px] rounded-[32px] border border-white/90 bg-white/85 p-8 shadow-[0_24px_64px_rgba(21,63,50,0.12)] backdrop-blur-2xl backdrop-saturate-[180%] sm:p-10 text-center animate-enter">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center">
          <Link to="/" className="mb-4 inline-flex items-center justify-center transition-transform hover:scale-105">
            <img
              src="/logo.png"
              alt="The Timberland logo"
              className="h-16 w-auto object-contain drop-shadow-sm"
            />
          </Link>
          <h1 className="text-[26px] font-semibold tracking-[-0.03em] text-ink">
            The Timberland
          </h1>
          <p className="mt-2 text-[13px] leading-[1.5] text-muted-ink">
            Sign in with your Google Workspace account to access publication equipment and inventory records.
          </p>
        </div>

        {/* Sole Action: Continue with Google */}
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isLoading}
            className="google-official-btn py-3.5 transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <RefreshCw size={19} className="animate-spin text-primary" />
            ) : (
              <GoogleIcon size={19} />
            )}
            <span className="font-medium text-[14px] text-ink">
              {isLoading ? 'Connecting to Google…' : 'Continue with Google'}
            </span>
          </button>

          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/90 p-3 text-left text-xs text-red-700">
              <AlertCircle size={15} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-[11.5px] text-muted-ink">
            Use your authorized student publication Google account
          </p>
        </div>
      </div>
    </div>
  )
}
