import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Package, ShieldAlert, Clock3, RefreshCw } from 'lucide-react'
import { dateText } from '../components/format'
import { useDemo } from '../demo/context'
import { canInventory } from '../demo/model'
import { Heading, Avatar } from '../components/layout'
import { Badge, Empty, TableSkeleton, Pagination } from '../components/ui'

export function Logs() {
  const { state, person } = useDemo()
  const manager = canInventory(person)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 500)
  }

  // Scoped events based on persona transparency rules
  const visibleEvents = state.events.filter((e) => {
    if (manager) return true
    // Staff can see events they performed or events involving items they borrowed
    const userLoans = state.loans.filter((l) => l.borrowerId === person.id)
    return e.actor === person.id || userLoans.some((l) => l.itemId === e.entityId)
  })

  const filteredEvents = visibleEvents.filter((e) => {
    const item = state.items.find((i) => i.id === e.entityId)
    const actor = state.profiles.find((p) => p.id === e.actor)
    const matchesSearch = `${e.text} ${item?.name ?? ''} ${item?.tag ?? ''} ${actor?.name ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase())

    if (!matchesSearch) return false

    if (filter === 'loans') {
      return e.text.toLowerCase().includes('checked out') || e.text.toLowerCase().includes('closed loan')
    }
    if (filter === 'incidents') {
      return e.text.toLowerCase().includes('incident') || e.text.toLowerCase().includes('flagged')
    }
    if (filter === 'equipment') {
      return e.text.toLowerCase().includes('saved equipment')
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
          <Package size={16} /> Equipment catalog
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
                (e) =>
                  e.text.toLowerCase().includes('checked out') ||
                  e.text.toLowerCase().includes('closed loan'),
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
                (e) =>
                  e.text.toLowerCase().includes('incident') ||
                  e.text.toLowerCase().includes('flagged'),
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
            {visibleEvents.filter((e) => e.text.toLowerCase().includes('saved equipment')).length}
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
            <select
              aria-label="Filter logs by type"
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All log types</option>
              <option value="loans">Releases & returns</option>
              <option value="incidents">Incident events</option>
              <option value="equipment">Equipment updates</option>
            </select>
          </div>
        </div>

        {refreshing ? (
          <TableSkeleton rows={6} cols={5} />
        ) : (
          <div className="table-wrap">
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
                  const actor = state.profiles.find((p) => p.id === e.actor)
                  const isIncident =
                    e.text.toLowerCase().includes('incident') ||
                    e.text.toLowerCase().includes('flagged')
                  const isLoan =
                    e.text.toLowerCase().includes('checked out') ||
                    e.text.toLowerCase().includes('closed loan')

                  return (
                    <tr
                      key={e.id}
                      className="stagger-item"
                      style={{ '--stagger-i': idx } as React.CSSProperties}
                    >
                    <td>
                      <div className="flex items-center gap-2">
                        <Clock3 size={15} className="text-muted-ink shrink-0" />
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
                      <p className="font-medium text-ink">{e.text}</p>
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
                        {isIncident ? 'Incident' : isLoan ? 'Release / Return' : 'Catalog update'}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

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
          <span>Local demo records, not tamper-resistant audit logs.</span>
        </div>
      </section>
    </>
  )
}
