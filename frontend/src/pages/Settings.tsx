import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, UserX, AlertTriangle, LogOut, Package, Handshake, ShieldCheck, Users } from 'lucide-react'
import { useInventory } from '../backend/context'
import { Heading, Avatar } from '../components/layout'
import { Modal, Field, Badge, Select, ActionMenu } from '../components/ui'
import type { Profile } from '../backend/model'

export function Settings() {
  const { state, person, act, signOut } = useInventory()
  const [editing, setEditing] = useState<Profile | null>(null)
  const [deleteProfileTarget, setDeleteProfileTarget] = useState<Profile | null>(null)
  const [deleteOwnAccountOpen, setDeleteOwnAccountOpen] = useState(false)

  const isAdmin = person.role === 'Administrator'

  // Check if target user has active loans
  const hasActiveLoans = (profileId: string) =>
    state.loans.some((l) => l.borrowerId === profileId && !l.returned)

  const handleDeleteProfile = async (target: Profile, reason: string) => {
    await act({ type: 'delete-profile', id: target.id, reason })
    setDeleteProfileTarget(null)
  }

  const handleDeleteOwnAccount = async () => {
    setDeleteOwnAccountOpen(false)
    if (signOut) {
      await signOut()
    } else {
      window.location.href = '/login'
    }
  }

  return (
    <>
      <Heading
        eyebrow="ACCOUNT & ACCESS"
        title="Account & Membership"
        description="Manage your publication profile, staff access levels, and team authorizations."
      />

      <div className="flex flex-col gap-6">
        {/* Your Profile Card */}
        <section className="panel rounded-3xl border border-white/90 bg-white/85 p-6 shadow-sm backdrop-blur-xl animate-enter">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-line-subtle">
            <div className="flex items-center gap-3.5">
              <Avatar name={person.name} />
              <div>
                <h2 className="text-base font-semibold text-ink leading-tight">{person.name}</h2>
                <p className="text-xs text-muted-ink mt-0.5">
                  {person.role} · {person.department || 'Department not specified'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{person.role}</Badge>
            </div>
          </div>

          {/* Account Authentication & Sign Out */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <p className="text-xs font-medium text-ink">
                Authentication &amp; Access
              </p>
              <p className="text-xs text-muted-ink">
                Connected with authorized student publication Google account.
              </p>
            </div>
            <button
              type="button"
              className="secondary text-xs flex items-center gap-1.5 self-start sm:self-auto"
              onClick={() => void signOut?.()}
            >
              <LogOut size={13} className="shrink-0" />
              <span>Sign out</span>
            </button>
          </div>
        </section>

        {/* Team Membership Management (Visible to Administrators) */}
        {isAdmin && (
          <section className="panel rounded-3xl border border-white/90 bg-white/85 p-6 shadow-sm backdrop-blur-xl animate-enter stagger-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-line-subtle gap-2">
              <div>
                <h2 className="text-base font-semibold text-ink">The Timberland Editorial Staff & Custodians</h2>
                <p className="text-xs text-muted-ink mt-0.5">
                  Official roster of publication members, editorial roles, and accountable equipment release & usage records.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/staff"
                  className="action-pill text-xs flex items-center gap-1.5"
                >
                  <Users size={13} className="shrink-0" />
                  <span>Open full roster</span>
                </Link>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-mono text-muted-ink border border-line-subtle">
                  {state.profiles.length} staff members
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-col divide-y divide-line-subtle/80">
              {state.profiles.map((p) => {
                const isSelf = p.id === person.id
                const usageLoans = state.loans.filter((l) => l.borrowerId === p.id)
                const activeLoans = usageLoans.filter((l) => !l.returned)
                const releaseCount = state.loans.filter((l) => l.issuedBy === p.id).length
                const canIssue = p.role === 'Administrator' || p.role === 'Inventory Custodian'

                return (
                  <div
                    key={p.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 py-4"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <Avatar name={p.name} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-[14px] font-medium text-ink">{p.name}</strong>
                          {p.title && (
                            <span className="rounded-full bg-[#f4f7f4] px-2.5 py-0.5 text-[11px] font-medium text-[#1e3f20] border border-[#d6e3d8]">
                              {p.title}
                            </span>
                          )}
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-muted-ink">
                            {p.role}
                          </span>
                          {isSelf && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                              Current session
                            </span>
                          )}
                          {activeLoans.length > 0 && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                              {activeLoans.length} currently in hand
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-ink">
                          <span>{p.department || 'Editorial'}</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-ink/80 font-medium">
                            <Package size={12} className="text-muted-ink" />
                            {usageLoans.length} equipment usage{usageLoans.length === 1 ? '' : 's'}
                          </span>
                          {canIssue && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 text-ink/80 font-medium">
                                <Handshake size={12} className="text-primary" />
                                {releaseCount} release{releaseCount === 1 ? '' : 's'} authorized
                              </span>
                            </>
                          )}
                          {p.status && p.status !== 'active' && (
                            <span className="ml-1 text-amber-700 font-medium">({p.status})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {!isSelf && (
                        <ActionMenu
                          triggerLabel={`Actions for ${p.name}`}
                          items={[
                            {
                              label: 'Review access & permissions',
                              icon: <ShieldCheck size={14} className="text-primary" />,
                              onClick: () => setEditing(p),
                            },
                            {
                              label: 'Suspend staff access…',
                              icon: <Trash2 size={14} className="text-[#963838]" />,
                              destructive: true,
                              divider: true,
                              onClick: () => setDeleteProfileTarget(p),
                            },
                          ]}
                        />
                      )}
                      {isSelf && (
                        <span className="text-[11.5px] text-muted-ink italic pr-2">
                          Active Administrator
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Account Deletion */}
        <section className="rounded-3xl border border-line-subtle bg-white/70 p-6 shadow-sm backdrop-blur-xl animate-enter stagger-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <AlertTriangle size={15} className="text-muted-ink" />
                Account Management & Deletion
              </h2>
              <p className="text-xs text-muted-ink mt-1 leading-relaxed">
                Sign out of this browser. To end your membership, ask an administrator to suspend your access.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDeleteOwnAccountOpen(true)}
              className="action-pill danger-pill text-xs shrink-0 self-start sm:self-auto font-medium"
            >
              <UserX size={14} className="shrink-0" />
              <span>Sign out of my account</span>
            </button>
          </div>
        </section>
      </div>

      {/* Confirmation Modal: Delete Team Member Account */}
      {deleteProfileTarget && (
        <Modal
          title={`Suspend access for ${deleteProfileTarget.name}?`}
          destructive
          submit="Suspend access"
          onClose={() => setDeleteProfileTarget(null)}
          onSubmit={async (f) => {
            const reason = String(f.get('reason') || 'Account revoked by administrator')
            await handleDeleteProfile(deleteProfileTarget, reason)
          }}
        >
          <div className="flex flex-col gap-3.5">
            <div className="rounded-2xl border border-line-subtle bg-surface/80 p-4 text-xs text-ink">
              <strong className="block text-sm font-semibold text-ink">
                Confirm Account Deletion
              </strong>
              <p className="mt-1 leading-relaxed text-muted-ink">
                You are about to suspend access for <strong>{deleteProfileTarget.name}</strong> ({deleteProfileTarget.role}) in the publication. Their records and equipment history will be retained.
              </p>
              <p className="mt-2 text-[11.5px] text-muted-ink leading-normal">
                This user will immediately lose authorization to borrow or issue publication equipment.
              </p>
            </div>

            {hasActiveLoans(deleteProfileTarget.id) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" role="alert">
                <strong>Attention:</strong> This staff member has active equipment loans that have not yet been returned.
              </div>
            )}

            <Field label="Reason for account removal">
              <textarea
                name="reason"
                required
                rows={2}
                defaultValue="Staff member departed or account decommissioned"
                placeholder="Document the administrative reason for this access removal"
              />
            </Field>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal: Delete Own Account */}
      {deleteOwnAccountOpen && (
        <Modal
          title="Sign out of your account?"
          destructive
          submit="Sign out"
          onClose={() => setDeleteOwnAccountOpen(false)}
          onSubmit={handleDeleteOwnAccount}
        >
          <div className="flex flex-col gap-3.5">
            <div className="rounded-2xl border border-line-subtle bg-surface/80 p-4 text-xs text-ink">
              <strong className="block text-sm font-semibold text-ink">
                Are you sure you want to sign out?
              </strong>
              <p className="mt-1 leading-relaxed text-muted-ink">
                You will be immediately logged out of <strong>The Timberland</strong> workspace. Your saved inventory records will be retained.
              </p>
            </div>

            {hasActiveLoans(person.id) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" role="alert">
                <strong>Warning:</strong> You currently have equipment checked out on loan. Signing out does not close your equipment usage records.
              </div>
            )}

            <p className="text-xs text-muted-ink">
              To regain access in the future, you will need to re-authenticate with your authorized Google Workspace account.
            </p>
          </div>
        </Modal>
      )}

      {/* Modal: Review / Edit Team Member Access */}
      {editing && (
        <Modal
          title={`Access for ${editing.name}`}
          onClose={() => setEditing(null)}
          onSubmit={async (f) => {
            await act({
              type: 'membership',
              id: editing.id,
              role: String(f.get('role')) as Profile['role'],
              status: String(f.get('status')) as 'active' | 'pending' | 'suspended',
              reason: String(f.get('reason')),
            })
          }}
        >
          <Field label="Role">
            <Select name="role" defaultValue={editing.role}>
              {['Staff', 'Inventory Custodian', 'Administrator'].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Membership status">
            <Select name="status" defaultValue={editing.status || 'active'}>
              {['active', 'pending', 'suspended'].map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reason for access change">
            <textarea
              name="reason"
              required
              maxLength={1000}
              placeholder="e.g. Promoted to inventory custodian for visual desk coverage"
            />
          </Field>
        </Modal>
      )}
    </>
  )
}
