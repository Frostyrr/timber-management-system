import { useEffect, useId, useRef, useState, type ReactNode, type FormEvent } from 'react'
import { X } from 'lucide-react'

export function Modal({
  title,
  children,
  onClose,
  onSubmit,
  submit = 'Save changes',
  destructive = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  onSubmit: (data: FormData) => void | Promise<void>
  submit?: string
  destructive?: boolean
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
    } finally { busy.current = false; setSaving(false) }
  }

  return (
    <dialog
      ref={ref}
      onCancel={e => { if (saving) e.preventDefault(); else onClose() }}
      aria-labelledby={titleId}
      className="m-auto max-h-[92vh] w-[calc(100vw-24px)] max-w-[540px] rounded-2xl border border-line bg-canvas p-0 text-ink shadow-[0_20px_56px_rgba(24,34,29,0.16)] backdrop:bg-[rgba(24,34,29,0.4)] backdrop:backdrop-blur-[2px] overflow-visible"
    >
      <form onSubmit={handle} className="flex max-h-[92vh] flex-col overflow-visible">
        <div className="dialog-heading flex items-center justify-between border-b border-line-subtle px-4 py-3.5 sm:px-6 sm:py-[18px]">
          <h2 id={titleId} className="text-[15px] font-medium text-ink">
            {title}
          </h2>
          <button
            type="button"
            className="icon-button flex h-9 w-9 items-center justify-center rounded-full"
            aria-label="Close dialog"
            disabled={saving} onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="dialog-body flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {children}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
        <div className="dialog-footer flex flex-col-reverse justify-end gap-2 border-t border-line-subtle bg-surface px-4 py-3 sm:flex-row sm:gap-2.5 sm:px-6 sm:py-3.5">
          <button type="button" className="secondary min-h-[42px] w-full sm:min-h-0 sm:w-auto" disabled={saving} onClick={onClose}>
            Cancel
          </button>
          <button disabled={saving} type="submit" className={`${destructive ? 'danger' : 'primary'} min-h-[42px] w-full sm:min-h-0 sm:w-auto`}>
            {saving ? 'Processing…' : submit}
          </button>
        </div>
      </form>
    </dialog>
  )
}
