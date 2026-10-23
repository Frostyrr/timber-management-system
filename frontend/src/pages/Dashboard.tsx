import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Leaf,
  ArrowUpRight,
  Package,
  ClipboardList,
  CheckCheck,
  Clock3,
  AlertTriangle,
  Plus,
  Layers,
} from 'lucide-react'
import { dateText, tomorrow, value } from '../components/format'
import { useDemo } from '../demo/context'
import {
  available,
  canEdit,
  canInventory,
  criteria,
  isOverdue,
  uid,
  visibleAssignments,
  type Item,
} from '../demo/model'
import { Heading } from '../components/layout'
import { Badge, Empty, Field, Modal } from '../components/ui'

const STATUS_META: {
  status:
    | 'Pending'
    | 'In progress'
    | 'Submitted'
    | 'Completed'
    | 'Excuse requested'
    | 'Excused'
  label: string
  color: string
  filter: string
}[] = [
  { status: 'Completed', label: 'Completed', color: '#153F32', filter: 'Completed' },
  { status: 'In progress', label: 'In progress', color: '#2F614E', filter: 'In progress' },
  { status: 'Submitted', label: 'Submitted', color: '#527A63', filter: 'Submitted' },
  { status: 'Pending', label: 'Pending', color: '#86A391', filter: 'Pending' },
  {
    status: 'Excuse requested',
    label: 'Excuse requested',
    color: '#B7791F',
    filter: 'Excuse requested',
  },
  { status: 'Excused', label: 'Excused', color: '#B8C5BC', filter: 'Excused' },
]

export function Dashboard() {
  const { state, person, act } = useDemo()
  const [quickModal, setQuickModal] = useState<'assignment' | 'equipment' | null>(null)
  const [department, setDepartment] = useState(person.department)
  const [taskType, setTaskType] = useState('Article')

  const assignments = visibleAssignments(state, person)
  const manager = canInventory(person)
  const reviewer = person.role === 'Administrator' || person.role === 'Department Editor'

  const loans = state.loans.filter((l) => manager || l.borrowerId === person.id)
  const activeLoans = loans.filter((l) => !l.returned)
  const overdueLoans = activeLoans.filter((l) => isOverdue(l.due))

  const availableCount = state.items.filter((i) => available(state, i.id)).length
  const openAssignments = assignments.filter((a) => ['Pending', 'In progress'].includes(a.status))
  const overdueAssignments = openAssignments.filter((a) => isOverdue(a.due))
  const pendingApprovals = assignments.filter((a) =>
    ['Submitted', 'Excuse requested'].includes(a.status),
  )

  const openHours = openAssignments.reduce((sum, a) => sum + a.hours, 0)
  const totalVisibleHours = assignments.reduce((sum, a) => sum + a.hours, 0)

  const visibleDepartments = state.departments.filter(
    (d) => canEdit(person, d) || d === person.department || assignments.some((a) => a.department === d),
  )

  const departmentWorkloads = visibleDepartments.map((dept) => {
    const deptAssignments = assignments.filter((a) => a.department === dept)
    const activeHrs = deptAssignments
      .filter((a) => ['Pending', 'In progress'].includes(a.status))
      .reduce((n, a) => n + a.hours, 0)
    const reviewHrs = deptAssignments
      .filter((a) => ['Submitted', 'Excuse requested'].includes(a.status))
      .reduce((n, a) => n + a.hours, 0)
    const completedHrs = deptAssignments
      .filter((a) => a.status === 'Completed')
      .reduce((n, a) => n + a.hours, 0)
    const excusedHrs = deptAssignments
      .filter((a) => a.status === 'Excused')
      .reduce((n, a) => n + a.hours, 0)
    const totalHrs = activeHrs + reviewHrs + completedHrs + excusedHrs
    return {
      dept,
      count: deptAssignments.length,
      totalHrs,
      activeHrs,
      reviewHrs,
      completedHrs,
      excusedHrs,
    }
  })

  const maxDeptHours = Math.max(...departmentWorkloads.map((d) => d.totalHrs), 1)

  const taskTypeWorkloads = Object.keys(criteria)
    .map((type) => {
      const matched = assignments.filter((a) => a.type === type)
      return {
        type,
        count: matched.length,
        hours: matched.reduce((n, a) => n + a.hours, 0),
      }
    })
    .filter((t) => t.count > 0)

  const maxTypeHours = Math.max(...taskTypeWorkloads.map((t) => t.hours), 1)

  const statusDistribution = STATUS_META.map((meta) => {
    const matched = assignments.filter((a) => a.status === meta.status)
    const count = matched.length
    const hours = matched.reduce((n, a) => n + a.hours, 0)
    const pct = assignments.length ? Math.round((count / assignments.length) * 100) : 0
    return { ...meta, count, hours, pct }
  })

  // Donut chart geometry (r = 62, circumference ≈ 389.56)
  const radius = 62
  const circumference = 2 * Math.PI * radius
  const activeStatusItems = statusDistribution.filter((s) => s.count > 0)
  const donutSegments = activeStatusItems.map((s, idx) => {
    const fraction = assignments.length ? s.count / assignments.length : 0
    const priorFraction = activeStatusItems
      .slice(0, idx)
      .reduce((sum, item) => sum + (assignments.length ? item.count / assignments.length : 0), 0)
    const dash = fraction * circumference
    const offset = -priorFraction * circumference
    return { ...s, dash, offset }
  })

  // Sorted upcoming & overdue assignments
  const prioritizedOpenAssignments = [...openAssignments].sort((a, b) => {
    const aOver = isOverdue(a.due) ? 0 : 1
    const bOver = isOverdue(b.due) ? 0 : 1
    if (aOver !== bOver) return aOver - bOver
    return new Date(a.due).getTime() - new Date(b.due).getTime()
  })

  // Loans needing follow-up (overdue first, then soonest due) + open incidents
  const followUpLoans = [...activeLoans].sort((a, b) => {
    const aOver = isOverdue(a.due) ? 0 : 1
    const bOver = isOverdue(b.due) ? 0 : 1
    if (aOver !== bOver) return aOver - bOver
    return new Date(a.due).getTime() - new Date(b.due).getTime()
  })

  const openIncidents = state.incidents.filter(
    (i) =>
      !i.resolved &&
      (manager ||
        i.reporter === person.id ||
        state.loans.some((l) => l.itemId === i.itemId && l.borrowerId === person.id)),
  )

  const events = state.events
    .filter(
      (e) =>
        e.actor === person.id ||
        assignments.some((a) => a.id === e.entityId) ||
        (manager && state.items.some((i) => i.id === e.entityId)),
    )
    .slice(0, 5)

  const summaryCards = [
    {
      label: 'Available equipment',
      value: availableCount,
      to: '/inventory?status=available',
      icon: Package,
      note: `of ${state.items.length} tracked assets ready`,
      tone: 'green',
    },
    {
      label: 'Active loans',
      value: activeLoans.length,
      to: '/inventory?status=loans',
      icon: ArrowUpRight,
      note: manager ? 'Currently checked out' : 'Checked out to you',
      tone: 'neutral',
    },
    {
      label: 'Overdue returns',
      value: overdueLoans.length,
      to: '/inventory?status=overdue',
      icon: AlertTriangle,
      note: overdueLoans.length > 0 ? 'Needs return follow-up' : 'All loans on schedule',
      tone: overdueLoans.length > 0 ? 'amber' : 'neutral',
    },
    {
      label: 'Open assignments',
      value: openAssignments.length,
      to: '/assignments?status=open',
      icon: ClipboardList,
      note: `${openHours} est. hours · ${overdueAssignments.length} past due`,
      tone: overdueAssignments.length > 0 ? 'amber' : 'green',
    },
    {
      label: 'Pending contribution approvals',
      value: pendingApprovals.length,
      to: reviewer ? '/reviews' : '/assignments?status=review',
      icon: CheckCheck,
      note: `${assignments.filter((a) => a.status === 'Submitted').length} submitted · ${assignments.filter((a) => a.status === 'Excuse requested').length} excuse req.`,
      tone: pendingApprovals.length > 0 ? 'green' : 'neutral',
    },
  ]

  return (
    <>
      <Heading
        title="Overview Dashboard"
        description={`Good day, ${person.name.split(' ')[0]} — viewing ${person.role.toLowerCase()} workspace for ${person.department}.`}
      >
        {manager && (
          <button
            type="button"
            className="secondary"
            onClick={() => setQuickModal('equipment')}
          >
            <Plus size={16} /> Register equipment
          </button>
        )}
        {reviewer && (
          <button
            type="button"
            className="primary"
            onClick={() => {
              setDepartment(person.department)
              setTaskType('Article')
              setQuickModal('assignment')
            }}
          >
            <Plus size={16} /> Create assignment
          </button>
        )}
      </Heading>

      <section className="stats-grid" aria-label="Workspace summary metrics">
        {summaryCards.map((card) => (
          <Link className={`stat-card tone-${card.tone}`} to={card.to} key={card.label}>
            <div className="stat-top">
              <span className="stat-icon" aria-hidden="true">
                <card.icon size={15} />
              </span>
              <span className="stat-label">{card.label}</span>
              <ArrowUpRight size={14} className="stat-arrow" aria-hidden="true" />
            </div>
            <strong className="stat-value">{card.value}</strong>
            <p className="stat-note">
              {card.tone === 'amber' && card.value > 0 && (
                <span className="inline-warning-tag">Attention</span>
              )}
              {card.note}
            </p>
          </Link>
        ))}
      </section>

      <div className="analytics-grid">
        {/* Main Panel 1: Assignment workload by department */}
        <section className="panel analytics-panel" aria-labelledby="workload-heading">
          <div className="panel-heading">
            <div>
              <h2 id="workload-heading">Assignment workload by department</h2>
              <p className="muted">
                Estimated assigned hours derived from {assignments.length} visible assignment
                {assignments.length === 1 ? '' : 's'} ({totalVisibleHours} total hours)
              </p>
            </div>
            <div className="workload-callout">
              <span className="workload-callout-label">Visible effort</span>
              <strong>{totalVisibleHours} hrs</strong>
              <small>{openHours} hrs active</small>
            </div>
          </div>

          {assignments.length > 0 ? (
            <div className="workload-body">
              <div className="chart-legend" aria-label="Workload stage legend">
                <span>
                  <i className="legend-swatch swatch-active" aria-hidden="true" /> Open ({openHours}
                  h)
                </span>
                <span>
                  <i className="legend-swatch swatch-review" aria-hidden="true" /> Awaiting review (
                  {assignments
                    .filter((a) => ['Submitted', 'Excuse requested'].includes(a.status))
                    .reduce((n, a) => n + a.hours, 0)}
                  h)
                </span>
                <span>
                  <i className="legend-swatch swatch-completed" aria-hidden="true" /> Completed (
                  {assignments
                    .filter((a) => a.status === 'Completed')
                    .reduce((n, a) => n + a.hours, 0)}
                  h)
                </span>
                <span>
                  <i className="legend-swatch swatch-excused" aria-hidden="true" /> Excused (
                  {assignments
                    .filter((a) => a.status === 'Excused')
                    .reduce((n, a) => n + a.hours, 0)}
                  h)
                </span>
              </div>

              <div className="hbar-group" role="list" aria-label="Department workload bars">
                {departmentWorkloads.map((d) => {
                  const activePct = (d.activeHrs / maxDeptHours) * 100
                  const reviewPct = (d.reviewHrs / maxDeptHours) * 100
                  const completedPct = (d.completedHrs / maxDeptHours) * 100
                  const excusedPct = (d.excusedHrs / maxDeptHours) * 100
                  return (
                    <div className="hbar-row" role="listitem" key={d.dept}>
                      <div className="hbar-header">
                        <div>
                          <strong>{d.dept}</strong>
                          <span className="hbar-meta">
                            {d.count} assignment{d.count === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="hbar-values">
                          <strong>{d.totalHrs} est. hrs</strong>
                          <span>
                            {d.activeHrs}h open · {d.reviewHrs}h review · {d.completedHrs}h done
                            {d.excusedHrs > 0 ? ` · ${d.excusedHrs}h excused` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="hbar-track" aria-hidden="true">
                        {d.activeHrs > 0 && (
                          <div
                            className="hbar-fill fill-active"
                            style={{ width: `${Math.max(activePct, 4)}%` }}
                          />
                        )}
                        {d.reviewHrs > 0 && (
                          <div
                            className="hbar-fill fill-review"
                            style={{ width: `${Math.max(reviewPct, 4)}%` }}
                          />
                        )}
                        {d.completedHrs > 0 && (
                          <div
                            className="hbar-fill fill-completed"
                            style={{ width: `${Math.max(completedPct, 4)}%` }}
                          />
                        )}
                        {d.excusedHrs > 0 && (
                          <div
                            className="hbar-fill fill-excused"
                            style={{ width: `${Math.max(excusedPct, 4)}%` }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {taskTypeWorkloads.length > 0 && (
                <div className="task-type-breakdown">
                  <div className="subchart-title">
                    <Layers size={14} aria-hidden="true" />
                    <span>Effort by task category (visible records)</span>
                  </div>
                  <div className="type-bars">
                    {taskTypeWorkloads.map((t) => (
                      <div className="type-bar-item" key={t.type}>
                        <div className="type-bar-label">
                          <span>{t.type}</span>
                          <strong>
                            {t.hours}h · {t.count} task{t.count === 1 ? '' : 's'}
                          </strong>
                        </div>
                        <div className="type-bar-track" aria-hidden="true">
                          <div
                            className="type-bar-fill"
                            style={{ width: `${Math.max((t.hours / maxTypeHours) * 100, 6)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Empty text="No assignments recorded. This is not a measure of participation." />
          )}
        </section>

        {/* Main Panel 2: Assignment status */}
        <section className="panel analytics-panel" aria-labelledby="status-heading">
          <div className="panel-heading">
            <div>
              <h2 id="status-heading">Assignment status</h2>
              <p className="muted">
                Distribution across pending, in-progress, submitted, completed, and excused states
              </p>
            </div>
            <Link to="/assignments" className="panel-link">
              All assignments <ArrowUpRight size={14} />
            </Link>
          </div>

          {assignments.length > 0 ? (
            <div className="status-analytics-layout">
              <div className="donut-wrap">
                <svg
                  viewBox="0 0 160 160"
                  className="donut-svg"
                  role="img"
                  aria-label={`Assignment status breakdown for ${assignments.length} assignments: ${statusDistribution
                    .map((s) => `${s.label} ${s.count}`)
                    .join(', ')}`}
                >
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke="#E7ECE6"
                    strokeWidth="20"
                  />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.status}
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="20"
                      strokeDasharray={`${seg.dash} ${circumference}`}
                      strokeDashoffset={seg.offset}
                      transform="rotate(-90 80 80)"
                    />
                  ))}
                </svg>
                <div className="donut-center">
                  <span>Visible tasks</span>
                  <strong>{assignments.length}</strong>
                  <small>{totalVisibleHours} est. hrs</small>
                </div>
              </div>

              <div className="status-table-wrap">
                <table className="compact-status-table" aria-label="Assignment status counts">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Share</th>
                      <th>Tasks · Effort</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusDistribution.map((s) => (
                      <tr key={s.status}>
                        <td>
                          <Link
                            to={`/assignments?status=${encodeURIComponent(s.filter)}`}
                            className="status-legend-link"
                          >
                            <span
                              className="status-dot"
                              style={{ backgroundColor: s.color }}
                              aria-hidden="true"
                            />
                            <span>{s.label}</span>
                          </Link>
                        </td>
                        <td className="status-pct">{s.pct}%</td>
                        <td className="status-vol">
                          <strong>{s.count}</strong> <span>({s.hours}h)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <Empty text="No assignments recorded. This is not a measure of participation." />
          )}
        </section>
      </div>

      {/* Lower Dashboard Panels: 3 Operational Lists */}
      <div className="lower-dashboard-grid">
        {/* Lower Panel 1: Upcoming and overdue assignments */}
        <section className="panel" aria-labelledby="upcoming-heading">
          <div className="panel-heading">
            <div>
              <h2 id="upcoming-heading">Upcoming & overdue assignments</h2>
              <p className="muted">Active deadlines in your workspace scope</p>
            </div>
            <Link to="/assignments" className="panel-link">
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="list-body">
            {prioritizedOpenAssignments.slice(0, 4).map((a) => {
              const overdue = isOverdue(a.due)
              return (
                <Link className="work-row" key={a.id} to={`/assignments?assignment=${a.id}`}>
                  <span className={`work-icon ${overdue ? 'icon-amber' : ''}`} aria-hidden="true">
                    <ClipboardList size={17} />
                  </span>
                  <div className="work-info">
                    <strong>{a.title}</strong>
                    <p>
                      {state.profiles.find((p) => p.id === a.assignee)?.name} <span>·</span> Due{' '}
                      {dateText(a.due)} <span>·</span> {a.hours}h
                    </p>
                  </div>
                  <Badge>{overdue ? 'Overdue' : a.status}</Badge>
                </Link>
              )
            })}
            {!prioritizedOpenAssignments.length && (
              <Empty
                text={
                  assignments.length === 0
                    ? 'No assignments recorded. This is not a measure of participation.'
                    : 'No open or overdue assignments right now.'
                }
              />
            )}
          </div>
        </section>

        {/* Lower Panel 2: Equipment loans needing follow-up */}
        <section className="panel" aria-labelledby="loans-followup-heading">
          <div className="panel-heading">
            <div>
              <h2 id="loans-followup-heading">Equipment loans needing follow-up</h2>
              <p className="muted">Active checkouts and open condition reviews</p>
            </div>
            <Link to="/inventory?status=loans" className="panel-link">
              Equipment <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="list-body">
            {followUpLoans.map((l) => {
              const item = state.items.find((i) => i.id === l.itemId)
              const borrower = state.profiles.find((p) => p.id === l.borrowerId)
              const overdue = isOverdue(l.due)
              return (
                <Link
                  className="work-row"
                  key={l.id}
                  to={overdue ? '/inventory?status=overdue' : '/inventory?status=loans'}
                >
                  <span className={`work-icon ${overdue ? 'icon-amber' : ''}`} aria-hidden="true">
                    <Package size={17} />
                  </span>
                  <div className="work-info">
                    <strong>
                      {item?.name} <span className="tag-inline">{item?.tag}</span>
                    </strong>
                    <p>
                      {borrower?.name} <span>·</span> Due {dateText(l.due)}
                    </p>
                  </div>
                  <Badge>{overdue ? 'Overdue' : 'On loan'}</Badge>
                </Link>
              )
            })}
            {openIncidents.map((inc) => {
              const item = state.items.find((i) => i.id === inc.itemId)
              return (
                <Link className="work-row" key={inc.id} to="/incidents">
                  <span className="work-icon icon-amber" aria-hidden="true">
                    <AlertTriangle size={17} />
                  </span>
                  <div className="work-info">
                    <strong>{item?.name} · Incident review</strong>
                    <p>
                      Reported {inc.kind.toLowerCase()} · {dateText(inc.at)}
                    </p>
                  </div>
                  <Badge>Under review</Badge>
                </Link>
              )
            })}
            {!followUpLoans.length && !openIncidents.length && (
              <Empty text="No active equipment loans or open incident reviews in your scope." />
            )}
          </div>
        </section>

        {/* Lower Panel 3: Recent workspace activity or pending reviews */}
        <section className="panel" aria-labelledby="activity-heading">
          <div className="panel-heading">
            <div>
              <h2 id="activity-heading">
                {reviewer && pendingApprovals.length > 0
                  ? 'Pending reviews & activity'
                  : 'Recent workspace activity'}
              </h2>
              <p className="muted">Latest submissions, approvals, and equipment logs</p>
            </div>
            {reviewer && pendingApprovals.length > 0 ? (
              <Link to="/reviews" className="panel-link">
                Review ({pendingApprovals.length}) <ArrowUpRight size={14} />
              </Link>
            ) : (
              <Clock3 size={16} className="panel-header-icon" aria-hidden="true" />
            )}
          </div>

          <div className="list-body">
            {pendingApprovals.slice(0, 2).map((a) => (
              <Link
                className="work-row review-highlight-row"
                key={a.id}
                to={reviewer ? '/reviews' : `/assignments?assignment=${a.id}`}
              >
                <span className="work-icon" aria-hidden="true">
                  <CheckCheck size={17} />
                </span>
                <div className="work-info">
                  <strong>{a.title}</strong>
                  <p>
                    {state.profiles.find((p) => p.id === a.assignee)?.name} · {a.points} pts
                  </p>
                </div>
                <Badge>{a.status}</Badge>
              </Link>
            ))}

            {events.map((e) => (
              <div className="activity-row" key={e.id}>
                <span className="activity-dot" aria-hidden="true" />
                <div>
                  <strong>{e.text}</strong>
                  <p>
                    {state.profiles.find((p) => p.id === e.actor)?.name} · {dateText(e.at)}
                  </p>
                </div>
              </div>
            ))}

            {!pendingApprovals.length && !events.length && (
              <Empty text="Your next workspace action will appear here." />
            )}
          </div>

          <p className="history-note">
            Demo histories are local browser records, not tamper-resistant audit logs.
          </p>
        </section>
      </div>

      <div className="fairness">
        <span className="fairness-icon" aria-hidden="true">
          <Leaf size={18} />
        </span>
        <div>
          <strong>Context before conclusions.</strong>
          <p>
            Deadlines and points tell part of the story. Consider assignment opportunities,
            workload, and approved excuses before reviewing participation.
          </p>
        </div>
      </div>

      {quickModal === 'equipment' && (
        <Modal
          title="Register equipment"
          onClose={() => setQuickModal(null)}
          onSubmit={(f) => {
            act({
              type: 'item',
              item: {
                id: uid(),
                name: value(f, 'name'),
                tag: value(f, 'tag'),
                category: value(f, 'category'),
                location: value(f, 'location'),
                condition: value(f, 'condition') as Item['condition'],
              },
            })
          }}
        >
          <Field label="Equipment name">
            <input name="name" required />
          </Field>
          <div className="form-grid">
            <Field label="Unique asset tag">
              <input name="tag" required placeholder="e.g. TP-009" />
            </Field>
            <Field label="Category">
              <input name="category" required defaultValue="Camera" />
            </Field>
          </div>
          <Field label="Storage location">
            <input name="location" required defaultValue="Equipment cabinet" />
          </Field>
          <Field label="Initial condition">
            <select name="condition">
              <option>Good</option>
              <option>Fair</option>
            </select>
          </Field>
        </Modal>
      )}

      {quickModal === 'assignment' && (
        <Modal
          title="Create an assignment"
          onClose={() => setQuickModal(null)}
          onSubmit={(f) => {
            act({
              type: 'assignment',
              assignment: {
                id: uid(),
                title: value(f, 'title'),
                description: value(f, 'description'),
                deliverable: value(f, 'deliverable'),
                department,
                assignee: value(f, 'assignee'),
                due: value(f, 'due'),
                hours: Number(value(f, 'hours')),
                points: Number(value(f, 'points')),
                type: taskType,
                status: 'Pending',
              },
            })
          }}
        >
          <Field label="Assignment title">
            <input name="title" required />
          </Field>
          <Field label="Description">
            <textarea name="description" required />
          </Field>
          <Field label="Expected deliverable">
            <input
              name="deliverable"
              required
              placeholder="e.g. A 600-word draft with verified sources"
            />
          </Field>
          <div className="form-grid">
            <Field label="Department">
              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                {state.departments
                  .filter((d) => canEdit(person, d))
                  .map((d) => (
                    <option key={d}>{d}</option>
                  ))}
              </select>
            </Field>
            <Field label="Assignee">
              <select
                name="assignee"
                key={department}
                defaultValue={department === 'Editorial' ? 'staff' : undefined}
              >
                {state.profiles
                  .filter((p) => p.department === department)
                  .map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
          <Field label="Deadline">
            <input type="datetime-local" name="due" required defaultValue={tomorrow()} />
          </Field>
          <div className="form-grid">
            <Field label="Task type">
              <select value={taskType} onChange={(e) => setTaskType(e.target.value)}>
                {Object.keys(criteria).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Estimated effort (hours)">
              <input
                name="hours"
                type="number"
                min="0.25"
                step="0.25"
                required
                defaultValue="2"
              />
            </Field>
          </div>
          <Field label="Agreed merit points">
            <input
              key={taskType}
              name="points"
              type="number"
              min="0"
              max="100"
              step="1"
              required
              defaultValue={criteria[taskType]}
            />
          </Field>
          <p className="hint">
            Suggested criteria: Article 10 · Photography 8 · Layout 12 · Editing 6 · Administration
            4. Agree points based on effort and difficulty before work starts.
          </p>
        </Modal>
      )}
    </>
  )
}
