import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, Plus, Zap, X } from 'lucide-react'
import { useInventory } from '../../backend/context'
import { canInventory } from '../../backend/model'

export function QuickActionFab() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { person } = useInventory()
  const location = useLocation()
  const manager = canInventory(person)

  // Adjust state when location changes during navigation
  const currentLocation = location.pathname + location.search
  const [prevLocation, setPrevLocation] = useState(currentLocation)
  if (prevLocation !== currentLocation) {
    setPrevLocation(currentLocation)
    setOpen(false)
  }

  // Close on Escape or click outside
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Only custodians & administrators have inventory management actions
  if (!manager) return null

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end md:bottom-7 md:right-7">
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px] md:hidden"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Expanded Quick Action Flyout */}
      <div
        ref={menuRef}
        role="menu"
        aria-label="Quick inventory actions"
        aria-hidden={!open}
        className={`${
          open ? 'flex flex-col animate-enter' : 'hidden'
        } relative z-40 mb-3 w-64 overflow-hidden rounded-2xl border border-white/90 bg-white/95 p-2 shadow-[0_18px_45px_rgba(21,63,50,0.2)] backdrop-blur-2xl transition-all duration-200`}
      >
        <div className="px-3 py-2 border-b border-line-subtle mb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-muted-ink uppercase">
            Quick Access
          </span>
          <span className="text-[10px] font-medium text-primary bg-pale px-2 py-0.5 rounded-full">
            Equipment
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <Link
            to="/inventory?action=release"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="group flex items-start gap-3 rounded-xl p-2.5 text-left transition-all hover:bg-pale/70 active:scale-98"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs group-hover:bg-primary-hover group-hover:scale-105 transition-all">
              <ArrowUpRight size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <strong className="text-xs font-semibold text-ink group-hover:text-primary">
                  Use equipment
                </strong>
                <span className="text-[10.5px] font-mono text-muted-ink">Release</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-ink leading-tight">
                Issue gear or check out loan to staff
              </p>
            </div>
          </Link>

          <Link
            to="/inventory?action=register"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="group flex items-start gap-3 rounded-xl p-2.5 text-left transition-all hover:bg-pale/70 active:scale-98"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#cbd8cf] bg-[#eef3f0] text-primary shadow-xs group-hover:border-primary/40 group-hover:bg-[#e2eae4] group-hover:scale-105 transition-all">
              <Plus size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <strong className="text-xs font-semibold text-ink group-hover:text-primary">
                  Register equipment
                </strong>
                <span className="text-[10.5px] font-mono text-muted-ink">New</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-ink leading-tight">
                Add new gear or item to catalog
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Floating Action Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? 'Close quick actions menu' : 'Open quick actions menu'}
        className={`group relative flex h-12 items-center gap-2 rounded-full border border-white/30 px-4 text-white shadow-[0_12px_32px_rgba(21,63,50,0.3)] backdrop-blur-xl transition-all duration-200 active:scale-95 ${
          open
            ? 'bg-ink hover:bg-black ring-2 ring-primary/40'
            : 'bg-primary hover:bg-primary-hover hover:shadow-[0_14px_38px_rgba(21,63,50,0.4)]'
        }`}
      >
        <span className="flex items-center justify-center">
          {open ? (
            <X size={18} className="transition-transform duration-200 rotate-90 group-hover:rotate-0" />
          ) : (
            <Zap size={17} className="fill-white/20 text-white transition-transform duration-200 group-hover:scale-110" />
          )}
        </span>
        <span className="text-[13px] font-medium tracking-tight">
          {open ? 'Close' : 'Quick Access'}
        </span>
      </button>
    </div>
  )
}
