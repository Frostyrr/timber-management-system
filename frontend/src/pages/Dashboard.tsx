import { Link } from 'react-router-dom'
import { Package, ArrowUpRight, Clock3, ShieldAlert, Plus, Boxes } from 'lucide-react'
import { dateText } from '../components/format'
import { useDemo } from '../demo/context'
import { available, canInventory, isOverdue, visibleIncidents } from '../demo/model'
import { Heading } from '../components/layout'
import { Badge, Empty } from '../components/ui'

export function Dashboard() {
  const { state, person } = useDemo()
  const manager = canInventory(person)
  const loans = state.loans
    .filter((l) => !l.returned && (manager || l.borrowerId === person.id))
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due))
  const overdue = loans.filter((l) => isOverdue(l.due))
  const incidents = visibleIncidents(state, person).filter((i) => !i.resolved)
  const events = state.events
    .filter(
      (e) => state.items.some((i) => i.id === e.entityId) && (manager || e.actor === person.id),
    )
    .slice(0, 6)
  const cards = [
    {
      label: 'Total equipment',
      count: state.items.length,
      to: '/inventory',
      icon: Boxes,
      note: 'Individually tracked assets',
    },
    {
      label: 'Available equipment',
      count: state.items.filter((i) => available(state, i.id)).length,
      to: '/inventory?status=available',
      icon: Package,
      note: 'Ready to check out',
    },
    {
      label: manager ? 'Active loans' : 'My active loans',
      count: loans.length,
      to: '/inventory?status=loans',
      icon: ArrowUpRight,
      note: manager ? 'Currently with borrowers' : 'Equipment in your care',
    },
    {
      label: 'Overdue returns',
      count: overdue.length,
      to: '/inventory?status=overdue',
      icon: Clock3,
      note: 'Follow up on return dates',
    },
    {
      label: 'Open incident reviews',
      count: incidents.length,
      to: '/incidents',
      icon: ShieldAlert,
      note: 'Document, inspect, and resolve',
    },
  ]
  return (
    <>
      <Heading
        eyebrow="PUBLICATION INVENTORY"
        title="Inventory overview"
        description={`Hello, ${person.name.split(' ')[0]}. Keep track of equipment, returns, and items needing attention.`}
      >
        <Link className="secondary" to="/inventory?status=available">
          <Package size={16} />
          Browse available equipment
        </Link>
        {manager && (
          <Link className="primary" to="/inventory?action=register">
            <Plus size={16} />
            Register equipment
          </Link>
        )}
      </Heading>
      <section className="stats-grid" aria-label="Inventory summary">
        {cards.map(({ label, count, to, icon: Icon, note }) => (
          <Link className="stat-card" key={label} to={to}>
            <div className="stat-top">
              <span className="stat-icon">
                <Icon size={16} />
              </span>
              <span className="stat-label">{label}</span>
              <ArrowUpRight size={13} />
            </div>
            <strong className="stat-value">{count}</strong>
            <p className="stat-note">{note}</p>
          </Link>
        ))}
      </section>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="panel" aria-labelledby="loans-heading">
          <div className="panel-heading">
            <div>
              <h2 id="loans-heading">
                {manager ? 'Borrowing & returns' : 'My borrowing & returns'}
              </h2>
              <p className="muted">Nearest return dates first</p>
            </div>
            <Link className="panel-link" to="/inventory?status=loans">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="list-body">
            {loans.slice(0, 6).map((l) => (
              <div className="work-row" key={l.id}>
                <span className="work-icon">
                  <Package size={17} />
                </span>
                <div className="work-info">
                  <strong>{state.items.find((i) => i.id === l.itemId)?.name}</strong>
                  <p>
                    {state.profiles.find((p) => p.id === l.borrowerId)?.name} · Due{' '}
                    {dateText(l.due)}
                  </p>
                </div>
                <Badge>{isOverdue(l.due) ? 'Overdue' : 'On loan'}</Badge>
                <Link
                  className="action-pill primary-pill"
                  aria-label={`${manager ? 'Return' : 'View history for'} ${state.items.find((i) => i.id === l.itemId)?.name}`}
                  to={
                    manager
                      ? `/inventory?action=return&loan=${encodeURIComponent(l.id)}`
                      : `/inventory?action=history&item=${encodeURIComponent(l.itemId)}`
                  }
                >
                  {manager ? 'Return' : 'History'}
                </Link>
              </div>
            ))}
            {!loans.length && (
              <Empty text="No active loans in your view. Browse the equipment catalog to see what is available." />
            )}
          </div>
        </section>
        <section className="panel" aria-labelledby="incidents-heading">
          <div className="panel-heading">
            <div>
              <h2 id="incidents-heading">Equipment needing attention</h2>
              <p className="muted">Open reports awaiting a documented outcome</p>
            </div>
            <Link className="panel-link" to="/incidents">
              Review incidents <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="list-body">
            {incidents.slice(0, 6).map((i) => (
              <Link className="work-row" key={i.id} to="/incidents">
                <span className="work-icon icon-amber">
                  <ShieldAlert size={17} />
                </span>
                <div className="work-info">
                  <strong>{state.items.find((item) => item.id === i.itemId)?.name}</strong>
                  <p>Reported {dateText(i.at)}</p>
                </div>
                <Badge>{i.kind}</Badge>
              </Link>
            ))}
            {!incidents.length && <Empty text="No open incident reviews in your view." />}
          </div>
        </section>
      </div>
      <section className="panel mt-4" aria-labelledby="activity-heading">
        <div className="panel-heading">
          <div>
            <h2 id="activity-heading">Inventory activity</h2>
            <p className="muted">Recent equipment updates and transactions</p>
          </div>
          <Clock3 size={17} />
        </div>
        <div className="list-body">
          {events.map((e) => (
            <div className="activity-row" key={e.id}>
              <span className="activity-dot" />
              <div>
                <strong>{e.text}</strong>
                <p>
                  {state.profiles.find((p) => p.id === e.actor)?.name} · {dateText(e.at)}
                </p>
              </div>
            </div>
          ))}
          {!events.length && (
            <Empty text="Equipment activity will appear here as records are updated." />
          )}
        </div>
        <p className="history-note">Local demo records, not tamper-resistant audit logs.</p>
      </section>
      <div className="fairness">
        <span className="fairness-icon">
          <ShieldAlert size={18} />
        </span>
        <div>
          <strong>Shared equipment, clear responsibility.</strong>
          <p>
            Missing or damaged equipment starts a documented review. A borrowing record alone does
            not establish fault.
          </p>
        </div>
      </div>
    </>
  )
}
