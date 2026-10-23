import { dateText } from '../components/format'
import { Link } from 'react-router-dom'
import {
  Leaf,
  ArrowRight,
  ArrowUpRight,
  Package,
  ClipboardList,
  CheckCheck,
  Clock3,
} from 'lucide-react'
import { useDemo } from '../demo/context'
import { available, canInventory, visibleAssignments, isOverdue } from '../demo/model'
import { Heading } from '../components/layout'
import { Badge, Empty } from '../components/ui'
export function Dashboard() {
  const { state, person } = useDemo(),
    assignments = visibleAssignments(state, person),
    loans = state.loans.filter((l) => canInventory(person) || l.borrowerId === person.id),
    reviewer = person.role === 'Administrator' || person.role === 'Department Editor'
  const pending = assignments.filter((a) => ['Pending', 'In progress'].includes(a.status)),
    review = assignments.filter((a) => ['Submitted', 'Excuse requested'].includes(a.status))
  const events = state.events
    .filter(
      (e) =>
        e.actor === person.id ||
        assignments.some((a) => a.id === e.entityId) ||
        (canInventory(person) && state.items.some((i) => i.id === e.entityId)),
    )
    .slice(0, 4)
  return (
    <>
      <Heading
        eyebrow="YOUR PUBLICATION, IN FOCUS"
        title="A clearer view of the newsroom."
        description={`Welcome back, ${person.name.split(' ')[0]}. Here's where things stand today.`}
      />
      <section className="hero-panel">
        <div>
          <span className="hero-label">MAKE ROOM FOR GOOD WORK</span>
          <h2>
            Every contribution counts.
            <br />
            Every resource matters.
          </h2>
          <p>
            Keep your team moving, your equipment accounted for,
            <br className="desktop" /> and the story behind the numbers in view.
          </p>
          <Link className="hero-link" to="/assignments">
            Explore assignments <ArrowRight size={17} />
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit one" />
          <div className="orbit two" />
          <div className="paper paper-back" />
          <div className="paper">
            <span>TIMBER</span>
            <div className="paper-rule" />
            <div className="paper-title">
              A voice.
              <br />A purpose.
            </div>
            <div className="paper-grid">
              <div />
              <div />
            </div>
            <div className="paper-lines" />
          </div>
          <div className="seal">
            <Leaf size={29} />
          </div>
        </div>
      </section>
      <div className="section-title">
        <h2>At a glance</h2>
        <span className="muted">Live from your demo workspace</span>
      </div>
      <section className="stats">
        {[
          {
            label: 'Available equipment',
            n: state.items.filter((i) => available(state, i.id)).length,
            to: '/inventory?status=available',
            icon: Package,
            note: 'Ready for your next story',
            color: 'green',
          },
          {
            label: 'Active loans',
            n: loans.filter((l) => !l.returned).length,
            to: '/inventory?status=loans',
            icon: ArrowUpRight,
            note: `${loans.filter((l) => !l.returned && isOverdue(l.due)).length} overdue · follow up with care`,
            color: 'amber',
          },
          {
            label: 'Open assignments',
            n: pending.length,
            to: '/assignments?status=open',
            icon: ClipboardList,
            note: 'Work in progress, together',
            color: 'blue',
          },
          {
            label: 'Awaiting review',
            n: review.length,
            to: reviewer ? '/reviews' : '/assignments?status=review',
            icon: CheckCheck,
            note: 'Recognition starts with review',
            color: 'purple',
          },
        ].map((c) => (
          <Link className="stat" to={c.to} key={c.label}>
            <div className="stat-top">
              <span>{c.label}</span>
              <c.icon size={18} className={c.color} />
            </div>
            <strong>{c.n.toString().padStart(2, '0')}</strong>
            <p>{c.note}</p>
          </Link>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>On the editorial desk</h2>
              <p className="muted">Upcoming work and submissions</p>
            </div>
            <Link to="/assignments">
              View all <ArrowUpRight size={15} />
            </Link>
          </div>
          {assignments
            .filter((a) => !['Completed', 'Excused'].includes(a.status))
            .slice(0, 4)
            .map((a) => (
              <Link className="work-row" key={a.id} to={`/assignments?assignment=${a.id}`}>
                <span className="work-icon">
                  <ClipboardList size={19} />
                </span>
                <div>
                  <strong>{a.title}</strong>
                  <p>
                    {state.profiles.find((p) => p.id === a.assignee)?.name} <span>·</span>{' '}
                    {dateText(a.due)}
                  </p>
                </div>
                <Badge>
                  {['Pending', 'In progress'].includes(a.status) && isOverdue(a.due)
                    ? 'Overdue'
                    : a.status}
                </Badge>
              </Link>
            ))}
          {!assignments.length && (
            <Empty text="No assignments recorded. This is not a measure of participation." />
          )}
        </section>
        <section className="panel activity">
          <div className="panel-heading">
            <div>
              <h2>Workspace activity</h2>
              <p className="muted">The small steps behind the work</p>
            </div>
            <Clock3 size={18} />
          </div>
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
          {!events.length && <Empty text="Your next action will appear here." />}
          <p className="history-note">
            Demo histories are local and editable, not tamper-resistant audit logs.
          </p>
        </section>
      </div>
      <div className="fairness">
        <span>
          <Leaf size={20} />
        </span>
        <div>
          <strong>Context before conclusions.</strong>
          <p>
            Deadlines and points tell part of the story. Consider assignment opportunities,
            workload, and approved excuses before reviewing participation.
          </p>
        </div>
      </div>
    </>
  )
}
