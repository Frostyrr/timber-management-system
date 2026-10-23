import { useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react'
import { X } from 'lucide-react'
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className={`badge ${String(children).toLowerCase().replaceAll(' ', '-')}`}>
      {children}
    </span>
  )
}
export function Empty({ text = 'No records match this view.' }: { text?: string }) {
  return (
    <div className="empty">
      <strong>Nothing here just yet</strong>
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
  const ref = useRef<HTMLDialogElement>(null),
    [error, setError] = useState('')
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
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
    <dialog ref={ref} onCancel={onClose} aria-labelledby="dialog-title">
      <form onSubmit={handle}>
        <div className="dialog-heading">
          <h2 id="dialog-title">{title}</h2>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
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
          <button className="primary">{submit}</button>
        </div>
      </form>
    </dialog>
  )
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}
