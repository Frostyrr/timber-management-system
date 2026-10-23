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
  User,
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
  const { state, person, switchPerson, warning, notice } = useDemo()
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

      <div className="app-canvas mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-4 sm:px-6 lg:px-10">
        {/* Sleek Floating Top Header */}
        <header className="topbar sticky top-3.5 z-30 mt-4 mb-4 flex items-center justify-between gap-3 py-2">
          {/* Brand Identity */}
          <div className="topbar-left flex items-center gap-3">
            <button
              type="button"
              className="icon-button mobile-menu md:hidden"
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
              <div className="brand-text">
                <strong className="block text-[15px] leading-[1.15] font-medium tracking-[-0.025em] text-ink">
                  Timber
                </strong>
                <span className="mt-px block text-[11px] font-normal text-muted-ink">
                  Publication Inventory
                </span>
              </div>
            </Link>
          </div>

          {/* Right Floating Header Controls */}
          <div className="topbar-right flex items-center gap-3">
            {/* Google OAuth Status / Connect Button */}
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="google-auth-btn"
              title="Google Workspace OAuth SSO"
              aria-label="Google Workspace Single Sign-On"
            >
              <GoogleIcon size={16} />
              <span className="hidden sm:inline font-medium">
                {googleConnected ? 'Google Linked' : 'Google SSO'}
              </span>
              {googleConnected && (
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              )}
            </button>

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

                    {/* Quick Demo Persona Switcher inside Dropdown */}
                    <div className="border-t border-line-subtle pt-2 pb-1">
                      <span className="block px-3 pb-1 text-[9.5px] font-medium tracking-[0.06em] text-muted-ink uppercase">
                        DEMO PERSONA
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {state.profiles.map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            onClick={() => {
                              switchPerson(p.id)
                              setProfileDropdownOpen(false)
                            }}
                            className={`dropdown-item text-xs ${p.id === person.id ? 'bg-pale font-medium text-primary' : ''}`}
                          >
                            <User size={13} className="text-muted-ink" />
                            <span className="truncate">{p.name} · {p.role}</span>
                          </button>
                        ))}
                      </div>
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
              <nav
                aria-label="Main navigation"
                className="rail-links flex w-full flex-col items-center gap-2"
              >
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
                {/* Direct quick action buttons in Sidebar requested by user: Use equipment & Register equipment */}
                {manager && (
                  <>
                    <div className="my-1.5 h-px w-6 bg-line" aria-hidden="true" />
                    <Link
                      to="/inventory?action=release"
                      aria-label="Use equipment"
                      className={`rail-pill-item ${location.pathname === '/inventory' && location.search.includes('action=release') ? 'active' : ''}`}
                      onClick={() => setMenu(false)}
                    >
                      <span className="relative inline-flex items-center justify-center">
                        <ArrowUpRight size={19} className="text-supporting" />
                      </span>
                      <span className="rail-label">Use equipment</span>
                    </Link>
                    <Link
                      to="/inventory?action=register"
                      aria-label="Register equipment"
                      className={`rail-pill-item ${location.pathname === '/inventory' && location.search.includes('action=register') ? 'active' : ''}`}
                      onClick={() => setMenu(false)}
                    >
                      <span className="relative inline-flex items-center justify-center text-primary">
                        <Plus size={19} />
                      </span>
                      <span className="rail-label">Register equipment</span>
                    </Link>
                  </>
                )}
              </nav>

</div>
          </aside>

          {/* Page Main Content */}
          <main id="main" className="workspace-main flex min-w-0 flex-1 flex-col pb-8">
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

      <GoogleAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        connected={googleConnected}
        onToggleConnect={setGoogleConnected}
      />
    </div>
  )
}
