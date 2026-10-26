import { activitySheet } from '../exports/reports'
import { ExportButton } from '../components/ui/ExportButton'
import { useState, useMemo } from 'react'
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
  const [actorFilter, setActorFilter] = useState('all')
  const [actionDetailsFilter, setActionDetailsFilter] = useState('all')
  const [equipmentFilter, setEquipmentFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const handleRefresh = async () => {
    setRefreshing(true)
    try { await refresh?.() } finally { setRefreshing(false) }
  }

  const visibleEvents = scopedEvents(state, person)

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

  // Extract distinct actors present in visible events
  const availableActors = useMemo(() => {
    const set = new Set<string>()
    visibleEvents.forEach((e) => {
      const name = auditActorName(e, state)
      if (name && name.trim()) set.add(name.trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [visibleEvents, state])

  // Extract active inventory equipment for target equipment filter
  const inventoryItems = useMemo(() => {
    return [...state.items].sort((a, b) => a.name.localeCompare(b.name))
  }, [state.items])

  const filteredEvents = useMemo(() => {
    return visibleEvents.filter((e) => {
      const item = state.items.find((i) => i.id === e.entityId)
      const actorName = auditActorName(e, state)
      const actionDetails = formatEventDetails(e, state)

      // 1. Text Search
      const matchesSearch = !search.trim() ||
        `${actionDetails} ${item?.name ?? ''} ${item?.tag ?? ''} ${actorName ?? ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      if (!matchesSearch) return false

      // 2. High-level Category Filter
      if (filter === 'loans' && !isLoanEvent(e, actionDetails)) return false
      if (filter === 'incidents' && !isIncidentEvent(e, actionDetails)) return false
      if (filter === 'equipment' && !isEquipmentEvent(e, actionDetails)) return false

      // 3. Actor Filter
      if (actorFilter !== 'all') {
        if (!actorName || actorName.toLowerCase() !== actorFilter.toLowerCase()) {
          return false
        }
      }

      // 4. Action Details Filter
      if (actionDetailsFilter !== 'all') {
        const raw = (e.action ?? '').toLowerCase()
        const details = actionDetails.toLowerCase()
        switch (actionDetailsFilter) {
          case 'checkout':
            if (!raw.includes('checkout') && !details.includes('release') && !details.includes('checked out')) return false
            break
          case 'return':
            if (!raw.includes('return') && !details.includes('return') && !details.includes('closed loan')) return false
            break
          case 'incident':
            if (!raw.includes('incident') && !details.includes('incident') && !details.includes('flagged')) return false
            break
          case 'resolve':
            if (!raw.includes('resolve') && !details.includes('resolved') && !details.includes('closed review')) return false
            break
          case 'item':
            if (!raw.includes('item') && !raw.includes('catalog') && !details.includes('equipment') && !details.includes('registered')) return false
            break
          case 'archive':
            if (!raw.includes('archive') && !details.includes('archive') && !details.includes('decommissioned')) return false
            break
          case 'restore':
            if (!raw.includes('unarchive') && !details.includes('restored')) return false
            break
          case 'staff':
            if (!raw.includes('people') && !raw.includes('person') && !details.includes('staff')) return false
            break
          case 'access':
            if (!raw.includes('membership') && !raw.includes('security') && !raw.includes('profile') && !details.includes('access') && !details.includes('permission')) return false
            break
        }
      }

      // 5. Target Equipment Filter
      if (equipmentFilter !== 'all') {
        const targetItem = state.items.find((i) => i.id === equipmentFilter)
        const matchesEntity = e.entityId === equipmentFilter
        const matchesTargetItem = targetItem && (
          actionDetails.toLowerCase().includes(targetItem.name.toLowerCase()) ||
          actionDetails.toLowerCase().includes(targetItem.tag.toLowerCase())
        )
        const matchesLoan = state.loans.some(
          (l) => (l.id === e.releaseId || l.id === e.entityId) && l.itemId === equipmentFilter
        )
        if (!matchesEntity && !matchesTargetItem && !matchesLoan) return false
      }

      return true
    })
  }, [visibleEvents, state, search, filter, actorFilter, actionDetailsFilter, equipmentFilter])

  const hasActiveFilters = Boolean(
    search.trim() ||
    filter !== 'all' ||
    actorFilter !== 'all' ||
    actionDetailsFilter !== 'all' ||
    equipmentFilter !== 'all'
  )

  const resetFilters = () => {
    setSearch('')
    setFilter('all')
    setActorFilter('all')
    setActionDetailsFilter('all')
    setEquipmentFilter('all')
    setPage(1)
  }

  const paginatedEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize)

  return (
    <>
      <Heading
        eyebrow="TRANSPARENCY & TRACEABILITY"
        title="Activity logs"
        description="Chronological record of equipment registration, checkout, returns, and incident reviews."
      >
        <ExportButton filename="activity-logs" sheets={() => [activitySheet(state, filteredEvents)]} />
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
        <div className="toolbar flex flex-col gap-3">
          {/* Top row: Search input + refresh button */}
          <div className="flex w-full flex-wrap items-center justify-between gap-2.5">
            <label className="search flex-1 min-w-[240px]">
              <Search size={16} />
              <input
                aria-label="Search logs"
                placeholder="Search by action, item, tag, or actor…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </label>
            <div className="toolbar-controls flex items-center gap-2">
              <button
                type="button"
                className="icon-button"
                title="Refresh log records"
                aria-label="Refresh records"
                onClick={handleRefresh}
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin text-primary' : ''} />
              </button>
            </div>
          </div>

          {/* Dedicated 3-Column Filter Deck: Actor, Action Details, Target Equipment */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 w-full pt-2 border-t border-line-subtle/50">
            {/* 1. Actor Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-ink uppercase tracking-wider">Actor</label>
              <Select
                aria-label="Filter by actor"
                value={actorFilter}
                onChange={(e) => {
                  setActorFilter(e.target.value)
                  setPage(1)
                }}
                searchable={availableActors.length > 5}
                className="w-full"
                buttonClassName="h-9 py-1 px-3 text-xs"
              >
                <option value="all">All actors</option>
                {availableActors.map((actor) => (
                  <option key={actor} value={actor}>
                    {actor}
                  </option>
                ))}
              </Select>
            </div>

            {/* 2. Action Details Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-ink uppercase tracking-wider">Action Details</label>
              <Select
                aria-label="Filter by action details"
                value={actionDetailsFilter}
                onChange={(e) => {
                  setActionDetailsFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full"
                buttonClassName="h-9 py-1 px-3 text-xs"
              >
                <option value="all">All action details</option>
                <option value="checkout">Equipment releases</option>
                <option value="return">Equipment returns</option>
                <option value="incident">Incident reports</option>
                <option value="resolve">Incident resolutions</option>
                <option value="item">Equipment catalog updates</option>
                <option value="archive">Equipment decommissioned</option>
                <option value="restore">Equipment restored</option>
                <option value="staff">Staff directory changes</option>
                <option value="access">Access & security changes</option>
              </Select>
            </div>

            {/* 3. Target Equipment Filter based on current inventory */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-ink uppercase tracking-wider">Target Equipment</label>
              <Select
                aria-label="Filter by target equipment"
                value={equipmentFilter}
                onChange={(e) => {
                  setEquipmentFilter(e.target.value)
                  setPage(1)
                }}
                searchable={inventoryItems.length > 5}
                className="w-full"
                buttonClassName="h-9 py-1 px-3 text-xs"
              >
                <option value="all">All target equipment</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.tag})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Results Count & Reset Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle/50 pt-2 text-xs text-muted-ink">
            <span>
              {filteredEvents.length} matching {filteredEvents.length === 1 ? 'log record' : 'log records'}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="cursor-pointer font-medium text-primary hover:underline hover:text-forest-deep transition-colors"
              >
                Reset all filters
              </button>
            )}
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
