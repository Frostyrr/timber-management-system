import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-backdrop min-h-screen bg-workspace flex items-center justify-center p-6">
          <div className="w-full max-w-[480px] rounded-3xl border border-white/90 bg-white/90 p-8 shadow-[0_20px_50px_rgba(21,63,50,0.12)] backdrop-blur-xl text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <AlertTriangle size={28} />
            </div>
            <h2 className="text-xl font-semibold text-ink">Application encountered an issue</h2>
            <p className="mt-2 text-xs text-muted-ink leading-relaxed">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-forest-deep"
              >
                <RefreshCw size={14} /> Reload application
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('timber_demo_override', 'true')
                  window.location.href = '/'
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-2 text-xs font-medium text-muted-ink hover:text-ink hover:bg-slate-50"
              >
                Launch demo workspace
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
