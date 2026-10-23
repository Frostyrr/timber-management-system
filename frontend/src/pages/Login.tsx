import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useDemo } from '../demo/context'
import { GoogleIcon } from '../components/auth'

export function Login() {
  const { person, switchPerson } = useDemo()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      switchPerson(person.id || 'admin')
      navigate('/')
    }, 450)
  }

  return (
    <div className="flex min-h-[80vh] w-full items-center justify-center py-10">
      <div className="w-full max-w-[420px] rounded-[32px] border border-white/90 bg-white/80 p-8 shadow-[0_24px_64px_rgba(21,63,50,0.12)] backdrop-blur-2xl backdrop-saturate-[180%] sm:p-10 animate-enter text-center">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center">
          <Link to="/" className="mb-4 inline-flex items-center justify-center">
            <img
              src="/logo.png"
              alt="The Timberland logo"
              className="h-14 w-auto object-contain"
            />
          </Link>
          <h1 className="text-[26px] font-medium tracking-[-0.03em] text-ink">
            The Timberland
          </h1>
          <p className="mt-1.5 text-[13px] leading-[1.5] text-muted-ink">
            Sign in with your Google account to access publication equipment and inventory records.
          </p>
        </div>

        {/* Sole Action: Continue with Google */}
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="google-official-btn py-3.5 transition-all duration-150"
          >
            {loading ? (
              <RefreshCw size={19} className="animate-spin text-primary" />
            ) : (
              <GoogleIcon size={19} />
            )}
            <span className="font-medium text-[14px] text-ink">
              {loading ? 'Signing in...' : 'Continue with Google'}
            </span>
          </button>
          <p className="text-[11.5px] text-muted-ink">
            Use your authorized student publication Google account
          </p>
        </div>
      </div>
    </div>
  )
}
