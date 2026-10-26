import { Toast } from './Toast'
import type { ToastItem } from '../../types/notification'

interface ToastContainerProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-3 top-20 z-[999999] flex flex-col gap-2.5 max-w-[400px] mx-auto sm:max-w-[420px] md:top-auto md:bottom-6 md:right-6 md:left-auto md:inset-x-auto md:mx-0 md:w-[380px]"
      aria-live="polite"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-full">
          <Toast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}
