import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Radio,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Search,
  UserX,
  Activity,
  Globe2,
} from 'lucide-react'
import { Heading } from '../../components/layout/Heading'
import { useSecuritySuite } from '../../backend/useSecuritySuite'
import { Modal } from '../../components/ui/Modal'
import { Field } from '../../components/ui/Field'
import { dateText } from '../../components/format'

export function SecurityThreats() {
  const {
    securityState,
    resolveThreat,
    dismissThreat,
    resetToDefaults,
    isLive,
    loading,
    syncFromBackend,
  } = useSecuritySuite()

  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all')
  const [search, setSearch] = useState('')
  const [resolvingThreatId, setResolvingThreatId] = useState<string | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')

  const activeThreats = securityState.threats.filter((t) => t.status === 'active')
  const resolvedThreats = securityState.threats.filter((t) => t.status === 'resolved')
  const criticalCount = activeThreats.filter((t) => t.severity === 'critical' || t.severity === 'high').length

  const filteredThreats = securityState.threats.filter((t) => {
    if (filter === 'active' && t.status !== 'active') return false
    if (filter === 'resolved' && t.status !== 'resolved') return false
    if (search.trim()) {
      const q = search.toLowerCase()
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

  // Compute security score out of 100
  const score = Math.max(
    65,
    100 - activeThreats.length * 8 - (criticalCount > 0 ? 12 : 0),
  )

  const selectedThreat = securityState.threats.find((t) => t.id === resolvingThreatId)

  return (
    <div className="space-y-6">
      <Heading
        eyebrow="SECURITY OPERATIONS CENTER"
        title="Threat monitoring & posture"
        description="Real-time heuristic threat detection, suspicious activity monitoring, and automated perimeter defense."
      />

      {/* Top Threat & Posture Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Posture Score */}
        <div className="panel p-5 relative overflow-hidden bg-gradient-to-br from-white/95 to-emerald-50/40">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-wider text-muted-ink uppercase">
              Security Posture
            </span>
            <span className="rounded-full bg-emerald-100/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-800">
              Grade A
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono">
              {score}
            </span>
            <span className="text-xs text-muted-ink font-medium">/ 100</span>
          </div>
          <p className="mt-2 text-xs text-muted-ink">
            {criticalCount === 0
              ? 'No active critical breach indicators.'
              : `${criticalCount} urgent anomalies require investigation.`}
          </p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line-subtle">
            <div
              className={`h-full transition-all duration-500 ${
                score >= 85 ? 'bg-emerald-600' : score >= 70 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Active Anomalies */}
        <div className="panel p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-wider text-muted-ink uppercase">
              Active Threats
            </span>
            <ShieldAlert
              size={18}
              className={activeThreats.length > 0 ? 'text-amber-600 animate-pulse' : 'text-emerald-600'}
            />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono">
              {activeThreats.length}
            </span>
            <span className="text-xs text-amber-700 font-medium">
              {criticalCount} critical / high
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-ink">
            {activeThreats.length === 0
              ? 'All security anomalies neutralized.'
              : 'Suspicious activities pending administrative action.'}
          </p>
        </div>

        {/* Active Sessions */}
        <Link
          to="/security/sessions"
          className="panel p-5 group hover:border-primary/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-wider text-muted-ink uppercase">
              Active Sessions
            </span>
            <Radio size={18} className="text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono">
              {securityState.sessions.filter((s) => s.status === 'active').length}
            </span>
            <span className="text-xs text-emerald-700 font-medium">Online now</span>
          </div>
          <p className="mt-2 text-xs text-muted-ink flex items-center justify-between">
            <span>Manage & revoke sessions</span>
            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>

        {/* Quarantined Accounts */}
        <Link
          to="/security/policies?tab=suspensions"
          className="panel p-5 group hover:border-primary/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-wider text-muted-ink uppercase">
              Suspended Accounts
            </span>
            <UserX size={18} className="text-red-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono">
              {securityState.suspensions.length}
            </span>
            <span className="text-xs text-red-700 font-medium">Quarantined</span>
          </div>
          <p className="mt-2 text-xs text-muted-ink flex items-center justify-between">
            <span>View lock history & killswitch</span>
            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Link>
      </div>

      {/* Real-time Threat Monitoring Section */}
      <section className="panel p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line-subtle pb-4">
          <div>
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <Activity size={18} className="text-primary" />
              <span>Real-Time Suspicious Activity Stream</span>
            </h2>
            <p className="text-xs text-muted-ink mt-0.5">
              Heuristic anomaly detection engine analyzing authentication velocity, geographical variance, and unknown hardware signatures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-primary border border-emerald-200">
              <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-400'}`} />
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
              <span>Reset demo logs</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                filter === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface text-muted-ink hover:text-ink'
              }`}
            >
              All Alerts ({securityState.threats.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                filter === 'active'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-surface text-muted-ink hover:text-ink'
              }`}
            >
              Active ({activeThreats.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('resolved')}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                filter === 'resolved'
                  ? 'bg-emerald-600 text-white shadow-xs'
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-line-subtle bg-white/80 focus:bg-white"
            />
          </div>
        </div>

        {/* Threat Cards Stream */}
        <div className="space-y-3 pt-1">
          {filteredThreats.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-line-subtle bg-surface/50">
              <ShieldCheck size={32} className="mx-auto text-emerald-600 mb-2" />
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
                      ? 'border-red-300 bg-red-50/60 shadow-xs'
                      : isHigh
                      ? 'border-amber-300 bg-amber-50/60 shadow-xs'
                      : 'border-line-subtle bg-white/90'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 shrink-0 rounded-xl p-2 ${
                          isCritical
                            ? 'bg-red-100 text-red-700'
                            : isHigh
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isCritical || isHigh ? (
                          <AlertTriangle size={18} />
                        ) : (
                          <ShieldAlert size={18} />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-ink">
                            {threat.title}
                          </h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              threat.severity === 'critical'
                                ? 'bg-red-600 text-white'
                                : threat.severity === 'high'
                                ? 'bg-amber-500 text-white'
                                : threat.severity === 'medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {threat.severity}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isActive
                                ? 'bg-red-100 text-red-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isActive ? '● Unresolved' : '✓ Resolved'}
                          </span>
                        </div>

                        <p className="text-xs text-ink/80 leading-relaxed max-w-3xl">
                          {threat.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[11px] text-muted-ink font-mono">
                          <span className="flex items-center gap-1 font-sans text-ink font-medium">
                            Target: <span className="font-mono text-primary">{threat.targetEmail}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Globe2 size={13} className="text-muted-ink" />
                            {threat.location}
                          </span>
                          <span>•</span>
                          <span>IP: <code className="bg-surface px-1 py-0.5 rounded text-ink">{threat.ip}</code></span>
                          <span>•</span>
                          <span>Logged: {dateText(threat.timestamp)}</span>
                        </div>

                        {threat.resolutionNote && (
                          <div className="mt-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-2.5">
                            <strong className="font-semibold text-emerald-950">Resolution Note: </strong>
                            {threat.resolutionNote}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                      {isActive ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setResolvingThreatId(threat.id)
                              setResolutionNote('')
                            }}
                            className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-xs font-medium shadow-xs transition"
                          >
                            Resolve Alert
                          </button>
                          <button
                            type="button"
                            onClick={() => dismissThreat(threat.id)}
                            className="rounded-xl border border-line-subtle bg-white hover:bg-surface text-muted-ink hover:text-ink px-2.5 py-1.5 text-xs font-medium transition"
                          >
                            Dismiss
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-xl">
                          <CheckCircle2 size={14} /> Closed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Resolve Threat Modal */}
      {resolvingThreatId && selectedThreat && (
        <Modal
          title="Resolve security anomaly"
          onClose={() => setResolvingThreatId(null)}
          onSubmit={async () => {
            resolveThreat(
              resolvingThreatId,
              resolutionNote || 'Threat verified and resolved by administrator.',
            )
            setResolvingThreatId(null)
          }}
          submit="Confirm resolution"
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-surface p-3 text-xs text-ink space-y-1">
              <strong className="block font-semibold text-sm">{selectedThreat.title}</strong>
              <p className="text-muted-ink">{selectedThreat.description}</p>
              <div className="mt-2 text-[11px] font-mono text-muted-ink">
                Target: {selectedThreat.targetEmail} · IP: {selectedThreat.ip}
              </div>
            </div>

            <Field label="Resolution audit note">
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={3}
                placeholder="e.g. Verified with staff member; legitimate travel on university business. Session cleared."
                className="w-full text-xs rounded-xl border border-line-subtle p-2.5"
                required
              />
            </Field>

            <p className="hint">
              Closing this threat will update the security posture score and record the resolution justification in the cybersecurity log.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
