import { useEffect, useId, useRef, useState, type ReactNode, type FormEvent } from 'react'
import { X } from 'lucide-react'

export function Modal({
  title,
  children,
  onClose,
  onSubmit,
  submit = 'Save changes',
  destructive = false,
  maxWidth = 'sm:max-w-[540px]',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  onSubmit: (data: FormData) => void | Promise<void>
  submit?: string
  destructive?: boolean
  maxWidth?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const busy = useRef(false)

  useEffect(() => {
    const dialog = ref.current!
    if (!dialog.open) {
      dialog.showModal()
    }
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  const handle = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy.current) return
    busy.current = true
    setSaving(true)
    setError('')
    try {
      await onSubmit(new FormData(e.currentTarget))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this change.')
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        if (saving) e.preventDefault()
        else onClose()
      }}
      aria-labelledby={titleId}
      className={`fixed inset-0 m-0 h-[100dvh] w-screen max-h-none max-w-none rounded-none border-0 bg-canvas p-0 text-ink shadow-none overflow-hidden sm:m-auto sm:h-auto sm:max-h-[90vh] sm:w-[calc(100vw-32px)] ${maxWidth} sm:rounded-2xl sm:border sm:border-line sm:shadow-[0_20px_56px_rgba(24,34,29,0.16)] backdrop:bg-[rgba(24,34,29,0.4)] backdrop:backdrop-blur-[2px]`}
    >
      <form onSubmit={handle} className="flex h-full sm:h-auto sm:max-h-[90vh] flex-col overflow-hidden">
        <div className="dialog-heading flex-shrink-0 flex items-center justify-between border-b border-line-subtle bg-canvas/95 px-4 py-3 sm:px-6 sm:py-[18px] backdrop-blur-md">
          <h2 id={titleId} className="text-[16px] sm:text-[15px] font-semibold sm:font-medium text-ink truncate pr-2">
            {title}
          </h2>
          <button
            type="button"
            className="icon-button flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full"
            aria-label="Close dialog"
            disabled={saving}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="dialog-body flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 overscroll-contain no-scrollbar sm:[scrollbar-width:thin]">
          {children}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
        <div className="dialog-footer flex-shrink-0 flex flex-col-reverse justify-end gap-2 border-t border-line-subtle bg-surface/95 px-4 py-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:flex-row sm:gap-2.5 sm:px-6 sm:py-3.5 sm:pb-3.5">
          <button
            type="button"
            className="secondary min-h-[44px] w-full sm:min-h-0 sm:w-auto"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            disabled={saving}
            type="submit"
            className={`${destructive ? 'danger' : 'primary'} min-h-[44px] w-full sm:min-h-0 sm:w-auto`}
          >
            {saving ? 'Processing…' : submit}
          </button>
        </div>
      </form>
    </dialog>
  )
}
