import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, ArrowUpRight, Clock3, ShieldAlert, Boxes, RefreshCw } from 'lucide-react'
import { dateText, categoryClass } from '../components/format'
import { useDemo } from '../demo/context'
import { available, canInventory, isOverdue, visibleIncidents } from '../demo/model'
import { Badge, Empty, CardSkeleton, KpiSkeletonGrid, Skeleton } from '../components/ui'

export function Dashboard() {
  const { state, person } = useDemo()
  const manager = canInventory(person)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 550)
  }

  const loans = state.loans
    .filter((l) => !l.returned && (manager || l.borrowerId === person.id))
    .sort((a, b) => Date.parse(a.due) - Date.parse(b.due))
  const overdue = loans.filter((l) => isOverdue(l.due))
  const incidents = visibleIncidents(state, person).filter((i) => !i.resolved)
  const events = state.events
    .filter(
      (e) => state.items.some((i) => i.id === e.entityId) && (manager || e.actor === person.id),
    )
    .slice(0, 6)

  const cards = [
    {
      label: 'Total equipment',
      count: state.items.length,
      to: '/inventory',
      icon: Boxes,
      note: 'Individually tracked assets',
    },
    {
      label: 'Available equipment',
      count: state.items.filter((i) => available(state, i.id)).length,
      to: '/inventory?status=available',
      icon: Package,
      note: 'Ready to check out',
    },
    {
      label: manager ? 'Equipment in use' : 'Equipment in my care',
      count: loans.length,
      to: '/inventory?status=loans',
      icon: ArrowUpRight,
      note: manager ? 'Currently in active use' : 'Equipment in your care',
    },
    {
      label: 'Overdue returns',
      count: overdue.length,
      to: '/inventory?status=overdue',
      icon: Clock3,
      note: 'Follow up on return dates',
    },
    {
      label: 'Open incident reviews',
      count: incidents.length,
      to: '/incidents',
      icon: ShieldAlert,
      note: 'Document, inspect, and resolve',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Top Hero Banner with Embedded Glass KPI Cards - FULL WIDTH */}
      <section className="hero-banner-card w-full animate-enter" aria-label="Inventory overview">
        <div className="hero-header-row">
          <div>
            <span className="hero-eyebrow">PUBLICATION INVENTORY</span>
            <h1 className="hero-title">Inventory overview</h1>
            <p className="hero-subtitle">
              Hello, {person.name.split(' ')[0]}. Keep track of equipment, returns, and items needing
              attention.
            </p>
          </div>
          <div className="hero-actions">
            <button
              type="button"
              className="hero-btn-secondary"
              title="Simulate data sync (Skeleton loading preview)"
              aria-label="Refresh inventory status"
              onClick={handleRefresh}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Syncing...' : 'Sync status'}
            </button>
            <Link className="hero-btn-secondary" to="/inventory">
              <Boxes size={15} />
              Equipment catalog
            </Link>
          </div>
        </div>

        {refreshing ? (
          <KpiSkeletonGrid />
        ) : (
          <div className="hero-kpi-grid" role="region" aria-label="Inventory summary">
            {cards.map(({ label, count, to, icon: Icon, note }, idx) => (
              <Link
                className="hero-stat-card group stagger-item"
                key={label}
                to={to}
                style={{ '--stagger-i': idx } as React.CSSProperties}
              >
                <div className="hero-stat-top">
                  <span className="hero-stat-icon">
                    <Icon size={14} />
                  </span>
                  <span className="hero-stat-label">{label}</span>
                  <ArrowUpRight size={13} className="hero-stat-arrow" />
                </div>
                <div className="hero-stat-value-row">
                  <strong className="hero-stat-value">{count}</strong>
                </div>
                <p className="hero-stat-note">{note}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 2-Column Bento Workspace Grid below the Hero */}
      <div className="bento-dashboard-grid">
        {/* Left Main Workspace Column */}
        <div className="bento-main-col">
          {/* Middle Section: Usage & Returns (Crisp White Row Cards inside Frosted Frame) */}
          <section className="panel animate-enter" aria-labelledby="loans-heading">
            <div className="panel-heading">
              <div>
                <h2 id="loans-heading">
                  {manager ? 'Equipment usage & returns' : 'Equipment in my care & returns'}
                </h2>
                <p className="muted">Nearest return dates first</p>
              </div>
              <Link className="panel-link" to="/inventory?status=loans">
                View all <ArrowUpRight size={14} />
              </Link>
            </div>
            {refreshing ? (
              <CardSkeleton count={3} />
            ) : (
              <div className="list-body">
                {loans.slice(0, 6).map((l, idx) => {
                  const eq = state.items.find((i) => i.id === l.itemId)
                  const borrower = state.profiles.find((p) => p.id === l.borrowerId)
                  return (
                    <div
                      className="work-row stagger-item"
                      key={l.id}
                      style={{ '--stagger-i': idx } as React.CSSProperties}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                        <span className="work-icon shrink-0">
                          <Package size={17} />
                        </span>
                        <div className="work-info min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 sm:block">
                            <strong className="truncate">{eq?.name}</strong>
                            <div className="shrink-0 sm:hidden">
                              <Badge>{isOverdue(l.due) ? 'Overdue' : 'In use'}</Badge>
                            </div>
                          </div>
                          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-ink">
                            <span>
                              {borrower?.name} · Due {dateText(l.due)}
                            </span>
                            {l.event && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[#cde0d2] bg-pale px-2 py-0.5 text-[11px] font-medium text-primary">
                                {l.event}
                              </span>
                            )}
                            {!l.event && l.eventCategory && (
                              <span className={`category-pill ${categoryClass(l.eventCategory)}`}>
                                {l.eventCategory}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="hidden shrink-0 sm:inline-flex">
                        <Badge>{isOverdue(l.due) ? 'Overdue' : 'In use'}</Badge>
                      </div>
                      <Link
                        className="action-pill primary-pill flex min-h-[40px] w-full items-center justify-center shrink-0 sm:min-h-0 sm:w-auto"
                        aria-label={`${manager ? 'Record return for' : 'View usage history for'} ${eq?.name}`}
                        to={
                          manager
                            ? `/inventory?action=return&loan=${encodeURIComponent(l.id)}`
                            : `/inventory?action=history&item=${encodeURIComponent(l.itemId)}`
                        }
                      >
                        {manager ? 'Record return' : 'Usage history'}
                      </Link>
                    </div>
                  )
                })}
                {!loans.length && (
                  <Empty text="No equipment currently in use in your view. Browse the equipment catalog to see what is available." />
                )}
              </div>
            )}
          </section>

          {/* Bottom Section: Inventory Activity Strip */}
          <section className="panel animate-enter" aria-labelledby="activity-heading">
            <div className="panel-heading">
              <div>
                <h2 id="activity-heading">Inventory activity</h2>
                <p className="muted">Recent equipment updates and transactions</p>
              </div>
              <Link className="panel-link" to="/inventory">
                Catalog <ArrowUpRight size={14} />
              </Link>
            </div>
            {refreshing ? (
              <div className="activity-cards-grid">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="activity-card flex flex-col gap-3">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : events.length > 0 ? (
              <div className="activity-cards-grid">
                {events.map((e, idx) => (
                  <article
                    className="activity-card stagger-item"
                    key={e.id}
                    style={{ '--stagger-i': idx } as React.CSSProperties}
                  >
                    <div>
                      <div className="activity-card-top">
                        <span>{dateText(e.at)}</span>
                        <span className="activity-card-arrow" aria-hidden="true">
                          <Clock3 size={13} />
                        </span>
                      </div>
                      <strong>{e.text}</strong>
                    </div>
                    <p>{state.profiles.find((p) => p.id === e.actor)?.name}</p>
                  </article>
                ))}
              </div>
            ) : (
              <Empty text="Equipment activity will appear here as records are updated." />
            )}
            <p className="history-note">Local demo records, not tamper-resistant audit logs.</p>
          </section>
        </div>

        {/* Right Priority Rail ("Next Priorities" + Forest Callout Card) */}
        <aside className="bento-side-col animate-enter" aria-label="Priority follow-ups">
          <section className="panel" aria-labelledby="incidents-heading">
            <div className="panel-heading">
              <div>
                <h2 id="incidents-heading">Equipment needing attention</h2>
                <p className="muted">Open reports awaiting a documented outcome</p>
              </div>
              <Link className="panel-link" to="/incidents">
                Review incidents <ArrowUpRight size={14} />
              </Link>
            </div>
            {refreshing ? (
              <CardSkeleton count={2} />
            ) : (
              <div className="list-body">
                {incidents.slice(0, 6).map((i, idx) => {
                  const eq = state.items.find((item) => item.id === i.itemId)
                  return (
                    <article
                      className="priority-card stagger-item"
                      key={i.id}
                      style={{ '--stagger-i': idx } as React.CSSProperties}
                    >
                      <div className="priority-card-head">
                        <span className="work-icon icon-amber">
                          <ShieldAlert size={17} />
                        </span>
                        <div className="priority-card-meta">
                          <strong>{eq?.name}</strong>
                          <p>Reported {dateText(i.at)}</p>
                        </div>
                        <Badge>{i.kind}</Badge>
                      </div>
                      <div className="priority-card-footer">
                        <span className="muted">{eq?.tag}</span>
                        <Link className="action-pill primary-pill" to="/incidents">
                          Inspect review <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    </article>
                  )
                })}
                {!incidents.length && <Empty text="No open incident reviews in your view." />}
              </div>
            )}
          </section>

          <div className="forest-callout-card stagger-item" style={{ '--stagger-i': 2 } as React.CSSProperties}>
            <span className="forest-callout-icon" aria-hidden="true">
              <ShieldAlert size={19} />
            </span>
            <div>
              <strong>Shared equipment, clear responsibility.</strong>
              <p>
                Missing or damaged equipment starts a documented review. An equipment release record
                alone does not establish fault.
              </p>
            </div>
            <div className="pt-1">
              <Link className="hero-btn-secondary w-full justify-center" to="/incidents">
                Open incident reviews <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
