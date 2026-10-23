import { dateText } from '../components/format'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, Users, Search, Award, X } from 'lucide-react'
import { useDemo } from '../demo/context'
import { canEdit, visibleAssignments } from '../demo/model'
import { Heading, Avatar } from '../components/layout'
import { Badge, Empty } from '../components/ui'

export function Contributions() {
  const { state, person } = useDemo()
  const params = new URLSearchParams(useLocation().search)
  const personFilter = params.get('person')
  const filteredPerson = personFilter
    ? state.profiles.find((p) => p.id === personFilter)
    : undefined

  const assignments = visibleAssignments(state, person).filter(
    (a) => !personFilter || a.assignee === personFilter,
  )
  const merits = state.merits.filter(
    (m) =>
      assignments.some((a) => a.id === m.assignmentId) &&
      (!personFilter || m.profileId === personFilter),
  )
  const people = state.profiles.filter(
    (p) =>
      (p.id === person.id || canEdit(person, p.department)) &&
      (!personFilter || p.id === personFilter),
  )

  return (
    <>
      <Heading
        eyebrow="RECOGNIZE THE WORK"
        title="Contributions"
        description="Verified work, transparent credit, and the context that gives numbers meaning."
      />

      {filteredPerson && (
        <div className="active-filter-banner">
          <span>
            Showing contribution and merit records for <strong>{filteredPerson.name}</strong>
          </span>
          <Link to="/contributions" className="action-pill">
            <X size={13} /> Show all contributors
          </Link>
        </div>
      )}

      <div className="summary-strip">
        <div className="summary-metric">
          <span>Verified contributions</span>
          <strong>{merits.length}</strong>
          <small>Approved outputs in scope</small>
        </div>
        <div className="summary-metric">
          <span>Merit points awarded</span>
          <strong>{merits.reduce((n, m) => n + m.points, 0)}</strong>
          <small>One award per verified task</small>
        </div>
        <div className="summary-context">
          <div className="summary-context-title">
            <Award size={16} aria-hidden="true" />
            <span>Recognition, with context</span>
          </div>
          <p>
            Points support appreciation and transparent credit. They do not determine discipline or
            rank staff members.
          </p>
        </div>
      </div>

      <div className="section-title">
        <h2>People & participation</h2>
        <span className="muted">Alphabetical · not a ranking</span>
      </div>

      <div className="people-grid">
        {[...people]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((p) => {
            const own = assignments.filter((a) => a.assignee === p.id)
            const done = own.filter((a) => a.status === 'Completed').length
            const personPoints = merits
              .filter((m) => m.profileId === p.id)
              .reduce((n, m) => n + m.points, 0)
            return (
              <article className="panel person-card" key={p.id}>
                <div className="person-heading">
                  <Avatar name={p.name} />
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.department} · {p.role}
                    </small>
                  </div>
                </div>
                {own.length ? (
                  <>
                    <div className="person-numbers">
                      <span>
                        <strong>{done}</strong> verified
                      </span>
                      <span>
                        <strong>{own.reduce((n, a) => n + a.hours, 0)}</strong> assigned hours
                      </span>
                      <span>
                        <strong>{personPoints}</strong> points
                      </span>
                    </div>
                    <p className="hint">
                      {own.filter((a) => a.status === 'Excused').length} excused ·{' '}
                      {own.filter((a) => a.status === 'Submitted').length} awaiting verification ·{' '}
                      {own.filter((a) => a.status === 'Excuse requested').length} excuse requests
                    </p>
                  </>
                ) : (
                  <p className="hint">No assignments recorded.</p>
                )}
                <Link className="card-footer-link" to={`/assignments?person=${p.id}`}>
                  View assignment context <ArrowUpRight size={14} />
                </Link>
              </article>
            )
          })}
      </div>

      {(person.role === 'Administrator' || person.role === 'Department Editor') && (
        <>
          <div className="section-title">
            <h2>Department summaries</h2>
            <span className="muted">Visible departmental workload and verified credit</span>
          </div>
          <div className="department-grid">
            {state.departments
              .filter((d) => canEdit(person, d))
              .map((d) => {
                const deptAssignments = assignments.filter((a) => a.department === d)
                const deptHours = deptAssignments.reduce((n, a) => n + a.hours, 0)
                const deptPoints = merits
                  .filter(
                    (m) => state.profiles.find((p) => p.id === m.profileId)?.department === d,
                  )
                  .reduce((n, m) => n + m.points, 0)
                return (
                  <div className="panel person-card" key={d}>
                    <h3>{d}</h3>
                    <p className="dept-summary-stats">
                      {deptAssignments.length} assignments · {deptHours} est. hours · {deptPoints}{' '}
                      verified points
                    </p>
                  </div>
                )
              })}
          </div>
        </>
      )}

      <div className="section-title">
        <h2>Merit history</h2>
        <span className="muted">Credit is awarded once, after verification</span>
      </div>

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Verified output</th>
                <th>Contributor</th>
                <th>Points</th>
                <th>Verified by</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {merits.map((m) => {
                const contributor = state.profiles.find((p) => p.id === m.profileId)
                const reviewer = state.profiles.find((p) => p.id === m.reviewer)
                return (
                  <tr key={m.id}>
                    <td>
                      <strong>
                        {state.assignments.find((a) => a.id === m.assignmentId)?.title}
                      </strong>
                      <a
                        className="output-link"
                        href={state.submissions.find((s) => s.id === m.submissionId)?.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View output ↗
                      </a>
                    </td>
                    <td>
                      <div className="cell-title">
                        <Avatar name={contributor?.name ?? 'Staff'} />
                        <strong>{contributor?.name}</strong>
                      </div>
                    </td>
                    <td>
                      <Badge>+{m.points}</Badge>
                    </td>
                    <td>{reviewer?.name}</td>
                    <td>{dateText(m.at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!merits.length && (
          <Empty text="Approved contributions will appear here with their agreed credit." />
        )}
      </section>

      <p className="hint criteria">
        Suggested merit criteria: Article 10 · Photography 8 · Layout 12 · Editing 6 ·
        Administration 4. Editors agree the final value on each assignment before work starts.
      </p>
    </>
  )
}

export function Staff() {
  const { state, person } = useDemo()
  const params = new URLSearchParams(useLocation().search)
  const initialDept = params.get('dept') ?? 'all'
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState(initialDept)

  // Keep deptFilter synced if URL query changes
  const activeDept = params.get('dept') ?? deptFilter

  const filteredProfiles = state.profiles.filter(
    (p) =>
      (activeDept === 'all' || p.department === activeDept) &&
      `${p.name} ${p.department} ${p.role}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <Heading
        eyebrow="THE PEOPLE BEHIND THE PUBLICATION"
        title="People & departments"
        description="Different skills, a shared purpose. Meet your fictional demo newsroom."
      />

      <div className="department-grid">
        {state.departments.map((d) => {
          const members = state.profiles.filter((p) => p.department === d)
          const isSelected = activeDept === d
          return (
            <article
              className={`panel department-card ${isSelected ? 'selected-dept' : ''}`}
              key={d}
            >
              <div className="dept-card-top">
                <span className="work-icon" aria-hidden="true">
                  <Users size={20} />
                </span>
                <Badge>{members.length} members</Badge>
              </div>
              <h2>{d}</h2>
              <p>
                {members.map((m) => m.name.split(' ')[0]).join(', ')}
              </p>
            </article>
          )
        })}
      </div>

      <section className="panel">
        <div className="toolbar">
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Search people"
              placeholder="Search name, role, or department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="toolbar-controls">
            <select
              aria-label="Filter by department"
              value={activeDept}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="all">All departments</option>
              {state.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <span className="muted">Read-only demo directory</span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Role</th>
                <th>Context</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="cell-title">
                      <Avatar name={p.name} />
                      <strong>{p.name}</strong>
                    </div>
                  </td>
                  <td>{p.department}</td>
                  <td>
                    <Badge>{p.role}</Badge>
                  </td>
                  <td>
                    {p.id === person.id || canEdit(person, p.department) ? (
                      <div className="row-actions">
                        <Link className="action-pill" to={`/assignments?person=${p.id}`}>
                          Assignments
                        </Link>
                        <Link className="action-pill" to={`/contributions?person=${p.id}`}>
                          Contributions
                        </Link>
                      </div>
                    ) : (
                      <span className="muted">Private staff records</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredProfiles.length && <Empty text="Try a different name or department." />}
        <div className="table-footer">
          <span>{filteredProfiles.length} team members shown</span>
          <span>Alphabetical & role-scoped · private staff records protected</span>
        </div>
      </section>
    </>
  )
}
