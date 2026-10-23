import { useEffect, useId, useMemo, useRef, useState, Children, isValidElement, type ReactNode, type FormEvent } from 'react'
import { X, Inbox, ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react'

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
      className="m-auto max-h-[92vh] w-[calc(100vw-24px)] max-w-[540px] rounded-2xl border border-line bg-canvas p-0 text-ink shadow-[0_20px_56px_rgba(24,34,29,0.16)] backdrop:bg-[rgba(24,34,29,0.4)] backdrop:backdrop-blur-[2px]"
    >
      <form onSubmit={handle} className="flex max-h-[92vh] flex-col">
        <div className="dialog-heading flex items-center justify-between border-b border-line-subtle px-4 py-3.5 sm:px-6 sm:py-[18px]">
          <h2 id={titleId} className="text-[15px] font-medium text-ink">
            {title}
          </h2>
          <button
            type="button"
            className="icon-button flex h-9 w-9 items-center justify-center rounded-full"
            aria-label="Close dialog"
            onClick={onClose}
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
          <button type="button" className="secondary min-h-[42px] w-full sm:min-h-0 sm:w-auto" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary min-h-[42px] w-full sm:min-h-0 sm:w-auto">
            {submit}
          </button>
        </div>
      </form>
    </dialog>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field relative flex flex-col gap-1.5 text-[12.5px] font-[450] text-ink">
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

export function Skeleton({
  className = '',
  dark = false,
}: {
  className?: string
  dark?: boolean
}) {
  return (
    <div
      className={`${dark ? 'skeleton-shimmer-dark' : 'skeleton-shimmer'} rounded-lg ${className}`}
      aria-hidden="true"
    />
  )
}

export function TableSkeleton({
  rows = 5,
  cols = 5,
}: {
  rows?: number
  cols?: number
}) {
  return (
    <div className="table-wrap p-5" aria-busy="true" aria-label="Loading table records">
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-4 border-b border-line-subtle pb-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="stagger-item flex items-center gap-4 py-2.5"
            style={{ '--stagger-i': r } as React.CSSProperties}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-4.5 ${c === 0 ? 'w-1/4' : c === cols - 1 ? 'w-24' : 'flex-1'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2.5" aria-busy="true" aria-label="Loading list records">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="stagger-item flex items-center gap-3.5 rounded-[18px] border border-white/95 bg-white/95 p-4"
          style={{ '--stagger-i': i } as React.CSSProperties}
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function KpiSkeletonGrid() {
  return (
    <div className="hero-kpi-grid" aria-busy="true" aria-label="Loading summary metrics">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="stagger-item flex flex-col justify-between rounded-[20px] border border-white/16 bg-white/[0.09] p-4 backdrop-blur-md"
          style={{ '--stagger-i': i } as React.CSSProperties}
        >
          <div className="flex items-center gap-2.5">
            <Skeleton dark className="h-7 w-7 rounded-full" />
            <Skeleton dark className="h-3.5 flex-1" />
          </div>
          <div className="my-3">
            <Skeleton dark className="h-7 w-14" />
          </div>
          <Skeleton dark className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}

export function Pagination({
  page,
  total,
  pageSize = 10,
  onPageChange,
  label = 'records',
}: {
  page: number
  total: number
  pageSize?: number
  onPageChange: (newPage: number) => void
  label?: string
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(total, page * pageSize)

  if (total <= 0) return null

  const getPages = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (page <= 3) {
      return [1, 2, 3, '...', totalPages]
    }
    if (page >= totalPages - 2) {
      return [1, '...', totalPages - 2, totalPages - 1, totalPages]
    }
    return [1, '...', page, '...', totalPages]
  }

  return (
    <nav
      className="pagination-bar mt-4 flex flex-col items-center justify-between gap-3 border-t border-line-subtle px-1 pt-3.5 sm:flex-row"
      aria-label="Table pagination"
    >
      <span className="text-xs text-muted-ink">
        Showing <strong className="font-medium text-ink">{start}–{end}</strong> of{' '}
        <strong className="font-medium text-ink">{total}</strong> {label}
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/85 bg-white/80 px-2.5 py-1 text-xs font-medium text-ink shadow-xs backdrop-blur-md transition-all duration-150 hover:bg-white hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <div className="flex items-center gap-1">
            {getPages().map((p, idx) =>
              p === '...' ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-ink">
                  …
                </span>
              ) : (
                <button
                  type="button"
                  key={p}
                  onClick={() => onPageChange(Number(p))}
                  className={`inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-full px-2 text-xs font-medium transition-all duration-150 ${
                    page === p
                      ? 'border border-primary bg-primary text-white shadow-xs'
                      : 'border border-white/80 bg-white/70 text-ink backdrop-blur-md hover:bg-white hover:text-primary'
                  }`}
                  aria-current={page === p ? 'page' : undefined}
                >
                  {p}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/85 bg-white/80 px-2.5 py-1 text-xs font-medium text-ink shadow-xs backdrop-blur-md transition-all duration-150 hover:bg-white hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </nav>
  )
}

export interface SelectOption {
  value: string
  label: ReactNode
}

export function Select({
  name,
  value,
  defaultValue,
  options,
  children,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  required = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  'aria-label': ariaLabel,
}: {
  name?: string
  value?: string
  defaultValue?: string
  options?: Array<SelectOption | string>
  children?: ReactNode
  onChange?: (e: { target: { value: string; name?: string }; currentTarget: { value: string; name?: string } }) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  buttonClassName?: string
  menuClassName?: string
  'aria-label'?: string
}) {
  const parsedOptions: SelectOption[] = useMemo(() => {
    const list: SelectOption[] = []
    if (options && options.length > 0) {
      for (const opt of options) {
        if (typeof opt === 'string') {
          list.push({ value: opt, label: opt })
        } else {
          list.push(opt)
        }
      }
    } else if (children) {
      Children.forEach(children, (child) => {
        if (isValidElement(child)) {
          const props = child.props as { value?: string | number; children?: ReactNode }
          const val = props.value !== undefined ? String(props.value) : String(props.children ?? '')
          list.push({
            value: val,
            label: props.children ?? val,
          })
        }
      })
    }
    return list
  }, [options, children])

  const isControlled = value !== undefined
  const [uncontrolledValue, setUncontrolledValue] = useState<string>(() => {
    return defaultValue !== undefined ? defaultValue : (parsedOptions[0]?.value ?? '')
  })

  const currentValue = isControlled ? value : (uncontrolledValue || parsedOptions[0]?.value || '')
  const selectedOption = parsedOptions.find((o) => o.value === currentValue)
  const displayLabel = selectedOption ? selectedOption.label : (placeholder || currentValue)

  const [isOpen, setIsOpen] = useState(false)
  const [opensUpward, setOpensUpward] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const toggleDropdown = () => {
    if (disabled) return
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelowWindow = window.innerHeight - rect.bottom

      const scrollParent = containerRef.current.closest('.dialog-body, dialog, .table-wrap, .panel')
      let spaceBelowParent = spaceBelowWindow
      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect()
        spaceBelowParent = parentRect.bottom - rect.bottom
      }

      const availableBelow = Math.min(spaceBelowWindow, spaceBelowParent)
      setOpensUpward(availableBelow < 190 && rect.top > 160)
    }
    setIsOpen((prev) => !prev)
  }

  const handleSelect = (val: string) => {
    if (!isControlled) {
      setUncontrolledValue(val)
    }
    setIsOpen(false)
    if (onChange) {
      const syntheticEvent = {
        target: { value: val, name: name ?? '' },
        currentTarget: { value: val, name: name ?? '' },
      }
      onChange(syntheticEvent)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`custom-select-container relative inline-block w-full text-left font-sans ${isOpen ? 'is-open z-[9999]' : 'z-10'} ${className}`}
      style={{ zIndex: isOpen ? 9999 : undefined }}
    >
      {name && (
        <input
          type="hidden"
          name={name}
          value={currentValue}
          required={required}
        />
      )}

      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={toggleDropdown}
        className={`group relative flex w-full items-center justify-between gap-2 rounded-xl border border-[#dfe5de] bg-white/85 px-3.5 py-2.5 text-left text-[13px] font-[450] text-ink shadow-[0_1px_3px_rgba(24,34,29,0.04)] backdrop-blur-md transition-all duration-150 hover:border-primary/40 hover:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
          isOpen ? 'border-primary ring-2 ring-primary/20' : ''
        } ${buttonClassName}`}
      >
        <span className="truncate pr-1 text-ink">{displayLabel}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-muted-ink transition-transform duration-200 group-hover:text-primary ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute left-0 z-[9999] w-full min-w-[180px] max-h-60 overflow-y-auto rounded-xl border border-white/90 bg-white/95 p-1.5 shadow-[0_20px_50px_rgba(24,34,29,0.22)] backdrop-blur-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 ${
            opensUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          } ${menuClassName}`}
          style={{ zIndex: 9999 }}
        >
          {parsedOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-ink">No options available</div>
          ) : (
            parsedOptions.map((opt) => {
              const isSelected = opt.value === currentValue
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className={`group/opt flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-[450] transition-colors duration-100 ${
                    isSelected
                      ? 'bg-emerald-50 text-primary font-medium'
                      : 'text-ink hover:bg-black/[0.04]'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check
                      size={14}
                      className="ml-2 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
