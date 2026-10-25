import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
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
  ShieldAlert,
} from 'lucide-react'
import { Heading } from '../../components/layout/Heading'
import { useSecuritySuite } from '../../backend/useSecuritySuite'
import { dateText } from '../../components/format'
import { Modal } from '../../components/ui/Modal'
import type { SecuritySession, SecurityLoginEvent } from '../../backend/security'

export function SecuritySessions() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'sessions'

  const setTab = (tab: 'sessions' | 'logins' | 'devices') => {
    setSearchParams({ tab })
  }

  const {
    securityState,
    revokeSession,
    revokeAllOtherSessions,
  } = useSecuritySuite()

  const [revokingSession, setRevokingSession] = useState<SecuritySession | null>(null)
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false)
  const [inspectingEvent, setInspectingEvent] = useState<SecurityLoginEvent | null>(null)

  // Filters for logins tab
  const [loginStatusFilter, setLoginStatusFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const activeSessions = securityState.sessions.filter((s) => s.status === 'active')
  const currentSession = securityState.sessions.find((s) => s.isCurrent)

  const events = securityState.loginEvents
  const failedEvents = useMemo(() => events.filter((e) => e.status === 'failed'), [events])
  const newDeviceEvents = useMemo(() => events.filter((e) => e.isNewDevice), [events])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (currentTab === 'devices' && !event.isNewDevice) return false
      if (currentTab === 'logins') {
        if (loginStatusFilter === 'success' && event.status !== 'success') return false
        if (loginStatusFilter === 'failed' && event.status !== 'failed') return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
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
  }, [events, currentTab, loginStatusFilter, searchQuery])

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
        eyebrow="AUTHENTICATION & SESSION TELEMETRY"
        title="Sessions & login telemetry"
        description="Inspect active authenticated bearer tokens, review chronological sign-in logs, and track novel device detections."
      />

      {/* Unified KPI Overview Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          onClick={() => setTab('sessions')}
          className={`panel p-4 cursor-pointer transition-all hover:border-primary/40 ${
            currentTab === 'sessions' ? 'border-primary ring-1 ring-primary/20 bg-emerald-50/20' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold tracking-wider text-muted-ink uppercase">
              Active Sessions
            </span>
            <Radio size={16} className="text-emerald-600 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink font-mono text-emerald-700">
              {activeSessions.length}
            </span>
            <span className="text-xs text-muted-ink">online now</span>
          </div>
        </div>

        <div
          onClick={() => setTab('logins')}
          className={`panel p-4 cursor-pointer transition-all hover:border-primary/40 ${
            currentTab === 'logins' && loginStatusFilter === 'all'
              ? 'border-primary ring-1 ring-primary/20 bg-emerald-50/20'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold tracking-wider text-muted-ink uppercase">
              Total Logins
            </span>
            <History size={16} className="text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink font-mono">
              {events.length}
            </span>
            <span className="text-xs text-muted-ink">audited events</span>
          </div>
        </div>

        <div
          onClick={() => {
            setTab('logins')
            setLoginStatusFilter('failed')
          }}
          className={`panel p-4 cursor-pointer transition-all hover:border-primary/40 ${
            currentTab === 'logins' && loginStatusFilter === 'failed'
              ? 'border-red-400 ring-1 ring-red-300 bg-red-50/20'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold tracking-wider text-muted-ink uppercase">
              Failed Logins
            </span>
            <ShieldAlert size={16} className="text-red-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight font-mono text-red-600">
              {failedEvents.length}
            </span>
            <span className="text-xs text-red-700 font-medium">denied at gate</span>
          </div>
        </div>

        <div
          onClick={() => setTab('devices')}
          className={`panel p-4 cursor-pointer transition-all hover:border-primary/40 ${
            currentTab === 'devices' ? 'border-amber-400 ring-1 ring-amber-300 bg-amber-50/20' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold tracking-wider text-muted-ink uppercase">
              New Devices Flagged
            </span>
            <Sparkles size={16} className="text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight font-mono text-amber-600">
              {newDeviceEvents.length}
            </span>
            <span className="text-xs text-amber-700 font-medium">novel signatures</span>
          </div>
        </div>
      </div>

      {/* Main Tabbed Container */}
      <section className="panel p-5 sm:p-6 space-y-5">
        {/* Sub-Tabs Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-line-subtle pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-surface rounded-2xl border border-line-subtle">
            <button
              type="button"
              onClick={() => setTab('sessions')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                currentTab === 'sessions'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-muted-ink hover:text-ink'
              }`}
            >
              <Radio size={14} className={currentTab === 'sessions' ? 'text-primary' : 'text-muted-ink'} />
              <span>Active Sessions</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] text-emerald-800">
                {activeSessions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab('logins')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                currentTab === 'logins'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-muted-ink hover:text-ink'
              }`}
            >
              <History size={14} className={currentTab === 'logins' ? 'text-primary' : 'text-muted-ink'} />
              <span>Login History & Failures</span>
              <span className="rounded-full bg-line-subtle px-1.5 py-0.2 text-[10px] text-ink">
                {events.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTab('devices')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                currentTab === 'devices'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-muted-ink hover:text-ink'
              }`}
            >
              <Sparkles size={14} className={currentTab === 'devices' ? 'text-amber-600' : 'text-muted-ink'} />
              <span>New Devices</span>
              <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] text-amber-800">
                {newDeviceEvents.length}
              </span>
            </button>
          </div>

          {currentTab === 'sessions' && (
            <button
              type="button"
              onClick={() => setConfirmRevokeAll(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 text-xs font-semibold transition"
            >
              <LogOut size={13} />
              <span>Revoke All Other Sessions</span>
            </button>
          )}

          {(currentTab === 'logins' || currentTab === 'devices') && (
            <div className="relative min-w-[240px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink"
              />
              <input
                type="text"
                placeholder="Search user, IP, device, reason…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-line-subtle bg-white/80 focus:bg-white"
              />
            </div>
          )}
        </div>

        {/* TAB 1: ACTIVE SESSIONS */}
        {currentTab === 'sessions' && (
          <div className="space-y-4">
            {/* Current Session Banner */}
            {currentSession && (
              <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50/50 via-white to-white p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-emerald-100 p-2 text-emerald-800 shrink-0">
                      <Laptop size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-semibold text-ink">
                          Current Device (This Browser Session)
                        </strong>
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Active Now
                        </span>
                      </div>
                      <p className="text-xs text-muted-ink mt-0.5">
                        {currentSession.userName} ({currentSession.userEmail}) · {currentSession.device}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-ink font-mono mt-1">
                        <span>IP: {currentSession.ip}</span>
                        <span>•</span>
                        <span>{currentSession.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-ink font-mono sm:text-right">
                    <div>Started: {dateText(currentSession.startedAt)}</div>
                    <div>Last Ping: {dateText(currentSession.lastActive)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Sessions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line-subtle text-[11px] font-semibold text-muted-ink uppercase tracking-wider">
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Staff Member</th>
                    <th className="py-3 px-3">Device / Browser</th>
                    <th className="py-3 px-3">IP & Location</th>
                    <th className="py-3 px-3">Last Active</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle text-xs">
                  {securityState.sessions.map((sess) => {
                    const isActive = sess.status === 'active'

                    return (
                      <tr
                        key={sess.id}
                        className={`hover:bg-surface/50 transition-colors ${
                          sess.isCurrent ? 'bg-emerald-50/20' : ''
                        } ${!isActive ? 'opacity-60 bg-surface/30' : ''}`}
                      >
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                              <Radio size={12} className="text-emerald-600 animate-pulse" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 border border-zinc-200">
                              <XCircle size={12} className="text-zinc-500" />
                              <span>Revoked</span>
                            </span>
                          )}
                          {sess.isCurrent && (
                            <span className="ml-1.5 text-[10px] font-bold text-primary uppercase">
                              (You)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-ink leading-tight">
                            {sess.userName}
                          </div>
                          <div className="font-mono text-[11px] text-muted-ink">
                            {sess.userEmail}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            {sess.device.toLowerCase().includes('iphone') ||
                            sess.device.toLowerCase().includes('android') ? (
                              <Smartphone size={15} className="shrink-0 text-muted-ink" />
                            ) : (
                              <Laptop size={15} className="shrink-0 text-muted-ink" />
                            )}
                            <span className="font-medium text-ink max-w-[200px] truncate">
                              {sess.device}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-ink mt-0.5 font-mono">
                            {sess.browser}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-mono text-[11.5px] font-semibold text-ink">
                            {sess.ip}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-muted-ink">
                            <Globe2 size={12} className="shrink-0" />
                            <span>{sess.location}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 font-mono text-[11px] text-muted-ink whitespace-nowrap">
                          {dateText(sess.lastActive)}
                        </td>

                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          {isActive && !sess.isCurrent ? (
                            <button
                              type="button"
                              onClick={() => setRevokingSession(sess)}
                              className="rounded-xl border border-red-200 bg-red-50/80 hover:bg-red-100 text-red-700 px-2.5 py-1 text-[11px] font-medium transition"
                            >
                              Revoke Session
                            </button>
                          ) : sess.isCurrent ? (
                            <span className="text-[11px] text-muted-ink font-medium">
                              Current Session
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-ink">
                              Terminated
                            </span>
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

        {/* TAB 2 & 3: LOGIN HISTORY & NEW DEVICES */}
        {(currentTab === 'logins' || currentTab === 'devices') && (
          <div className="space-y-4">
            {currentTab === 'logins' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLoginStatusFilter('all')}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition ${
                    loginStatusFilter === 'all'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface text-muted-ink hover:text-ink'
                  }`}
                >
                  All ({events.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLoginStatusFilter('success')}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition ${
                    loginStatusFilter === 'success'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-surface text-muted-ink hover:text-ink'
                  }`}
                >
                  Success ({events.length - failedEvents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLoginStatusFilter('failed')}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition ${
                    loginStatusFilter === 'failed'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-surface text-muted-ink hover:text-ink'
                  }`}
                >
                  Failed ({failedEvents.length})
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line-subtle text-[11px] font-semibold text-muted-ink uppercase tracking-wider">
                    <th className="py-3 px-3">Result</th>
                    <th className="py-3 px-3">Identity</th>
                    <th className="py-3 px-3">Device / Signature</th>
                    <th className="py-3 px-3">IP & Location</th>
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle text-xs">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted-ink">
                        No login events match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((evt) => {
                      const isSuccess = evt.status === 'success'

                      return (
                        <tr key={evt.id} className="hover:bg-surface/50 transition">
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {isSuccess ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 size={12} className="text-emerald-600" />
                                  <span>Success</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 border border-red-200">
                                  <XCircle size={12} className="text-red-600" />
                                  <span>Failed</span>
                                </span>
                              )}

                              {evt.isNewDevice && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                                  <Sparkles size={11} className="text-amber-600" />
                                  <span>New Device</span>
                                </span>
                              )}
                            </div>

                            {!isSuccess && evt.failureReason && (
                              <div className="mt-1 text-[10.5px] font-medium text-red-600">
                                {getReasonLabel(evt.failureReason)}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3">
                            {evt.userName && (
                              <div className="font-semibold text-ink leading-tight">
                                {evt.userName}
                              </div>
                            )}
                            <div className="font-mono text-[11.5px] text-muted-ink truncate max-w-[200px]">
                              {evt.email}
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2">
                              {evt.device.toLowerCase().includes('phone') ||
                              evt.device.toLowerCase().includes('android') ? (
                                <Smartphone size={15} className="shrink-0 text-muted-ink" />
                              ) : (
                                <Laptop size={15} className="shrink-0 text-muted-ink" />
                              )}
                              <span className="font-medium text-ink max-w-[190px] truncate">
                                {evt.device}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="font-mono text-[11.5px] text-ink font-semibold">
                              {evt.ip}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-muted-ink">
                              <Globe2 size={12} className="shrink-0" />
                              <span>{evt.location}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap text-muted-ink font-mono text-[11px]">
                            {dateText(evt.timestamp)}
                          </td>

                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setInspectingEvent(evt)}
                              className="rounded-xl border border-line-subtle bg-white px-2.5 py-1 text-[11px] font-medium text-muted-ink hover:text-ink hover:bg-surface transition"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Revoke Modal */}
      {revokingSession && (
        <Modal
          title="Revoke active bearer token?"
          onClose={() => setRevokingSession(null)}
          onSubmit={async () => {
            revokeSession(revokingSession.id)
            setRevokingSession(null)
          }}
          submit="Terminate session"
          destructive
        >
          <div className="space-y-3 text-xs">
            <p className="text-ink">
              Are you sure you want to terminate the active session for{' '}
              <strong>{revokingSession.userName}</strong> on{' '}
              <strong>{revokingSession.device}</strong>?
            </p>
            <div className="rounded-xl bg-surface p-3 space-y-1 font-mono text-[11px] text-muted-ink">
              <div>IP: {revokingSession.ip}</div>
              <div>Location: {revokingSession.location}</div>
              <div>Started: {dateText(revokingSession.startedAt)}</div>
            </div>
            <p className="text-red-700 font-medium">
              The user will be immediately logged out and forced to re-authenticate with Google Workspace.
            </p>
          </div>
        </Modal>
      )}

      {/* Revoke All Modal */}
      {confirmRevokeAll && (
        <Modal
          title="Revoke all other active sessions?"
          onClose={() => setConfirmRevokeAll(false)}
          onSubmit={async () => {
            revokeAllOtherSessions()
            setConfirmRevokeAll(false)
          }}
          submit="Revoke all remote sessions"
          destructive
        >
          <div className="space-y-3 text-xs">
            <p className="text-ink">
              This emergency action will invalidate all cryptographic bearer tokens across all devices except this current browser session.
            </p>
            <p className="text-red-700 font-medium">
              All other editorial staff and active logins will be immediately disconnected.
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-line-subtle bg-surface/60 p-3">
                <span className="text-muted-ink block text-[11px] uppercase font-semibold">Result</span>
                <span className={`text-sm font-semibold ${inspectingEvent.status === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {inspectingEvent.status === 'success' ? 'Successful Login' : 'Authentication Denied'}
                </span>
                {inspectingEvent.failureReason && (
                  <p className="mt-1 text-red-600 font-medium">
                    {getReasonLabel(inspectingEvent.failureReason)}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-line-subtle bg-surface/60 p-3">
                <span className="text-muted-ink block text-[11px] uppercase font-semibold">Hardware Type</span>
                <span className="text-sm font-semibold text-ink">
                  {inspectingEvent.isNewDevice ? 'Novel Hardware Signature' : 'Recognized Trusted Hardware'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-line-subtle p-3 space-y-2 text-xs">
              <div>
                <span className="text-muted-ink font-medium">Email / Account:</span>
                <div className="font-mono text-ink font-semibold">{inspectingEvent.email}</div>
              </div>
              <div>
                <span className="text-muted-ink font-medium">Source IP & Location:</span>
                <div className="font-mono text-ink font-semibold">{inspectingEvent.ip} ({inspectingEvent.location})</div>
              </div>
              <div>
                <span className="text-muted-ink font-medium">Device Profile:</span>
                <div className="text-ink font-medium">{inspectingEvent.device}</div>
              </div>
              <div>
                <span className="text-muted-ink font-medium">Raw User-Agent String:</span>
                <div className="font-mono text-[11px] text-muted-ink bg-surface p-2 rounded-lg break-all mt-1 border border-line-subtle">
                  {inspectingEvent.userAgent}
                </div>
              </div>
              <div>
                <span className="text-muted-ink font-medium">Timestamp:</span>
                <div className="font-mono text-ink">{inspectingEvent.timestamp}</div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
