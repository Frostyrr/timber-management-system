import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Globe2,
  Mail,
  ShieldCheck,
  Plus,
  Trash2,
  Sliders,
  UserX,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  RefreshCw,
} from 'lucide-react'
import { Heading } from '../../components/layout/Heading'
import { useSecuritySuite } from '../../backend/useSecuritySuite'
import { useInventory } from '../../backend/context'
import { Modal } from '../../components/ui/Modal'
import { Field } from '../../components/ui/Field'
import { Select } from '../../components/ui/Select'
import { dateText } from '../../components/format'
import type { Profile } from '../../backend/model'

export function SecurityPolicies() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'domains'

  const setTab = (tab: 'domains' | 'suspensions' | 'thresholds') => {
    setSearchParams({ tab })
  }

  const { person, state, act } = useInventory()
  const {
    securityState,
    updatePolicy,
    addAllowedDomain,
    removeAllowedDomain,
    addAuthorizedEmail,
    removeAuthorizedEmail,
    suspendAccount,
    reactivateAccount,
    isLive,
    loading,
    syncFromBackend,
  } = useSecuritySuite()

  const policy = securityState.policy

  // Domain & Email state
  const [newDomain, setNewDomain] = useState('')
  const [addingEmailModal, setAddingEmailModal] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailNote, setEmailNote] = useState('')

  // Suspensions state
  const [suspensionFilter, setSuspensionFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [suspensionSearch, setSuspensionSearch] = useState('')
  const [suspendingTarget, setSuspendingTarget] = useState<Profile | null>(null)
  const [reactivatingTarget, setReactivatingTarget] = useState<{ id: string; name: string } | null>(null)
  const [suspensionReason, setSuspensionReason] = useState('')

  const allProfiles = state.profiles ?? []
  const suspendedUserIds = new Set(
    securityState.suspensions.map((s) => s.userId).concat(
      allProfiles.filter((p) => p.status === 'suspended').map((p) => p.id),
    ),
  )

  const activeCount = allProfiles.filter((p) => !suspendedUserIds.has(p.id)).length
  const suspendedCount = suspendedUserIds.size

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

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDomain.trim()) return
    addAllowedDomain(newDomain)
    setNewDomain('')
  }

  const handleAddEmailSubmit = async () => {
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

  return (
    <div className="space-y-6">
      <Heading
        eyebrow="ACCESS CONTROL & ENFORCEMENT"
        title="Policies & account suspensions"
        description="Manage institutional email domain guardrails, individual user whitelists, and emergency account quarantine controls."
      />

      {/* KPI Overview Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          onClick={() => setTab('domains')}
          className={`panel p-4 cursor-pointer transition-all hover:border-primary/40 ${
            currentTab === 'domains' ? 'border-primary ring-1 ring-primary/20 bg-emerald-50/20' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold tracking-wider text-muted-ink uppercase">
              Domain Restrictions
            </span>
            <Globe2 size={16} className="text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink font-mono text-emerald-700">
              {policy.allowedDomains.length}
            </span>
            <span className="text-xs text-muted-ink">approved domains</span>
          </div>
          <p className="mt-1 text-xs text-muted-ink">
            {policy.restrictToAllowedDomains ? 'Strict enforcement active' : 'Permissive mode'}
          </p>
        </div>

        <div
          onClick={() => setTab('suspensions')}
          className={`panel p-4 cursor-pointer transition-all hover:border-primary/40 ${
            currentTab === 'suspensions' ? 'border-red-400 ring-1 ring-red-300 bg-red-50/20' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold tracking-wider text-muted-ink uppercase">
              Quarantined Accounts
            </span>
            <UserX size={16} className="text-red-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight font-mono text-red-600">
              {suspendedCount}
            </span>
            <span className="text-xs text-red-700 font-medium">suspended</span>
          </div>
          <p className="mt-1 text-xs text-muted-ink">
            Emergency killswitch & lockout roster
          </p>
        </div>

        <div
          onClick={() => setTab('thresholds')}
          className={`panel p-4 cursor-pointer transition-all hover:border-primary/40 ${
            currentTab === 'thresholds' ? 'border-primary ring-1 ring-primary/20 bg-emerald-50/20' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] font-semibold tracking-wider text-muted-ink uppercase">
              Session & Lockout Limits
            </span>
            <Sliders size={16} className="text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-ink font-mono">
              {policy.sessionTimeoutMinutes / 60}h
            </span>
            <span className="text-xs text-muted-ink">idle lifetime</span>
          </div>
          <p className="mt-1 text-xs text-muted-ink">
            Lockout after {policy.maxFailedAttemptsBeforeLock} consecutive failures
          </p>
        </div>
      </div>

      {/* Main Tabbed Container */}
      <section className="panel p-5 sm:p-6 space-y-5">
        {/* Sub-Tabs Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-line-subtle pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-surface rounded-2xl border border-line-subtle self-start w-fit">
            <button
              type="button"
              onClick={() => setTab('domains')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                currentTab === 'domains'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-muted-ink hover:text-ink'
              }`}
            >
              <Globe2 size={14} className={currentTab === 'domains' ? 'text-primary' : 'text-muted-ink'} />
              <span>Domain Guard & Allowlist</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('suspensions')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                currentTab === 'suspensions'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-muted-ink hover:text-ink'
              }`}
            >
              <UserX size={14} className={currentTab === 'suspensions' ? 'text-red-600' : 'text-muted-ink'} />
              <span>Account Suspensions & Killswitch</span>
              {suspendedCount > 0 && (
                <span className="rounded-full bg-red-100 px-1.5 py-0.2 text-[10px] text-red-800">
                  {suspendedCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab('thresholds')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                currentTab === 'thresholds'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-muted-ink hover:text-ink'
              }`}
            >
              <Sliders size={14} className={currentTab === 'thresholds' ? 'text-primary' : 'text-muted-ink'} />
              <span>Session & Lockout Thresholds</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => void syncFromBackend()}
            disabled={loading}
            className="rounded-xl border border-line-subtle bg-white px-2.5 py-1 text-xs font-medium text-muted-ink hover:text-ink transition flex items-center gap-1.5"
            title="Synchronize from Supabase database"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-primary' : 'text-muted-ink'} />
            <span>{isLive ? 'DB Connected' : 'Sync'}</span>
          </button>
        </div>

        {/* TAB 1: DOMAINS & EMAIL WHITELIST */}
        {currentTab === 'domains' && (
          <div className="space-y-6 pt-2">
            <div className="rounded-xl border border-line-subtle bg-surface/40 p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                    <ShieldCheck size={16} className="text-primary" />
                    <span>Strict Institutional Domain Enforcement</span>
                  </h3>
                  <p className="text-xs text-muted-ink mt-0.5 max-w-xl">
                    When active, only Google accounts belonging to approved domains (or individually authorized emails) can authenticate.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={policy.restrictToAllowedDomains}
                    onChange={(e) => updatePolicy({ restrictToAllowedDomains: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-line-subtle"></div>
                </label>
              </div>

              {/* Configured Domains */}
              <div className="space-y-2 pt-2 border-t border-line-subtle">
                <label className="text-xs font-semibold text-muted-ink uppercase tracking-wider block">
                  Allowed Domains
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {policy.allowedDomains.map((dom) => (
                    <div
                      key={dom}
                      className="flex items-center justify-between rounded-xl border border-line-subtle bg-white px-3 py-2 text-xs"
                    >
                      <span className="font-mono font-medium text-ink">@{dom}</span>
                      {policy.allowedDomains.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAllowedDomain(dom)}
                          className="rounded-lg p-1 text-muted-ink hover:text-red-600 transition"
                          title="Remove domain"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddDomain} className="flex gap-2 pt-1 max-w-md">
                  <input
                    type="text"
                    placeholder="e.g. publication.university.edu"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-line-subtle font-mono"
                  />
                  <button type="submit" className="secondary text-xs px-3 py-1.5 flex items-center gap-1">
                    <Plus size={13} /> Add Domain
                  </button>
                </form>
              </div>
            </div>

            {/* Whitelisted Emails */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                    <Mail size={16} className="text-primary" />
                    <span>Individually Authorized Email Allowlist</span>
                  </h3>
                  <p className="text-xs text-muted-ink mt-0.5">
                    Individual non-institutional Google accounts authorized to bypass domain restrictions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddingEmailModal(true)}
                  className="primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Plus size={13} /> Authorize Email
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-line-subtle text-[11px] font-semibold text-muted-ink uppercase tracking-wider">
                      <th className="py-2.5 px-3">Authorized Email</th>
                      <th className="py-2.5 px-3">Note / Purpose</th>
                      <th className="py-2.5 px-3">Authorized By</th>
                      <th className="py-2.5 px-3">Added</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line-subtle text-xs">
                    {policy.whitelistedEmails.map((item) => (
                      <tr key={item.email} className="hover:bg-surface/50 transition">
                        <td className="py-3 px-3 font-mono font-semibold text-ink">{item.email}</td>
                        <td className="py-3 px-3 text-muted-ink">{item.note}</td>
                        <td className="py-3 px-3 text-ink font-medium">{item.addedBy}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-muted-ink">{dateText(item.addedAt)}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeAuthorizedEmail(item.email)}
                            className="rounded-lg p-1 text-muted-ink hover:text-red-600 transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACCOUNT SUSPENSIONS & KILLSWITCH */}
        {currentTab === 'suspensions' && (
          <div className="space-y-4 pt-1">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-line-subtle pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSuspensionFilter('all')}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition ${
                    suspensionFilter === 'all'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface text-muted-ink hover:text-ink'
                  }`}
                >
                  All ({allProfiles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSuspensionFilter('active')}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition ${
                    suspensionFilter === 'active'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-surface text-muted-ink hover:text-ink'
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSuspensionFilter('suspended')}
                  className={`rounded-xl px-3 py-1 text-xs font-medium transition ${
                    suspensionFilter === 'suspended'
                      ? 'bg-red-600 text-white shadow-xs'
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
                  placeholder="Search user by name or role…"
                  value={suspensionSearch}
                  onChange={(e) => setSuspensionSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-line-subtle bg-white/80 focus:bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line-subtle text-[11px] font-semibold text-muted-ink uppercase tracking-wider">
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Staff Member</th>
                    <th className="py-3 px-3">Role & Dept</th>
                    <th className="py-3 px-3">Security Standing / Justification</th>
                    <th className="py-3 px-3 text-right">Emergency Killswitch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-subtle text-xs">
                  {filteredProfiles.map((prof) => {
                    const isSuspended = suspendedUserIds.has(prof.id)
                    const record = securityState.suspensions.find((s) => s.userId === prof.id)
                    const isSelf = prof.id === person.id

                    return (
                      <tr
                        key={prof.id}
                        className={`hover:bg-surface/50 transition-colors ${
                          isSuspended ? 'bg-red-50/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {isSuspended ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800 border border-red-200">
                              <XCircle size={12} className="text-red-600" />
                              <span>Suspended</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-ink leading-tight flex items-center gap-1.5">
                            <span>{prof.name}</span>
                            {isSelf && <span className="text-[10px] text-muted-ink">(You)</span>}
                          </div>
                          <div className="font-mono text-[11px] text-muted-ink">
                            {prof.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@thetimberland.pub
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-medium text-ink block">{prof.role}</span>
                          <span className="text-[11px] text-muted-ink">{prof.department || 'Editorial'}</span>
                        </td>

                        <td className="py-3.5 px-3">
                          {isSuspended && record ? (
                            <div className="text-[11.5px] text-red-900 max-w-sm">
                              <strong className="font-semibold">Reason: </strong>
                              <span>{record.reason}</span>
                              <div className="text-[10.5px] text-muted-ink mt-0.5 font-mono">
                                Locked by {record.suspendedBy} on {dateText(record.suspendedAt)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-ink">
                              Good standing · No active security holds
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          {isSuspended ? (
                            <button
                              type="button"
                              onClick={() => setReactivatingTarget({ id: prof.id, name: prof.name })}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-medium transition"
                            >
                              <RotateCcw size={13} />
                              <span>Reactivate</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => {
                                setSuspendingTarget(prof)
                                setSuspensionReason('')
                              }}
                              className={`inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-700 px-3 py-1.5 text-xs font-medium transition ${
                                isSelf ? 'opacity-40 cursor-not-allowed' : ''
                              }`}
                              title={isSelf ? 'Cannot suspend your own administrator account' : 'Emergency killswitch'}
                            >
                              <UserX size={13} />
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

        {/* TAB 3: SESSION TIMEOUTS & LOCKOUTS */}
        {currentTab === 'thresholds' && (
          <div className="space-y-5 pt-1 max-w-2xl">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink block">
                Session Idle Inactivity Lifetime
              </label>
              <Select
                value={String(policy.sessionTimeoutMinutes)}
                onChange={(e) =>
                  updatePolicy({ sessionTimeoutMinutes: Number(e.target.value) })
                }
                options={[
                  { value: '240', label: '4 Hours (High Security / Shared Workstations)' },
                  { value: '480', label: '8 Hours (Standard Work Shift)' },
                  { value: '720', label: '12 Hours (Recommended Default)' },
                  { value: '1440', label: '24 Hours (Editorial Leads / Remote Reporting)' },
                  { value: '10080', label: '7 Days (Extended Mobile Sessions)' },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink block">
                Brute-Force Lockout Threshold
              </label>
              <Select
                value={String(policy.maxFailedAttemptsBeforeLock)}
                onChange={(e) =>
                  updatePolicy({ maxFailedAttemptsBeforeLock: Number(e.target.value) })
                }
                options={[
                  { value: '3', label: '3 Failed Attempts (Aggressive)' },
                  { value: '5', label: '5 Failed Attempts (Standard Recommended)' },
                  { value: '10', label: '10 Failed Attempts (Permissive)' },
                ]}
              />
            </div>

            <div className="pt-2 space-y-3 border-t border-line-subtle">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.notifyOnNewDevice}
                  onChange={(e) => updatePolicy({ notifyOnNewDevice: e.target.checked })}
                  className="mt-0.5 rounded border-line text-primary focus:ring-primary h-4 w-4"
                />
                <div className="text-xs">
                  <span className="font-semibold text-ink block">Flag New Hardware Signatures</span>
                  <span className="text-muted-ink">
                    Automatically trigger security anomaly alerts whenever an account authenticates from an unrecognized browser/device.
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}
      </section>

      {/* Add Email Modal */}
      {addingEmailModal && (
        <Modal
          title="Authorize Individual Email"
          onClose={() => setAddingEmailModal(false)}
          onSubmit={handleAddEmailSubmit}
          submit="Grant authorization"
        >
          <div className="space-y-4">
            <Field label="Google Account Email">
              <input
                type="email"
                placeholder="e.g. adviser.external@gmail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-line-subtle p-2.5 font-mono"
              />
            </Field>

            <Field label="Authorization Purpose / Note">
              <input
                type="text"
                placeholder="e.g. External Photography Mentor or PICO Media Specialist"
                value={emailNote}
                onChange={(e) => setEmailNote(e.target.value)}
                required
                className="w-full text-xs rounded-xl border border-line-subtle p-2.5"
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendingTarget && (
        <Modal
          title={`Emergency Suspension: ${suspendingTarget.name}`}
          onClose={() => setSuspendingTarget(null)}
          onSubmit={handleSuspendSubmit}
          submit="Quarantine & lock account"
          destructive
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-900 border border-red-200">
              <strong className="block font-semibold">Critical Security Containment Action</strong>
              <p>
                Suspending <strong>{suspendingTarget.name}</strong> will instantly invalidate all active browser sessions, reject upcoming OAuth requests, and prevent equipment checkouts.
              </p>
            </div>

            <Field label="Suspension Justification (Required for Audit)">
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                rows={3}
                placeholder="e.g. Unusual login location detected; account locked pending identity verification with editorial board."
                className="w-full text-xs rounded-xl border border-line-subtle p-2.5"
                required
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* Reactivate Modal */}
      {reactivatingTarget && (
        <Modal
          title={`Reactivate Account: ${reactivatingTarget.name}`}
          onClose={() => setReactivatingTarget(null)}
          onSubmit={handleReactivateSubmit}
          submit="Reactivate account"
        >
          <div className="space-y-3 text-xs">
            <p className="text-ink">
              Are you sure you want to lift the security hold on{' '}
              <strong>{reactivatingTarget.name}</strong>?
            </p>
            <p className="text-muted-ink">
              The user will once again be authorized to sign in with their Google Workspace account.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
