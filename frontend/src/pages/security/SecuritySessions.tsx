import { useState } from 'react'
import {
  Radio,
  Laptop,
  Smartphone,
  Globe2,
  LogOut,
  XCircle,
} from 'lucide-react'
import { Heading } from '../../components/layout/Heading'
import { useSecuritySuite } from '../../backend/useSecuritySuite'
import { dateText } from '../../components/format'
import { Modal } from '../../components/ui/Modal'
import type { SecuritySession } from '../../backend/security'

export function SecuritySessions() {
  const {
    securityState,
    revokeSession,
    revokeAllOtherSessions,
  } = useSecuritySuite()

  const [revokingSession, setRevokingSession] = useState<SecuritySession | null>(null)
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false)

  const activeSessions = securityState.sessions.filter((s) => s.status === 'active')
  const revokedSessions = securityState.sessions.filter((s) => s.status === 'revoked')
  const currentSession = securityState.sessions.find((s) => s.isCurrent)

  return (
    <div className="space-y-6">
      <Heading
        eyebrow="SESSION MANAGEMENT & REVOCATION"
        title="Active sessions"
        description="Inspect authenticated user sessions, monitor active connection origins, and remotely terminate compromised tokens."
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-wider text-muted-ink uppercase">
              Active Sessions
            </span>
            <Radio size={18} className="text-emerald-600 animate-pulse" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono text-emerald-700">
              {activeSessions.length}
            </span>
            <span className="text-xs text-muted-ink">authenticated tokens</span>
          </div>
          <p className="mt-2 text-xs text-muted-ink">
            Currently valid cryptographic bearer tokens.
          </p>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-wider text-muted-ink uppercase">
              Revoked Sessions
            </span>
            <XCircle size={18} className="text-muted-ink" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono">
              {revokedSessions.length}
            </span>
            <span className="text-xs text-muted-ink">terminated</span>
          </div>
          <p className="mt-2 text-xs text-muted-ink">
            Tokens invalidated by user or administrator action.
          </p>
        </div>

        <div className="panel p-5 flex flex-col justify-between">
          <div>
            <span className="text-[12px] font-semibold tracking-wider text-muted-ink uppercase block">
              Emergency Containment
            </span>
            <p className="mt-1 text-xs text-muted-ink leading-relaxed">
              Invalidate all remote bearer tokens except for this browser session.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmRevokeAll(true)}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3.5 py-2 text-xs font-semibold transition"
          >
            <LogOut size={14} />
            <span>Revoke All Other Sessions</span>
          </button>
        </div>
      </div>

      {/* Current Session Highlight Card */}
      {currentSession && (
        <section className="panel p-5 sm:p-6 border-emerald-300 bg-gradient-to-r from-emerald-50/40 via-white to-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="rounded-2xl bg-emerald-100/80 p-3 text-emerald-800 shrink-0">
                <Laptop size={22} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-ink">
                    Current Device (This Browser Session)
                  </h3>
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10.5px] font-semibold text-white">
                    Active Now
                  </span>
                </div>
                <p className="text-xs text-ink/80 font-medium">
                  {currentSession.userName} ({currentSession.userEmail})
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-ink font-mono pt-1">
                  <span>{currentSession.device}</span>
                  <span>•</span>
                  <span>IP: {currentSession.ip}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-sans">
                    <Globe2 size={13} className="text-muted-ink" />
                    {currentSession.location}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right text-xs text-muted-ink self-start sm:self-auto font-mono">
              <div>Session Started: {dateText(currentSession.startedAt)}</div>
              <div>Last Ping: {dateText(currentSession.lastActive)}</div>
            </div>
          </div>
        </section>
      )}

      {/* Network Active Sessions Table */}
      <section className="panel p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-line-subtle pb-4">
          <div>
            <h2 className="text-base font-semibold text-ink">
              All Active & Historical Sessions
            </h2>
            <p className="text-xs text-muted-ink mt-0.5">
              Live token registry tracking client hardware, geolocated IP addresses, and session states.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line-subtle text-[11px] font-semibold text-muted-ink uppercase tracking-wider">
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">User & Account</th>
                <th className="py-3 px-3">Device / OS</th>
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
                    {/* Status */}
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

                    {/* User */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-ink leading-tight">
                        {sess.userName}
                      </div>
                      <div className="font-mono text-[11px] text-muted-ink">
                        {sess.userEmail}
                      </div>
                    </td>

                    {/* Device */}
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
                      <div className="text-[11px] text-muted-ink mt-0.5">
                        {sess.browser}
                      </div>
                    </td>

                    {/* IP & Location */}
                    <td className="py-3.5 px-3">
                      <div className="font-mono text-[11.5px] font-semibold text-ink">
                        {sess.ip}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-ink">
                        <Globe2 size={12} className="shrink-0" />
                        <span>{sess.location}</span>
                      </div>
                    </td>

                    {/* Last Active */}
                    <td className="py-3.5 px-3 font-mono text-[11px] text-muted-ink whitespace-nowrap">
                      {dateText(sess.lastActive)}
                    </td>

                    {/* Actions */}
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
      </section>

      {/* Revoke Single Session Modal */}
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

      {/* Revoke All Other Sessions Modal */}
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
    </div>
  )
}
