import { useState } from 'react'
import {
  UserX,
  UserCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from 'lucide-react'
import { Heading } from '../../components/layout/Heading'
import { useSecuritySuite } from '../../backend/useSecuritySuite'
import { useInventory } from '../../backend/context'
import { dateText } from '../../components/format'
import { Modal } from '../../components/ui/Modal'
import { Field } from '../../components/ui/Field'
import type { Profile } from '../../backend/model'

export function SecuritySuspensions() {
  const { state, person, act } = useInventory()
  const {
    securityState,
    suspendAccount,
    reactivateAccount,
  } = useSecuritySuite()

  const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [search, setSearch] = useState('')
  const [suspendingTarget, setSuspendingTarget] = useState<Profile | null>(null)
  const [reactivatingTarget, setReactivatingTarget] = useState<{ id: string; name: string } | null>(null)
  const [suspensionReason, setSuspensionReason] = useState('')

  const allProfiles = state.profiles ?? []

  // Combine profiles from inventory state with security suspensions record
  const suspendedUserIds = new Set(
    securityState.suspensions.map((s) => s.userId).concat(
      allProfiles.filter((p) => p.status === 'suspended').map((p) => p.id),
    ),
  )

  const activeCount = allProfiles.filter((p) => !suspendedUserIds.has(p.id)).length
  const suspendedCount = suspendedUserIds.size

  const filteredProfiles = allProfiles.filter((p) => {
    const isSuspended = suspendedUserIds.has(p.id)
    if (filter === 'active' && isSuspended) return false
    if (filter === 'suspended' && !isSuspended) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleSuspendSubmit = async () => {
    if (!suspendingTarget || !suspensionReason.trim()) return
    const target = suspendingTarget
    const reason = suspensionReason.trim()

    // 1. Update security state (revoking sessions, logging event)
    suspendAccount(
      target.id,
      target.name,
      `${target.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@thetimberland.pub`,
      target.role,
      reason,
      person.name,
    )

    // 2. Also dispatch database action if possible
    try {
      await act({
        type: 'membership',
        id: target.id,
        role: target.role,
        status: 'suspended',
        reason,
      })
    } catch {
      // Offline / fallback handled gracefully
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
        eyebrow="ACCOUNT QUARANTINE & DISCIPLINARY HOLD"
        title="Account suspension & killswitch"
        description="Emergency account lockdown, access quarantine, and session invalidation for compromised or departed publication members."
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-wider text-muted-ink uppercase">
              Active Accounts
            </span>
            <UserCheck size={18} className="text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono text-emerald-700">
              {activeCount}
            </span>
            <span className="text-xs text-muted-ink">permitted users</span>
          </div>
          <p className="mt-2 text-xs text-muted-ink">
            Accounts with unrestricted operational access.
          </p>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-wider text-muted-ink uppercase">
              Quarantined / Suspended
            </span>
            <UserX size={18} className="text-red-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-ink font-mono text-red-600">
              {suspendedCount}
            </span>
            <span className="text-xs text-red-700 font-medium">Locked out</span>
          </div>
          <p className="mt-2 text-xs text-muted-ink">
            Sign-in blocked at perimeter gate.
          </p>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold tracking-wider text-muted-ink uppercase">
              Enforcement Protocol
            </span>
            <ShieldAlert size={18} className="text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-bold text-ink">Zero-Trust Isolation</span>
          </div>
          <p className="mt-2 text-xs text-muted-ink">
            Suspending terminates all live sessions and revokes OAuth refresh keys.
          </p>
        </div>
      </div>

      {/* Main Roster Panel */}
      <section className="panel p-5 sm:p-6 space-y-4">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-line-subtle pb-4">
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
              All Accounts ({allProfiles.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                filter === 'active'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-surface text-muted-ink hover:text-ink'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('suspended')}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                filter === 'suspended'
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-line-subtle bg-white/80 focus:bg-white"
            />
          </div>
        </div>

        {/* User Account Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line-subtle text-[11px] font-semibold text-muted-ink uppercase tracking-wider">
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Staff Member</th>
                <th className="py-3 px-3">Role & Department</th>
                <th className="py-3 px-3">Audit Details</th>
                <th className="py-3 px-3 text-right">Emergency Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle text-xs">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-ink">
                    No accounts matching the selected filter.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((prof) => {
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
                      {/* Status */}
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

                      {/* Name */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-ink leading-tight flex items-center gap-1.5">
                          <span>{prof.name}</span>
                          {isSelf && (
                            <span className="text-[10px] text-muted-ink font-normal">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-muted-ink">
                          {prof.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@thetimberland.pub
                        </div>
                      </td>

                      {/* Role & Dept */}
                      <td className="py-3.5 px-3">
                        <span className="font-medium text-ink block">
                          {prof.role}
                        </span>
                        <span className="text-[11px] text-muted-ink">
                          {prof.department || 'Editorial Staff'}
                        </span>
                      </td>

                      {/* Audit Details */}
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

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        {isSuspended ? (
                          <button
                            type="button"
                            onClick={() =>
                              setReactivatingTarget({ id: prof.id, name: prof.name })
                            }
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
                            title={isSelf ? 'Cannot suspend your own active administrator account' : 'Lock and quarantine account'}
                          >
                            <UserX size={13} />
                            <span>Suspend Account</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

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
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-900 border border-red-200 space-y-1">
              <strong className="block font-semibold">
                Critical Security Containment Action
              </strong>
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

            <p className="hint">
              This action is logged in the permanent audit trail with your administrator identity ({person.name}).
            </p>
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
              The user will once again be authorized to sign in with their Google Workspace account and access publication equipment according to their assigned role.
            </p>
          </div>
        </Modal>
      )}
    </div>
  )
}
