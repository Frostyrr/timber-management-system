import { dropdownMenuClass, dropdownOptionClass, dropdownSelectedClass, dropdownIdleClass } from './dropdownStyles'
import { useEffect, useMemo, useRef, useState, useCallback, Children, isValidElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Search } from 'lucide-react'

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
  const selectedOption = parsedOptions.find((o) => o.value === currentValue)
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
      className={`fixed z-[999999] overflow-y-auto ${dropdownMenuClass} animate-in fade-in zoom-in-95 duration-100 slick-scroll-dark-green ${menuClassName}`}
    >
      {searchable && (
        <div className="sticky top-0 z-10 -mx-1.5 -mt-1.5 mb-1.5 border-b border-line-subtle/80 bg-white/95 p-1.5 backdrop-blur-md">
          <div className="relative flex items-center">
            <Search size={13} className="pointer-events-none absolute left-2.5 text-muted-ink" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search options…"
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
              className={`group/opt ${dropdownOptionClass} ${
                isSelected
                  ? dropdownSelectedClass
                  : dropdownIdleClass
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
