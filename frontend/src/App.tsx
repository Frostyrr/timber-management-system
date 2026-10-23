import { useState } from 'react'
import { Link, NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  CheckCheck,
  Award,
  Users,
  ShieldAlert,
  Menu,
  X,
} from 'lucide-react'
import { useDemo } from './demo/context'
import { visibleAssignments } from './demo/model'
import { Avatar } from './components/layout'
import { Dashboard } from './pages/Dashboard'
import { Inventory, Incidents } from './pages/Inventory'
import { Assignments } from './pages/Assignments'
import { Contributions, Staff } from './pages/People'
import './App.css'

const links = [
  { to: '/', name: 'Overview', icon: LayoutDashboard },
  { to: '/inventory', name: 'Equipment', icon: Package },
  { to: '/incidents', name: 'Incident reviews', icon: ShieldAlert },
  { to: '/assignments', name: 'Assignments', icon: ClipboardList },
  { to: '/reviews', name: 'Contribution review', icon: CheckCheck },
  { to: '/contributions', name: 'Contributions', icon: Award },
  { to: '/staff', name: 'People & departments', icon: Users },
]

function getContextualPills(pathname: string) {
  if (pathname === '/inventory' || pathname === '/incidents') {
    return [
      { to: '/inventory', label: 'All gear', match: (p: string, s: string) => p === '/inventory' && (!s || s === '?status=all') },
      { to: '/inventory?status=available', label: 'Available', match: (p: string, s: string) => p === '/inventory' && s === '?status=available' },
      { to: '/inventory?status=loans', label: 'Active loans', match: (p: string, s: string) => p === '/inventory' && s === '?status=loans' },
      { to: '/inventory?status=overdue', label: 'Overdue loans', match: (p: string, s: string) => p === '/inventory' && s === '?status=overdue' },
    ]
  }
  if (pathname === '/assignments' || pathname === '/reviews') {
    return [
      { to: '/assignments', label: 'All tasks', match: (p: string, s: string) => p === '/assignments' && (!s || s === '?status=all') },
      { to: '/assignments?status=open', label: 'Open work', match: (p: string, s: string) => p === '/assignments' && s === '?status=open' },
      { to: '/assignments?status=overdue', label: 'Overdue', match: (p: string, s: string) => p === '/assignments' && s === '?status=overdue' },
      { to: '/assignments?status=Completed', label: 'Completed', match: (p: string, s: string) => p === '/assignments' && s === '?status=Completed' },
      { to: '/assignments?status=Excused', label: 'Excused', match: (p: string, s: string) => p === '/assignments' && s === '?status=Excused' },
    ]
  }
  if (pathname === '/contributions' || pathname === '/staff') {
    return [
      { to: '/contributions', label: 'Merit & output', match: (p: string, s: string) => p === '/contributions' && !s },
      { to: '/staff', label: 'All departments', match: (p: string, s: string) => p === '/staff' && !s },
      { to: '/staff?dept=Editorial', label: 'Editorial', match: (p: string, s: string) => p === '/staff' && s === '?dept=Editorial' },
      { to: '/staff?dept=Visuals', label: 'Visuals', match: (p: string, s: string) => p === '/staff' && s === '?dept=Visuals' },
      { to: '/staff?dept=Production', label: 'Production', match: (p: string, s: string) => p === '/staff' && s === '?dept=Production' },
    ]
  }
  return [
    { to: '/', label: 'Overview', match: (p: string) => p === '/' },
    { to: '/inventory?status=available', label: 'Available gear', match: () => false },
    { to: '/inventory?status=loans', label: 'Active loans', match: () => false },
    { to: '/assignments?status=open', label: 'Open tasks', match: () => false },
    { to: '/assignments?status=overdue', label: 'Overdue tasks', match: () => false },
  ]
}

export default function App() {
  const { state, person, switchPerson, warning, notice } = useDemo()
  const [menu, setMenu] = useState(false)
  const location = useLocation()
  const reviewer = person.role === 'Administrator' || person.role === 'Department Editor'
  const reviewCount = visibleAssignments(state, person).filter((a) =>
    ['Submitted', 'Excuse requested'].includes(a.status),
  ).length
  const openIncidentCount = state.incidents.filter((i) => !i.resolved).length
  const contextualPills = getContextualPills(location.pathname)

  return (
    <div className="app-backdrop">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <div className="app-canvas">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="icon-button mobile-menu"
              aria-label="Toggle navigation"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/" className="brand" onClick={() => setMenu(false)}>
              <img src="/logo.png" alt="Timber publication logo" className="brand-logo" />
              <div className="brand-text">
                <strong>Timber</strong>
                <span>Student Publication</span>
              </div>
            </Link>
          </div>

          <nav className="top-pill-nav" aria-label="Quick view filters">
            {contextualPills.map((pill) => {
              const active = pill.match(location.pathname, location.search)
              return (
                <Link
                  key={pill.to}
                  to={pill.to}
                  className={`pill-link ${active ? 'active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {pill.label}
                </Link>
              )
            })}
          </nav>

          <div className="topbar-right">
            <div className="persona-switcher">
              <Avatar name={person.name} />
              <label className="persona-label">
                <span className="persona-eyebrow">WORKSPACE ROLE</span>
                <select
                  aria-label="Demo persona"
                  value={person.id}
                  onChange={(e) => switchPerson(e.target.value)}
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
            className="mobile-backdrop"
            aria-hidden="true"
            onClick={() => setMenu(false)}
          />
        )}

        <div className="workspace-body">
          <aside className={`nav-rail ${menu ? 'open' : ''}`} aria-label="Workspace navigation">
            <nav aria-label="Main navigation" className="rail-links">
              {links
                .filter((l) => l.to !== '/reviews' || reviewer)
                .map(({ to, name, icon: Icon }) => {
                  const badge =
                    to === '/reviews'
                      ? reviewCount
                      : to === '/incidents'
                        ? openIncidentCount
                        : 0
                  return (
                    <NavLink
                      end={to === '/'}
                      key={to}
                      to={to}
                      aria-label={name}
                      className={({ isActive }) => `rail-item ${isActive ? 'active' : ''}`}
                      onClick={() => setMenu(false)}
                    >
                      <span className="rail-icon-wrap">
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

          <main id="main" className="workspace-main">
            <div className="notice" role="status" aria-live="polite">
              {notice}
            </div>
            <div key={person.id} className="page-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory key={location.search} />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/assignments" element={<Assignments key={location.search} />} />
                <Route
                  path="/reviews"
                  element={
                    reviewer ? <Assignments key="review" review /> : <Navigate to="/" replace />
                  }
                />
                <Route path="/contributions" element={<Contributions />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <footer className="workspace-footer">
              <span>Timber · Student Publication Management & Accountability System</span>
              <span>Fair recognition, transparent context, and shared care for newsroom resources.</span>
            </footer>
          </main>
        </div>
      </div>
    </div>
  )
}
