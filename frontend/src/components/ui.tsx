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
    <span className={`badge ${slug}`}>
      <span className="badge-dot" aria-hidden="true" />
      {children}
    </span>
  )
}

export function Empty({ text = 'No records match this view.' }: { text?: string }) {
  return (
    <div className="empty">
      <span className="empty-icon" aria-hidden="true">
        <Inbox size={18} />
      </span>
      <strong>Nothing to show right now</strong>
      <p>{text}</p>
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
    <dialog ref={ref} onCancel={onClose} aria-labelledby={titleId}>
      <form onSubmit={handle}>
        <div className="dialog-heading">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="dialog-body">
          {children}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
        <div className="dialog-footer">
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
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}
