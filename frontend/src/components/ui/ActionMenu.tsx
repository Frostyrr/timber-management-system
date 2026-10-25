import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

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
