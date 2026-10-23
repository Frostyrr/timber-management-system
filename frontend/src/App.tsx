import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShieldAlert,
  ShieldCheck,
  ScrollText,
  Users,
  Menu,
  X,
  ArrowUpRight,
  Plus,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  Bell,
  Clock3,
  CheckCheck,
} from 'lucide-react'
import { useInventory } from './backend/context'
import { visibleIncidents, canInventory, isOverdue } from './backend/model'
import { dateText } from './components/format'
import { Avatar } from './components/layout'
import { Dashboard } from './pages/Dashboard'
import { Inventory, Incidents } from './pages/Inventory'
import { Logs } from './pages/Logs'
import { Staff } from './pages/Staff'
import { Login } from './pages/Login'
import { Settings } from './pages/Settings'
import { Security } from './pages/Security'
import './App.css'

export default function App() {
  const { state, person, warning, notice, signOut } = useInventory()
  const [menu, setMenu] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [allRead, setAllRead] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const manager = canInventory(person)

  const links = [
    { to: '/', name: 'Overview', icon: LayoutDashboard },
    { to: '/inventory', name: 'Inventory', icon: Package },
    { to: '/incidents', name: 'Incident reviews', icon: ShieldAlert },
    { to: '/logs', name: 'Logs', icon: ScrollText },
    ...(manager ? [{ to: '/staff', name: 'Staff roster', icon: Users }] : []),
    { to: '/security', name: 'Cybersecurity', icon: ShieldCheck },
    { to: '/settings', name: 'Account settings', icon: SettingsIcon },
  ]

  const openIncidentCount = visibleIncidents(state, person).filter((i) => !i.resolved).length

  const overdueLoans = state.loans.filter(
    (l) => !l.returned && isOverdue(l.due) && (manager || l.borrowerId === person.id),
  )
  const openIncidents = visibleIncidents(state, person).filter((i) => !i.resolved)
  const unreadCount = overdueLoans.length + openIncidents.length

  // Apple macOS Dock Magnification Engine for the floating sidebar
  const dockRef = useRef<HTMLElement>(null)
  const itemCentersRef = useRef<{ el: HTMLElement; top: number; height: number }[]>([])

  const updateDockCenters = () => {
    if (!dockRef.current) return
    const items = dockRef.current.querySelectorAll<HTMLElement>('.dock-item')
    itemCentersRef.current = Array.from(items).map((el) => {
      const rect = el.getBoundingClientRect()
      return { el, top: rect.top, height: rect.height }
    })
  }

  const handleDockMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!itemCentersRef.current.length) {
      updateDockCenters()
    }
    const mouseY = e.clientY
    const maxDistance = 130
    const maxScale = 1.36
    const maxNudge = 5

    for (const { el, top, height } of itemCentersRef.current) {
      const centerY = top + height / 2
      const dist = Math.abs(mouseY - centerY)
      if (dist < maxDistance) {
        const factor = Math.cos((dist / maxDistance) * (Math.PI / 2))
        const scale = 1 + (maxScale - 1) * factor
        const direction = centerY < mouseY ? -1 : 1
        const nudge = direction * maxNudge * Math.sin((dist / maxDistance) * Math.PI)
        el.style.setProperty('--dock-scale', scale.toFixed(3))
        el.style.setProperty('--dock-nudge', `${nudge.toFixed(1)}px`)
      } else {
        el.style.setProperty('--dock-scale', '1')
        el.style.setProperty('--dock-nudge', '0px')
      }
    }
  }

  const handleDockMouseLeave = () => {
    itemCentersRef.current = []
    if (!dockRef.current) return
    const items = dockRef.current.querySelectorAll<HTMLElement>('.dock-item')
    items.forEach((el) => {
      el.style.setProperty('--dock-scale', '1')
      el.style.setProperty('--dock-nudge', '0px')
    })
  }

  useEffect(() => {
    const onResize = () => {
      itemCentersRef.current = []
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isLoginPage = location.pathname === '/login'

  if (isLoginPage) {
    return (
      <div className="app-backdrop min-h-screen bg-workspace flex items-center justify-center p-4">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <main id="main" className="w-full flex justify-center">
          <Login />
        </main>
      </div>
    )
  }

  return (
    <div className="app-backdrop min-h-screen bg-workspace">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="app-canvas mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-3 sm:px-6 lg:px-10">
        {/* Sleek Floating Top Header with matching pill border radius */}
        <header className={`topbar sticky top-3.5 ${notificationsOpen || profileDropdownOpen ? 'z-[100000]' : 'z-30'} mb-6 flex items-center justify-between gap-2.5 rounded-full border border-white/85 bg-white/80 px-4 py-2 shadow-[0_4px_16px_rgba(21,63,50,0.06)] backdrop-blur-xl sm:top-4 sm:mb-8 sm:gap-3 sm:px-5 sm:py-2.5 lg:top-5 lg:mb-9`}>
          {/* Brand Identity */}
          <div className="topbar-left flex items-center gap-2.5 sm:gap-3">
            <Link
              to="/"
              className="brand inline-flex items-center gap-3"
              onClick={() => setMenu(false)}
            >
              <img
                src="/logo.png"
                alt="Timber publication logo"
                className="brand-logo block h-9 w-auto object-contain"
              />
              <h1 className="text-[17px] leading-tight font-semibold tracking-[-0.025em] text-ink">
                The Timberland
              </h1>
            </Link>
          </div>

          {/* Right Floating Header Controls */}
          <div className="topbar-right flex items-center gap-2 sm:gap-2.5">
            {/* Notification Center */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen)
                  setProfileDropdownOpen(false)
                }}
                className="notification-btn relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/90 bg-white/85 text-ink shadow-[0_2px_8px_rgba(21,63,50,0.06)] backdrop-blur-xl transition-all duration-150 hover:border-white hover:bg-white active:scale-95"
                title="Notifications & alerts"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell size={17} className="text-muted-ink transition-colors hover:text-primary" />
                {unreadCount > 0 && !allRead && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#b7791f] px-1 font-mono text-[9px] font-semibold text-white shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[99998]"
                    aria-hidden="true"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div className="notification-dropdown-menu" style={{ zIndex: 99999 }}>
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-line-subtle px-4 py-3">
                      <div className="flex items-center gap-2">
                        <strong className="text-[13.5px] font-medium text-ink">Notifications</strong>
                        {unreadCount > 0 && !allRead && (
                          <span className="rounded-full bg-pale px-2 py-0.5 font-mono text-[10.5px] font-medium text-primary">
                            {unreadCount} pending
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setAllRead(true)}
                        className="cursor-pointer text-[11.5px] font-medium text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>

                    {/* Notification List */}
                    <div className="flex max-h-[360px] flex-col gap-1 overflow-y-auto p-2">
                      {overdueLoans.map((l) => {
                        const item = state.items.find((i) => i.id === l.itemId)
                        const borrower = state.profiles.find((p) => p.id === l.borrowerId)
                        return (
                          <Link
                            key={`notif-overdue-${l.id}`}
                            to={manager ? `/inventory?action=return&loan=${l.id}` : '/inventory?status=overdue'}
                            onClick={() => setNotificationsOpen(false)}
                            className="notification-item group flex items-start gap-2.5 rounded-2xl p-2.5 transition-colors hover:bg-surface/80"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-warning-border bg-warning-bg text-warning-text">
                              <Clock3 size={15} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <strong className="truncate text-xs font-medium text-ink">Overdue return</strong>
                                <span className="text-[10.5px] font-medium text-warning-text">Overdue</span>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-ink">
                                <strong>{item?.name}</strong> was due on {dateText(l.due)}{borrower ? ` (${borrower.name}${borrower.title ? ` — ${borrower.title}` : ''})` : ''}.
                              </p>
                            </div>
                          </Link>
                        )
                      })}

                      {openIncidents.map((inc) => {
                        const item = state.items.find((i) => i.id === inc.itemId)
                        return (
                          <Link
                            key={`notif-inc-${inc.id}`}
                            to="/incidents"
                            onClick={() => setNotificationsOpen(false)}
                            className="notification-item group flex items-start gap-2.5 rounded-2xl p-2.5 transition-colors hover:bg-surface/80"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-danger-border bg-danger-bg text-danger-text">
                              <ShieldAlert size={15} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <strong className="truncate text-xs font-medium text-ink">Open incident review</strong>
                                <span className="text-[10.5px] font-medium text-danger-text">{inc.kind}</span>
                              </div>
                              <p className="mt-0.5 text-xs text-muted-ink">
                                <strong>{item?.name}</strong>: {inc.notes}
                              </p>
                            </div>
                          </Link>
                        )
                      })}

                      {unreadCount === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-ink">
                          <CheckCheck size={28} className="mb-2 text-primary opacity-60" />
                          <strong className="text-xs font-medium text-ink">You're all caught up!</strong>
                          <span className="mt-0.5 text-[11px]">No overdue returns or pending incidents.</span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-line-subtle bg-surface/50 px-4 py-2.5 text-center">
                      <Link
                        to="/logs"
                        onClick={() => setNotificationsOpen(false)}
                        className="text-[11.5px] font-medium text-primary hover:underline"
                      >
                        View all activity logs →
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="profile-btn flex cursor-pointer items-center gap-2 rounded-full border border-white/90 bg-white/85 py-1 pr-3 pl-1.5 shadow-[0_4px_14px_rgba(21,63,50,0.06)] backdrop-blur-xl transition-all duration-150 hover:border-white hover:bg-white"
                aria-expanded={profileDropdownOpen}
                aria-label="User profile and settings"
              >
                <Avatar name={person.name} />
                <span className="hidden max-w-[120px] truncate text-xs font-medium text-ink sm:inline">
                  {person.name.split(' ')[0]}
                </span>
                <ChevronDown size={14} className="text-muted-ink" />
              </button>

              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[99998]"
                    aria-hidden="true"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="profile-dropdown-menu" style={{ zIndex: 99999 }}>
                    <div className="border-b border-line-subtle px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={person.name} />
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-[13.5px] font-semibold text-ink leading-tight">
                            {person.name}
                          </strong>
                          <span className="block truncate text-[11px] text-muted-ink mt-0.5">
                            {person.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@timber.publication.edu
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-line-subtle/80 pt-2.5">
                        <span className="text-[10.5px] font-medium text-muted-ink">System Role</span>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-primary border border-emerald-200/60 shadow-2xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>{person.role}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 py-1">
                      <Link
                        to="/settings"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="dropdown-item"
                      >
                        <SettingsIcon size={15} />
                        <span>Account settings</span>
                      </Link>
                    </div>



                    <div className="border-t border-line-subtle pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false)
                          if (signOut) void signOut(); else navigate('/login')
                        }}
                        className="dropdown-item text-muted-ink hover:text-ink hover:bg-surface"
                      >
                        <LogOut size={15} />
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {warning && (
          <div role="alert" className="warning mb-4">
            {warning}
          </div>
        )}

        {/* Main Workspace Body with Floating Pill Sidebar Dock (Desktop) */}
        <div className="workspace-body flex min-w-0 flex-1 items-start md:pl-[84px] lg:pl-[96px]">
          {/* Creative Floating Glassmorphic Pill Sidebar Dock (Desktop only) */}
          <aside
            ref={dockRef}
            onMouseEnter={updateDockCenters}
            onMouseMove={handleDockMouseMove}
            onMouseLeave={handleDockMouseLeave}
            className="floating-pill-rail hidden md:flex"
            aria-label="Workspace navigation"
          >
            <div className="pill-rail-inner flex flex-col items-center py-1">
              <nav
                aria-label="Main navigation"
                className="rail-links flex w-full flex-col items-center gap-3"
              >
                {/* Primary Action Buttons at the very top of Sidebar: Use equipment & Register equipment */}
                {manager && (
                  <>
                    <Link
                      to="/inventory?action=release"
                      aria-label="Use equipment"
                      className={`dock-item rail-primary-btn ${location.pathname === '/inventory' && location.search.includes('action=release') ? 'active' : ''}`}
                    >
                      <span className="relative inline-flex items-center justify-center">
                        <ArrowUpRight size={19} className="text-white" />
                      </span>
                      <span className="rail-label">Use equipment</span>
                    </Link>
                    <Link
                      to="/inventory?action=register"
                      aria-label="Register equipment"
                      className={`dock-item rail-register-btn ${location.pathname === '/inventory' && location.search.includes('action=register') ? 'active' : ''}`}
                    >
                      <span className="relative inline-flex items-center justify-center">
                        <Plus size={19} />
                      </span>
                      <span className="rail-label">Register equipment</span>
                    </Link>
                    <div className="my-1.5 h-px w-6 bg-line-subtle" aria-hidden="true" />
                  </>
                )}
                {links.map(({ to, name, icon: Icon }) => {
                  const badge = to === '/incidents' ? openIncidentCount : 0
                  return (
                    <NavLink
                      end={to === '/'}
                      key={to}
                      to={to}
                      aria-label={name}
                      className={({ isActive }) =>
                        `dock-item rail-pill-item ${isActive ? 'active' : ''}`
                      }
                    >
                      <span className="relative inline-flex items-center justify-center">
                        <Icon size={19} />
                        {badge > 0 && (
                          <span className="rail-badge" aria-label={`${badge} pending`}>
                            {badge}
                          </span>
                        )}
                      </span>
                      <span className="rail-label">
                        {name}
                        {badge > 0 && <span className="rail-inline-count">{badge}</span>}
                      </span>
                    </NavLink>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Page Main Content with bottom padding for mobile dock */}
          <main id="main" className="workspace-main flex min-w-0 flex-1 flex-col pb-24 md:pb-12">
            <div className="notice" role="status" aria-live="polite">
              {notice ? (
                <span className="flex items-center gap-2">
                  <CheckCheck size={16} className="shrink-0 text-primary" />
                  <span>{notice}</span>
                </span>
              ) : null}
            </div>
            <div key={person.id} className="page-content mx-auto w-full max-w-[1400px] flex-1">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory key={location.search} />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/security" element={<Security />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <footer className="workspace-footer mx-auto mt-8 flex w-full max-w-[1400px] flex-wrap justify-between gap-2.5 border-t border-line/70 pt-4 text-[11.5px] text-muted-ink">
              <span>Timber · Student Publication Inventory Management</span>
              <span>Equipment, borrowing, and shared responsibility.</span>
            </footer>
          </main>
        </div>
      </div>

      {/* Mobile Menu Modal Sheet */}
      {menu && (
        <div className="mobile-menu-modal fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[rgba(24,34,29,0.45)] backdrop-blur-sm transition-opacity"
            aria-hidden="true"
            onClick={() => setMenu(false)}
          />

          {/* Bottom Sheet Card */}
          <div
            role="dialog"
            aria-label="Navigation menu"
            aria-modal="true"
            className="relative z-10 flex max-h-[85vh] flex-col overflow-hidden rounded-t-[32px] border-t border-x border-white/95 bg-white/95 p-5 pb-6 shadow-[0_-16px_48px_rgba(21,63,50,0.22)] backdrop-blur-2xl animate-enter"
          >
            {/* Pull Indicator Pill */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#dbe4de]" aria-hidden="true" />

            {/* Header */}
            <div className="mb-4 flex items-center justify-between border-b border-line-subtle pb-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo.png"
                  alt="Timber publication logo"
                  className="h-7 w-auto object-contain"
                />
                <h2 className="text-[16px] font-semibold tracking-tight text-ink">The Timberland</h2>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line-subtle bg-surface text-ink hover:bg-white active:scale-95 transition-all"
                onClick={() => setMenu(false)}
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-0.5">
              {/* Quick Primary Actions for Custodians */}
              {manager && (
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    to="/inventory?action=release"
                    onClick={() => setMenu(false)}
                    className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-primary px-3 text-xs font-medium text-white shadow-[0_4px_14px_rgba(21,63,50,0.3)] active:scale-98 transition-all"
                    aria-label="Use equipment"
                  >
                    <span className="relative inline-flex items-center justify-center">
                      <ArrowUpRight size={17} className="text-white" />
                    </span>
                    <span>Use equipment</span>
                  </Link>

                  <Link
                    to="/inventory?action=register"
                    onClick={() => setMenu(false)}
                    className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-[#cbd8cf] bg-[#eef3f0] px-3 text-xs font-medium text-primary shadow-xs active:scale-98 transition-all hover:bg-[#e2eae4]"
                    aria-label="Register equipment"
                  >
                    <Plus size={17} />
                    <span>Register equipment</span>
                  </Link>
                </div>
              )}

              {/* Navigation Links */}
              <nav aria-label="Mobile full navigation" className="flex flex-col gap-1.5">
                {links.map(({ to, name, icon: Icon }) => {
                  const badge = to === '/incidents' ? openIncidentCount : 0
                  const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
                  return (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMenu(false)}
                      className={`flex min-h-[48px] items-center justify-between rounded-2xl px-4 text-[14px] font-medium transition-all ${
                        isActive
                          ? 'border border-primary/30 bg-pale text-primary font-semibold'
                          : 'text-ink hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${isActive ? 'bg-primary text-white' : 'bg-surface text-muted-ink'}`}>
                          <Icon size={17} />
                        </span>
                        <span>{name}</span>
                      </div>
                      {badge > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b7791f] px-1.5 font-mono text-[10px] font-semibold text-white">
                          {badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>

              {/* User Profile & Logout Footer */}
              <div className="mt-2 flex items-center justify-between border-t border-line-subtle pt-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={person.name} />
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-xs font-medium text-ink">{person.name}</strong>
                    <span className="block truncate text-[11px] text-muted-ink">{person.role}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMenu(false)
                    if (signOut) void signOut(); else navigate('/login')
                  }}
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-line-subtle bg-white/80 px-3 text-xs font-medium text-muted-ink hover:border-line hover:bg-surface hover:text-ink active:scale-95 transition-all cursor-pointer"
                  aria-label="Log out"
                >
                  <LogOut size={14} />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Bottom Navigation Dock for 1-thumb touch navigation (rounded-full) */}
      <nav
        aria-label="Mobile navigation"
        className="mobile-bottom-dock fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-full border border-white/90 bg-white/85 px-2 py-1.5 shadow-[0_8px_32px_rgba(21,63,50,0.12)] backdrop-blur-xl md:hidden"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) => `mobile-dock-btn ${isActive ? 'active' : ''}`}
          aria-label="Dashboard overview"
        >
          <LayoutDashboard size={19} />
          <span>Overview</span>
        </NavLink>

        <NavLink
          to="/inventory"
          end={location.pathname === '/inventory' && !location.search.includes('action=release')}
          className={({ isActive }) =>
            `mobile-dock-btn ${isActive && !location.search.includes('action=release') ? 'active' : ''}`
          }
          aria-label="Equipment inventory"
        >
          <Package size={19} />
          <span>Inventory</span>
        </NavLink>

        {manager ? (
          <Link
            to="/inventory?action=release"
            className="mobile-dock-action-btn"
            aria-label="Use equipment"
          >
            <span className="relative inline-flex items-center justify-center">
              <ArrowUpRight size={19} className="text-white" />
            </span>
            <span className="text-[9.5px] font-medium leading-none text-white">Use</span>
          </Link>
        ) : (
          <NavLink
            to="/inventory?status=loans"
            className={({ isActive }) => `mobile-dock-btn ${isActive ? 'active' : ''}`}
            aria-label="Equipment in my care"
          >
            <ArrowUpRight size={19} />
            <span>In care</span>
          </NavLink>
        )}

        <NavLink
          to="/incidents"
          className={({ isActive }) => `mobile-dock-btn relative ${isActive ? 'active' : ''}`}
          aria-label="Incident reviews"
        >
          <ShieldAlert size={19} />
          {openIncidentCount > 0 && (
            <span className="mobile-dock-badge">{openIncidentCount}</span>
          )}
          <span>Incidents</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setMenu(!menu)}
          className={`mobile-dock-btn ${menu ? 'active' : ''}`}
          aria-label="More navigation options"
        >
          <Menu size={19} />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  )
}
