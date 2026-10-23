import { useEffect, useId, useRef, useState, type ReactNode, type FormEvent } from 'react'
import { X, Inbox } from 'lucide-react'

export function Badge({ children }: { children: ReactNode }) {
  const raw = String(children)
  const slug = raw
    .toLowerCase()
    .replace(/^\+/, 'points-')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return (
    <span
      className={`badge ${slug} inline-flex items-center gap-1.5 rounded-full border border-[#dfe5de] bg-workspace px-[9.5px] py-[3.5px] text-[11.5px] leading-[1.35] font-[450] whitespace-nowrap text-[#36453c]`}
    >
      <span className="badge-dot h-[5.5px] w-[5.5px] rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  )
}

export function Empty({ text = 'No records match this view.' }: { text?: string }) {
  return (
    <div className="empty px-5 py-9 text-center text-muted-ink">
      <span
        className="empty-icon mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-pale text-primary"
        aria-hidden="true"
      >
        <Inbox size={18} />
      </span>
      <strong className="block text-[13.5px] font-medium text-ink">Nothing to show right now</strong>
      <p className="mx-auto mt-1 max-w-[420px] text-[12.5px] leading-[1.6]">{text}</p>
    </div>
  )
}

export function Modal({
  title,
  children,
  onClose,
  onSubmit,
  submit = 'Save changes',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  onSubmit: (data: FormData) => void
  submit?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = ref.current!
    if (!dialog.open) {
      dialog.showModal()
    }
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  const handle = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      onSubmit(new FormData(e.currentTarget))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this change.')
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      aria-labelledby={titleId}
      className="m-auto max-h-[90vh] w-[min(540px,calc(100vw-32px))] rounded-2xl border border-line bg-canvas p-0 text-ink shadow-[0_20px_56px_rgba(24,34,29,0.16)] backdrop:bg-[rgba(24,34,29,0.4)] backdrop:backdrop-blur-[2px]"
    >
      <form onSubmit={handle}>
        <div className="dialog-heading flex items-center justify-between border-b border-line-subtle px-6 py-[18px]">
          <h2 id={titleId} className="text-[15px] font-medium text-ink">
            {title}
          </h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="dialog-body flex flex-col gap-4 px-6 py-5">
          {children}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
        <div className="dialog-footer flex justify-end gap-2.5 border-t border-line-subtle bg-surface px-6 py-3.5">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            {submit}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field flex flex-col gap-1.5 text-[12.5px] font-[450] text-ink">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}
