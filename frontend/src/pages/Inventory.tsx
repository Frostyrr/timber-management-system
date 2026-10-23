import { value, dateText, tomorrow, categoryClass } from '../components/format'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus, Search, Package, ShieldAlert, ArrowUpRight, Clock3, RefreshCw } from 'lucide-react'
import { useDemo } from '../demo/context'
import {
  canInventory,
  available,
  isOverdue,
  uid,
  visibleIncidents,
  type Item,
} from '../demo/model'
import { Heading, Avatar } from '../components/layout'
import { Badge, Empty, Modal, Field, TableSkeleton, Pagination } from '../components/ui'

function getScheduleSummary(iso: string) {
  const targetTime = Date.parse(iso)
  if (!Number.isFinite(targetTime)) return { dateStr: 'Invalid date', duration: '' }
  const diffHours = Math.round((targetTime - Date.now()) / 3600000)
  const diffDays = Math.round(diffHours / 24)
  const duration = diffHours < 24 ? `${diffHours} hours from now` : `${diffDays} days from now`
  const dateStr = new Date(targetTime).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return { dateStr, duration }
}

function SchedulePicker({ defaultValue }: { defaultValue: string }) {
  const [preset, setPreset] = useState<'today' | 'tomorrow' | 'weekend' | 'week' | 'custom'>('tomorrow')
  const [isoValue, setIsoValue] = useState(() => defaultValue)
  const [summary, setSummary] = useState(() => getScheduleSummary(defaultValue))

  const computePreset = (type: 'today' | 'tomorrow' | 'weekend' | 'week') => {
    setPreset(type)
    const now = new Date()
    let target = new Date()
    if (type === 'today') {
      target.setHours(18, 0, 0, 0)
      if (target.getTime() <= now.getTime()) {
        target = new Date(now.getTime() + 4 * 3600000)
      }
    } else if (type === 'tomorrow') {
      target = new Date(now.getTime() + 24 * 3600000)
      target.setHours(17, 0, 0, 0)
    } else if (type === 'weekend') {
      target = new Date(now.getTime() + 3 * 86400000)
      target.setHours(17, 0, 0, 0)
    } else if (type === 'week') {
      target = new Date(now.getTime() + 7 * 86400000)
      target.setHours(17, 0, 0, 0)
    }
    const tzOffset = target.getTimezoneOffset() * 60000
    const local = new Date(target.getTime() - tzOffset).toISOString().slice(0, 16)
    setIsoValue(local)
    setSummary(getScheduleSummary(local))
  }

  return (
    <div className="schedule-picker-card">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-medium tracking-[0.03em] text-muted-ink uppercase">
          Quick Return Deadlines
        </span>
        <span className="text-[11px] text-muted-ink">Select window or customize</span>
      </div>

      <div className="schedule-preset-grid">
        <button
          type="button"
          className={`schedule-preset-btn ${preset === 'today' ? 'active' : ''}`}
          onClick={() => computePreset('today')}
        >
          <strong>Same Day</strong>
          <span>End of day · 6 PM</span>
        </button>
        <button
          type="button"
          className={`schedule-preset-btn ${preset === 'tomorrow' ? 'active' : ''}`}
          onClick={() => computePreset('tomorrow')}
        >
          <strong>Tomorrow</strong>
          <span>24h · 5 PM</span>
        </button>
        <button
          type="button"
          className={`schedule-preset-btn ${preset === 'weekend' ? 'active' : ''}`}
          onClick={() => computePreset('weekend')}
        >
          <strong>Weekend</strong>
          <span>3 Days coverage</span>
        </button>
        <button
          type="button"
          className={`schedule-preset-btn ${preset === 'week' ? 'active' : ''}`}
          onClick={() => computePreset('week')}
        >
          <strong>Full Week</strong>
          <span>7 Days assignment</span>
        </button>
      </div>

      <div className="schedule-summary-badge">
        <div className="flex min-w-0 items-center gap-2">
          <Clock3 size={15} className="shrink-0" />
          <span className="truncate">
            Due: {summary.dateStr} {summary.duration ? `(${summary.duration})` : ''}
          </span>
        </div>
        <button
          type="button"
          className="shrink-0 text-[11.5px] font-medium text-primary underline hover:text-primary-hover"
          onClick={() => setPreset('custom')}
        >
          {preset === 'custom' ? 'Custom mode' : 'Customize date & time'}
        </button>
      </div>

      {preset === 'custom' ? (
        <div className="pt-1">
          <label className="mb-1 block text-[11px] text-muted-ink">Exact Return Timestamp</label>
          <input
            type="datetime-local"
            name="due"
            required
            value={isoValue}
            onChange={(e) => {
              setIsoValue(e.target.value)
              setSummary(getScheduleSummary(e.target.value))
            }}
            className="w-full"
          />
        </div>
      ) : (
        <input type="hidden" name="due" value={isoValue} />
      )}
    </div>
  )
}

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
      (query.get('action') === 'release' || query.get('action') === 'checkout') &&
      canInventory(person)
    )
      return { type: 'checkout', id: query.get('item') ?? undefined }
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

  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 500)
  }

  const manager = canInventory(person)
  const item = state.items.find((i) => i.id === modal?.id)
  const loan = state.loans.find((l) => l.id === modal?.id)
  const availableItems = state.items.filter((i) => available(state, i.id))

  const visibleLoans = state.loans.filter(
    (l) => !l.returned && (manager || l.borrowerId === person.id),
  )
  const overdueLoans = visibleLoans.filter((l) => isOverdue(l.due))
  const availableItemsCount = availableItems.length

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

  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize)

  return (
    <>
      <Heading
        eyebrow="RESOURCES & RESPONSIBILITY"
        title="Equipment"
        description="Shared tools behind every story. Track availability, equipment in use, and condition records."
      >
        <Link to="/incidents" className="secondary">
          <ShieldAlert size={16} /> Incident reviews
        </Link>
        {manager && (
          <>
            <button className="secondary" onClick={() => setModal({ type: 'checkout' })}>
              <ArrowUpRight size={16} /> Release equipment
            </button>
            <button className="primary" onClick={() => setModal({ type: 'item' })}>
              <Plus size={16} /> Register equipment
            </button>
          </>
        )}
      </Heading>

      <section className="mini-metrics" aria-label="Equipment summary">
        <button
          type="button"
          className={`mini-metric stagger-item ${filter === 'all' ? 'active' : ''}`}
          style={{ '--stagger-i': 0 } as React.CSSProperties}
          onClick={() => { setFilter('all'); setPage(1); }}
        >
          <span>Total catalog</span>
          <strong>{state.items.length}</strong>
        </button>
        <button
          type="button"
          className={`mini-metric stagger-item ${filter === 'available' ? 'active' : ''}`}
          style={{ '--stagger-i': 1 } as React.CSSProperties}
          onClick={() => { setFilter('available'); setPage(1); }}
        >
          <span>Available now</span>
          <strong>{availableItemsCount}</strong>
        </button>
        <button
          type="button"
          className={`mini-metric stagger-item ${filter === 'loans' ? 'active' : ''}`}
          style={{ '--stagger-i': 2 } as React.CSSProperties}
          onClick={() => { setFilter('loans'); setPage(1); }}
        >
          <span>Equipment in use</span>
          <strong>{visibleLoans.length}</strong>
        </button>
        <button
          type="button"
          className={`mini-metric stagger-item ${filter === 'overdue' ? 'active' : ''}`}
          style={{ '--stagger-i': 3 } as React.CSSProperties}
          onClick={() => { setFilter('overdue'); setPage(1); }}
        >
          <span>Overdue returns</span>
          <strong>{overdueLoans.length}</strong>
        </button>
      </section>

      <section className="panel animate-enter">
        <div className="toolbar">
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Search equipment"
              placeholder="Search equipment, category, or asset tag…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </label>
          <div className="toolbar-controls">
            <button
              type="button"
              className="icon-button"
              title="Refresh equipment catalog"
              aria-label="Refresh records"
              onClick={handleRefresh}
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-primary' : ''} />
            </button>
            <select
              aria-label="Equipment status"
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All equipment</option>
              <option value="available">Available</option>
              <option value="loans">Equipment in use</option>
              <option value="overdue">Overdue returns</option>
            </select>
          </div>
        </div>

        {refreshing ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Equipment / asset</th>
                  <th>Location</th>
                  <th>Condition</th>
                  <th>Status & usage details</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((i, idx) => {
                  const active = state.loans.find((l) => l.itemId === i.id && !l.returned)
                  const canSeeBorrower = active && (manager || active.borrowerId === person.id)
                  const borrower = canSeeBorrower
                    ? state.profiles.find((p) => p.id === active.borrowerId)
                    : undefined
                  return (
                    <tr
                      key={i.id}
                      className="stagger-item"
                      style={{ '--stagger-i': idx } as React.CSSProperties}
                    >
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
                            : 'In use'
                          : available(state, i.id)
                            ? 'Available'
                            : 'Under review'}
                      </Badge>
                      {active && canSeeBorrower && (
                        <div className="mt-1 flex flex-col gap-1">
                          <small className="font-medium text-ink">
                            {borrower?.name} · Due {dateText(active.due)}
                          </small>
                          {(active.event || active.eventCategory) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {active.event && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-[#cde0d2] bg-pale px-2 py-0.5 text-[11px] font-medium text-primary">
                                  {active.event}
                                </span>
                              )}
                              {!active.event && active.eventCategory && (
                                <span className={`category-pill ${categoryClass(active.eventCategory)}`}>
                                  {active.eventCategory}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="action-pill"
                          onClick={() => setModal({ type: 'history', id: i.id })}
                        >
                          Usage history
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
                                Record equipment release
                              </button>
                            )}
                            {active && (
                              <button
                                type="button"
                                className="action-pill primary-pill"
                                onClick={() => setModal({ type: 'return', id: active.id })}
                              >
                                Record return
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
      )}
      {!items.length && <Empty text="Try another search or equipment filter." />}
        <Pagination
          page={page}
          total={items.length}
          pageSize={pageSize}
          onPageChange={setPage}
          label="equipment records"
        />
        <div className="table-footer">
          <span>{items.length} equipment records shown</span>
          <span>Individual assets · 10 items per page</span>
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
                ? item
                  ? `Record equipment release for ${item.name}`
                  : 'Record equipment release'
                : modal.type === 'return'
                  ? 'Record equipment return'
                  : `${item?.name} · usage history`
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
                itemId: item?.id ?? value(f, 'item'),
                borrowerId: value(f, 'borrower'),
                due: value(f, 'due'),
                condition: value(f, 'condition'),
                event: value(f, 'event'),
                eventCategory: value(f, 'eventCategory'),
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
              {!item && (
                <Field label="Equipment to release">
                  <select name="item" required defaultValue={availableItems[0]?.id}>
                    {availableItems.map((ai) => (
                      <option key={ai.id} value={ai.id}>
                        {ai.name} ({ai.tag}) · {ai.category}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Staff member / Assignee">
                <select name="borrower" defaultValue="staff">
                  {state.profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="form-grid">
                <Field label="Type of event coverage">
                  <input
                    name="eventCategory"
                    placeholder="e.g. Sports Coverage, Campus News, Features, Investigative…"
                    list="coverage-types"
                    autoComplete="off"
                  />
                  <datalist id="coverage-types">
                    <option value="Sports Coverage" />
                    <option value="Campus News & Governance" />
                    <option value="Features & Culture" />
                    <option value="Investigative & Fieldwork" />
                    <option value="Institutional & Academic" />
                    <option value="Studio & Internal Production" />
                  </datalist>
                </Field>
                <Field label="Specific event / assignment">
                  <input
                    name="event"
                    placeholder="e.g. UAAP Men's Basketball Finals, Student Council Forum…"
                    autoComplete="off"
                  />
                </Field>
              </div>
              <Field label="Return Deadline & Duration Window">
                <SchedulePicker defaultValue={tomorrow()} />
              </Field>
              <Field label="Condition before release">
                <textarea name="condition" required defaultValue={item?.condition ?? 'Good'} />
              </Field>
            </>
          )}
          {modal.type === 'return' && (
            <>
              <p>
                Recording return for{' '}
                <strong>{state.items.find((i) => i.id === loan?.itemId)?.name}</strong>. An
                adverse condition opens an incident review without assigning blame.
              </p>
              <Field label="Condition upon return">
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
                Demo usage history. Other staff members' usage details are restricted in this view.
              </p>
              {state.loans
                .filter((l) => l.itemId === item?.id && (manager || l.borrowerId === person.id))
                .map((l) => (
                  <article className="history-card flex flex-col gap-3 rounded-2xl border border-white/90 bg-white/85 p-4 shadow-xs" key={l.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={state.profiles.find((p) => p.id === l.borrowerId)?.name ?? 'Staff'} />
                        <div>
                          <strong className="block text-[13.5px] font-medium text-ink">
                            {state.profiles.find((p) => p.id === l.borrowerId)?.name}
                          </strong>
                          <span className="block text-[11px] text-muted-ink">
                            {state.profiles.find((p) => p.id === l.borrowerId)?.role}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {l.eventCategory && (
                          <span className={`category-pill ${categoryClass(l.eventCategory)}`}>
                            {l.eventCategory}
                          </span>
                        )}
                        <Badge>{l.returned ? 'Returned' : 'In use'}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
                      <div>
                        <span className="block text-[10.5px] font-medium tracking-[0.04em] text-muted-ink uppercase">
                          Type of Event Coverage
                        </span>
                        <span className="mt-0.5 block font-medium text-ink">
                          {l.eventCategory ? (
                            <span className={`category-pill ${categoryClass(l.eventCategory)}`}>
                              {l.eventCategory}
                            </span>
                          ) : (
                            'General Editorial Coverage'
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10.5px] font-medium tracking-[0.04em] text-muted-ink uppercase">
                          Specific Assignment
                        </span>
                        <span className="mt-0.5 block font-medium text-primary">
                          {l.event || 'Routine publication usage'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10.5px] font-medium tracking-[0.04em] text-muted-ink uppercase">
                          Release Timeline
                        </span>
                        <span className="mt-0.5 block text-muted-ink">
                          Released {dateText(l.out)} · Due {dateText(l.due)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10.5px] font-medium tracking-[0.04em] text-muted-ink uppercase">
                          Return Status & Condition
                        </span>
                        <span className="mt-0.5 block">
                          {l.returned ? (
                            <span className="font-medium text-primary">
                              Returned {dateText(l.returned)} ({l.after})
                            </span>
                          ) : (
                            <span className="font-medium text-[#b7791f]">
                              Currently in use · Condition: {l.before}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
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
              ) && <Empty text="No usage history visible for this item." />}
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
            staff member stole or intentionally damaged an item.
          </p>
        </div>
      </div>

      <section className="panel animate-enter">
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
              {incidents.map((i, idx) => {
                const eq = state.items.find((x) => x.id === i.itemId)
                return (
                  <tr
                    key={i.id}
                    className="stagger-item"
                    style={{ '--stagger-i': idx } as React.CSSProperties}
                  >
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
