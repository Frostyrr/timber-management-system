import { useState, useMemo } from 'react'
import {
  History,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Laptop,
  Globe2,
  Search,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react'
import { Heading } from '../../components/layout/Heading'
import { useSecuritySuite } from '../../backend/useSecuritySuite'
import { dateText } from '../../components/format'
import { Modal } from '../../components/ui/Modal'
import type { SecurityLoginEvent } from '../../backend/security'

export function SecurityLogins() {
  const { securityState } = useSecuritySuite()

  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'new_devices'>('all')
  const [search, setSearch] = useState('')
  const [inspectingEvent, setInspectingEvent] = useState<SecurityLoginEvent | null>(null)

  const events = securityState.loginEvents

  // Metrics
  const totalCount = events.length
  const failedEvents = useMemo(() => events.filter((e) => e.status === 'failed'), [events])
  const newDeviceEvents = useMemo(() => events.filter((e) => e.isNewDevice), [events])
  const domainBlockCount = useMemo(
    () => events.filter((e) => e.failureReason === 'unauthorized_domain').length,
    [events],
  )

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (statusFilter === 'success' && event.status !== 'success') return false
      if (statusFilter === 'failed' && event.status !== 'failed') return false
      if (statusFilter === 'new_devices' && !event.isNewDevice) return false

      if (search.trim()) {
        const q = search.toLowerCase()
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
  }, [events, statusFilter, search])

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
        eyebrow="AUTHENTICATION TELEMETRY"
        title="Login history & device tracking"
        description="Comprehensive audit of successful logins, failed authentication attempts, and novel device fingerprint detections."
      />

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-wider text-muted-ink uppercase">
              Total Logins
            </span>
            <History size={18} className="text-primary" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono">
              {totalCount}
            </span>
            <span className="text-xs text-muted-ink">all time</span>
          </div>
          <p className="mt-2 text-xs text-muted-ink">
            Chronological authentication events recorded.
          </p>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-wider text-muted-ink uppercase">
              Failed Logins
            </span>
            <ShieldAlert size={18} className="text-red-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono text-red-600">
              {failedEvents.length}
            </span>
            <span className="text-xs text-red-700 font-medium">
              {Math.round((failedEvents.length / (totalCount || 1)) * 100)}% failure rate
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-ink">
            Blocked at identity perimeter gate.
          </p>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-wider text-muted-ink uppercase">
              New Devices Flagged
            </span>
            <Sparkles size={18} className="text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono text-amber-600">
              {newDeviceEvents.length}
            </span>
            <span className="text-xs text-amber-700 font-medium">Novel hardware</span>
          </div>
          <p className="mt-2 text-xs text-muted-ink">
            First-time hardware or user-agent signatures.
          </p>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-wider text-muted-ink uppercase">
              Domain Blocks
            </span>
            <ShieldCheck size={18} className="text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono text-emerald-700">
              {domainBlockCount}
            </span>
            <span className="text-xs text-emerald-700 font-medium">Restricted</span>
          </div>
          <p className="mt-2 text-xs text-muted-ink">
            Protected against non-institutional domains.
          </p>
        </div>
      </div>

      {/* Main Table Panel */}
      <section className="panel p-5 sm:p-6 space-y-4">
        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-line-subtle pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface text-muted-ink hover:text-ink'
              }`}
            >
              All Events ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('success')}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === 'success'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-surface text-muted-ink hover:text-ink'
              }`}
            >
              Successful ({totalCount - failedEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('failed')}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === 'failed'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-surface text-muted-ink hover:text-ink'
              }`}
            >
              Failed ({failedEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('new_devices')}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === 'new_devices'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-surface text-muted-ink hover:text-ink'
              }`}
            >
              New Devices ({newDeviceEvents.length})
            </button>
          </div>

          <div className="relative min-w-[260px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-ink"
            />
            <input
              type="text"
              placeholder="Search user, IP, failure reason…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-line-subtle bg-white/80 focus:bg-white"
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line-subtle text-[11px] font-semibold text-muted-ink uppercase tracking-wider">
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Identity / Account</th>
                <th className="py-3 px-3">Device & Environment</th>
                <th className="py-3 px-3">IP Address & Geolocation</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle text-xs">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-ink">
                    No login telemetry matches the selected filter.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => {
                  const isSuccess = evt.status === 'success'

                  return (
                    <tr
                      key={evt.id}
                      className="hover:bg-surface/50 transition-colors group"
                    >
                      {/* Status */}
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
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200"
                              title="First-seen hardware fingerprint"
                            >
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

                      {/* Identity */}
                      <td className="py-3.5 px-3">
                        <div className="min-w-0">
                          {evt.userName ? (
                            <div className="font-semibold text-ink leading-tight">
                              {evt.userName}
                            </div>
                          ) : null}
                          <div className="font-mono text-[11.5px] text-muted-ink truncate max-w-[220px]">
                            {evt.email}
                          </div>
                        </div>
                      </td>

                      {/* Device & Client */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          {evt.device.toLowerCase().includes('phone') ||
                          evt.device.toLowerCase().includes('android') ? (
                            <Smartphone size={15} className="shrink-0 text-muted-ink" />
                          ) : (
                            <Laptop size={15} className="shrink-0 text-muted-ink" />
                          )}
                          <span className="font-medium text-ink max-w-[200px] truncate">
                            {evt.device}
                          </span>
                        </div>
                      </td>

                      {/* IP & Location */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5">
                          <div className="font-mono text-[11.5px] text-ink font-semibold">
                            {evt.ip}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-muted-ink">
                            <Globe2 size={12} className="shrink-0" />
                            <span>{evt.location}</span>
                          </div>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-muted-ink font-mono text-[11px]">
                        {dateText(evt.timestamp)}
                      </td>

                      {/* Action */}
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
      </section>

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
