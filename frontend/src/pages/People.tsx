import { dateText } from '../components/format'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, Users, Search } from 'lucide-react'
import { useDemo } from '../demo/context'
import { canEdit, visibleAssignments } from '../demo/model'
import { Heading, Avatar } from '../components/layout'
import { Badge, Empty } from '../components/ui'
export function Contributions() {
  const { state, person } = useDemo(),
    params = new URLSearchParams(useLocation().search),
    assignments = visibleAssignments(state, person).filter(
      (a) => !params.get('person') || a.assignee === params.get('person'),
    ),
    merits = state.merits.filter(
      (m) =>
        assignments.some((a) => a.id === m.assignmentId) &&
        (!params.get('person') || m.profileId === params.get('person')),
    ),
    people = state.profiles.filter(
      (p) =>
        (p.id === person.id || canEdit(person, p.department)) &&
        (!params.get('person') || p.id === params.get('person')),
    )
  return (
    <>
      <Heading
        eyebrow="RECOGNIZE THE WORK"
        title="Contributions"
        description="Verified work, transparent credit, and the context that gives numbers meaning."
      />
      <div className="summary-strip">
        <div>
          <span>Verified contributions</span>
          <strong>{merits.length}</strong>
        </div>
        <div>
          <span>Merit points awarded</span>
          <strong>{merits.reduce((n, m) => n + m.points, 0)}</strong>
        </div>
        <div>
          <span>Recognition, with context</span>
          <p>
            Points support appreciation.
            <br />
            They do not determine discipline.
          </p>
        </div>
      </div>
      <div className="section-title">
        <h2>People & participation</h2>
        <span className="muted">Alphabetical · not a ranking</span>
      </div>
      <div className="people-grid">
        {people
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((p) => {
            const own = assignments.filter((a) => a.assignee === p.id),
              done = own.filter((a) => a.status === 'Completed').length
            return (
              <article className="panel person-card" key={p.id}>
                <div className="person-heading">
                  <Avatar name={p.name} />
                  <div>
                    <strong>{p.name}</strong>
                    <small>{p.department}</small>
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
                        <strong>
                          {merits
                            .filter((m) => m.profileId === p.id)
                            .reduce((n, m) => n + m.points, 0)}
                        </strong>{' '}
                        points
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
                <Link to={`/assignments?person=${p.id}`}>
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
          </div>
          <div className="department-grid">
            {state.departments
              .filter((d) => canEdit(person, d))
              .map((d) => (
                <div className="panel person-card" key={d}>
                  <h3>{d}</h3>
                  <p>
                    {assignments.filter((a) => a.department === d).length} assignments ·{' '}
                    {merits
                      .filter(
                        (m) => state.profiles.find((p) => p.id === m.profileId)?.department === d,
                      )
                      .reduce((n, m) => n + m.points, 0)}{' '}
                    verified points
                  </p>
                </div>
              ))}
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
              {merits.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{state.assignments.find((a) => a.id === m.assignmentId)?.title}</strong>
                    <a
                      href={state.submissions.find((s) => s.id === m.submissionId)?.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View output ↗
                    </a>
                  </td>
                  <td>{state.profiles.find((p) => p.id === m.profileId)?.name}</td>
                  <td>
                    <Badge>+{m.points}</Badge>
                  </td>
                  <td>{state.profiles.find((p) => p.id === m.reviewer)?.name}</td>
                  <td>{dateText(m.at)}</td>
                </tr>
              ))}
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
  const { state, person } = useDemo(),
    [search, setSearch] = useState('')
  return (
    <>
      <Heading
        eyebrow="THE PEOPLE BEHIND THE PUBLICATION"
        title="People & departments"
        description="Different skills, a shared purpose. Meet your fictional demo newsroom."
      />
      <div className="department-grid">
        {state.departments.map((d) => (
          <article className="panel department-card" key={d}>
            <span className="work-icon">
              <Users size={23} />
            </span>
            <h2>{d}</h2>
            <p>{state.profiles.filter((p) => p.department === d).length} members</p>
          </article>
        ))}
      </div>
      <section className="panel">
        <div className="toolbar">
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Search people"
              placeholder="Search name or department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <span className="muted">Read-only demo directory</span>
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
              {state.profiles
                .filter((p) =>
                  `${p.name} ${p.department}`.toLowerCase().includes(search.toLowerCase()),
                )
                .map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="cell-title">
                        <Avatar name={p.name} />
                        <strong>{p.name}</strong>
                      </div>
                    </td>
                    <td>{p.department}</td>
                    <td>{p.role}</td>
                    <td>
                      {p.id === person.id || canEdit(person, p.department) ? (
                        <div className="row-actions">
                          <Link to={`/assignments?person=${p.id}`}>Assignments</Link>
                          <Link to={`/contributions?person=${p.id}`}>Contributions</Link>
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
        {!state.profiles.some((p) =>
          `${p.name} ${p.department}`.toLowerCase().includes(search.toLowerCase()),
        ) && <Empty text="Try a different name or department." />}
      </section>
    </>
  )
}
