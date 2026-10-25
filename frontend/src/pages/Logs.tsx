import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Package, ShieldAlert, Clock3, RefreshCw } from 'lucide-react'
import { dateText } from '../components/format'
import { useInventory } from '../backend/context'
import { visibleEvents as scopedEvents, formatEventDetails, auditActorName } from '../backend/model'
import { Heading } from '../components/layout/Heading'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Empty } from '../components/ui/Empty'
import { Pagination } from '../components/ui/Pagination'
import { Select } from '../components/ui/Select'

export function Logs() {
  const { state, person, refresh } = useInventory()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const handleRefresh = async () => {
    setRefreshing(true)
    try { await refresh?.() } finally { setRefreshing(false) }
  }

  const visibleEvents = scopedEvents(state,person)

  const isLoanEvent = (e: (typeof visibleEvents)[number], details: string) => {
    const raw = (e.action ?? '').toLowerCase()
    const text = details.toLowerCase()
    return (
      ['checkout', 'return', 'correct', 'releases.insert', 'releases.update', 'releases.delete'].includes(raw) ||
      text.includes('release') ||
      text.includes('loan') ||
      text.includes('checked out') ||
      text.includes('closed loan') ||
      text.includes('return')
    )
  }

  const isIncidentEvent = (e: (typeof visibleEvents)[number], details: string) => {
    const raw = (e.action ?? '').toLowerCase()
    const text = details.toLowerCase()
    return (
      raw.startsWith('incidents.') ||
      ['incident', 'resolve'].includes(raw) ||
      text.includes('incident') ||
      text.includes('flagged')
    )
  }

  const isEquipmentEvent = (e: (typeof visibleEvents)[number], details: string) => {
    const raw = (e.action ?? '').toLowerCase()
    const text = details.toLowerCase()
    return (
      raw.startsWith('items.') ||
      ['item', 'archive'].includes(raw) ||
      text.includes('equipment') ||
      text.includes('registered') ||
      text.includes('saved equipment')
    )
  }

  const filteredEvents = visibleEvents.filter((e) => {
    const item = state.items.find((i) => i.id === e.entityId)
    const actor = {name:auditActorName(e,state),role:e.actorRole}
    const actionDetails = formatEventDetails(e, state)
    const matchesSearch = `${actionDetails} ${item?.name ?? ''} ${item?.tag ?? ''} ${actor?.name ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (filter === 'loans') {
      return isLoanEvent(e, actionDetails)
    }
    if (filter === 'incidents') {
      return isIncidentEvent(e, actionDetails)
    }
    if (filter === 'equipment') {
      return isEquipmentEvent(e, actionDetails)
    }
    return true
  })

  const paginatedEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize)

  return (
    <>
      <Heading
        eyebrow="TRANSPARENCY & TRACEABILITY"
        title="Activity logs"
        description="Chronological record of equipment registration, checkout, returns, and incident reviews."
      >
        <Link to="/inventory" className="secondary">
          <Package size={16} /> Equipment inventory
        </Link>
        <Link to="/incidents" className="secondary">
          <ShieldAlert size={16} /> Incident reviews
        </Link>
      </Heading>

      {/* Mini Summary Metrics */}
      <section className="mini-metrics" aria-label="Logs summary">
        <button
          type="button"
          className={`mini-metric stagger-item ${filter === 'all' ? 'active' : ''}`}
          style={{ '--stagger-i': 0 } as React.CSSProperties}
          onClick={() => { setFilter('all'); setPage(1); }}
        >
          <span>Total records</span>
          <strong>{visibleEvents.length}</strong>
        </button>
        <button
          type="button"
          className={`mini-metric stagger-item ${filter === 'loans' ? 'active' : ''}`}
          style={{ '--stagger-i': 1 } as React.CSSProperties}
          onClick={() => { setFilter('loans'); setPage(1); }}
        >
          <span>Releases & returns</span>
          <strong>
            {
              visibleEvents.filter(
                (e) => isLoanEvent(e, formatEventDetails(e, state))
              ).length
            }
          </strong>
        </button>
        <button
          type="button"
          className={`mini-metric stagger-item ${filter === 'incidents' ? 'active' : ''}`}
          style={{ '--stagger-i': 2 } as React.CSSProperties}
          onClick={() => { setFilter('incidents'); setPage(1); }}
        >
          <span>Incident events</span>
          <strong>
            {
              visibleEvents.filter(
                (e) => isIncidentEvent(e, formatEventDetails(e, state))
              ).length
            }
          </strong>
        </button>
        <button
          type="button"
          className={`mini-metric stagger-item ${filter === 'equipment' ? 'active' : ''}`}
          style={{ '--stagger-i': 3 } as React.CSSProperties}
          onClick={() => { setFilter('equipment'); setPage(1); }}
        >
          <span>Equipment updates</span>
          <strong>
            {visibleEvents.filter((e) => isEquipmentEvent(e, formatEventDetails(e, state))).length}
          </strong>
        </button>
      </section>

      {/* Frosted Panel with Logs Table */}
      <section className="panel animate-enter" aria-label="Activity log records">
        <div className="toolbar">
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Search logs"
              placeholder="Search by action, item, tag, or actor…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </label>
          <div className="toolbar-controls">
            <button
              type="button"
              className="icon-button"
              title="Refresh log records"
              aria-label="Refresh records"
              onClick={handleRefresh}
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-primary' : ''} />
            </button>
            <Select
              aria-label="Filter logs by type"
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(1); }}
              className="w-auto min-w-[170px]"
              buttonClassName="h-9 py-1 px-3 text-xs"
            >
              <option value="all">All log types</option>
              <option value="loans">Releases & returns</option>
              <option value="incidents">Incident events</option>
              <option value="equipment">Equipment updates</option>
            </Select>
          </div>
        </div>

        <>
          {/* Mobile Log Cards List */}
            <div className="mobile-logs-cards flex flex-col gap-3 md:hidden">
              {paginatedEvents.map((e, idx) => {
                const item = state.items.find((i) => i.id === e.entityId)
                const actor = {name:auditActorName(e,state),role:e.actorRole}
                const actionDetails = formatEventDetails(e, state)
                const isIncident = isIncidentEvent(e, actionDetails)
                const isLoan = isLoanEvent(e, actionDetails)
                const isEquipment = isEquipmentEvent(e, actionDetails)

                return (
                  <article
                    key={`m-log-${e.id}`}
                    className="log-mobile-card stagger-item flex flex-col gap-2.5 rounded-[20px] border border-white/90 bg-white/85 p-3.5 shadow-[0_4px_16px_rgba(21,63,50,0.05)] backdrop-blur-md"
                    style={{ '--stagger-i': idx } as React.CSSProperties}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-ink">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock3 size={13} /> {dateText(e.at)}
                      </span>
                      <Badge>
                        {isIncident ? 'Incident' : isLoan ? 'Release / Return' : isEquipment ? 'Inventory update' : e.action?.startsWith('people.') ? 'Staff directory' : 'Member access'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2.5 border-t border-line-subtle pt-2">
                      <Avatar name={actor?.name ?? 'System'} />
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-xs font-medium text-ink">{actor?.name ?? 'System'}</strong>
                        <span className="block text-[11px] text-muted-ink">{actor?.role ?? 'Role'}</span>
                      </div>
                    </div>

                    <p className="rounded-xl border border-line-subtle bg-surface/70 p-2.5 text-xs font-medium text-ink leading-relaxed">
                      {actionDetails}
                    </p>

                    {item && (
                      <div className="flex items-center gap-2 text-xs text-muted-ink">
                        <Package size={14} className="text-primary" />
                        <span className="truncate">
                          <strong>{item.name}</strong> · <span className="asset-code">{item.tag}</span>
                        </span>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>

            {/* Desktop High-Density Table */}
            <div className="table-wrap hidden md:block">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action details</th>
                    <th>Target equipment</th>
                    <th>Outcome / Type</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEvents.map((e, idx) => {
                    const item = state.items.find((i) => i.id === e.entityId)
                    const actor = {name:auditActorName(e,state),role:e.actorRole}
                    const actionDetails = formatEventDetails(e, state)
                    const isIncident = isIncidentEvent(e, actionDetails)
                    const isLoan = isLoanEvent(e, actionDetails)
                    const isEquipment = isEquipmentEvent(e, actionDetails)

                    return (
                      <tr
                        key={e.id}
                        className="stagger-item"
                        style={{ '--stagger-i': idx } as React.CSSProperties}
                      >
                        <td>
                          <div className="flex items-center gap-2">
                            <Clock3 size={15} className="shrink-0 text-muted-ink" />
                            <div>
                              <strong>{dateText(e.at)}</strong>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={actor?.name ?? 'System'} />
                            <div>
                              <strong>{actor?.name ?? 'System'}</strong>
                              <small>{actor?.role ?? 'Role'}</small>
                            </div>
                          </div>
                        </td>
                        <td className="long-cell">
                          <p className="font-medium text-ink leading-relaxed">{actionDetails}</p>
                        </td>
                        <td>
                          {item ? (
                            <div className="cell-title">
                              <span className="equipment-icon" aria-hidden="true">
                                <Package size={16} />
                              </span>
                              <div>
                                <strong>{item.name}</strong>
                                <small>
                                  <span className="asset-code">{item.tag}</span> · {item.category}
                                </small>
                              </div>
                            </div>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                        <td>
                          <Badge>
                            {isIncident ? 'Incident' : isLoan ? 'Release / Return' : isEquipment ? 'Inventory update' : e.action?.startsWith('people.') ? 'Staff directory' : 'Member access'}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>

      {!filteredEvents.length && <Empty text="No log entries match your filter criteria." />}

        <Pagination
          page={page}
          total={filteredEvents.length}
          pageSize={pageSize}
          onPageChange={setPage}
          label="activity log records"
        />
        <div className="table-footer">
          <span>{filteredEvents.length} total activity log records</span>
          <span>Audit trail recorded with user accountability.</span>
        </div>
      </section>
    </>
  )
}
