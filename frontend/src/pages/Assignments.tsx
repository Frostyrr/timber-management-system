import { value, dateText, tomorrow } from '../components/format'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus, Search, ArrowUpRight, X } from 'lucide-react'
import { useDemo } from '../demo/context'
import { canEdit, visibleAssignments, isOverdue, criteria, uid } from '../demo/model'
import { Avatar, Heading } from '../components/layout'
import { Badge, Empty, Modal, Field } from '../components/ui'

export function Assignments({ review = false }: { review?: boolean }) {
  const { state, person, act } = useDemo()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(params.get('status') ?? 'all')
  const [modal, setModal] = useState<{ type: string; id?: string } | null>(null)
  const [department, setDepartment] = useState(person.department)
  const [taskType, setTaskType] = useState('Article')

  const editor = person.role === 'Administrator' || person.role === 'Department Editor'
  const a = state.assignments.find((a) => a.id === modal?.id)
  const scoped = visibleAssignments(state, person)
  const personFilter = params.get('person')
  const assignmentFilter = params.get('assignment')
  const filteredPerson = personFilter
    ? state.profiles.find((p) => p.id === personFilter)
    : undefined

  const assignments = scoped.filter(
    (a) =>
      (!review || ['Submitted', 'Excuse requested'].includes(a.status)) &&
      (!personFilter || a.assignee === personFilter) &&
      (!assignmentFilter || a.id === assignmentFilter) &&
      `${a.title} ${a.department} ${a.type}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'all' ||
        (filter === 'open' && ['Pending', 'In progress'].includes(a.status)) ||
        (filter === 'review' && ['Submitted', 'Excuse requested'].includes(a.status)) ||
        (filter === 'overdue' &&
          ['Pending', 'In progress'].includes(a.status) &&
          isOverdue(a.due)) ||
        a.status === filter),
  )

  return (
    <>
      <Heading
        eyebrow={review ? 'REVIEW & RECOGNITION' : 'THE WORK BEHIND THE STORIES'}
        title={review ? 'Contribution review' : 'Assignments'}
        description={
          review
            ? 'Give work a thoughtful review. Recognize effort with verified credit.'
            : 'Clear expectations, manageable workloads, and room for context.'
        }
      >
        {editor && !review && (
          <button
            className="primary"
            onClick={() => {
              setDepartment(person.department)
              setTaskType('Article')
              setModal({ type: 'create' })
            }}
          >
            <Plus size={16} /> Create assignment
          </button>
        )}
      </Heading>

      {!review && (
        <section className="mini-metrics" aria-label="Assignment summary filters">
          <button
            type="button"
            className={`mini-metric ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            <span>All in scope</span>
            <strong>{scoped.length}</strong>
          </button>
          <button
            type="button"
            className={`mini-metric ${filter === 'open' ? 'active' : ''}`}
            onClick={() => setFilter('open')}
          >
            <span>Open work</span>
            <strong>
              {scoped.filter((x) => ['Pending', 'In progress'].includes(x.status)).length}
            </strong>
          </button>
          <button
            type="button"
            className={`mini-metric ${filter === 'review' ? 'active' : ''}`}
            onClick={() => setFilter('review')}
          >
            <span>Awaiting review</span>
            <strong>
              {scoped.filter((x) => ['Submitted', 'Excuse requested'].includes(x.status)).length}
            </strong>
          </button>
          <button
            type="button"
            className={`mini-metric ${filter === 'overdue' ? 'active' : ''}`}
            onClick={() => setFilter('overdue')}
          >
            <span>Overdue</span>
            <strong>
              {
                scoped.filter(
                  (x) => ['Pending', 'In progress'].includes(x.status) && isOverdue(x.due),
                ).length
              }
            </strong>
          </button>
          <button
            type="button"
            className={`mini-metric ${filter === 'Completed' ? 'active' : ''}`}
            onClick={() => setFilter('Completed')}
          >
            <span>Completed</span>
            <strong>{scoped.filter((x) => x.status === 'Completed').length}</strong>
          </button>
        </section>
      )}

      {(filteredPerson || assignmentFilter) && (
        <div className="active-filter-banner">
          <span>
            Showing records filtered for{' '}
            <strong>
              {filteredPerson ? filteredPerson.name : 'selected assignment'}
            </strong>
          </span>
          <Link to="/assignments" className="action-pill">
            <X size={13} /> Clear filter
          </Link>
        </div>
      )}

      <section className="panel">
        <div className="toolbar">
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Search assignments"
              placeholder="Search assignments, department, or type…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {!review && (
            <div className="toolbar-controls">
              <select
                aria-label="Assignment status"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="open">Open work</option>
                <option value="review">Awaiting review</option>
                <option value="overdue">Overdue</option>
                <option value="Pending">Pending</option>
                <option value="In progress">In progress</option>
                <option value="Submitted">Submitted</option>
                <option value="Excuse requested">Excuse requested</option>
                <option value="Completed">Completed</option>
                <option value="Excused">Excused</option>
              </select>
            </div>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Assignee</th>
                <th>Deadline / effort</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const assigneeProfile = state.profiles.find((p) => p.id === a.assignee)
                return (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.title}</strong>
                      <small>
                        {a.department} · {a.type} · {a.points} agreed points
                      </small>
                    </td>
                    <td>
                      <div className="cell-title">
                        <Avatar name={assigneeProfile?.name ?? 'Staff'} />
                        <div>
                          <strong>{assigneeProfile?.name}</strong>
                          <small>{assigneeProfile?.role}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{dateText(a.due)}</strong>
                      <small>{a.hours} estimated hours</small>
                    </td>
                    <td>
                      <Badge>
                        {['Pending', 'In progress'].includes(a.status) && isOverdue(a.due)
                          ? 'Overdue'
                          : a.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="action-pill"
                          onClick={() => setModal({ type: 'detail', id: a.id })}
                        >
                          Details
                        </button>
                        {a.assignee === person.id &&
                          ['Pending', 'In progress'].includes(a.status) && (
                            <>
                              <button
                                type="button"
                                className="action-pill primary-pill"
                                onClick={() => setModal({ type: 'submit', id: a.id })}
                              >
                                Submit
                              </button>
                              <button
                                type="button"
                                className="action-pill"
                                onClick={() => setModal({ type: 'excuse', id: a.id })}
                              >
                                Request excuse
                              </button>
                            </>
                          )}
                        {canEdit(person, a.department) &&
                          a.assignee !== person.id &&
                          ['Submitted', 'Excuse requested'].includes(a.status) && (
                            <button
                              type="button"
                              className="action-pill primary-pill"
                              onClick={() => setModal({ type: 'review', id: a.id })}
                            >
                              Review
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!assignments.length && (
          <Empty text="No assignments match this view. No assignments recorded is not a measure of inactivity." />
        )}
        <div className="table-footer">
          <span>{assignments.length} assignments shown</span>
          <span>Excused work and pending reviews are considered separately.</span>
        </div>
      </section>

      {modal && (
        <Modal
          title={
            modal.type === 'create'
              ? 'Create an assignment'
              : modal.type === 'submit'
                ? 'Submit your contribution'
                : modal.type === 'excuse'
                  ? 'Request an excuse'
                  : modal.type === 'review'
                    ? 'Review contribution or excuse'
                    : (a?.title ?? 'Assignment')
          }
          submit={modal.type === 'detail' ? 'Done' : 'Save changes'}
          onClose={() => setModal(null)}
          onSubmit={(f) => {
            if (modal.type === 'create')
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
            if (modal.type === 'submit')
              act({ type: 'submit', id: a!.id, url: value(f, 'url'), notes: value(f, 'notes') })
            if (modal.type === 'excuse')
              act({ type: 'excuse', id: a!.id, reason: value(f, 'reason') })
            if (modal.type === 'review')
              act({
                type: 'review',
                id: a!.id,
                decision: value(f, 'decision') as 'approve' | 'revise' | 'excuse',
                feedback: value(f, 'feedback'),
              })
            if (modal.type === 'detail' && value(f, 'start') === 'yes')
              act({ type: 'start', id: a!.id })
          }}
        >
          {modal.type === 'create' && (
            <>
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
                Suggested criteria: Article 10 · Photography 8 · Layout 12 · Editing 6 ·
                Administration 4. Agree points based on effort and difficulty before work starts.
              </p>
            </>
          )}
          {modal.type === 'submit' && (
            <>
              <p>
                <strong>{a?.title}</strong>
              </p>
              <Field label="Output link">
                <input name="url" type="url" placeholder="https://…" required />
              </Field>
              <Field label="Submission notes">
                <textarea name="notes" />
              </Field>
              <p className="hint">
                Sample links are welcome. Do not add confidential information to this demo.
              </p>
            </>
          )}
          {modal.type === 'excuse' && (
            <Field label="Reason and relevant context">
              <textarea name="reason" required />
            </Field>
          )}
          {modal.type === 'review' && (
            <>
              <p>
                <strong>{a?.title}</strong>
              </p>
              {a?.status === 'Excuse requested' ? (
                <div className="history-card">
                  <strong>Staff excuse request</strong>
                  <p>{a.reason}</p>
                </div>
              ) : (
                state.submissions
                  .filter((s) => s.assignmentId === a?.id)
                  .slice(0, 1)
                  .map((s) => (
                    <div className="history-card" key={s.id}>
                      <a href={s.url} target="_blank" rel="noreferrer">
                        Open submitted output <ArrowUpRight size={14} />
                      </a>
                      <p>{s.notes || 'No notes provided.'}</p>
                    </div>
                  ))
              )}
              <Field label="Decision">
                <select name="decision">
                  {a?.status === 'Excuse requested' ? (
                    <option value="excuse">Approve excuse</option>
                  ) : (
                    <>
                      <option value="approve">
                        Approve contribution · award {a?.points} points
                      </option>
                      <option value="revise">Return for revision</option>
                    </>
                  )}
                </select>
              </Field>
              <Field label="Reviewer feedback (required for revisions and excuses)">
                <textarea name="feedback" required={a?.status === 'Excuse requested'} />
              </Field>
            </>
          )}
          {modal.type === 'detail' && (
            <>
              <div className="detail-meta-row">
                <Badge>{a?.status}</Badge>
                <span className="muted">
                  {a?.department} · {a?.type} · Due {a ? dateText(a.due) : ''}
                </span>
              </div>
              <p>{a?.description}</p>
              <div className="history-card">
                <p>
                  <strong>Deliverable:</strong> {a?.deliverable}
                </p>
                <p>
                  <strong>Workload & credit:</strong> {a?.hours} estimated hours · {a?.points}{' '}
                  agreed points
                </p>
              </div>
              {a?.reason && (
                <p>
                  <strong>Excuse context:</strong> {a.reason}
                </p>
              )}
              {a?.feedback && (
                <p>
                  <strong>Reviewer feedback:</strong> {a.feedback}
                </p>
              )}
              {a?.assignee === person.id && a.status === 'Pending' && (
                <Field label="Update work status">
                  <select name="start">
                    <option value="no">Keep pending</option>
                    <option value="yes">Start work</option>
                  </select>
                </Field>
              )}
              <h3>Submission history</h3>
              {state.submissions
                .filter((s) => s.assignmentId === a?.id)
                .map((s) => (
                  <article className="history-card" key={s.id}>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      Submitted output <ArrowUpRight size={13} />
                    </a>
                    <p>{s.notes}</p>
                    <small>
                      {dateText(s.at)} · {s.approved ? 'Verified' : 'Submitted'}
                    </small>
                  </article>
                ))}
              {!state.submissions.some((s) => s.assignmentId === a?.id) && (
                <p className="muted">No submissions recorded yet.</p>
              )}
              <h3>Local activity history</h3>
              {state.events
                .filter((e) => e.entityId === a?.id)
                .map((e) => (
                  <p key={e.id} className="event-line">
                    {e.text} · {state.profiles.find((p) => p.id === e.actor)?.name} ·{' '}
                    {dateText(e.at)}
                  </p>
                ))}
              <p className="hint">This demo history is not a tamper-resistant audit log.</p>
            </>
          )}
        </Modal>
      )}
    </>
  )
}
