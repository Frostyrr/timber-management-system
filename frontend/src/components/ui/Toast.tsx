import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X, ArrowRight } from 'lucide-react'
import type { ToastItem } from '../../types/notification'

interface ToastProps {
  toast: ToastItem
  onDismiss: (id: string) => void
  duration?: number
}

export function Toast({ toast, onDismiss, duration = 5000 }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(100)
  const startTimeRef = useRef(Date.now())
  const remainingTimeRef = useRef(duration)
  const animationFrameRef = useRef<number | null>(null)

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss(toast.id)
    }, 250)
  }

  useEffect(() => {
    if (isPaused || isExiting) return

    startTimeRef.current = Date.now()
    const initialRemaining = remainingTimeRef.current

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current
      const currentRemaining = Math.max(0, initialRemaining - elapsed)
      remainingTimeRef.current = currentRemaining
      const pct = (currentRemaining / duration) * 100
      setProgress(pct)

      if (currentRemaining <= 0) {
        handleDismiss()
      } else {
        animationFrameRef.current = requestAnimationFrame(tick)
      }
    }

    animationFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isPaused, isExiting, duration])

  const renderIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <CheckCircle2 size={18} strokeWidth={2.2} />
          </div>
        )
      case 'warning':
        return (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-[#b7791f] shadow-xs">
            <AlertTriangle size={18} strokeWidth={2.2} />
          </div>
        )
      case 'error':
        return (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-600 shadow-xs">
            <AlertCircle size={18} strokeWidth={2.2} />
          </div>
        )
      case 'info':
      default:
        return (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary shadow-xs">
            <Info size={18} strokeWidth={2.2} />
          </div>
        )
    }
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`group relative overflow-hidden rounded-[20px] border border-white/90 bg-white/95 p-3.5 shadow-[0_16px_36px_rgba(21,63,50,0.14),0_2px_8px_rgba(21,63,50,0.04)] backdrop-blur-2xl transition-all duration-200 ease-out sm:p-4 ${
        isExiting
          ? 'scale-95 opacity-0 translate-y-2'
          : 'scale-100 opacity-100 translate-y-0 animate-enter'
      }`}
    >
      <div className="flex items-start gap-3">
        {renderIcon()}

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center justify-between gap-2 pr-5">
            <h4 className="text-[13.5px] font-semibold tracking-[-0.015em] text-ink">
              {toast.title}
            </h4>
          </div>

          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-ink">
            {toast.message}
          </p>

          {(toast.actionLabel || toast.actionUrl) && (
            <div className="mt-2.5">
              {toast.actionUrl ? (
                <Link
                  to={toast.actionUrl}
                  onClick={handleDismiss}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary transition-colors hover:text-forest-deep hover:underline"
                >
                  <span>{toast.actionLabel ?? 'View details'}</span>
                  <ArrowRight size={13} className="transition-transform group-hover/link:translate-x-0.5" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    toast.onAction?.()
                    handleDismiss()
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-primary transition-colors hover:text-forest-deep hover:underline"
                >
                  <span>{toast.actionLabel ?? 'Action'}</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-muted-ink/70 transition-colors hover:bg-black/5 hover:text-ink active:scale-95"
          aria-label="Dismiss notification"
        >
          <X size={15} />
        </button>
      </div>

      {/* Subtle Auto-Dismiss Progress Bar */}
      <div className="absolute inset-x-0 bottom-0 h-[2.5px] bg-primary/10 overflow-hidden">
        <div
          className="h-full bg-primary/70 transition-[width] duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
