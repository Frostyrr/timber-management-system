import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  UserPlus,
  Search,
  Package,
  Handshake,
  Pencil,
  Trash2,
  History,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import { useInventory } from '../backend/context'
import { canInventory, type Profile } from '../backend/model'
import { dateText } from '../components/format'
import { Heading, Avatar } from '../components/layout'
import { Badge, Empty, Modal, Field, Select, ActionMenu } from '../components/ui'

const EDITORIAL_DEPARTMENTS = [
  'Editorial Board',
  'Multimedia & Visuals',
  'Photojournalism',
  'Videojournalism',
  'Video Production',
  'Art & Cartoons',
  'Layout & Graphics',
  'News Desk',
  'Opinion & Columns',
  'General Circulation',
]

const EDITORIAL_TITLES = [
  'Editor-in-Chief',
  'Associate Editor',
  'Managing Editor',
  'Multimedia Director',
  'Head Photojournalist',
  'Head Videojournalist',
  'Head Video Editor',
  'Head Cartoonist',
  'Head Graphics Artist',
  'News Writer',
  'Column Writer',
  'Photojournalist',
  'Videojournalist',
  'Graphics Artist',
  'Cartoonist',
  'Staff Member',
]

export function Staff() {
  const { state, person, act, refresh } = useInventory()
  const isAuthorized = canInventory(person)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [deleteProfileTarget, setDeleteProfileTarget] = useState<Profile | null>(null)
  const [viewingHistoryProfile, setViewingHistoryProfile] = useState<Profile | null>(null)

  if (!isAuthorized) {
    return <Navigate to="/" replace />
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refresh?.()
    } finally {
      setRefreshing(false)
    }
  }

  const hasActiveLoans = (profileId: string) =>
    state.loans.some((l) => l.borrowerId === profileId && !l.returned)

  // Filtered staff list
  const filteredProfiles = state.profiles.filter((p) => {
    const query = search.toLowerCase()
    const matchesSearch =
      p.name.toLowerCase().includes(query) ||
      (p.title ?? '').toLowerCase().includes(query) ||
      p.role.toLowerCase().includes(query) ||
      (p.department ?? '').toLowerCase().includes(query)

    if (!matchesSearch) return false

    if (roleFilter !== 'all' && p.role !== roleFilter) return false
    if (statusFilter !== 'all' && (p.status || 'active') !== statusFilter) return false

    return true
  })

  // Quick summary counts
  const totalStaffCount = state.profiles.length
  const membersWithActiveGear = state.profiles.filter((p) => hasActiveLoans(p.id)).length
  const custodiansCount = state.profiles.filter((p) =>
    ['Administrator', 'Inventory Custodian'].includes(p.role),
  ).length
  const totalLoansCount = state.loans.length

  const handleUpdateMember = async (f: FormData) => {
    if (!editingProfile) return
    await act({
      type: 'update-profile',
      id: editingProfile.id,
      name: String(f.get('name') || '').trim(),
      title: String(f.get('title') || '').trim() || undefined,
      department: String(f.get('department') || 'Editorial Board').trim(),
      role: String(f.get('role')) as Profile['role'],
      status: String(f.get('status') || 'active') as 'active' | 'pending' | 'suspended',
      reason: String(f.get('reason') || ''),
    })
    setEditingProfile(null)
  }

  const handleDeleteMember = async (target: Profile, reason: string) => {
    await act({
      type: 'delete-profile',
      id: target.id,
      reason,
    })
    setDeleteProfileTarget(null)
  }

  return (
    <>
      <Heading
        eyebrow="EDITORIAL BOARD & ACCESS CONTROL"
        title="Staff members & accountability roster"
        description="Official publication staff directory, role authorizations, and accountable equipment usage & release records."
      >
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="primary flex items-center gap-1.5"
        >
          <UserPlus size={15} />
          <span>Add staff member</span>
        </button>
      </Heading>

      {/* Mini Summary Metrics */}
      <section className="mini-metrics" aria-label="Staff roster summary">
        <button
          type="button"
          className={`mini-metric stagger-item ${roleFilter === 'all' && statusFilter === 'all' ? 'active' : ''}`}
          style={{ '--stagger-i': 0 } as React.CSSProperties}
          onClick={() => {
            setRoleFilter('all')
            setStatusFilter('all')
          }}
        >
          <span>Official members</span>
          <strong>{totalStaffCount}</strong>
        </button>

        <button
          type="button"
          className={`mini-metric stagger-item ${statusFilter === 'active-loans' ? 'active' : ''}`}
          style={{ '--stagger-i': 1 } as React.CSSProperties}
          onClick={() => {
            setStatusFilter(statusFilter === 'active-loans' ? 'all' : 'active-loans')
          }}
        >
          <span>With active gear</span>
          <strong>{membersWithActiveGear}</strong>
        </button>

        <button
          type="button"
          className={`mini-metric stagger-item ${roleFilter === 'Inventory Custodian' ? 'active' : ''}`}
          style={{ '--stagger-i': 2 } as React.CSSProperties}
          onClick={() => {
            setRoleFilter(roleFilter === 'Inventory Custodian' ? 'all' : 'Inventory Custodian')
          }}
        >
          <span>Custodians & Admins</span>
          <strong>{custodiansCount}</strong>
        </button>

        <Link
          to="/logs?filter=loans"
          className="mini-metric stagger-item"
          style={{ '--stagger-i': 3 } as React.CSSProperties}
        >
          <span>Publication checkouts</span>
          <strong>{totalLoansCount}</strong>
        </Link>
      </section>

      {/* Frosted Panel with Staff Table */}
      <section className="panel animate-enter" aria-label="Staff roster table">
        <div className="toolbar">
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Search staff members"
              placeholder="Search by name, title, department, or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <div className="toolbar-controls">
            <button
              type="button"
              className="icon-button"
              title="Refresh staff records"
              aria-label="Refresh records"
              onClick={handleRefresh}
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin text-primary' : ''} />
            </button>

            <Select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-auto min-w-[150px]"
              buttonClassName="h-9 py-1 px-3 text-xs"
            >
              <option value="all">All Roles</option>
              <option value="Administrator">Administrator</option>
              <option value="Inventory Custodian">Inventory Custodian</option>
              <option value="Staff">Staff</option>
            </Select>

            <Select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-auto min-w-[140px]"
              buttonClassName="h-9 py-1 px-3 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </Select>
          </div>
        </div>

        {/* Mobile Staff Cards List */}
        <div className="mobile-staff-cards flex flex-col gap-3 md:hidden">
          {filteredProfiles.map((p, idx) => {
            const isSelf = p.id === person.id
            const usageLoans = state.loans.filter((l) => l.borrowerId === p.id)
            const activeLoans = usageLoans.filter((l) => !l.returned)
            const releaseCount = state.loans.filter((l) => l.issuedBy === p.id).length
            const canIssue = p.role === 'Administrator' || p.role === 'Inventory Custodian'

            return (
              <article
                key={`m-staff-${p.id}`}
                className="staff-mobile-card stagger-item flex flex-col gap-3 rounded-[20px] border border-white/90 bg-white/85 p-4 shadow-[0_4px_16px_rgba(21,63,50,0.05)] backdrop-blur-md"
                style={{ '--stagger-i': idx } as React.CSSProperties}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={p.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <strong className="block truncate text-[14px] font-medium text-ink">
                          {p.name}
                        </strong>
                        {isSelf && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-800">
                            You
                          </span>
                        )}
                      </div>
                      <span className="block truncate text-xs text-muted-ink">
                        {p.title || p.role} · {p.department}
                      </span>
                    </div>
                  </div>

                  <ActionMenu
                    triggerLabel={`Actions for ${p.name}`}
                    items={[
                      !isSelf && person.role === 'Administrator' && {
                        label: 'Edit details & permissions',
                        icon: <Pencil size={14} className="text-muted-ink" />,
                        onClick: () => setEditingProfile(p),
                      },
                      {
                        label: 'View equipment history',
                        icon: <History size={14} className="text-muted-ink" />,
                        onClick: () => setViewingHistoryProfile(p),
                      },
                      !isSelf && person.role === 'Administrator' && {
                        label: 'Suspend staff access…',
                        icon: <Trash2 size={14} className="text-[#963838]" />,
                        destructive: true,
                        divider: true,
                        onClick: () => setDeleteProfileTarget(p),
                      },
                    ]}
                  />
                </div>

                {/* Badges strip */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Badge>{p.role}</Badge>
                  {p.status && p.status !== 'active' && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200">
                      {p.status}
                    </span>
                  )}
                  {activeLoans.length > 0 && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                      {activeLoans.length} gear in hand
                    </span>
                  )}
                </div>

                {/* Accountability metrics footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle pt-2.5 text-xs text-muted-ink">
                  <span className="inline-flex items-center gap-1">
                    <Package size={13} className="text-primary" />
                    <strong>{usageLoans.length}</strong> total usages
                  </span>
                  {canIssue && (
                    <span className="inline-flex items-center gap-1">
                      <Handshake size={13} className="text-primary" />
                      <strong>{releaseCount}</strong> authorized
                    </span>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        {/* Desktop Table View */}
        <div className="table-wrap hidden md:block">
          <table>
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Editorial Position</th>
                <th>Department / Desk</th>
                <th>Access Role</th>
                <th>Equipment Accountability</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((p, idx) => {
                const isSelf = p.id === person.id
                const usageLoans = state.loans.filter((l) => l.borrowerId === p.id)
                const activeLoans = usageLoans.filter((l) => !l.returned)
                const releaseCount = state.loans.filter((l) => l.issuedBy === p.id).length
                const canIssue = p.role === 'Administrator' || p.role === 'Inventory Custodian'

                return (
                  <tr
                    key={p.id}
                    className="stagger-item"
                    style={{ '--stagger-i': idx } as React.CSSProperties}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-[13.5px] font-medium text-ink">{p.name}</strong>
                            {isSelf && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                                You
                              </span>
                            )}
                          </div>
                          <small className="text-muted-ink">ID: {p.id}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      {p.title ? (
                        <span className="inline-flex items-center rounded-full bg-[#f4f7f4] px-2.5 py-0.5 text-[11.5px] font-medium text-[#1e3f20] border border-[#d6e3d8]">
                          {p.title}
                        </span>
                      ) : (
                        <span className="text-muted-ink text-xs">—</span>
                      )}
                    </td>

                    <td>
                      <span className="text-xs font-medium text-ink/85">{p.department}</span>
                    </td>

                    <td>
                      <div className="flex items-center gap-1.5">
                        <Badge>{p.role}</Badge>
                        {p.status && p.status !== 'active' && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                            {p.status}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 text-ink/80 font-medium">
                            <Package size={13} className="text-muted-ink" />
                            {usageLoans.length} total usage{usageLoans.length === 1 ? '' : 's'}
                          </span>
                          {activeLoans.length > 0 && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                              {activeLoans.length} in hand
                            </span>
                          )}
                        </div>
                        {canIssue && (
                          <span className="inline-flex items-center gap-1 text-primary text-[11.5px] font-medium">
                            <Handshake size={12} />
                            {releaseCount} release{releaseCount === 1 ? '' : 's'} authorized
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <ActionMenu
                          triggerLabel={`Options for ${p.name}`}
                          items={[
                            !isSelf && person.role === 'Administrator' && {
                              label: 'Edit details & permissions',
                              icon: <Pencil size={14} className="text-muted-ink" />,
                              onClick: () => setEditingProfile(p),
                            },
                            {
                              label: 'View equipment history',
                              icon: <History size={14} className="text-muted-ink" />,
                              onClick: () => setViewingHistoryProfile(p),
                            },
                            !isSelf && person.role === 'Administrator' && {
                              label: 'Suspend staff access…',
                              icon: <Trash2 size={14} className="text-[#963838]" />,
                              destructive: true,
                              divider: true,
                              onClick: () => setDeleteProfileTarget(p),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!filteredProfiles.length && (
          <Empty text="No staff members match your search or filter criteria." />
        )}

        <div className="table-footer">
          <span>{filteredProfiles.length} staff records shown</span>
          <span>Access restricted to Inventory Custodians and Administrators</span>
        </div>
      </section>

      {/* Modal: Add New Staff Member */}
      {addModalOpen && <Modal title="Add a publication member" submit="Done" onClose={()=>setAddModalOpen(false)} onSubmit={()=>{}}><p>Ask the member to sign in with Google on this website. Their account will appear here as pending. An administrator can then review their details and approve access.</p></Modal>}
      {editingProfile && (
        <Modal
          title={`Edit details for ${editingProfile.name}`}
          submit="Save changes"
          onClose={() => setEditingProfile(null)}
          onSubmit={handleUpdateMember}
        >
          <Field label="Full name">
            <input
              name="name"
              required
              defaultValue={editingProfile.name}
              maxLength={120}
            />
          </Field>

          <div className="form-grid">
            <Field label="Editorial title / position">
              <Select name="title" defaultValue={editingProfile.title || 'News Writer'}>
                {EDITORIAL_TITLES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Editorial department / desk">
              <Select name="department" defaultValue={editingProfile.department ?? 'News Desk'}>
                {EDITORIAL_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="form-grid">
            <Field label="System access role">
              <Select name="role" defaultValue={editingProfile.role}>
                <option value="Staff">Staff (Standard Borrowing)</option>
                <option value="Inventory Custodian">Inventory Custodian (Equipment Management)</option>
                <option value="Administrator">Administrator (Full Publication Control)</option>
              </Select>
            </Field>

            <Field label="Membership status">
              <Select name="status" defaultValue={editingProfile.status ?? 'active'}>
                <option value="active">Active</option>
                <option value="pending">Pending Review</option>
                <option value="suspended">Suspended</option>
              </Select>
            </Field>
          </div>

          <Field label="Reason for changes (Audit record)">
            <input
              name="reason"
              maxLength={300}
              placeholder="e.g. Promoted to Head Photojournalist for upcoming semester"
            />
          </Field>
        </Modal>
      )}

      {/* Modal: Delete Staff Member Confirmation */}
      {deleteProfileTarget && (
        <Modal
          title={`Suspend access for ${deleteProfileTarget.name}?`}
          destructive
          submit="Suspend access"
          onClose={() => setDeleteProfileTarget(null)}
          onSubmit={async (f) => {
            const reason = String(f.get('reason') || 'Staff member account decommissioned')
            await handleDeleteMember(deleteProfileTarget, reason)
          }}
        >
          <div className="flex flex-col gap-3.5">
            <div className="rounded-2xl border border-line-subtle bg-surface/80 p-4 text-xs text-ink">
              <strong className="block text-sm font-semibold text-ink">
                Confirm access suspension
              </strong>
              <p className="mt-1 leading-relaxed text-muted-ink">
                You are about to suspend access for <strong>{deleteProfileTarget.name}</strong> (
                {deleteProfileTarget.title ? `${deleteProfileTarget.title} · ` : ''}
                {deleteProfileTarget.role}) in the publication. Their records and equipment history will be retained.
              </p>
              <p className="mt-2 text-[11.5px] text-muted-ink leading-normal">
                This member will immediately lose credentials to borrow gear or authorize releases.
              </p>
            </div>

            {hasActiveLoans(deleteProfileTarget.id) && (
              <div
                className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2"
                role="alert"
              >
                <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block">Unreturned Equipment Warning</strong>
                  <span>
                    This staff member currently has active equipment on loan. Please record the equipment return before removing this account.
                  </span>
                </div>
              </div>
            )}

            <Field label="Administrative reason for suspension">
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

      {/* Modal: View Member Usage History */}
      {viewingHistoryProfile && (
        <Modal
          title={`${viewingHistoryProfile.name} · Equipment history`}
          submit="Done"
          onClose={() => setViewingHistoryProfile(null)}
          onSubmit={() => setViewingHistoryProfile(null)}
        >
          <div className="flex flex-col gap-3">
            <p className="hint">
              Chronological equipment usage and checkouts recorded for{' '}
              <strong>{viewingHistoryProfile.name}</strong> ({viewingHistoryProfile.title || viewingHistoryProfile.role}).
            </p>

            {state.loans.filter((l) => l.borrowerId === viewingHistoryProfile.id).length === 0 ? (
              <Empty text="No equipment loans recorded for this staff member yet." />
            ) : (
              state.loans
                .filter((l) => l.borrowerId === viewingHistoryProfile.id)
                .map((l) => {
                  const item = state.items.find((i) => i.id === l.itemId)
                  const issuer = state.profiles.find((p) => p.id === l.issuedBy)
                  const isHolding = !l.returned

                  return (
                    <div
                      key={l.id}
                      className="rounded-2xl border border-line-subtle bg-surface/70 p-3.5 text-xs flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-[13px] text-ink font-medium">
                          {item?.name ?? 'Unknown item'}
                        </strong>
                        <Badge>{isHolding ? 'Currently in hand' : 'Returned'}</Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-ink">
                        <span>Tag: {item?.tag}</span>
                        <span>•</span>
                        <span>Borrowed: {dateText(l.out)}</span>
                        <span>•</span>
                        <span>Due: {dateText(l.due)}</span>
                        {l.returned && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-medium">
                              Returned: {dateText(l.returned)}
                            </span>
                          </>
                        )}
                      </div>

                      {l.event && (
                        <div className="text-ink/80 pt-1 border-t border-line-subtle/80">
                          <span className="text-muted-ink">Purpose: </span>
                          <span>{l.event}</span>
                        </div>
                      )}

                      {issuer && (
                        <div className="text-[11px] text-muted-ink">
                          Authorized release by: {issuer.name} ({issuer.title || issuer.role})
                        </div>
                      )}
                    </div>
                  )
                })
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
