import { useState, useMemo, useContext } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Radio,
  History,
  Laptop,
  Smartphone,
  Globe2,
  LogOut,
  XCircle,
  CheckCircle2,
  Search,
  Sparkles,
  RefreshCw,
  UserX,
  Activity,
  Plus,
  Trash2,
  Sliders,
  RotateCcw,
} from 'lucide-react'
import { Heading } from '../../components/layout/Heading'
import { useSecuritySuite } from '../../backend/useSecuritySuite'
import { InventoryContext } from '../../backend/context'
import { Modal } from '../../components/ui/Modal'
import { Field } from '../../components/ui/Field'
import { dateText } from '../../components/format'
import type { Profile } from '../../backend/model'
import type { SecuritySession, SecurityLoginEvent } from '../../backend/security'

export type SecurityTab =
  | 'threats'
  | 'sessions'
  | 'logins'
  | 'devices'
  | 'domains'
  | 'suspensions'
  | 'thresholds'

interface SecurityHubProps {
  initialTab?: SecurityTab
}

export function SecurityHub({ initialTab }: SecurityHubProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

  // Determine current tab from URL search params, props, or path
  const defaultTab: SecurityTab =
    initialTab ||
    (location.pathname.includes('/sessions') ? 'sessions' : 'threats')

  const currentTab = (searchParams.get('tab') as SecurityTab) || defaultTab

  const setTab = (tab: SecurityTab) => {
    setSearchParams({ tab })
  }

  // Gracefully read InventoryContext if available, or fall back to safe mock defaults
  const inventory = useContext(InventoryContext)
  const person = inventory?.person ?? { id: 'admin-1', name: 'Security Administrator', role: 'Administrator' as const }
  const state = inventory?.state ?? { profiles: [] }
  const act = inventory?.act ?? (async () => {})

  const {
    securityState,
    resolveThreat,
    dismissThreat,
    resetToDefaults,
    isLive,
    loading,
    syncFromBackend,
    updatePolicy,
    addAllowedDomain,
    removeAllowedDomain,
    addAuthorizedEmail,
    removeAuthorizedEmail,
    suspendAccount,
    reactivateAccount,
    revokeSession,
    revokeAllOtherSessions,
  } = useSecuritySuite()

  const policy = securityState.policy || {
    allowedDomains: ['thetimberland.pub'],
    restrictToAllowedDomains: true,
    whitelistedEmails: [],
    sessionTimeoutMinutes: 1440,
    maxFailedAttemptsBeforeLock: 5,
    notifyOnNewDevice: true,
    requireAdminMFA: false,
  }

  // ----------------------------------------------------
  // THREATS STATE & FILTERS
  // ----------------------------------------------------
  const [threatFilter, setThreatFilter] = useState<'all' | 'active' | 'resolved'>('all')
  const [threatSearch, setThreatSearch] = useState('')
  const [resolvingThreatId, setResolvingThreatId] = useState<string | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')

  // ----------------------------------------------------
  // DOMAINS & EMAILS STATE
  // ----------------------------------------------------
  const [newDomain, setNewDomain] = useState('')
  const [addingEmailModal, setAddingEmailModal] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailNote, setEmailNote] = useState('')

  // ----------------------------------------------------
  // SUSPENSIONS STATE
  // ----------------------------------------------------
  const [suspensionFilter, setSuspensionFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [suspensionSearch, setSuspensionSearch] = useState('')
  const [suspendingTarget, setSuspendingTarget] = useState<Profile | null>(null)
  const [reactivatingTarget, setReactivatingTarget] = useState<{ id: string; name: string } | null>(null)
  const [suspensionReason, setSuspensionReason] = useState('')

  // ----------------------------------------------------
  // SESSIONS & LOGINS STATE
  // ----------------------------------------------------
  const [revokingSession, setRevokingSession] = useState<SecuritySession | null>(null)
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false)
  const [inspectingEvent, setInspectingEvent] = useState<SecurityLoginEvent | null>(null)
  const [loginStatusFilter, setLoginStatusFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [loginSearchQuery, setLoginSearchQuery] = useState('')

  // Derived metrics
  const activeThreats = (securityState.threats || []).filter((t) => t.status === 'active')
  const resolvedThreats = (securityState.threats || []).filter((t) => t.status === 'resolved')
  const criticalCount = activeThreats.filter(
    (t) => t.severity === 'critical' || t.severity === 'high',
  ).length

  const allProfiles = state.profiles ?? []
  const suspendedUserIds = new Set(
    (securityState.suspensions || []).map((s) => s.userId).concat(
      allProfiles.filter((p) => p.status === 'suspended').map((p) => p.id),
    ),
  )
  const suspendedCount = suspendedUserIds.size

  const activeSessions = (securityState.sessions || []).filter((s) => s.status === 'active')
  const currentSession = (securityState.sessions || []).find((s) => s.isCurrent)

  const events = useMemo(() => securityState.loginEvents || [], [securityState.loginEvents])
  const failedEvents = useMemo(() => events.filter((e) => e.status === 'failed'), [events])
  const newDeviceEvents = useMemo(() => events.filter((e) => e.isNewDevice), [events])

  // Posture score
  const score = Math.max(
    65,
    100 - activeThreats.length * 8 - (criticalCount > 0 ? 12 : 0),
  )

  // Filtered threats
  const filteredThreats = (securityState.threats || []).filter((t) => {
    if (threatFilter === 'active' && t.status !== 'active') return false
    if (threatFilter === 'resolved' && t.status !== 'resolved') return false
    if (threatSearch.trim()) {
      const q = threatSearch.toLowerCase()
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.targetEmail.toLowerCase().includes(q) ||
        t.ip.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Filtered profiles for suspensions
  const filteredProfiles = allProfiles.filter((p) => {
    const isSuspended = suspendedUserIds.has(p.id)
    if (suspensionFilter === 'active' && isSuspended) return false
    if (suspensionFilter === 'suspended' && !isSuspended) return false

    if (suspensionSearch.trim()) {
      const q = suspensionSearch.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Filtered login events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (currentTab === 'devices' && !event.isNewDevice) return false
      if (currentTab === 'logins') {
        if (loginStatusFilter === 'success' && event.status !== 'success') return false
        if (loginStatusFilter === 'failed' && event.status !== 'failed') return false
      }

      if (loginSearchQuery.trim()) {
        const q = loginSearchQuery.toLowerCase()
        return (
          event.email.toLowerCase().includes(q) ||
          (event.userName && event.userName.toLowerCase().includes(q)) ||
          event.ip.toLowerCase().includes(q) ||
          event.location.toLowerCase().includes(q) ||
          event.device.toLowerCase().includes(q) ||
          (event.failureReason && event.failureReason.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [events, currentTab, loginStatusFilter, loginSearchQuery])

  const selectedThreat = (securityState.threats || []).find((t) => t.id === resolvingThreatId)

  // ----------------------------------------------------
  // ACTION HANDLERS
  // ----------------------------------------------------
  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDomain.trim()) return
    addAllowedDomain(newDomain)
    setNewDomain('')
  }

  const handleResolveSubmit = () => {
    if (resolvingThreatId) {
      resolveThreat(resolvingThreatId, resolutionNote)
      setResolvingThreatId(null)
      setResolutionNote('')
    }
  }

  const handleAddEmailSubmit = () => {
    if (!emailInput.trim()) return
    addAuthorizedEmail(emailInput, emailNote, person.name)
    setEmailInput('')
    setEmailNote('')
    setAddingEmailModal(false)
  }

  const handleSuspendSubmit = async () => {
    if (!suspendingTarget || !suspensionReason.trim()) return
    const target = suspendingTarget
    const reason = suspensionReason.trim()

    suspendAccount(
      target.id,
      target.name,
      `${target.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@thetimberland.pub`,
      target.role,
      reason,
      person.name,
    )

    try {
      await act({
        type: 'membership',
        id: target.id,
        role: target.role,
        status: 'suspended',
        reason,
      })
    } catch {
      // Offline fallback
    }

    setSuspendingTarget(null)
    setSuspensionReason('')
  }

  const handleReactivateSubmit = async () => {
    if (!reactivatingTarget) return
    const targetId = reactivatingTarget.id

    reactivateAccount(targetId)

    const profile = allProfiles.find((p) => p.id === targetId)
    if (profile) {
      try {
        await act({
          type: 'membership',
          id: targetId,
          role: profile.role,
          status: 'active',
          reason: 'Account reinstated by security administrator.',
        })
      } catch {
        // Fallback
      }
    }

    setReactivatingTarget(null)
  }

  const getReasonLabel = (reason?: string) => {
    switch (reason) {
      case 'unauthorized_domain':
        return 'Unauthorized Email Domain'
      case 'account_suspended':
        return 'Account Quarantined / Suspended'
      case 'rate_limited':
        return 'Rate Limit Throttled (Brute-Force Shield)'
      case 'invalid_credentials':
        return 'Invalid Credentials'
      case 'unrecognized_device':
        return 'Untrusted Device Signature'
      default:
        return 'Access Denied'
    }
  }

  return (
    <div className="space-y-6">
      <Heading
        eyebrow="ENTERPRISE SECURITY & GOVERNANCE"
        title="Cybersecurity center"
        description="Unified security posture, heuristic threat detection, active session telemetry, institutional domain guardrails, and account quarantine controls."
      />

      {/* TOP 4 HIGH-IMPACT METRIC CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Posture Score */}
        <div
          onClick={() => setTab('threats')}
          className={`panel p-4.5 cursor-pointer transition-all hover:border-primary/40 ${
            currentTab === 'threats'
              ? 'border-primary ring-1 ring-primary/20 bg-pale/35'
              : 'hover:bg-white/95'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold tracking-wider text-muted-ink uppercase">
              Security Posture
            </span>
            <ShieldCheck size={17} className="text-primary" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono">
              {score}%
            </span>
            <span className="text-xs text-primary font-medium">Optimal</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-ink">
            <span>{activeThreats.length} active threats</span>
            <span className="text-[10.5px] font-semibold text-primary uppercase">Inspect</span>
          </div>
        </div>

        {/* Active Threats */}
        <div
          onClick={() => setTab('threats')}
          className={`panel p-4.5 cursor-pointer transition-all hover:border-primary/40 ${
            currentTab === 'threats'
              ? 'border-warning-border ring-1 ring-warning-border bg-warning-bg/40'
              : 'hover:bg-white/95'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold tracking-wider text-muted-ink uppercase">
              Active Threats
            </span>
            <ShieldAlert size={17} className="text-warning-text" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono">
              {activeThreats.length}
            </span>
            <span className="text-xs text-warning-text font-medium">Heuristics flagged</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-ink">
            <span>{criticalCount} critical alert</span>
            <span className="text-[10.5px] font-semibold text-warning-text uppercase">Resolve</span>
          </div>
        </div>

        {/* Active Sessions */}
        <div
          onClick={() => setTab('sessions')}
          className={`panel p-4.5 cursor-pointer transition-all hover:border-primary/40 ${
            currentTab === 'sessions'
              ? 'border-primary ring-1 ring-primary/20 bg-pale/35'
              : 'hover:bg-white/95'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold tracking-wider text-muted-ink uppercase">
              Active Sessions
            </span>
            <Radio size={16} className="text-primary animate-pulse" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono">
              {activeSessions.length}
            </span>
            <span className="text-xs text-muted-ink">online tokens</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-ink">
            <span>{newDeviceEvents.length} new devices</span>
            <span className="text-[10.5px] font-semibold text-primary uppercase">Manage</span>
          </div>
        </div>

        {/* Quarantined Accounts */}
        <div
          onClick={() => setTab('suspensions')}
          className={`panel p-4.5 cursor-pointer transition-all hover:border-primary/40 ${
            currentTab === 'suspensions'
              ? 'border-danger-border ring-1 ring-danger-border bg-danger-bg/40'
              : 'hover:bg-white/95'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold tracking-wider text-muted-ink uppercase">
              Suspended Accounts
            </span>
            <UserX size={16} className="text-danger-text" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight font-mono text-ink">
              {suspendedCount}
            </span>
            <span className="text-xs text-danger-text font-medium">Quarantined</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-ink">
            <span>Killswitch roster</span>
            <span className="text-[10.5px] font-semibold text-danger-text uppercase">Review</span>
          </div>
        </div>
      </div>

      {/* MAIN TABBED SECURITY WORKSPACE */}
      <section className="panel p-5 sm:p-6 space-y-5">
        {/* Sub-Tabs Navigation Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-line-subtle pb-3.5">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-surface rounded-2xl border border-line-subtle">
            <button
              type="button"
              onClick={() => setTab('threats')}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                currentTab === 'threats'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-muted-ink hover:text-ink'
              }`}
            >
              <Activity size={14} className={currentTab === 'threats' ? 'text-primary' : 'text-muted-ink'} />
              <span>Threat Alerts</span>
              {activeThreats.length > 0 && (
                <span className="rounded-full bg-warning-bg border border-warning-border px-1.5 py-0.2 text-[10px] text-warning-text font-mono font-bold">
                  {activeThreats.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab('sessions')}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                currentTab === 'sessions'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-muted-ink hover:text-ink'
              }`}
            >
              <Radio size={14} className={currentTab === 'sessions' ? 'text-primary' : 'text-muted-ink'} />
              <span>Active Sessions</span>
              <span className="rounded-full bg-pale px-1.5 py-0.2 text-[10px] text-primary font-mono font-medium">
                {activeSessions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab('logins')}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                currentTab === 'logins'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-muted-ink hover:text-ink'
              }`}
            >
              <History size={14} className={currentTab === 'logins' ? 'text-primary' : 'text-muted-ink'} />
              <span>Login History & Failures</span>
              <span className="rounded-full bg-line-subtle px-1.5 py-0.2 text-[10px] text-ink font-mono">
                {events.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab('devices')}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                currentTab === 'devices'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-muted-ink hover:text-ink'
              }`}
            >
              <Sparkles size={14} className={currentTab === 'devices' ? 'text-primary' : 'text-muted-ink'} />
              <span>New Devices</span>
              <span className="rounded-full bg-pale px-1.5 py-0.2 text-[10px] text-primary font-mono">
                {newDeviceEvents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab('domains')}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                currentTab === 'domains'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-muted-ink hover:text-ink'
              }`}
            >
              <Globe2 size={14} className={currentTab === 'domains' ? 'text-primary' : 'text-muted-ink'} />
              <span>Domain Guard & Whitelist</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('suspensions')}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                currentTab === 'suspensions'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-muted-ink hover:text-ink'
              }`}
            >
              <UserX size={14} className={currentTab === 'suspensions' ? 'text-danger-text' : 'text-muted-ink'} />
              <span>Account Suspensions & Killswitch</span>
              {suspendedCount > 0 && (
                <span className="rounded-full bg-danger-bg border border-danger-border px-1.5 py-0.2 text-[10px] text-danger-text font-mono font-bold">
                  {suspendedCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab('thresholds')}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                currentTab === 'thresholds'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-muted-ink hover:text-ink'
              }`}
            >
              <Sliders size={14} className={currentTab === 'thresholds' ? 'text-primary' : 'text-muted-ink'} />
              <span>Session & Lockout Thresholds</span>
            </button>
          </div>

          {/* Sync & Telemetry Status Actions */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <div className="flex items-center gap-1.5 rounded-full bg-pale px-2.5 py-1 text-[11px] font-medium text-primary border border-line">
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-primary animate-pulse' : 'bg-supporting'}`} />
              <span>{isLive ? 'Database Synced' : 'Telemetry Active'}</span>
            </div>
            <button
              type="button"
              onClick={() => void syncFromBackend()}
              disabled={loading}
              className="secondary text-xs h-8 px-2.5"
              title="Refresh telemetry from database"
            >
              <RefreshCw size={13} className={`text-muted-ink ${loading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
            <button
              type="button"
              onClick={resetToDefaults}
              className="secondary text-xs h-8 px-2.5"
              title="Reset sample telemetry data"
            >
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* TAB 1: THREAT ALERTS STREAM                         */}
        {/* ---------------------------------------------------- */}
        {currentTab === 'threats' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setThreatFilter('all')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                    threatFilter === 'all'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface text-muted-ink hover:text-ink'
                  }`}
                >
                  All Alerts ({securityState.threats.length})
                </button>
                <button
                  type="button"
                  onClick={() => setThreatFilter('active')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                    threatFilter === 'active'
                      ? 'bg-warning-text text-white shadow-xs'
                      : 'bg-surface text-muted-ink hover:text-ink'
                  }`}
                >
                  Active ({activeThreats.length})
                </button>
                <button
                  type="button"
                  onClick={() => setThreatFilter('resolved')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                    threatFilter === 'resolved'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface text-muted-ink hover:text-ink'
                  }`}
                >
                  Resolved ({resolvedThreats.length})
                </button>
              </div>

              <div className="relative min-w-[240px]">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink"
                />
                <input
                  type="text"
                  placeholder="Filter threats by IP, user, location…"
                  value={threatSearch}
                  onChange={(e) => setThreatSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-line-subtle bg-white/80 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {filteredThreats.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-line-subtle bg-surface/50">
                  <ShieldCheck size={32} className="mx-auto text-primary mb-2" />
                  <p className="text-sm font-medium text-ink">No threats matching criteria</p>
                  <p className="text-xs text-muted-ink mt-0.5">
                    All monitoring probes reporting normal baseline activity.
                  </p>
                </div>
              ) : (
                filteredThreats.map((threat) => {
                  const isCritical = threat.severity === 'critical'
                  const isHigh = threat.severity === 'high'
                  const isActive = threat.status === 'active'

                  return (
                    <div
                      key={threat.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        !isActive
                          ? 'border-line-subtle bg-surface/40 opacity-80'
                          : isCritical
                          ? 'border-danger-border bg-danger-bg/40 shadow-xs'
                          : isHigh
                          ? 'border-warning-border bg-warning-bg/40 shadow-xs'
                          : 'border-line bg-white shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              isCritical
                                ? 'bg-danger-bg text-danger-text border border-danger-border'
                                : isHigh
                                ? 'bg-warning-bg text-warning-text border border-warning-border'
                                : 'bg-pale text-primary border border-line'
                            }`}
                          >
                            {isCritical ? (
                              <ShieldAlert size={18} />
                            ) : isHigh ? (
                              <AlertTriangle size={18} />
                            ) : (
                              <CheckCircle2 size={18} />
                            )}
                          </span>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <strong className="text-[13.5px] font-semibold text-ink">
                                {threat.title}
                              </strong>
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider font-mono ${
                                  isCritical
                                    ? 'bg-danger-text text-white'
                                    : isHigh
                                    ? 'bg-warning-text text-white'
                                    : 'bg-pale text-primary border border-line'
                                }`}
                              >
                                {threat.severity}
                              </span>
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-medium ${
                                  isActive
                                    ? 'bg-warning-bg text-warning-text border border-warning-border'
                                    : 'bg-pale text-primary border border-line'
                                }`}
                              >
                                {isActive ? 'Active Threat' : 'Resolved'}
                              </span>
                            </div>

                            <p className="mt-1 text-xs text-muted-ink leading-relaxed">
                              {threat.description}
                            </p>

                            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-ink">
                              <span>
                                Target:{' '}
                                <strong className="text-ink font-mono">
                                  {threat.targetEmail}
                                </strong>
                              </span>
                              <span>
                                Origin:{' '}
                                <strong className="text-ink font-mono">{threat.ip}</strong> (
                                {threat.location})
                              </span>
                              <span>Detected: {dateText(threat.timestamp)}</span>
                            </div>

                            {threat.resolutionNote && (
                              <div className="mt-2.5 text-xs bg-pale border border-line text-ink rounded-xl p-2.5">
                                <strong className="font-semibold text-primary">Resolution Note: </strong>
                                <span>{threat.resolutionNote}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {isActive ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setResolvingThreatId(threat.id)}
                                className="rounded-xl bg-primary hover:bg-primary-hover text-white px-3 py-1.5 text-xs font-medium shadow-xs transition"
                              >
                                Resolve Alert
                              </button>
                              <button
                                type="button"
                                onClick={() => dismissThreat(threat.id)}
                                className="secondary text-xs px-2.5 py-1.5"
                              >
                                Dismiss
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium bg-pale px-2.5 py-1 rounded-xl border border-line">
                              <CheckCircle2 size={13} className="text-primary" />
                              <span>Remediated</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: ACTIVE SESSIONS TELEMETRY                    */}
        {/* ---------------------------------------------------- */}
        {currentTab === 'sessions' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">Active Device & Bearer Sessions</h3>
                <p className="text-xs text-muted-ink">
                  Currently active sessions signed into Timberland services.
                </p>
              </div>

              {activeSessions.length > 1 && (
                <button
                  type="button"
                  onClick={() => setConfirmRevokeAll(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-danger-bg hover:bg-danger-border text-danger-text border border-danger-border px-3 py-1.5 text-xs font-semibold transition"
                >
                  <LogOut size={13} />
                  <span>Revoke All Other Sessions</span>
                </button>
              )}
            </div>

            {/* Current device spotlight */}
            {currentSession && (
              <div className="rounded-2xl border border-line bg-pale/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-primary text-white p-2 shrink-0">
                      <Laptop size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-semibold text-ink">
                          Current Device (This Browser Session)
                        </strong>
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                          Active Now
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-ink font-mono">
                        {currentSession.device} · {currentSession.browser} on {currentSession.os}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 text-[11px] text-muted-ink">
                        <span>
                          IP: <strong className="text-ink font-mono">{currentSession.ip}</strong>
                        </span>
                        <span>Location: {currentSession.location}</span>
                        <span>Logged in: {dateText(currentSession.startedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Session table */}
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-surface/80 text-[11px] font-semibold uppercase tracking-wider text-muted-ink">
                  <tr>
                    <th className="px-4 py-3">Device & Browser</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Location & IP</th>
                    <th className="px-4 py-3">Signed In</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle bg-white">
                  {securityState.sessions.map((sess) => {
                    const isPhone = sess.device.toLowerCase().includes('phone')
                    const isActive = sess.status === 'active'

                    return (
                      <tr
                        key={sess.id}
                        className={`transition-colors hover:bg-surface/60 ${
                          sess.isCurrent ? 'bg-pale/25' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-muted-ink">
                              {isPhone ? <Smartphone size={14} /> : <Laptop size={14} />}
                            </span>
                            <div>
                              <strong className="block text-ink font-medium">
                                {sess.device}
                                {sess.isCurrent && (
                                  <span className="ml-1.5 text-[10px] text-primary font-semibold">
                                    (This device)
                                  </span>
                                )}
                              </strong>
                              <span className="text-[11px] text-muted-ink">
                                {sess.browser} · {sess.os}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <strong className="block text-ink">{sess.userName}</strong>
                          <span className="text-[11px] text-muted-ink font-mono">
                            {sess.userEmail}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="block text-ink">{sess.location}</span>
                          <span className="text-[11px] text-muted-ink font-mono">{sess.ip}</span>
                        </td>

                        <td className="px-4 py-3.5 text-muted-ink">
                          {dateText(sess.startedAt)}
                        </td>

                        <td className="px-4 py-3.5">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-pale px-2 py-0.5 text-[11px] font-medium text-primary border border-line">
                              <Radio size={11} className="text-primary animate-pulse" />
                              <span>Online</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted-ink border border-line-subtle">
                              <XCircle size={11} />
                              <span>Revoked</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {isActive && !sess.isCurrent && (
                            <button
                              type="button"
                              onClick={() => setRevokingSession(sess)}
                              className="rounded-xl border border-danger-border bg-danger-bg/80 hover:bg-danger-bg text-danger-text px-2.5 py-1 text-[11px] font-medium transition"
                            >
                              Revoke Session
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3 & 4: LOGIN AUDIT & NEW DEVICES                */}
        {/* ---------------------------------------------------- */}
        {(currentTab === 'logins' || currentTab === 'devices') && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {currentTab === 'logins' ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLoginStatusFilter('all')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                      loginStatusFilter === 'all'
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-surface text-muted-ink hover:text-ink'
                    }`}
                  >
                    All Logins ({events.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginStatusFilter('success')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                      loginStatusFilter === 'success'
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-surface text-muted-ink hover:text-ink'
                    }`}
                  >
                    Successful ({events.filter((e) => e.status === 'success').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginStatusFilter('failed')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                      loginStatusFilter === 'failed'
                        ? 'bg-danger-text text-white shadow-xs'
                        : 'bg-surface text-muted-ink hover:text-ink'
                    }`}
                  >
                    Failed ({failedEvents.length})
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-ink">
                    Showing logins flagged with untrusted or previously unseen device fingerprints.
                  </span>
                </div>
              )}

              <div className="relative min-w-[240px]">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink"
                />
                <input
                  type="text"
                  placeholder="Filter by email, IP, browser…"
                  value={loginSearchQuery}
                  onChange={(e) => setLoginSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-line-subtle bg-white/80 focus:bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-surface/80 text-[11px] font-semibold uppercase tracking-wider text-muted-ink">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User & Identity</th>
                    <th className="px-4 py-3">Outcome</th>
                    <th className="px-4 py-3">Device Signature</th>
                    <th className="px-4 py-3">IP & Location</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle bg-white">
                  {filteredEvents.map((event) => {
                    const isSuccess = event.status === 'success'

                    return (
                      <tr key={event.id} className="transition-colors hover:bg-surface/60">
                        <td className="px-4 py-3 font-mono text-[11.5px] text-muted-ink whitespace-nowrap">
                          {dateText(event.timestamp)}
                        </td>

                        <td className="px-4 py-3">
                          <strong className="block text-ink">{event.userName || 'Unknown User'}</strong>
                          <span className="text-[11px] text-muted-ink font-mono">{event.email}</span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {isSuccess ? (
                              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-pale px-2 py-0.5 text-[11px] font-medium text-primary border border-line">
                                <CheckCircle2 size={11} className="text-primary" />
                                <span>Granted</span>
                              </span>
                            ) : (
                              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-danger-bg px-2 py-0.5 text-[11px] font-medium text-danger-text border border-danger-border">
                                <XCircle size={11} className="text-danger-text" />
                                <span>{getReasonLabel(event.failureReason)}</span>
                              </span>
                            )}
                            {event.isNewDevice && (
                              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-semibold text-warning-text border border-warning-border">
                                <Sparkles size={10} />
                                <span>New Device</span>
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="block text-ink font-medium">{event.device}</span>
                          <span className="text-[11px] text-muted-ink truncate max-w-[180px] block font-mono">{event.userAgent}</span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="block text-ink">{event.location}</span>
                          <span className="text-[11px] text-muted-ink font-mono">{event.ip}</span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setInspectingEvent(event)}
                            className="secondary text-[11px] px-2.5 py-1"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 5: DOMAIN GUARD & EMAIL WHITELIST               */}
        {/* ---------------------------------------------------- */}
        {currentTab === 'domains' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-line bg-pale/30 p-4.5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary text-white p-2 shrink-0">
                    <Globe2 size={18} />
                  </div>
                  <div>
                    <strong className="text-xs font-semibold text-ink">
                      Strict Institutional Domain Enforcement
                    </strong>
                    <p className="mt-0.5 text-xs text-muted-ink">
                      When enabled, users can only authenticate if their email belongs to an allowed institutional domain or is listed in the individual exceptions directory.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updatePolicy({ restrictToAllowedDomains: !policy.restrictToAllowedDomains })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    policy.restrictToAllowedDomains ? 'bg-primary' : 'bg-line'
                  }`}
                  role="switch"
                  aria-checked={policy.restrictToAllowedDomains}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      policy.restrictToAllowedDomains ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Allowed Domains Card */}
            <div className="rounded-2xl border border-line p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line-subtle pb-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-ink">
                    Allowed Institutional Domains
                  </h3>
                  <p className="text-xs text-muted-ink mt-0.5">
                    Emails ending with these suffixes are automatically recognized as institutional.
                  </p>
                </div>

                <form onSubmit={handleAddDomain} className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-ink">
                      @
                    </span>
                    <input
                      type="text"
                      placeholder="publication.university.edu"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      className="pl-7 pr-3 py-1.5 text-xs rounded-xl border border-line-subtle font-mono w-56"
                    />
                  </div>
                  <button type="submit" className="primary text-xs px-3 py-1.5 h-8.5">
                    <Plus size={13} />
                    <span>Add Domain</span>
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(policy.allowedDomains || []).map((domain) => (
                  <div
                    key={domain}
                    className="flex items-center justify-between p-3 rounded-xl border border-line-subtle bg-surface/60"
                  >
                    <div className="flex items-center gap-2">
                      <Globe2 size={15} className="text-primary" />
                      <span className="text-xs font-mono font-medium text-ink">@{domain}</span>
                    </div>
                    {(policy.allowedDomains || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAllowedDomain(domain)}
                        className="rounded-lg p-1 text-muted-ink hover:text-danger-text transition"
                        title={`Remove @${domain}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Authorized Individual Emails */}
            <div className="rounded-2xl border border-line p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-line-subtle pb-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-ink">
                    Authorized Individual External Emails
                  </h3>
                  <p className="text-xs text-muted-ink mt-0.5">
                    Explicit exceptions granted to outside advisers, guest contributors, and alumni.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAddingEmailModal(true)}
                  className="secondary text-xs px-3 py-1.5 h-8.5"
                >
                  <Plus size={13} />
                  <span>Authorize Email</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-line-subtle">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line-subtle bg-surface/80 text-[11px] font-semibold uppercase tracking-wider text-muted-ink">
                    <tr>
                      <th className="px-4 py-2.5">Email Address</th>
                      <th className="px-4 py-2.5">Justification Note</th>
                      <th className="px-4 py-2.5">Authorized By</th>
                      <th className="px-4 py-2.5">Date Granted</th>
                      <th className="px-4 py-2.5 text-right">Revoke</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle bg-white">
                    {(policy.whitelistedEmails || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-muted-ink">
                          No external email exceptions registered.
                        </td>
                      </tr>
                    ) : (
                      (policy.whitelistedEmails || []).map((item) => (
                        <tr key={item.email} className="hover:bg-surface/50">
                          <td className="px-4 py-2.5 font-mono text-ink font-medium">
                            {item.email}
                          </td>
                          <td className="px-4 py-2.5 text-muted-ink">{item.note}</td>
                          <td className="px-4 py-2.5 text-muted-ink">{item.addedBy}</td>
                          <td className="px-4 py-2.5 text-muted-ink">{dateText(item.addedAt)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => removeAuthorizedEmail(item.email)}
                              className="rounded-lg p-1 text-muted-ink hover:text-danger-text transition"
                              title="Revoke authorization"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 6: SUSPENSIONS & QUARANTINE CONTROLS             */}
        {/* ---------------------------------------------------- */}
        {currentTab === 'suspensions' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSuspensionFilter('all')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                    suspensionFilter === 'all'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface text-muted-ink hover:text-ink'
                  }`}
                >
                  All Accounts ({allProfiles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSuspensionFilter('active')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                    suspensionFilter === 'active'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface text-muted-ink hover:text-ink'
                  }`}
                >
                  Active ({allProfiles.length - suspendedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSuspensionFilter('suspended')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                    suspensionFilter === 'suspended'
                      ? 'bg-danger-text text-white shadow-xs'
                      : 'bg-surface text-muted-ink hover:text-ink'
                  }`}
                >
                  Suspended ({suspendedCount})
                </button>
              </div>

              <div className="relative min-w-[240px]">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink"
                />
                <input
                  type="text"
                  placeholder="Search staff roster…"
                  value={suspensionSearch}
                  onChange={(e) => setSuspensionSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-line-subtle bg-white/80 focus:bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-surface/80 text-[11px] font-semibold uppercase tracking-wider text-muted-ink">
                  <tr>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Role & Dept</th>
                    <th className="px-4 py-3">Security Standing</th>
                    <th className="px-4 py-3">Quarantine Log</th>
                    <th className="px-4 py-3 text-right">Lockout Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle bg-white">
                  {filteredProfiles.map((p) => {
                    const isSuspended = suspendedUserIds.has(p.id)
                    const isSelf = p.id === person.id
                    const suspensionRecord = (securityState.suspensions || []).find((s) => s.userId === p.id)

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors hover:bg-surface/60 ${
                          isSuspended ? 'bg-danger-bg/25' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <strong className="block text-ink font-semibold">{p.name}</strong>
                          <span className="text-[11px] text-muted-ink font-mono">{p.id}</span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="block text-ink">{p.role}</span>
                          <span className="text-[11px] text-muted-ink">{p.department}</span>
                        </td>

                        <td className="px-4 py-3.5">
                          {isSuspended ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2 py-0.5 text-[11px] font-bold text-danger-text border border-danger-border">
                              <XCircle size={12} className="text-danger-text" />
                              <span>Suspended</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-pale px-2 py-0.5 text-[11px] font-medium text-primary border border-line">
                              <CheckCircle2 size={12} className="text-primary" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {suspensionRecord ? (
                            <div className="text-[11.5px] text-danger-text max-w-sm">
                              <p className="font-semibold">{suspensionRecord.reason}</p>
                              <p className="text-[10.5px] text-muted-ink mt-0.5">
                                Ordered by {suspensionRecord.suspendedBy} on{' '}
                                {dateText(suspensionRecord.suspendedAt)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-ink text-[11.5px]">
                              Good standing · No active security holds
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {isSuspended ? (
                            <button
                              type="button"
                              onClick={() => setReactivatingTarget({ id: p.id, name: p.name })}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-pale hover:bg-pale/80 text-primary px-3 py-1.5 text-xs font-medium transition"
                            >
                              <RotateCcw size={12} />
                              <span>Reactivate</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => setSuspendingTarget(p)}
                              className={`inline-flex items-center gap-1.5 rounded-xl border border-danger-border bg-white hover:bg-danger-bg text-danger-text px-3 py-1.5 text-xs font-medium transition ${
                                isSelf ? 'opacity-40 cursor-not-allowed' : ''
                              }`}
                              title={isSelf ? 'Cannot self-suspend logged in administrator' : 'Quarantine account'}
                            >
                              <UserX size={12} />
                              <span>Suspend Account</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 7: SESSION & LOCKOUT THRESHOLDS                 */}
        {/* ---------------------------------------------------- */}
        {currentTab === 'thresholds' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-line p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sliders size={16} className="text-primary" />
                  <strong className="text-xs font-semibold uppercase tracking-wider text-muted-ink">
                    Brute-Force Lockout Threshold
                  </strong>
                </div>
                <p className="text-xs text-muted-ink">
                  Consecutive invalid credentials before IP is throttled and staff account enters temporary cooldown.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="range"
                    min="3"
                    max="10"
                    value={policy.maxFailedAttemptsBeforeLock}
                    onChange={(e) =>
                      updatePolicy({
                        maxFailedAttemptsBeforeLock: Number(e.target.value),
                      })
                    }
                    className="flex-1 accent-primary cursor-pointer"
                  />
                  <span className="font-mono text-sm font-bold text-ink w-8 text-right">
                    {policy.maxFailedAttemptsBeforeLock}
                  </span>
                </div>
                <span className="text-[11px] text-muted-ink">
                  Currently triggers after {policy.maxFailedAttemptsBeforeLock} failed attempts
                </span>
              </div>

              <div className="rounded-2xl border border-line p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Radio size={16} className="text-primary" />
                  <strong className="text-xs font-semibold uppercase tracking-wider text-muted-ink">
                    Session Inactivity Timeout (Hours)
                  </strong>
                </div>
                <p className="text-xs text-muted-ink">
                  Idle tokens automatically expire to protect unattended lab terminals and newsroom editing suites.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="range"
                    min="1"
                    max="72"
                    value={Math.round(policy.sessionTimeoutMinutes / 60)}
                    onChange={(e) =>
                      updatePolicy({
                        sessionTimeoutMinutes: Number(e.target.value) * 60,
                      })
                    }
                    className="flex-1 accent-primary cursor-pointer"
                  />
                  <span className="font-mono text-sm font-bold text-ink w-12 text-right">
                    {Math.round(policy.sessionTimeoutMinutes / 60)}h
                  </span>
                </div>
                <span className="text-[11px] text-muted-ink">
                  Bearers expire after {Math.round(policy.sessionTimeoutMinutes / 60)} continuous hours of inactivity
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ---------------------------------------------------- */}
      {/* MODALS                                               */}
      {/* ---------------------------------------------------- */}

      {/* Resolve Threat Modal */}
      {resolvingThreatId && (
        <Modal
          title="Resolve Security Threat Alert"
          onClose={() => {
            setResolvingThreatId(null)
            setResolutionNote('')
          }}
          onSubmit={handleResolveSubmit}
          submit="Confirm resolution"
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-ink">
              Confirming this will mark the threat as mitigated and record your audit note.
            </p>

            {selectedThreat && (
              <div className="rounded-xl bg-surface p-3 border border-line-subtle text-xs space-y-1">
                <strong className="block text-ink">{selectedThreat.title}</strong>
                <p className="text-muted-ink font-mono">{selectedThreat.ip} · {selectedThreat.targetEmail}</p>
              </div>
            )}

            <Field label="Audit & Resolution Note">
              <textarea
                required
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Verified with staff member; legitimate off-campus access confirmed."
                className="w-full text-xs"
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* Add Email Exception Modal */}
      {addingEmailModal && (
        <Modal
          title="Authorize Individual Email"
          onClose={() => setAddingEmailModal(false)}
          onSubmit={handleAddEmailSubmit}
          submit="Grant authorization"
        >
          <div className="space-y-4">
            <Field label="Email Address">
              <input
                type="email"
                required
                placeholder="adviser.external@gmail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full text-xs font-mono"
              />
            </Field>

            <Field label="Role / Justification Note">
              <input
                type="text"
                required
                placeholder="External Photography Mentor & Workshop Judge"
                value={emailNote}
                onChange={(e) => setEmailNote(e.target.value)}
                className="w-full text-xs"
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* Suspend Target Modal */}
      {suspendingTarget && (
        <Modal
          title={`Emergency Suspension: ${suspendingTarget.name}`}
          onClose={() => {
            setSuspendingTarget(null)
            setSuspensionReason('')
          }}
          onSubmit={handleSuspendSubmit}
          submit="Quarantine & lock account"
          destructive
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-danger-bg p-3 text-xs text-danger-text border border-danger-border">
              <strong>Warning: </strong>
              This triggers the emergency killswitch. The user will be immediately logged out of all active sessions and prevented from signing in until reinstated.
            </div>

            <Field label="Formal Suspension Reason">
              <textarea
                required
                rows={3}
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Unusual login location detected; account quarantined until identity verification."
                className="w-full text-xs"
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* Reactivate Target Modal */}
      {reactivatingTarget && (
        <Modal
          title={`Reactivate Account: ${reactivatingTarget.name}`}
          onClose={() => setReactivatingTarget(null)}
          onSubmit={handleReactivateSubmit}
          submit="Reactivate account"
        >
          <div className="space-y-3 text-xs">
            <p className="text-muted-ink">
              Confirm reinstatement of access privileges. The user will be authorized to log in and resume duties.
            </p>
          </div>
        </Modal>
      )}

      {/* Revoke Session Confirmation */}
      {revokingSession && (
        <Modal
          title="Revoke active bearer token?"
          onClose={() => setRevokingSession(null)}
          onSubmit={() => {
            if (revokingSession) {
              revokeSession(revokingSession.id)
              setRevokingSession(null)
            }
          }}
          submit="Terminate session"
          destructive
        >
          <div className="space-y-3 text-xs">
            <p className="text-muted-ink">
              Are you sure you want to invalidate this authenticated session? The client will immediately be signed out.
            </p>
            <div className="rounded-xl bg-surface p-3 border border-line-subtle space-y-1">
              <strong className="block text-ink">{revokingSession.userName}</strong>
              <p className="text-muted-ink font-mono">{revokingSession.device} · {revokingSession.ip}</p>
            </div>
          </div>
        </Modal>
      )}

      {/* Revoke All Sessions Confirmation */}
      {confirmRevokeAll && (
        <Modal
          title="Revoke all remote sessions?"
          onClose={() => setConfirmRevokeAll(false)}
          onSubmit={() => {
            revokeAllOtherSessions()
            setConfirmRevokeAll(false)
          }}
          submit="Terminate all other sessions"
          destructive
        >
          <div className="space-y-3 text-xs">
            <p className="text-muted-ink">
              This will terminate all active sign-ins across all devices except for your current browser. All other lab and remote users will need to re-authenticate.
            </p>
          </div>
        </Modal>
      )}

      {/* Inspect Event Modal */}
      {inspectingEvent && (
        <Modal
          title="Authentication Telemetry Details"
          onClose={() => setInspectingEvent(null)}
          onSubmit={() => setInspectingEvent(null)}
          submit="Close"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface p-3.5 border border-line-subtle">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-ink block">Timestamp</span>
                <span className="font-mono text-ink">{dateText(inspectingEvent.timestamp)}</span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-ink block">Outcome</span>
                <span className={inspectingEvent.status === 'success' ? 'text-primary font-semibold' : 'text-danger-text font-semibold'}>
                  {inspectingEvent.status.toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-ink block">User Email</span>
                <span className="font-mono text-ink">{inspectingEvent.email}</span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-muted-ink block">IP Address</span>
                <span className="font-mono text-ink">{inspectingEvent.ip}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-ink block mb-1">
                Raw User-Agent Signature
              </span>
              <p className="font-mono text-[11px] bg-workspace p-2.5 rounded-xl border border-line-subtle text-muted-ink break-all">
                {inspectingEvent.userAgent}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
