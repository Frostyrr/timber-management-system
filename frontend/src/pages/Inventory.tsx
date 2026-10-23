import { releaseDetailsSchema, USE_TYPES, type UseType } from '../demo/release'
import { value, dateText, tomorrow, categoryClass } from '../components/format'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus, Search, Package, ShieldAlert, ArrowUpRight, Clock3, RefreshCw, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { useDemo } from '../demo/context'
import {
  borrowerName,
  canInventory,
  available,
  isOverdue,
  uid,
  visibleIncidents,
  type Item,
} from '../demo/model'
import { Heading, Avatar } from '../components/layout'
import { Badge, Empty, Modal, Field, TableSkeleton, Pagination, Select } from '../components/ui'

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

function parseIsoDate(iso: string) {
  const [dPart = '2026-10-25', tPart = '17:00'] = iso.split('T')
  const [yStr = '2026', mStr = '10', dStr = '25'] = dPart.split('-')
  const [hStr = '17', minStr = '00'] = tPart.split(':')
  return {
    year: Number(yStr) || 2026,
    month: Math.max(0, (Number(mStr) || 10) - 1),
    day: Number(dStr) || 25,
    hour: Number(hStr) || 17,
    minute: Number(minStr) || 0,
  }
}

function CustomDateTimePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (iso: string) => void
}) {
  const parsed = parseIsoDate(value)
  const [navMonth, setNavMonth] = useState<{ year: number; month: number } | null>(null)
  const viewMonth = navMonth ?? { year: parsed.year, month: parsed.month }
  const [today] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const pad = (n: number) => String(n).padStart(2, '0')

  const emit = (year: number, month: number, day: number, hour24: number, minute: number) => {
    const iso = `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour24)}:${pad(minute)}`
    onChange(iso)
  }

  const prevMonth = () => {
    setNavMonth({
      year: viewMonth.month === 0 ? viewMonth.year - 1 : viewMonth.year,
      month: viewMonth.month === 0 ? 11 : viewMonth.month - 1,
    })
  }

  const nextMonth = () => {
    setNavMonth({
      year: viewMonth.month === 11 ? viewMonth.year + 1 : viewMonth.year,
      month: viewMonth.month === 11 ? 0 : viewMonth.month + 1,
    })
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewMonth.year, viewMonth.month, 1).getDay()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i)

  const period: 'AM' | 'PM' = parsed.hour >= 12 ? 'PM' : 'AM'
  const hour12 = parsed.hour % 12 === 0 ? 12 : parsed.hour % 12

  const setHour12 = (h: number) => {
    const clamped = Math.max(1, Math.min(12, h))
    const h24 = period === 'AM' ? (clamped === 12 ? 0 : clamped) : (clamped === 12 ? 12 : clamped + 12)
    emit(parsed.year, parsed.month, parsed.day, h24, parsed.minute)
  }

  const setMinute = (m: number) => {
    const clamped = Math.max(0, Math.min(59, m))
    emit(parsed.year, parsed.month, parsed.day, parsed.hour, clamped)
  }

  const setPeriod = (p: 'AM' | 'PM') => {
    const h24 = p === 'AM' ? (hour12 === 12 ? 0 : hour12) : (hour12 === 12 ? 12 : hour12 + 12)
    emit(parsed.year, parsed.month, parsed.day, h24, parsed.minute)
  }

  const quickTimes = [
    { label: '9:00 AM', h: 9, m: 0 },
    { label: '12:00 PM', h: 12, m: 0 },
    { label: '5:00 PM', h: 17, m: 0 },
    { label: '8:00 PM', h: 20, m: 0 },
  ]

  return (
    <div className="custom-datetime-picker mt-2 flex flex-col gap-3 rounded-2xl border border-line-subtle bg-white/95 p-3.5 shadow-[0_8px_24px_rgba(21,63,50,0.06)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between border-b border-line-subtle pb-2.5">
        <div className="flex items-center gap-2 text-xs font-medium text-ink">
          <CalendarIcon size={14} className="text-primary" />
          <span>Interactive Calendar & Time</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-ink">
          <button
            type="button"
            className="hover:text-primary hover:underline font-medium"
            onClick={() => {
              const now = new Date()
              setNavMonth({ year: now.getFullYear(), month: now.getMonth() })
              emit(now.getFullYear(), now.getMonth(), now.getDate(), parsed.hour, parsed.minute)
            }}
          >
            Today
          </button>
          <span>·</span>
          <button
            type="button"
            className="hover:text-primary hover:underline font-medium"
            onClick={() => {
              const tmrw = new Date(Date.now() + 86400000)
              setNavMonth({ year: tmrw.getFullYear(), month: tmrw.getMonth() })
              emit(tmrw.getFullYear(), tmrw.getMonth(), tmrw.getDate(), parsed.hour, parsed.minute)
            }}
          >
            Tomorrow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.25fr_1fr]">
        {/* Left: Calendar Month */}
        <div className="calendar-pane flex flex-col gap-2 sm:border-r sm:border-line-subtle sm:pr-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-semibold text-ink">
              {monthNames[viewMonth.month]} {viewMonth.year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-line-subtle bg-surface text-muted-ink transition-colors hover:border-line hover:bg-canvas hover:text-ink"
                aria-label="Previous month"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="flex h-6 w-6 items-center justify-center rounded-lg border border-line-subtle bg-surface text-muted-ink transition-colors hover:border-line hover:bg-canvas hover:text-ink"
                aria-label="Next month"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <span key={d} className="text-[10px] font-medium text-muted-ink">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {blanks.map((b) => (
              <div key={`blank-${b}`} className="h-7 w-7 sm:h-7.5 sm:w-7.5" />
            ))}
            {days.map((day) => {
              const dateObj = new Date(viewMonth.year, viewMonth.month, day)
              dateObj.setHours(0, 0, 0, 0)
              const isPast = dateObj.getTime() < today.getTime()
              const isSelected =
                parsed.year === viewMonth.year &&
                parsed.month === viewMonth.month &&
                parsed.day === day
              const isTodayDate =
                today.getFullYear() === viewMonth.year &&
                today.getMonth() === viewMonth.month &&
                today.getDate() === day

              return (
                <button
                  type="button"
                  key={day}
                  disabled={isPast}
                  onClick={() => emit(viewMonth.year, viewMonth.month, day, parsed.hour, parsed.minute)}
                  className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-medium transition-all duration-150 sm:h-7.5 sm:w-7.5 ${
                    isSelected
                      ? 'bg-primary text-white shadow-[0_2px_8px_rgba(21,63,50,0.35)] scale-105'
                      : isPast
                        ? 'text-slate-300 cursor-not-allowed'
                        : isTodayDate
                          ? 'border border-primary/50 bg-pale text-primary font-semibold'
                          : 'text-ink hover:bg-black/[0.04] hover:text-primary'
                  }`}
                  aria-label={`${monthNames[viewMonth.month]} ${day}, ${viewMonth.year}`}
                  aria-pressed={isSelected}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Time Controls */}
        <div className="time-pane flex flex-col justify-between gap-3">
          <div>
            <span className="mb-1.5 block text-[11px] font-medium tracking-[0.03em] text-muted-ink uppercase">
              Deadline Time
            </span>

            {/* Time Controls: Hour, Minute, AM/PM */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center rounded-xl border border-line-subtle bg-surface px-2 py-1 focus-within:border-primary focus-within:bg-canvas">
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={hour12}
                  onChange={(e) => setHour12(Number(e.target.value))}
                  aria-label="Hour"
                  className="w-7 border-0 bg-transparent text-center font-mono text-xs font-semibold text-ink focus:outline-none"
                />
                <span className="font-mono text-xs text-muted-ink">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={pad(parsed.minute)}
                  onChange={(e) => setMinute(Number(e.target.value))}
                  aria-label="Minute"
                  className="w-7 border-0 bg-transparent text-center font-mono text-xs font-semibold text-ink focus:outline-none"
                />
              </div>

              {/* AM / PM Segmented Control */}
              <div className="flex rounded-xl border border-line-subtle bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => setPeriod('AM')}
                  className={`rounded-lg px-2 py-1 text-xs font-medium transition-all duration-150 ${
                    period === 'AM'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-muted-ink hover:text-ink'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('PM')}
                  className={`rounded-lg px-2 py-1 text-xs font-medium transition-all duration-150 ${
                    period === 'PM'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-muted-ink hover:text-ink'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Quick Time Presets */}
            <div className="mt-3">
              <span className="mb-1.5 block text-[10.5px] text-muted-ink">Preset deadlines</span>
              <div className="grid grid-cols-2 gap-1.5">
                {quickTimes.map((qt) => {
                  const isActive =
                    ((period === 'AM' ? (hour12 === 12 ? 0 : hour12) : (hour12 === 12 ? 12 : hour12 + 12)) === qt.h) &&
                    parsed.minute === qt.m
                  return (
                    <button
                      type="button"
                      key={qt.label}
                      onClick={() => emit(parsed.year, parsed.month, parsed.day, qt.h, qt.m)}
                      className={`rounded-lg border px-2 py-1 text-center text-[11px] font-medium transition-all duration-150 ${
                        isActive
                          ? 'border-primary bg-pale text-primary font-semibold'
                          : 'border-line-subtle bg-canvas text-ink hover:border-line hover:bg-surface'
                      }`}
                    >
                      {qt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-pale/50 px-2.5 py-1.5 text-center text-[11px] font-medium text-primary">
            Target: {pad(hour12)}:{pad(parsed.minute)} {period}
          </div>
        </div>
      </div>
    </div>
  )
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

  const handleCustomChange = (newIso: string) => {
    setIsoValue(newIso)
    setSummary(getScheduleSummary(newIso))
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
          onClick={() => setPreset((p) => (p === 'custom' ? 'tomorrow' : 'custom'))}
        >
          {preset === 'custom' ? 'Close custom picker' : 'Customize date & time'}
        </button>
      </div>

      {preset === 'custom' && (
        <CustomDateTimePicker
          value={isoValue}
          onChange={handleCustomChange}
        />
      )}

      {/* Hidden input ensures FormData always receives the exact selected timestamp */}
      <input type="hidden" name="due" value={isoValue} required />
    </div>
  )
}

export function Inventory() {
  const { state, person, act, refresh } = useDemo()
  const query = new URLSearchParams(useLocation().search)
  const [useType, setUseType] = useState<UseType>('publication_use')
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
  const handleRefresh = async () => {
    setRefreshing(true)
    try { await refresh?.() } finally { setRefreshing(false) }
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
          <span>Total inventory</span>
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
              title="Refresh equipment inventory"
              aria-label="Refresh records"
              onClick={handleRefresh}
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-primary' : ''} />
            </button>
            <Select
              aria-label="Equipment status"
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(1); }}
              className="w-auto min-w-[160px]"
              buttonClassName="h-9 py-1 px-3 text-xs"
            >
              <option value="all">All equipment</option>
              <option value="available">Available</option>
              <option value="loans">Equipment in use</option>
              <option value="overdue">Overdue returns</option>
            </Select>
          </div>
        </div>

        {refreshing ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
          <>
            {/* Mobile Equipment Cards List (Touch-Friendly Card View for Phones & Small Tablets) */}
            <div className="mobile-equipment-cards flex flex-col gap-3 md:hidden">
              {paginatedItems.map((i, idx) => {
                const active = state.loans.find((l) => l.itemId === i.id && !l.returned)
                const canSeeBorrower = active && (manager || active.borrowerId === person.id)
                const borrower = canSeeBorrower
                  ? state.profiles.find((p) => p.id === active.borrowerId)
                  : undefined
                const isItemAvailable = available(state, i.id)

                return (
                  <article
                    key={`m-${i.id}`}
                    className="equipment-mobile-card stagger-item flex flex-col gap-3 rounded-[20px] border border-white/90 bg-white/85 p-3.5 shadow-[0_4px_16px_rgba(21,63,50,0.05)] backdrop-blur-md"
                    style={{ '--stagger-i': idx } as React.CSSProperties}
                  >
                    {/* Card Top: Icon, Title, Asset code, Category & Condition */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="equipment-icon shrink-0" aria-hidden="true">
                          <Package size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-[14px] font-medium text-ink">{i.name}</strong>
                          <small className="block text-[11.5px] text-muted-ink">
                            <span className="asset-code">{i.tag}</span> · {i.category}
                          </small>
                        </div>
                      </div>
                      <Badge>{i.condition}</Badge>
                    </div>

                    {/* Location & Status Info Box */}
                    <div className="flex flex-col gap-1.5 rounded-xl border border-line-subtle bg-surface/70 p-2.5 text-xs">
                      <div className="flex items-center justify-between text-muted-ink">
                        <span>Storage Location</span>
                        <span className="font-medium text-ink">{i.location}</span>
                      </div>

                      {active ? (
                        <div className="mt-1 border-t border-line-subtle pt-1.5">
                          <div className="mb-1 flex items-center justify-between gap-1.5">
                            <Badge>{isOverdue(active.due) ? 'Overdue' : 'In use'}</Badge>
                            {active.event && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-[#cde0d2] bg-pale px-2 py-0.5 text-[10.5px] font-medium text-primary">
                                {active.event}
                              </span>
                            )}
                            {!active.event && active.eventCategory && (
                              <span className={`category-pill ${categoryClass(active.eventCategory)}`}>
                                {active.eventCategory}
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-muted-ink">
                            {canSeeBorrower ? (
                              <>
                                In care of <strong className="font-medium text-ink">{borrower?.name}</strong> · Due {dateText(active.due)}
                              </>
                            ) : (
                              <>Currently in active use · Due {dateText(active.due)}</>
                            )}
                          </p>
                        </div>
                      ) : isItemAvailable ? (
                        <div className="mt-1 flex items-center gap-1.5 border-t border-line-subtle pt-1.5 text-[11.5px] font-medium text-primary">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Available for release
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center gap-1.5 border-t border-line-subtle pt-1.5 text-[11.5px] font-medium text-warning-text">
                          <ShieldAlert size={14} /> Under review / maintenance
                        </div>
                      )}
                    </div>

                    {/* Action Buttons with 44px touch targets */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-line-subtle pt-1">
                      {manager && isItemAvailable && (
                        <button
                          type="button"
                          className="primary-pill flex min-h-[42px] flex-1 cursor-pointer items-center justify-center gap-1.5 text-xs font-medium"
                          onClick={() => setModal({ type: 'checkout', id: i.id })}
                        >
                          <ArrowUpRight size={15} /> Record equipment release
                        </button>
                      )}

                      {manager && active && (
                        <button
                          type="button"
                          className="primary-pill flex min-h-[42px] flex-1 cursor-pointer items-center justify-center gap-1.5 text-xs font-medium"
                          onClick={() => setModal({ type: 'return', id: active.id })}
                        >
                          Record return
                        </button>
                      )}

                      <button
                        type="button"
                        className="action-pill flex min-h-[42px] flex-1 cursor-pointer items-center justify-center text-xs font-medium"
                        onClick={() => setModal({ type: 'history', id: i.id })}
                      >
                        Usage history
                      </button>

                      {manager && (
                        <button
                          type="button"
                          className="action-pill flex min-h-[42px] cursor-pointer items-center justify-center px-3 text-xs font-medium"
                          onClick={() => setModal({ type: 'item', id: i.id })}
                          aria-label={`Edit ${i.name}`}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>

            {/* Desktop High-Density Table */}
            <div className="table-wrap hidden md:block">
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
      </>
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
          onSubmit={async (f) => {
            if (modal.type === 'item')
              await act({
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
              await act({
                type: 'checkout',
                itemId: item?.id ?? value(f, 'item'),
                ...releaseDetailsSchema.parse({ useType, purpose: value(f,'event'), borrowerId: value(f,'borrower'), external: { name:value(f,'externalName'), organization:value(f,'organization'),contactMethod:value(f,'contactMethod'),contact:value(f,'contact') } }),
                due: value(f, 'due'),
                condition: value(f, 'condition'),
                event: value(f, 'event'),
                eventCategory: value(f, 'eventCategory'),
              })
            if (modal.type === 'return')
              await act({
                type: 'return',
                loanId: loan!.id,
                condition: value(f, 'condition') as Item['condition'],
              })
          }}
        >
          {modal.type === 'item' && (
            <>
              <Field label="Equipment name">
                <input name="name" required defaultValue={item?.name} placeholder="e.g. Sony Alpha a6400 Mirrorless Camera, DJI Ronin Gimbal…" />
              </Field>
              <div className="form-grid">
                <Field label="Unique asset tag">
                  <input name="tag" required defaultValue={item?.tag} placeholder="e.g. TP-CAM-001, TP-AUD-004…" />
                </Field>
                <Field label="Category">
                  <input name="category" required defaultValue={item?.category ?? 'Camera'} placeholder="e.g. Camera, Audio, Lighting, Computer, Accessory…" />
                </Field>
              </div>
              <Field label="Storage location">
                <input
                  name="location"
                  required
                  defaultValue={item?.location ?? 'Equipment cabinet'}
                  placeholder="e.g. Cabinet B Shelf 2, Studio Desk, Layout Room Locker…"
                />
              </Field>
              {!item && (
                <Field label="Initial condition">
                  <Select name="condition" defaultValue="Good">
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                  </Select>
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
                  <Select name="item" required defaultValue={availableItems[0]?.id}>
                    {availableItems.map((ai) => (
                      <option key={ai.id} value={ai.id}>
                        {ai.name} ({ai.tag}) · {ai.category}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Release type"><select value={useType} onChange={e=>setUseType(e.target.value as UseType)}>{Object.entries(USE_TYPES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field>
              {useType === 'external_borrowing' ? <>
                <Field label="Borrower name"><input name="externalName" required maxLength={120}/></Field>
                <Field label="Organization (optional)"><input name="organization" maxLength={160}/></Field>
                <Field label="Contact method"><select name="contactMethod"><option value="email">Email</option><option value="phone">Phone</option></select></Field>
                <Field label="Contact details"><input name="contact" required maxLength={160}/></Field>
              </> : <Field label="Responsible member">
                <Select name="borrower" defaultValue={state.profiles.find(p=>!p.status || p.status==='active')?.id}>
                  {state.profiles.filter(p=>!p.status || p.status==='active').map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              }<div className="form-grid">
                <Field label="Type of event coverage (optional)">
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
                <Field label="Purpose / event name">
                  <input
                    name="event" required maxLength={200}
                    placeholder="e.g. UAAP Men's Basketball Finals, Student Council Forum…"
                    autoComplete="off"
                  />
                </Field>
              </div>
              <Field label="Return Deadline & Duration Window">
                <SchedulePicker defaultValue={tomorrow()} />
              </Field>
              <Field label="Condition before release">
                <Select name="condition" defaultValue={item?.condition === 'Fair' ? 'Fair' : 'Good'}>
                  <option value="Good">Good — Fully functional & inspected</option>
                  <option value="Good · 100% Battery & Clean Optics">Good · 100% Battery & Clean Optics</option>
                  <option value="Good · SD Card Formatted & Media Cleared">Good · SD Card Formatted & Media Cleared</option>
                  <option value="Fair">Fair — Minor cosmetic wear, fully operational</option>
                  <option value="Fair · Minor exterior scuffs, verified functional">Fair · Minor exterior scuffs, verified functional</option>
                </Select>
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
                <Select name="condition" defaultValue="Good">
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Missing">Missing</option>
                </Select>
              </Field>
            </>
          )}
          {modal.type === 'history' && (
            <>
              <p className="hint">
                Usage history. Other staff members' usage details are restricted in this view.
              </p>
              {state.loans
                .filter((l) => l.itemId === item?.id && (manager || l.borrowerId === person.id))
                .map((l) => (
                  <article className="history-card flex flex-col gap-3 rounded-2xl border border-white/90 bg-white/85 p-4 shadow-xs" key={l.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={borrowerName(state,l)} />
                        <div>
                          <strong className="block text-[13.5px] font-medium text-ink">
                            {borrowerName(state,l)}
                          </strong>
                          <span className="block text-[11px] text-muted-ink">
                            {state.profiles.find((p) => p.id === l.borrowerId)?.role}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge>{l.useType ? USE_TYPES[l.useType] : 'Legacy / unspecified'}</Badge>
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
          Equipment inventory <ArrowUpRight size={15} />
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
        {/* Mobile Incident Cards List */}
        <div className="mobile-incidents-cards flex flex-col gap-3 md:hidden">
          {incidents.map((i, idx) => {
            const eq = state.items.find((x) => x.id === i.itemId)
            return (
              <article
                key={`m-inc-${i.id}`}
                className="incident-mobile-card stagger-item flex flex-col gap-2.5 rounded-[20px] border border-white/90 bg-white/85 p-3.5 shadow-[0_4px_16px_rgba(21,63,50,0.05)] backdrop-blur-md"
                style={{ '--stagger-i': idx } as React.CSSProperties}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-[14px] font-medium text-ink">{eq?.name}</strong>
                    <small className="block text-[11.5px] text-muted-ink">
                      {eq?.tag} · Reported {dateText(i.at)}
                    </small>
                  </div>
                  <Badge>{i.kind}</Badge>
                </div>

                <div className="rounded-xl border border-line-subtle bg-surface/70 p-2.5 text-xs">
                  <p className="leading-relaxed text-ink">{i.notes}</p>
                  {i.outcome && (
                    <div className="mt-2 border-t border-line-subtle pt-1.5 text-primary">
                      <strong>Outcome: </strong>
                      <span>{i.outcome}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-line-subtle pt-1">
                  <Badge>{i.resolved ? 'Resolved' : 'Under review'}</Badge>
                  {manager && !i.resolved && (
                    <button
                      type="button"
                      className="primary-pill flex min-h-[40px] cursor-pointer items-center justify-center px-4 text-xs font-medium"
                      onClick={() => setModal(i.id)}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        {/* Desktop Incidents Table */}
        <div className="table-wrap hidden md:block">
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
          onSubmit={async (f) => {
            if (modal === 'new')
              await act({
                type: 'incident',
                itemId: value(f, 'item'),
                kind: value(f, 'kind') as 'Damaged' | 'Missing',
                notes: value(f, 'notes'),
              })
            else
              await act({
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
                <Select name="item" defaultValue={reportable[0]?.id}>
                  {reportable.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Observed condition">
                <Select name="kind" defaultValue="Damaged">
                  <option value="Damaged">Damaged</option>
                  <option value="Missing">Missing</option>
                </Select>
              </Field>
              <Field label="What happened? Include facts and context.">
                <textarea name="notes" required placeholder="Describe what occurred during assignment: e.g. Dropped during coverage; autofocus ring sticking or loose screw…" />
              </Field>
            </>
          ) : (
            <>
              <Field label="Documented outcome">
                <textarea name="outcome" required placeholder="Document the resolution: e.g. Replaced filter ring at authorized center. Verified full operability and restocked in cabinet." />
              </Field>
              <Field label="Condition after review">
                <Select name="condition" defaultValue="Good">
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Missing">Missing</option>
                </Select>
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
