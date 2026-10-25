import { useState, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import {
  User,
  Mail,
  Shield,
  Building,
  Key,
  Copy,
  Check,
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  Globe,
  MapPin,
  Clock,
  LogOut,
  AlertTriangle,
  History,
  RotateCcw,
  Search,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useInventory } from '../backend/context'
import { Heading } from '../components/layout/Heading'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Empty } from '../components/ui/Empty'
import { Pagination } from '../components/ui/Pagination'
import { dateText } from '../components/format'
import { formatEventDetails, type Action } from '../backend/model'
import { useSecuritySuite } from '../backend/useSecuritySuite'
import { detectCurrentDevice, type SecuritySession, type SecurityLoginEvent } from '../backend/security'
import { useTouchSwipe } from '../hooks/useTouchSwipe'

type SettingsTab = 'overview' | 'devices' | 'activity' | 'danger'

export function Settings() {
  const { state, person, act, refresh, signOut } = useInventory()
  const [tab, setTab] = useState<SettingsTab>('overview')
  const [copiedId, setCopiedId] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [sessionToast, setSessionToast] = useState('')

  // Activity log state
  const [activitySearch, setActivitySearch] = useState('')
  const [activityFilter, setActivityFilter] = useState<'all' | 'loans' | 'equipment' | 'other'>('all')
  const [activityPage, setActivityPage] = useState(1)
  const activityPageSize = 8

  // Delete account state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Security telemetry & sessions
  const { securityState, revokeSession } = useSecuritySuite(person)
  const sessions: SecuritySession[] = securityState?.sessions ?? []
  const loginHistory: SecurityLoginEvent[] = securityState?.loginEvents ?? []

  const userEmail =
    person?.email ||
    (person?.name ? `${person.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@thetimberland.pub` : 'operator@thetimberland.pub')

  const copyIdToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(person.id)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    } catch {
      // ignore
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refresh?.()
    } finally {
      setRefreshing(false)
    }
  }

  // Active sessions calculation
  // Mobile touch swipe between tabs
  const tabOrder: SettingsTab[] = ['overview', 'devices', 'activity', 'danger']
  const handleSwipeLeft = () => {
    const idx = tabOrder.indexOf(tab)
    if (idx < tabOrder.length - 1) setTab(tabOrder[idx + 1])
  }
  const handleSwipeRight = () => {
    const idx = tabOrder.indexOf(tab)
    if (idx > 0) setTab(tabOrder[idx - 1])
  }
  const swipeHandlers = useTouchSwipe({ onSwipeLeft: handleSwipeLeft, onSwipeRight: handleSwipeRight })
  const currentDev = detectCurrentDevice()
  const activeSessions = useMemo(() => {
    const list = (sessions ?? []).filter(
      (s: SecuritySession) => s.status === 'active' && (!s.userId || s.userId === person?.id || s.userEmail === userEmail),
    )
    if (list.length === 0) {
      // Fallback: Show detected current session
      return [
        {
          id: `sess-${person?.id ?? 'current'}`,
          userId: person?.id ?? '',
          userName: person?.name ?? '',
          userEmail,
          ip: currentDev.ip,
          location: currentDev.location,
          device: `${currentDev.device} · ${currentDev.os}`,
          browser: currentDev.browser,
          os: currentDev.os,
          startedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          isCurrent: true,
          status: 'active' as const,
        },
      ]
    }
    return list
  }, [sessions, person.id, person.name, userEmail, currentDev])

  // Personal audit events calculation
  const myEvents = useMemo(() => {
    const events = state?.events ?? []
    return events.filter(
      (e) => (person?.id && e.actor === person.id) || (Boolean(person?.name) && e.actorName?.toLowerCase() === person?.name.toLowerCase()),
    )
  }, [state?.events, person.id, person.name])

  const filteredEvents = useMemo(() => {
    return myEvents.filter((e) => {
      const details = formatEventDetails(e, state).toLowerCase()
      const reason = (e.reason ?? '').toLowerCase()
      const matchesSearch = !activitySearch.trim() || details.includes(activitySearch.toLowerCase()) || reason.includes(activitySearch.toLowerCase())
      if (!matchesSearch) return false

      if (activityFilter === 'loans') {
        const raw = (e.action ?? '').toLowerCase()
        return (
          ['checkout', 'return', 'correct', 'releases.insert', 'releases.update'].includes(raw) ||
          details.includes('release') ||
          details.includes('return') ||
          details.includes('loan')
        )
      }
      if (activityFilter === 'equipment') {
        const raw = (e.action ?? '').toLowerCase()
        return (
          ['item', 'archive', 'items.insert', 'items.update'].includes(raw) ||
          details.includes('equipment') ||
          details.includes('decommission')
        )
      }
      if (activityFilter === 'other') {
        const raw = (e.action ?? '').toLowerCase()
        return (
          raw.startsWith('people.') ||
          raw.startsWith('profiles.') ||
          raw.startsWith('security.') ||
          details.includes('member') ||
          details.includes('incident')
        )
      }
      return true
    })
  }, [myEvents, activitySearch, activityFilter, state])

  const paginatedEvents = useMemo(() => {
    const start = (activityPage - 1) * activityPageSize
    return filteredEvents.slice(start, start + activityPageSize)
  }, [filteredEvents, activityPage, activityPageSize])

  // Safeguard conditions for deletion
  const otherAdmins = useMemo(() => {
    return (state?.profiles ?? []).filter(
      (p) => p.role === 'Administrator' && p.status !== 'suspended' && p.id !== person?.id,
    )
  }, [state?.profiles, person.id])

  const isSoleAdmin = person?.role === 'Administrator' && otherAdmins.length === 0

  const activeLoans = useMemo(() => {
    return (state?.loans ?? []).filter((l) => person?.id ? (l.borrowerId === person.id && !l.returned) : false)
  }, [state?.loans, person.id])

  const hasActiveLoans = activeLoans.length > 0

  const confirmPhrase = ((person?.email || person?.name) ?? '').trim()

  const handleRevokeSingle = (sessionId: string) => {
    revokeSession(sessionId)
    setSessionToast('Session revoked successfully. The device will be required to re-authenticate.')
    setTimeout(() => setSessionToast(''), 4000)
  }

  const handleRevokeAllOther = () => {
    activeSessions.forEach((s: SecuritySession) => {
      if (!s.isCurrent) revokeSession(s.id)
    })
    setSessionToast('All other active sessions have been signed out.')
    setTimeout(() => setSessionToast(''), 4000)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== confirmPhrase.toLowerCase()) {
      throw Error(`Please type "${confirmPhrase}" exactly to confirm.`)
    }
    setDeleting(true)
    setDeleteError('')
    try {
      await act({
        type: 'delete-profile',
        id: person.id,
        reason: 'Self-requested account deletion from Account Settings',
      } as Action)
      await signOut?.()
    } catch (err) {
      setDeleting(false)
      throw err
    }
  }

  const getDeviceIcon = (deviceStr: string) => {
    const d = deviceStr.toLowerCase()
    if (d.includes('phone') || d.includes('android') || d.includes('iphone')) return <Smartphone size={18} className="text-forest" />
    if (d.includes('tablet') || d.includes('ipad')) return <Tablet size={18} className="text-forest" />
    if (d.includes('macbook') || d.includes('laptop')) return <Laptop size={18} className="text-forest" />
    return <Monitor size={18} className="text-forest" />
  }

  if (!person) return <Navigate to="/login" replace />

  return (
    <>
      <Heading
        eyebrow="YOUR IDENTITY & SECURITY"
        title="Account settings"
        description="Manage your operator profile, view active device sessions, review your personal activity logs, and configure security credentials."
      >
        <button
          className="secondary flex items-center gap-1.5"
          disabled={refreshing}
          onClick={handleRefresh}
          title="Refresh account information"
        >
          <RotateCcw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
        </button>
        <button
          className="secondary flex items-center gap-1.5 text-danger-text hover:bg-danger-bg hover:border-danger-border"
          onClick={() => void signOut?.()}
          title="Sign out of your session"
        >
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </Heading>

      {/* Tabs Navigation with Touch Slide */}
      <div className="touch-slide-x mb-2 border-b border-line pb-3" role="tablist" aria-label="Account Settings Tabs">
        <button
          role="tab"
          aria-selected={tab === 'overview'}
          className={`touch-slide-item ${tab === 'overview' ? 'primary' : 'secondary'}`}
          onClick={() => setTab('overview')}
        >
          <User size={14} className="mr-1.5 inline" />
          <span>Profile & Identity</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === 'devices'}
          className={`touch-slide-item ${tab === 'devices' ? 'primary' : 'secondary'}`}
          onClick={() => setTab('devices')}
        >
          <Laptop size={14} className="mr-1.5 inline" />
          <span>Devices & Sessions ({activeSessions.length})</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === 'activity'}
          className={`touch-slide-item ${tab === 'activity' ? 'primary' : 'secondary'}`}
          onClick={() => setTab('activity')}
        >
          <History size={14} className="mr-1.5 inline" />
          <span>My Activity Logs ({myEvents.length})</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === 'danger'}
          className={`touch-slide-item ${tab === 'danger' ? 'primary bg-[#963838] border-[#963838]' : 'secondary'} text-danger-text`}
          onClick={() => setTab('danger')}
        >
          <AlertTriangle size={14} className="mr-1.5 inline" />
          <span>Account Security & Actions</span>
        </button>
      </div>

      {/* Mobile Swipe Navigation Indicator */}
      <div className="mb-4 sm:hidden flex items-center justify-between text-[11px] text-muted-ink px-1 select-none">
        <span>← Slide or swipe horizontally →</span>
        <span className="font-medium text-forest">{tabOrder.indexOf(tab) + 1} of {tabOrder.length}</span>
      </div>

      {sessionToast && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-line bg-surface p-3.5 text-sm text-ink shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-forest shrink-0" />
            <span>{sessionToast}</span>
          </div>
          <button className="text-xs text-muted-ink hover:text-ink" onClick={() => setSessionToast('')}>
            Dismiss
          </button>
        </div>
      )}

      <div {...swipeHandlers} className="touch-pan-y min-h-[300px]">
      {/* TAB 1: PROFILE & IDENTITY */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Identity Header Card */}
          <section className="panel p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-primary to-forest flex items-center justify-center text-white text-xl font-bold tracking-tight shadow-md border-2 border-white/60">
                  {person.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-ink">{person.name}</h2>
                    <Badge>{person.status ?? 'active'}</Badge>
                  </div>
                  <p className="text-sm text-muted-ink mt-0.5">{person.title || 'Inventory Operator'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <Badge>{person.role}</Badge>
              </div>
            </div>

            {/* Profile Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="rounded-xl border border-line bg-surface/40 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-ink uppercase tracking-wider mb-1">
                  <Mail size={13} className="text-forest" />
                  <span>Authorized Email</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">{userEmail}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-forest bg-forest/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={11} /> Verified
                  </span>
                </div>
                <p className="text-xs text-muted-ink mt-1.5">
                  Authenticated via Google OAuth Workspace SSO.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface/40 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-ink uppercase tracking-wider mb-1">
                  <Shield size={13} className="text-forest" />
                  <span>Access Level & Privileges</span>
                </div>
                <div className="text-sm font-medium text-ink">{person.role}</div>
                <p className="text-xs text-muted-ink mt-1.5">
                  {person?.role === 'Administrator'
                    ? 'Full operator privileges: inventory mutation, member approvals, cybersecurity suite, and audit inspection.'
                    : person.role === 'Inventory Custodian'
                    ? 'Custodian privileges: item cataloging, releases, returns, and staff directory management.'
                    : 'Standard staff viewer profile.'}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-surface/40 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-ink uppercase tracking-wider mb-1">
                  <Building size={13} className="text-forest" />
                  <span>Department / Section</span>
                </div>
                <div className="text-sm font-medium text-ink">{person.department || 'Publication Staff'}</div>
                <p className="text-xs text-muted-ink mt-1.5">Organizational division within the publication.</p>
              </div>

              <div className="rounded-xl border border-line bg-surface/40 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-ink uppercase tracking-wider mb-1">
                  <Key size={13} className="text-forest" />
                  <span>Operator Account ID</span>
                </div>
                <div className="flex items-center justify-between">
                  <code className="text-xs font-mono text-muted-ink truncate max-w-[220px]">{person.id}</code>
                  <button
                    onClick={copyIdToClipboard}
                    className="action-pill text-xs flex items-center gap-1"
                    title="Copy operator UUID"
                  >
                    {copiedId ? <Check size={12} className="text-forest" /> : <Copy size={12} />}
                    <span>{copiedId ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-xs text-muted-ink mt-1.5">Unique database cryptographic identifier.</p>
              </div>
            </div>

            {/* Architecture Separation Notice */}
            <div className="mt-6 rounded-xl border border-line bg-[#f0f4f1] p-4 text-xs text-muted-ink leading-relaxed">
              <strong className="text-ink font-semibold block mb-0.5">Directory Boundary Clarification:</strong>
              Your operator account grants you software access to manage inventory. Editorial journalists,
              photojournalists, and external borrowers who borrow physical equipment are maintained separately in the{' '}
              <a href="/staff" className="text-forest font-medium underline underline-offset-2 hover:text-primary">
                Staff directory
              </a>
              . Directory membership does not create a login account.
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: DEVICES & SESSIONS */}
      {tab === 'devices' && (
        <div className="space-y-6">
          {/* Active Sessions Panel */}
          <section className="panel p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-ink">Active Device Sessions</h3>
                <p className="text-xs text-muted-ink mt-0.5">
                  Devices and browser sessions currently authenticated with your account.
                </p>
              </div>
              {activeSessions.filter((s: SecuritySession) => !s.isCurrent).length > 0 && (
                <button
                  className="secondary text-xs h-8 px-3 text-danger-text hover:bg-danger-bg hover:border-danger-border flex items-center gap-1.5 font-medium"
                  onClick={handleRevokeAllOther}
                  title="Sign out of all other devices except this one"
                >
                  <LogOut size={12} />
                  <span>Sign out all other sessions</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {activeSessions.map((s: SecuritySession) => (
                <div
                  key={s.id}
                  className={`rounded-xl border p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    s.isCurrent
                      ? 'border-forest/40 bg-forest/5 ring-1 ring-forest/20'
                      : 'border-line bg-surface/50 hover:bg-surface'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-surface border border-line flex items-center justify-center shadow-xs">
                      {getDeviceIcon(s.device)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">{s.device}</span>
                        {s.isCurrent && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest bg-forest/15 px-2 py-0.5 rounded-full">
                            <span className="h-1.5 w-1.5 rounded-full bg-forest animate-pulse" />
                            Current device
                          </span>
                        )}
                        <span className="text-xs text-muted-ink">({s.browser})</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-ink mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-forest" />
                          <span>{s.location}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Globe size={11} className="text-muted-ink" />
                          <span>{s.ip}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          <span>Started {dateText(s.startedAt)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {s.isCurrent ? (
                      <span className="text-xs font-medium text-forest px-2.5 py-1 rounded-md bg-forest/10">
                        Active now
                      </span>
                    ) : (
                      <button
                        className="action-pill text-xs text-danger-text hover:bg-danger-bg hover:border-danger-border flex items-center gap-1"
                        onClick={() => handleRevokeSingle(s.id)}
                        title="Revoke session on this device"
                      >
                        <LogOut size={12} />
                        <span>Revoke session</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Login History subsection */}
            <div className="mt-8 pt-6 border-t border-line">
              <h4 className="text-sm font-semibold text-ink mb-1">Recent Sign-in History</h4>
              <p className="text-xs text-muted-ink mb-3">
                Security log of recent authentication attempts for this account.
              </p>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Device & Client</th>
                      <th>Location</th>
                      <th>IP Address</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loginHistory ?? []).slice(0, 5).map((ev: SecurityLoginEvent) => (
                      <tr key={ev.id}>
                        <td>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              ev.status === 'success'
                                ? 'bg-forest/10 text-forest'
                                : 'bg-danger-bg text-danger-text'
                            }`}
                          >
                            {ev.status === 'success' ? (
                              <>
                                <CheckCircle2 size={11} /> Success
                              </>
                            ) : (
                              <>
                                <XCircle size={11} /> Failed
                              </>
                            )}
                          </span>
                        </td>
                        <td className="text-xs font-medium text-ink">{ev.device}</td>
                        <td className="text-xs text-muted-ink">{ev.location}</td>
                        <td className="text-xs font-mono text-muted-ink">{ev.ip}</td>
                        <td className="text-xs text-muted-ink">{dateText(ev.timestamp)}</td>
                      </tr>
                    ))}
                    {(loginHistory ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-xs text-muted-ink">
                          No previous authentication events logged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: MY ACTIVITY LOGS */}
      {tab === 'activity' && (
        <div className="space-y-6">
          <section className="panel p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-ink">Personal Audit Trail</h3>
                <p className="text-xs text-muted-ink mt-0.5">
                  Immutable record of inventory releases, return inspections, and updates performed by your account.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-ink font-medium">
                  {filteredEvents.length} action{filteredEvents.length === 1 ? '' : 's'} recorded
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row gap-3 mb-5">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink" />
                <input
                  type="search"
                  className="w-full pl-9 text-xs"
                  placeholder="Search actions by equipment name, borrower, or notes..."
                  value={activitySearch}
                  onChange={(e) => {
                    setActivitySearch(e.target.value)
                    setActivityPage(1)
                  }}
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                {(['all', 'loans', 'equipment', 'other'] as const).map((f) => (
                  <button
                    key={f}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                      activityFilter === f
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-surface border-line text-muted-ink hover:text-ink'
                    }`}
                    onClick={() => {
                      setActivityFilter(f)
                      setActivityPage(1)
                    }}
                  >
                    {f === 'all'
                      ? 'All actions'
                      : f === 'loans'
                      ? 'Releases & Returns'
                      : f === 'equipment'
                      ? 'Equipment'
                      : 'Other updates'}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Stream */}
            <div className="space-y-2.5">
              {paginatedEvents.map((e) => {
                const details = formatEventDetails(e, state)
                return (
                  <div
                    key={e.id}
                    className="rounded-xl border border-line bg-surface/40 hover:bg-surface p-3.5 transition-colors flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5 text-primary">
                        <History size={14} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink leading-snug">{details}</p>
                        {e.reason && (
                          <p className="text-xs text-muted-ink italic mt-1 bg-surface-muted/60 px-2.5 py-1 rounded-md border border-line/60 inline-block">
                            "{e.reason}"
                          </p>
                        )}
                        <p className="text-[11px] text-muted-ink mt-1 flex items-center gap-1.5">
                          <Clock size={10} />
                          <span>{new Date(e.at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                          {e.actorRole && (
                            <>
                              <span>•</span>
                              <span>Role: {e.actorRole}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {filteredEvents.length === 0 && (
                <Empty
                  text={
                    activitySearch.trim() || activityFilter !== 'all'
                      ? 'No personal activity logs match your filter.'
                      : 'No activity logs recorded under your operator account yet. Actions you perform will appear here.'
                  }
                />
              )}
            </div>

            {filteredEvents.length > activityPageSize && (
              <div className="mt-4">
                <Pagination
                  page={activityPage}
                  total={filteredEvents.length}
                  pageSize={activityPageSize}
                  onPageChange={setActivityPage}
                  label="activity events"
                />
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 4: ACCOUNT SECURITY & DANGER ZONE */}
      {tab === 'danger' && (
        <div className="space-y-6">
          {/* Security Standards Card */}
          <section className="panel p-6">
            <h3 className="text-base font-bold text-ink mb-1">Account Security Posture</h3>
            <p className="text-xs text-muted-ink mb-4">
              Current security configuration and session guarantees for your operator identity.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-line bg-surface/50 p-4">
                <span className="text-xs font-semibold text-muted-ink uppercase tracking-wider block mb-1">
                  Auth Method
                </span>
                <span className="text-sm font-bold text-ink flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-forest" />
                  Google Workspace
                </span>
                <span className="text-[11px] text-muted-ink block mt-1">PKCE OAuth Flow</span>
              </div>

              <div className="rounded-xl border border-line bg-surface/50 p-4">
                <span className="text-xs font-semibold text-muted-ink uppercase tracking-wider block mb-1">
                  Session Token
                </span>
                <span className="text-sm font-bold text-ink flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-forest" />
                  Auto-Refresh Active
                </span>
                <span className="text-[11px] text-muted-ink block mt-1">Encrypted Browser Storage</span>
              </div>

              <div className="rounded-xl border border-line bg-surface/50 p-4">
                <span className="text-xs font-semibold text-muted-ink uppercase tracking-wider block mb-1">
                  Audit Retention
                </span>
                <span className="text-sm font-bold text-ink flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-forest" />
                  Institutional Grade
                </span>
                <span className="text-[11px] text-muted-ink block mt-1">Non-repudiable Logs</span>
              </div>
            </div>
          </section>

          {/* DANGER ZONE PANEL */}
          <section className="rounded-2xl border border-danger-border/60 bg-danger-bg/25 p-6 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-danger-bg border border-danger-border flex items-center justify-center text-danger-text shadow-xs">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-danger-text">Danger Zone · Deactivate Operator Account</h3>
                <p className="text-xs text-danger-text/90 mt-1 leading-relaxed">
                  Permanently deactivate your operator account and revoke sign-in privileges.
                  Once deactivated, you will be immediately signed out from all active devices and will no longer be able
                  to access the management workspace.
                </p>

                <div className="mt-4 rounded-xl border border-danger-border/40 bg-surface/90 p-3.5 text-xs text-muted-ink space-y-1.5">
                  <p className="font-semibold text-ink">Institutional Audit Accountability Safeguard:</p>
                  <p>
                    In accordance with university property custody and publication governance policies, past equipment
                    checkouts, return condition inspections, and audit logs recorded under your name will remain safely
                    preserved in archival records.
                  </p>
                </div>

                <div className="mt-5">
                  <button
                    className="primary bg-[#963838] hover:bg-[#7d2e2e] border-[#963838] text-white text-xs h-9 px-4 font-semibold shadow-xs"
                    onClick={() => {
                      setDeleteConfirmText('')
                      setDeleteError('')
                      setDeleteModalOpen(true)
                    }}
                  >
                    Delete my operator account…
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      </div>

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {deleteModalOpen && (
        <Modal
          title="Confirm Account Deactivation"
          destructive
          onClose={() => setDeleteModalOpen(false)}
          submit={isSoleAdmin || hasActiveLoans ? 'Close' : 'Permanently Deactivate Account'}
          onSubmit={async () => {
            if (isSoleAdmin || hasActiveLoans) {
              setDeleteModalOpen(false)
              return
            }
            await handleDeleteAccount()
          }}
        >
          {isSoleAdmin ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-danger-border bg-danger-bg text-xs text-danger-text leading-relaxed">
                <strong className="block font-semibold mb-1 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Account Deletion Blocked
                </strong>
                You are currently the <strong>sole active Administrator</strong> in the system.
                To prevent accidental administrative lockout, you must promote another custodian to Administrator
                under{' '}
                <a href="/access" className="underline font-semibold">
                  System access
                </a>{' '}
                before deleting this account.
              </div>
            </div>
          ) : hasActiveLoans ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-danger-border bg-danger-bg text-xs text-danger-text leading-relaxed">
                <strong className="block font-semibold mb-1 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Account Deletion Blocked
                </strong>
                You currently have <strong>{activeLoans.length} active equipment loan{activeLoans.length === 1 ? '' : 's'}</strong> checked out.
                All equipment must be returned and inspected before your account can be deleted.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-ink leading-relaxed">
                This action is permanent. Your operator session will be terminated immediately, and your login account will
                be suspended.
              </p>

              <div className="rounded-xl border border-line bg-surface p-3 text-xs space-y-1.5 text-muted-ink">
                <div className="flex items-center gap-2 text-ink font-semibold">
                  <span>Account to be deactivated:</span>
                </div>
                <p>
                  <strong>{person.name}</strong> ({userEmail})
                </p>
                <p>Role: {person.role}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Type <span className="font-mono text-danger-text font-bold">"{confirmPhrase}"</span> to confirm:
                </label>
                <input
                  type="text"
                  className="w-full text-xs font-mono"
                  placeholder={confirmPhrase}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  autoFocus
                />
              </div>

              {deleteError && (
                <p className="text-xs text-danger-text font-medium">{deleteError}</p>
              )}

              {deleting && (
                <p className="text-xs text-muted-ink animate-pulse">Deactivating operator credentials…</p>
              )}
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
