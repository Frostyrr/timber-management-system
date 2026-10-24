import { useEffect, useId, useMemo, useRef, useState, useCallback, Children, isValidElement, type ReactNode, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { X, Inbox, ChevronLeft, ChevronRight, ChevronDown, Check, MoreVertical, Search } from 'lucide-react'

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
  maxVisibleOptions,
  searchable = false,
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
  maxVisibleOptions?: number
  searchable?: boolean
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
    return defaultValue !== undefined
      ? defaultValue
      : placeholder
        ? ''
        : (parsedOptions[0]?.value ?? '')
  })

  const currentValue = isControlled
    ? (value ?? '')
    : (uncontrolledValue !== undefined ? uncontrolledValue : (placeholder ? '' : (parsedOptions[0]?.value || '')))
  const selectedOption = parsedOptions.find((o) => o.value === currentValue && o.value !== '')
  const displayLabel = selectedOption ? selectedOption.label : (placeholder || currentValue || 'Select an option')

  const [isOpen, setIsOpen] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [coords, setCoords] = useState<{
    top?: number
    bottom?: number
    left: number
    width: number
    opensUpward: boolean
  }>({ left: 0, width: 0, opensUpward: false })
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return

    const dialog = buttonRef.current.closest('dialog')
    setPortalTarget(dialog || (typeof document !== 'undefined' ? document.body : null))

    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const opensUpward = spaceBelow < 220 && spaceAbove > spaceBelow

    const width = Math.max(rect.width, 180)
    let left = rect.left
    if (typeof window !== 'undefined') {
      if (left + width > window.innerWidth - 12) {
        left = window.innerWidth - width - 12
      }
      if (left < 12) left = 12
    }

    setCoords({
      top: opensUpward ? undefined : rect.bottom + 6,
      bottom: opensUpward ? window.innerHeight - rect.top + 6 : undefined,
      left,
      width,
      opensUpward,
    })
  }, [])

  const toggleDropdown = () => {
    if (disabled) return
    if (!isOpen) {
      setFilterText('')
      updatePosition()
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    updatePosition()

    const handleScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return
      }
      updatePosition()
    }

    const handleResize = () => updatePosition()

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (containerRef.current && containerRef.current.contains(target)) return
      if (menuRef.current && menuRef.current.contains(target)) return
      setIsOpen(false)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, updatePosition])

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

  const filteredOptions = filterText.trim()
    ? parsedOptions.filter((o) =>
        String(o.label).toLowerCase().includes(filterText.trim().toLowerCase())
      )
    : parsedOptions

  const menuContent = isOpen ? (
    <div
      ref={menuRef}
      role="listbox"
      aria-label={ariaLabel}
      style={{
        position: 'fixed',
        top: coords.opensUpward ? undefined : coords.top !== undefined ? `${coords.top}px` : undefined,
        bottom: coords.opensUpward && coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        maxHeight: maxVisibleOptions ? `${maxVisibleOptions * 38 + (searchable ? 52 : 12)}px` : '260px',
        zIndex: 999999,
      }}
      className={`fixed z-[999999] overflow-y-auto rounded-xl border border-white/95 bg-white/98 p-1.5 shadow-[0_20px_50px_rgba(21,63,50,0.28)] backdrop-blur-2xl ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-100 slick-scroll-dark-green ${menuClassName}`}
    >
      {searchable && (
        <div className="sticky top-0 z-10 -mx-1.5 -mt-1.5 mb-1.5 border-b border-line-subtle/80 bg-white/95 p-1.5 backdrop-blur-md">
          <div className="relative flex items-center">
            <Search size={13} className="pointer-events-none absolute left-2.5 text-muted-ink" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search positions…"
              className="w-full rounded-lg border border-line-subtle bg-surface/70 py-1.5 pr-2.5 pl-7 text-xs text-ink placeholder:text-muted-ink focus:border-primary focus:bg-white focus:outline-none"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
        </div>
      )}
      {filteredOptions.length === 0 ? (
        <div className="px-3 py-3 text-center text-xs text-muted-ink">No matching options</div>
      ) : (
        filteredOptions.map((opt) => {
          const isSelected = opt.value === currentValue
          return (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                handleSelect(opt.value)
                setFilterText('')
              }}
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
  ) : null

  return (
    <div
      ref={containerRef}
      className={`custom-select-container relative inline-block w-full text-left font-sans ${isOpen ? 'is-open' : ''} ${className}`}
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
        ref={buttonRef}
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
        <span className={`truncate pr-1 ${selectedOption ? "text-ink font-medium" : "text-muted-ink font-normal"}`}>{displayLabel}</span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-muted-ink transition-transform duration-200 group-hover:text-primary ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {menuContent && (
        portalTarget && typeof document !== 'undefined'
          ? createPortal(menuContent, portalTarget)
          : menuContent
      )}
    </div>
  )
}

export interface ActionMenuItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  destructive?: boolean
  divider?: boolean
}

export function ActionMenu({
  items,
  triggerLabel = 'More options',
  align = 'right',
  className = '',
}: {
  items: (ActionMenuItem | null | false | undefined)[]
  triggerLabel?: string
  align?: 'left' | 'right'
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{
    top?: number
    bottom?: number
    left: number
    opensUpward: boolean
  }>({ left: 0, opensUpward: false })
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const validItems = items.filter(Boolean) as ActionMenuItem[]

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return

    const dialog = triggerRef.current.closest('dialog')
    setPortalTarget(dialog || (typeof document !== 'undefined' ? document.body : null))

    const menuWidth = 210
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const opensUpward = spaceBelow < 220 && spaceAbove > spaceBelow

    let left = align === 'right' ? rect.right - menuWidth : rect.left
    if (typeof window !== 'undefined') {
      if (left + menuWidth > window.innerWidth - 12) {
        left = window.innerWidth - menuWidth - 12
      }
      if (left < 12) left = 12
    }

    setCoords({
      top: opensUpward ? undefined : rect.bottom + 6,
      bottom: opensUpward ? window.innerHeight - rect.top + 6 : undefined,
      left,
      opensUpward,
    })
  }, [align])

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOpen) {
      updatePosition()
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    updatePosition()

    const handleScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return
      }
      updatePosition()
    }

    const handleResize = () => updatePosition()

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (triggerRef.current && triggerRef.current.contains(target)) return
      if (menuRef.current && menuRef.current.contains(target)) return
      setIsOpen(false)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, updatePosition])

  if (validItems.length === 0) return null

  const menuContent = isOpen ? (
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      style={{
        position: 'fixed',
        top: coords.opensUpward ? undefined : coords.top !== undefined ? `${coords.top}px` : undefined,
        bottom: coords.opensUpward && coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
        left: `${coords.left}px`,
        minWidth: '210px',
        zIndex: 999999,
      }}
      className="fixed z-[999999] rounded-2xl border border-white/90 bg-white/98 p-1.5 shadow-[0_20px_50px_rgba(21,63,50,0.24)] backdrop-blur-2xl ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-100 focus:outline-none"
    >
      {validItems.map((item, idx) => (
        <div key={`${item.label}-${idx}`}>
          {item.divider && idx > 0 && (
            <div className="my-1 h-px bg-line-subtle/80" role="separator" />
          )}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
              item.onClick()
            }}
            className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors ${
              item.destructive
                ? 'text-[#963838] hover:bg-[#fbf4f4] hover:text-[#802c2c]'
                : 'text-ink hover:bg-surface hover:text-primary'
            }`}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span className="flex-1 truncate">{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  ) : null

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerLabel}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={toggle}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          isOpen
            ? 'border-primary/40 bg-white text-primary shadow-xs ring-2 ring-primary/20'
            : 'border-line-subtle bg-white/70 text-muted-ink hover:border-line hover:bg-white hover:text-ink hover:shadow-xs'
        }`}
        title={triggerLabel}
      >
        <MoreVertical size={16} />
      </button>

      {menuContent && (
        portalTarget && typeof document !== 'undefined'
          ? createPortal(menuContent, portalTarget)
          : menuContent
      )}
    </div>
  )
}
