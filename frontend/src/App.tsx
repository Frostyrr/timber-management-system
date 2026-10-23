import { useState } from 'react'
import { Link, NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, ShieldAlert, Menu, X } from 'lucide-react'
import { useDemo } from './demo/context'
import { visibleIncidents } from './demo/model'
import { Avatar } from './components/layout'
import { Dashboard } from './pages/Dashboard'
import { Inventory, Incidents } from './pages/Inventory'
import './App.css'

const links = [
  { to: '/', name: 'Overview', icon: LayoutDashboard },
  { to: '/inventory', name: 'Equipment', icon: Package },
  { to: '/incidents', name: 'Incident reviews', icon: ShieldAlert },
]

function getContextualPills(pathname: string) {
  if (pathname === '/inventory' || pathname === '/incidents') {
    return [
      {
        to: '/inventory',
        label: 'All gear',
        match: (p: string, s: string) => p === '/inventory' && (!s || s === '?status=all'),
      },
      {
        to: '/inventory?status=available',
        label: 'Available',
        match: (p: string, s: string) => p === '/inventory' && s === '?status=available',
      },
      {
        to: '/inventory?status=loans',
        label: 'Active loans',
        match: (p: string, s: string) => p === '/inventory' && s === '?status=loans',
      },
      {
        to: '/inventory?status=overdue',
        label: 'Overdue loans',
        match: (p: string, s: string) => p === '/inventory' && s === '?status=overdue',
      },
    ]
  }
  return [
    { to: '/', label: 'Overview', match: (p: string) => p === '/' },
    { to: '/inventory?status=available', label: 'Available gear', match: () => false },
    { to: '/inventory?status=loans', label: 'Active loans', match: () => false },
    { to: '/inventory?status=overdue', label: 'Overdue returns', match: () => false },
    { to: '/incidents', label: 'Incident reviews', match: () => false },
  ]
}

export default function App() {
  const { state, person, switchPerson, warning, notice } = useDemo()
  const [menu, setMenu] = useState(false)
  const location = useLocation()
  const openIncidentCount = visibleIncidents(state, person).filter((i) => !i.resolved).length
  const contextualPills = getContextualPills(location.pathname)

  return (
    <div className="app-backdrop min-h-screen bg-workspace p-0">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="app-canvas mx-auto flex min-h-screen w-full max-w-[1340px] flex-col px-4 sm:px-6 lg:px-9 xl:px-16">
        <header className="topbar pointer-events-none sticky top-3.5 z-40 mt-5 flex flex-wrap items-center justify-between gap-5 bg-transparent py-1.5">
          <div className="topbar-left pointer-events-auto flex items-center gap-3">
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
              className="brand inline-flex items-center gap-[11px]"
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

          <nav
            className="top-pill-nav pointer-events-auto order-3 mx-auto inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-white/90 bg-white/72 p-[5px] shadow-[0_12px_32px_-6px_rgba(21,63,50,0.1),0_2px_6px_rgba(21,63,50,0.04),0_0_0_1px_rgba(21,63,50,0.07),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-[18px] backdrop-saturate-[180%] lg:order-none lg:mx-0"
            aria-label="Quick view filters"
          >
            {contextualPills.map((pill) => {
              const active = pill.match(location.pathname, location.search)
              return (
                <Link
                  key={pill.to}
                  to={pill.to}
                  className={`pill-link rounded-full px-[15px] py-[6.5px] text-[12.5px] font-[450] whitespace-nowrap transition-colors duration-150 ${
                    active
                      ? 'active bg-primary font-medium text-white shadow-[0_2px_8px_rgba(21,63,50,0.2)]'
                      : 'text-[#5b6860] hover:bg-primary/[0.07] hover:text-ink'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {pill.label}
                </Link>
              )
            })}
          </nav>

          <div className="topbar-right pointer-events-auto flex items-center gap-3">
            <div className="persona-switcher flex items-center gap-2.5 rounded-full border border-white/85 bg-white/72 py-1 pr-[13px] pl-[5px] shadow-[0_6px_20px_-4px_rgba(21,63,50,0.07),0_0_0_1px_rgba(21,63,50,0.07)] backdrop-blur-[16px] backdrop-saturate-[180%]">
              <Avatar name={person.name} />
              <label className="persona-label flex flex-col">
                <span className="persona-eyebrow text-[8.5px] leading-[1.1] font-medium tracking-[0.07em] text-muted-ink">
                  DEMO ROLE
                </span>
                <select
                  aria-label="Demo persona"
                  value={person.id}
                  onChange={(e) => switchPerson(e.target.value)}
                  className="cursor-pointer rounded border-0 bg-transparent py-px pr-4 pl-0 text-[12.5px] font-medium text-ink"
                >
                  {state.profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.role}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </header>

        {warning && (
          <div role="alert" className="warning">
            {warning}
          </div>
        )}

        {menu && (
          <div
            className="mobile-backdrop fixed inset-0 z-[45] bg-[rgba(24,34,29,0.35)] md:hidden"
            aria-hidden="true"
            onClick={() => setMenu(false)}
          />
        )}

        <div className="workspace-body flex min-w-0 flex-1 items-start md:pl-[84px]">
          <aside className={`nav-rail ${menu ? 'open' : ''}`} aria-label="Workspace navigation">
            <nav
              aria-label="Main navigation"
              className="rail-links flex w-full flex-col items-center gap-1.5"
            >
              {links.map(({ to, name, icon: Icon }) => {
                const badge = to === '/incidents' ? openIncidentCount : 0
                return (
                  <NavLink
                    end={to === '/'}
                    key={to}
                    to={to}
                    aria-label={name}
                    className={({ isActive }) => `rail-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMenu(false)}
                  >
                    <span className="rail-icon-wrap relative inline-flex items-center justify-center">
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
          </aside>

          <main id="main" className="workspace-main flex min-w-0 flex-1 flex-col pt-6 pb-8">
            <div className="notice" role="status" aria-live="polite">
              {notice}
            </div>
            <div key={person.id} className="page-content mx-auto w-full max-w-[1440px] flex-1">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory key={location.search} />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <footer className="workspace-footer mx-auto mt-7 flex w-full max-w-[1440px] flex-wrap justify-between gap-2.5 border-t border-line pt-[18px] text-[11.5px] text-muted-ink">
              <span>Timber · Student Publication Inventory Management</span>
              <span>Equipment, borrowing, and shared responsibility.</span>
            </footer>
          </main>
        </div>
      </div>
    </div>
  )
}

