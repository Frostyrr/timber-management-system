import { useState } from 'react'
import { Link, NavLink, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShieldAlert,
  ScrollText,
  Menu,
  X,
  ArrowUpRight,
  Plus,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
} from 'lucide-react'
import { useDemo } from './demo/context'
import { visibleIncidents, canInventory } from './demo/model'
import { Avatar } from './components/layout'
import { GoogleIcon, GoogleAuthModal } from './components/auth'
import { Dashboard } from './pages/Dashboard'
import { Inventory, Incidents } from './pages/Inventory'
import { Logs } from './pages/Logs'
import { Login } from './pages/Login'
import { Settings } from './pages/Settings'
import './App.css'

const links = [
  { to: '/', name: 'Overview', icon: LayoutDashboard },
  { to: '/inventory', name: 'Equipment', icon: Package },
  { to: '/incidents', name: 'Incident reviews', icon: ShieldAlert },
  { to: '/logs', name: 'Logs', icon: ScrollText },
]

export default function App() {
  const { state, person, warning, notice } = useDemo()
  const [menu, setMenu] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const manager = canInventory(person)
  const openIncidentCount = visibleIncidents(state, person).filter((i) => !i.resolved).length

  return (
    <div className="app-backdrop min-h-screen bg-workspace">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="app-canvas mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-3 sm:px-6 lg:px-10">
        {/* Sleek Floating Top Header */}
        <header className="topbar sticky top-2.5 z-30 mb-3.5 flex items-center justify-between gap-2.5 rounded-2xl border border-white/85 bg-white/80 px-3 py-2 shadow-[0_4px_16px_rgba(21,63,50,0.06)] backdrop-blur-xl sm:top-3 sm:mb-4 sm:gap-3 sm:px-4">
          {/* Brand Identity */}
          <div className="topbar-left flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              className="icon-button mobile-menu flex h-10 w-10 items-center justify-center rounded-full md:hidden"
              aria-label="Toggle navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={20} /> : <Menu size={20} />}
            </button>
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
          <div className="topbar-right flex items-center gap-3">
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
                    className="fixed inset-0 z-40"
                    aria-hidden="true"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="profile-dropdown-menu">
                    <div className="border-b border-line-subtle px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={person.name} />
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-[13px] font-medium text-ink">
                            {person.name}
                          </strong>
                          <span className="block truncate text-[11px] text-muted-ink">
                            {person.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@timber.publication.edu
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-[10.5px] font-medium text-supporting">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span>{person.role}</span>
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
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false)
                          setAuthModalOpen(true)
                        }}
                        className="dropdown-item"
                      >
                        <GoogleIcon size={15} />
                        <span>Google Workspace SSO</span>
                      </button>
                    </div>



                    <div className="border-t border-line-subtle pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false)
                          navigate('/login')
                        }}
                        className="dropdown-item danger"
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

        {/* Mobile Backdrop */}
        {menu && (
          <div
            className="mobile-backdrop fixed inset-0 z-40 bg-[rgba(24,34,29,0.35)] backdrop-blur-xs md:hidden"
            aria-hidden="true"
            onClick={() => setMenu(false)}
          />
        )}

        {/* Main Workspace Body with Floating Pill Sidebar Dock */}
        <div className="workspace-body flex min-w-0 flex-1 items-start md:pl-[84px] lg:pl-[96px]">
          {/* Creative Floating Glassmorphic Pill Sidebar Dock */}
          <aside
            className={`floating-pill-rail ${menu ? 'open' : ''}`}
            aria-label="Workspace navigation"
          >
            <div className="pill-rail-inner flex flex-col items-center gap-3.5 py-2 px-1">
              {/* Mobile Drawer Header */}
              <div className="mobile-drawer-header mb-1 flex w-full items-center justify-between border-b border-line-subtle px-1 pb-3 md:hidden">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/logo.png"
                    alt="Timber logo"
                    className="h-7 w-auto object-contain"
                  />
                  <span className="text-[15px] font-semibold tracking-tight text-ink">The Timberland</span>
                </div>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line-subtle bg-surface text-ink hover:bg-white"
                  onClick={() => setMenu(false)}
                  aria-label="Close navigation drawer"
                >
                  <X size={17} />
                </button>
              </div>

              <nav
                aria-label="Main navigation"
                className="rail-links flex w-full flex-col items-center gap-2"
              >
                {/* Primary Action Buttons at the very top of Sidebar: Use equipment & Register equipment */}
                {manager && (
                  <>
                    <Link
                      to="/inventory?action=release"
                      aria-label="Use equipment"
                      className={`rail-primary-btn ${location.pathname === '/inventory' && location.search.includes('action=release') ? 'active' : ''}`}
                      onClick={() => setMenu(false)}
                    >
                      <span className="icon-shiny-wrapper relative inline-flex items-center justify-center">
                        <ArrowUpRight size={19} className="text-white" />
                      </span>
                      <span className="rail-label">Use equipment</span>
                    </Link>
                    <Link
                      to="/inventory?action=register"
                      aria-label="Register equipment"
                      className={`rail-register-btn ${location.pathname === '/inventory' && location.search.includes('action=register') ? 'active' : ''}`}
                      onClick={() => setMenu(false)}
                    >
                      <span className="relative inline-flex items-center justify-center">
                        <Plus size={19} />
                      </span>
                      <span className="rail-label">Register equipment</span>
                    </Link>
                    <div className="my-1 h-px w-6 bg-line" aria-hidden="true" />
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
                        `rail-pill-item ${isActive ? 'active' : ''}`
                      }
                      onClick={() => setMenu(false)}
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

              {/* Mobile Drawer Footer User Card */}
              <div className="mobile-drawer-footer mt-auto flex w-full flex-col gap-2 border-t border-line-subtle px-1 pt-3.5 md:hidden">
                <div className="flex items-center gap-2.5">
                  <Avatar name={person.name} />
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-xs font-medium text-ink">{person.name}</strong>
                    <span className="block truncate text-[11px] text-muted-ink">{person.role}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Link
                    to="/settings"
                    onClick={() => setMenu(false)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line-subtle bg-surface py-2 text-xs font-medium text-ink hover:bg-white"
                  >
                    <SettingsIcon size={14} />
                    <span>Settings</span>
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setMenu(false)}
                    className="flex items-center justify-center rounded-xl border border-danger-border bg-danger-bg px-3 py-2 text-xs font-medium text-danger-text"
                    aria-label="Log out"
                  >
                    <LogOut size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Page Main Content with bottom padding for mobile dock */}
          <main id="main" className="workspace-main flex min-w-0 flex-1 flex-col pb-24 md:pb-12">
            <div className="notice" role="status" aria-live="polite">
              {notice}
            </div>
            <div key={person.id} className="page-content mx-auto w-full max-w-[1400px] flex-1">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory key={location.search} />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/logs" element={<Logs />} />
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

      {/* Mobile Floating Bottom Navigation Dock for 1-thumb touch navigation */}
      <nav
        aria-label="Mobile navigation"
        className="mobile-bottom-dock fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-2xl border border-white/90 bg-white/85 p-1.5 shadow-[0_8px_32px_rgba(21,63,50,0.12)] backdrop-blur-xl md:hidden"
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
          aria-label="Equipment catalog"
        >
          <Package size={19} />
          <span>Catalog</span>
        </NavLink>

        {manager ? (
          <Link
            to="/inventory?action=release"
            className="mobile-dock-action-btn"
            aria-label="Use equipment"
          >
            <span className="icon-shiny-wrapper">
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

      <GoogleAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        connected={googleConnected}
        onToggleConnect={setGoogleConnected}
      />
    </div>
  )
}
