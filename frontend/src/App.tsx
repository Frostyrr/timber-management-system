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
  RotateCcw,
  Leaf,
} from 'lucide-react'
import { useDemo } from './demo/context'
import { visibleAssignments } from './demo/model'
import { Modal } from './components/ui'
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
export default function App() {
  const { state, person, switchPerson, reset, warning, notice } = useDemo(),
    [menu, setMenu] = useState(false),
    [confirm, setConfirm] = useState(false)
  const location = useLocation()
  const reviewer = person.role === 'Administrator' || person.role === 'Department Editor'
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <Link to="/" className="brand">
          <img src="/logo.png" alt="Timber publication logo" />
          <div>
            <strong>TIMBER</strong>
            <span>PUBLICATION WORKSPACE</span>
          </div>
        </Link>
        <div className="workspace-label">
          THE NEWSROOM <span>DEMO</span>
        </div>
        <nav aria-label="Main navigation">
          {links
            .filter((l) => l.to !== '/reviews' || reviewer)
            .map(({ to, name, icon: Icon }) => (
              <NavLink end={to === '/'} key={to} to={to} onClick={() => setMenu(false)}>
                <Icon size={18} />
                {name}
                {to === '/reviews' && (
                  <span className="nav-count">
                    {
                      visibleAssignments(state, person).filter((a) =>
                        ['Submitted', 'Excuse requested'].includes(a.status),
                      ).length
                    }
                  </span>
                )}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="principle">
            <Leaf size={20} />
            <strong>Good work. Shared responsibility.</strong>
            <p>A little clarity helps every voice grow.</p>
          </div>
          <button className="reset" onClick={() => setConfirm(true)}>
            <RotateCcw size={15} /> Reset demo data
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Toggle navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span>{' '}
            {links.find((l) => l.to === location.pathname)?.name ?? 'Overview'}
          </div>
          <div className="persona">
            <Avatar name={person.name} />
            <label>
              <span>VIEW DEMO AS</span>
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
        </header>
        <div className="demo-bar">
          <span className="live-dot" />
          Demo — sample data stored in this browser
          <span className="demo-detail">Role switching is a preview, not real authorization.</span>
        </div>
        {warning && (
          <div role="alert" className="warning">
            {warning}
          </div>
        )}
        <main id="main">
          <div className="notice" role="status" aria-live="polite">
            {notice}
          </div>
          <div key={person.id}>
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
          <footer>
            Timber · Student publication management
            <span>Built around people, powered by accountability.</span>
          </footer>
        </main>
      </div>
      {confirm && (
        <Modal
          title="Reset the showcase?"
          submit="Reset demo"
          onClose={() => setConfirm(false)}
          onSubmit={() => reset()}
        >
          <p>
            This replaces all changes in this browser with fresh fictional sample data. This cannot
            be undone.
          </p>
        </Modal>
      )}
    </div>
  )
}
