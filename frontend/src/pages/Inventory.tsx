import { value, dateText, tomorrow } from '../components/format'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus, Search, Package, ShieldAlert, ArrowUpRight } from 'lucide-react'
import { useDemo } from '../demo/context'
import { canInventory, available, isOverdue, uid, visibleIncidents, type Item } from '../demo/model'
import { Heading } from '../components/layout'
import { Badge, Empty, Modal, Field } from '../components/ui'

export function Inventory() {
  const { state, person, act } = useDemo()
  const query = new URLSearchParams(useLocation().search)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(query.get('status') ?? 'all')
  const [modal, setModal] = useState<{
    type: 'item' | 'checkout' | 'return' | 'history'
    id?: string
  } | null>(() => {
    if (query.get('action') === 'register' && canInventory(person)) return { type: 'item' }
    if (
      query.get('action') === 'return' &&
      canInventory(person) &&
      state.loans.some((l) => l.id === query.get('loan') && !l.returned)
    )
      return { type: 'return', id: query.get('loan')! }
    if (query.get('action') === 'history' && state.items.some((i) => i.id === query.get('item')))
      return { type: 'history', id: query.get('item')! }
    return null
  })

  const manager = canInventory(person)
  const item = state.items.find((i) => i.id === modal?.id)
  const loan = state.loans.find((l) => l.id === modal?.id)

  const visibleLoans = state.loans.filter(
    (l) => !l.returned && (manager || l.borrowerId === person.id),
  )
  const overdueLoans = visibleLoans.filter((l) => isOverdue(l.due))
  const availableItemsCount = state.items.filter((i) => available(state, i.id)).length

  const items = state.items.filter(
    (i) =>
      `${i.name} ${i.tag} ${i.category}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'all' ||
        (filter === 'available' && available(state, i.id)) ||
        (filter === 'loans' &&
          state.loans.some(
            (l) => l.itemId === i.id && !l.returned && (manager || l.borrowerId === person.id),
          )) ||
        (filter === 'overdue' &&
          state.loans.some(
            (l) =>
              l.itemId === i.id &&
              !l.returned &&
              isOverdue(l.due) &&
              (manager || l.borrowerId === person.id),
          ))),
  )

  return (
    <>
      <Heading
        eyebrow="RESOURCES & RESPONSIBILITY"
        title="Equipment"
        description="Shared tools behind every story. Track availability, active loans, and condition records."
      >
        <Link to="/incidents" className="secondary">
          <ShieldAlert size={16} /> Incident reviews
        </Link>
        {manager && (
          <button className="primary" onClick={() => setModal({ type: 'item' })}>
            <Plus size={16} /> Register equipment
          </button>
        )}
      </Heading>

      <section className="mini-metrics" aria-label="Equipment summary">
        <button
          type="button"
          className={`mini-metric ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <span>Total catalog</span>
          <strong>{state.items.length}</strong>
        </button>
        <button
          type="button"
          className={`mini-metric ${filter === 'available' ? 'active' : ''}`}
          onClick={() => setFilter('available')}
        >
          <span>Available now</span>
          <strong>{availableItemsCount}</strong>
        </button>
        <button
          type="button"
          className={`mini-metric ${filter === 'loans' ? 'active' : ''}`}
          onClick={() => setFilter('loans')}
        >
          <span>Active loans</span>
          <strong>{visibleLoans.length}</strong>
        </button>
        <button
          type="button"
          className={`mini-metric ${filter === 'overdue' ? 'active' : ''}`}
          onClick={() => setFilter('overdue')}
        >
          <span>Overdue returns</span>
          <strong>{overdueLoans.length}</strong>
        </button>
      </section>

      <section className="panel">
        <div className="toolbar">
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Search equipment"
              placeholder="Search equipment, category, or asset tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="toolbar-controls">
            <select
              aria-label="Equipment status"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All equipment</option>
              <option value="available">Available</option>
              <option value="loans">Active loans</option>
              <option value="overdue">Overdue loans</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Equipment / asset</th>
                <th>Location</th>
                <th>Condition</th>
                <th>Status & loan context</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const active = state.loans.find((l) => l.itemId === i.id && !l.returned)
                const canSeeBorrower = active && (manager || active.borrowerId === person.id)
                const borrower = canSeeBorrower
                  ? state.profiles.find((p) => p.id === active.borrowerId)
                  : undefined
                return (
                  <tr key={i.id}>
                    <td>
                      <div className="cell-title">
                        <span className="equipment-icon" aria-hidden="true">
                          <Package size={18} />
                        </span>
                        <div>
                          <strong>{i.name}</strong>
                          <small>
                            <span className="asset-code">{i.tag}</span> · {i.category}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{i.location}</td>
                    <td>
                      <Badge>{i.condition}</Badge>
                    </td>
                    <td>
                      <Badge>
                        {active
                          ? isOverdue(active.due)
                            ? 'Overdue'
                            : 'On loan'
                          : available(state, i.id)
                            ? 'Available'
                            : 'Under review'}
                      </Badge>
                      {active && canSeeBorrower && (
                        <small>
                          {borrower?.name} · Due {dateText(active.due)}
                        </small>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="action-pill"
                          onClick={() => setModal({ type: 'history', id: i.id })}
                        >
                          History
                        </button>
                        {manager && (
                          <>
                            <button
                              type="button"
                              className="action-pill"
                              onClick={() => setModal({ type: 'item', id: i.id })}
                            >
                              Edit
                            </button>
                            {available(state, i.id) && (
                              <button
                                type="button"
                                className="action-pill primary-pill"
                                onClick={() => setModal({ type: 'checkout', id: i.id })}
                              >
                                Check out
                              </button>
                            )}
                            {active && (
                              <button
                                type="button"
                                className="action-pill primary-pill"
                                onClick={() => setModal({ type: 'return', id: active.id })}
                              >
                                Return
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!items.length && <Empty text="Try another search or equipment filter." />}
        <div className="table-footer">
          <span>{items.length} equipment records shown</span>
          <span>Individual assets · quantities and bulk supplies deferred</span>
        </div>
      </section>

      {modal && (
        <Modal
          title={
            modal.type === 'item'
              ? item
                ? 'Edit equipment'
                : 'Register equipment'
              : modal.type === 'checkout'
                ? `Check out ${item?.name}`
                : modal.type === 'return'
                  ? 'Record equipment return'
                  : `${item?.name} · history`
          }
          submit={modal.type === 'history' ? 'Done' : 'Save changes'}
          onClose={() => setModal(null)}
          onSubmit={(f) => {
            if (modal.type === 'item')
              act({
                type: 'item',
                item: {
                  id: item?.id ?? uid(),
                  name: value(f, 'name'),
                  tag: value(f, 'tag'),
                  category: value(f, 'category'),
                  location: value(f, 'location'),
                  condition: item?.condition ?? (value(f, 'condition') as Item['condition']),
                },
              })
            if (modal.type === 'checkout')
              act({
                type: 'checkout',
                itemId: item!.id,
                borrowerId: value(f, 'borrower'),
                due: value(f, 'due'),
                condition: value(f, 'condition'),
              })
            if (modal.type === 'return')
              act({
                type: 'return',
                loanId: loan!.id,
                condition: value(f, 'condition') as Item['condition'],
              })
          }}
        >
          {modal.type === 'item' && (
            <>
              <Field label="Equipment name">
                <input name="name" required defaultValue={item?.name} />
              </Field>
              <div className="form-grid">
                <Field label="Unique asset tag">
                  <input name="tag" required defaultValue={item?.tag} />
                </Field>
                <Field label="Category">
                  <input name="category" required defaultValue={item?.category ?? 'Camera'} />
                </Field>
              </div>
              <Field label="Storage location">
                <input
                  name="location"
                  required
                  defaultValue={item?.location ?? 'Equipment cabinet'}
                />
              </Field>
              {!item && (
                <Field label="Initial condition">
                  <select name="condition">
                    <option>Good</option>
                    <option>Fair</option>
                  </select>
                </Field>
              )}
              {item && (
                <p className="hint">
                  Condition changes are recorded through returns and incident reviews.
                </p>
              )}
            </>
          )}
          {modal.type === 'checkout' && (
            <>
              <Field label="Borrower">
                <select name="borrower" defaultValue="staff">
                  {state.profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Expected return">
                <input type="datetime-local" name="due" required defaultValue={tomorrow()} />
              </Field>
              <Field label="Condition before borrowing">
                <textarea name="condition" required defaultValue={item?.condition} />
              </Field>
            </>
          )}
          {modal.type === 'return' && (
            <>
              <p>
                Returning <strong>{state.items.find((i) => i.id === loan?.itemId)?.name}</strong>.
                An adverse condition opens an incident review without assigning blame.
              </p>
              <Field label="Condition after borrowing">
                <select name="condition">
                  <option>Good</option>
                  <option>Fair</option>
                  <option>Damaged</option>
                  <option>Missing</option>
                </select>
              </Field>
            </>
          )}
          {modal.type === 'history' && (
            <>
              <p className="hint">
                Demo history. Other staff members' loan details are restricted in this view.
              </p>
              {state.loans
                .filter((l) => l.itemId === item?.id && (manager || l.borrowerId === person.id))
                .map((l) => (
                  <article className="history-card" key={l.id}>
                    <strong>{state.profiles.find((p) => p.id === l.borrowerId)?.name}</strong>
                    <p>
                      Out {dateText(l.out)} · Due {dateText(l.due)}
                    </p>
                    <p>Before: {l.before}</p>
                    <p>
                      {l.returned
                        ? `Returned ${dateText(l.returned)} · ${l.after}`
                        : 'Currently on loan'}
                    </p>
                  </article>
                ))}
              {manager &&
                state.events
                  .filter((e) => e.entityId === item?.id)
                  .map((e) => (
                    <p key={e.id} className="event-line">
                      {e.text} · {dateText(e.at)}
                    </p>
                  ))}
              {!state.loans.some(
                (l) => l.itemId === item?.id && (manager || l.borrowerId === person.id),
              ) && <Empty text="No loan history visible for this item." />}
            </>
          )}
        </Modal>
      )}
    </>
  )
}

export function Incidents() {
  const { state, person, act } = useDemo()
  const [modal, setModal] = useState<string | null>(null)
  const manager = canInventory(person)
  const incidents = visibleIncidents(state, person)
  const reportable = state.items.filter(
    (i) =>
      manager ||
      state.loans.some((l) => l.itemId === i.id && l.borrowerId === person.id && !l.returned),
  )

  return (
    <>
      <Heading
        eyebrow="CARE FOR SHARED RESOURCES"
        title="Incident reviews"
        description="Document what happened, consider the context, and record a fair resolution."
      >
        <Link to="/inventory" className="secondary">
          Equipment catalog <ArrowUpRight size={15} />
        </Link>
        {!!reportable.length && (
          <button className="primary" onClick={() => setModal('new')}>
            <Plus size={16} /> Report an incident
          </button>
        )}
      </Heading>

      <div className="fairness compact">
        <span className="fairness-icon" aria-hidden="true">
          <ShieldAlert size={18} />
        </span>
        <div>
          <strong>Review without presumption of fault</strong>
          <p>
            An incident is a request for review. It does not establish fault or imply that a
            borrower stole or intentionally damaged an item.
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Reported condition</th>
                <th>Details & outcome</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((i) => {
                const eq = state.items.find((x) => x.id === i.itemId)
                return (
                  <tr key={i.id}>
                    <td>
                      <strong>{eq?.name}</strong>
                      <small>
                        {eq?.tag} · Reported {dateText(i.at)}
                      </small>
                    </td>
                    <td>
                      <Badge>{i.kind}</Badge>
                    </td>
                    <td className="long-cell">
                      {i.notes}
                      {i.outcome && (
                        <p>
                          <strong>Outcome:</strong> {i.outcome}
                        </p>
                      )}
                    </td>
                    <td>
                      <Badge>{i.resolved ? 'Resolved' : 'Under review'}</Badge>
                    </td>
                    <td>
                      {manager && !i.resolved ? (
                        <button
                          type="button"
                          className="action-pill primary-pill"
                          onClick={() => setModal(i.id)}
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!incidents.length && <Empty text="No incident reviews are visible to this persona." />}
        <div className="table-footer">
          <span>{incidents.length} incident records in scope</span>
          <span>Documented outcomes update equipment availability automatically</span>
        </div>
      </section>

      {modal && (
        <Modal
          title={modal === 'new' ? 'Report an equipment incident' : 'Resolve incident review'}
          onClose={() => setModal(null)}
          onSubmit={(f) => {
            if (modal === 'new')
              act({
                type: 'incident',
                itemId: value(f, 'item'),
                kind: value(f, 'kind') as 'Damaged' | 'Missing',
                notes: value(f, 'notes'),
              })
            else
              act({
                type: 'resolve',
                id: modal,
                outcome: value(f, 'outcome'),
                condition: value(f, 'condition') as Item['condition'],
              })
          }}
        >
          {modal === 'new' ? (
            <>
              <Field label="Equipment">
                <select name="item">
                  {reportable.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Observed condition">
                <select name="kind">
                  <option>Damaged</option>
                  <option>Missing</option>
                </select>
              </Field>
              <Field label="What happened? Include facts and context.">
                <textarea name="notes" required />
              </Field>
            </>
          ) : (
            <>
              <Field label="Documented outcome">
                <textarea name="outcome" required />
              </Field>
              <Field label="Condition after review">
                <select name="condition">
                  <option>Good</option>
                  <option>Fair</option>
                  <option>Damaged</option>
                  <option>Missing</option>
                </select>
              </Field>
              <p className="hint">
                Equipment remains unavailable if damaged, missing, on loan, or subject to another
                open incident.
              </p>
            </>
          )}
        </Modal>
      )}
    </>
  )
}
